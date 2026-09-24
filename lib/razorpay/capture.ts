import { normalizePhone } from "@/lib/whatsapp";

// Extracted so tests can inject a fake sql function and prove the idempotency
// guarantee without a live database.
type SqlFn = (strings: TemplateStringsArray, ...values: unknown[]) => unknown;

// A buyer must never receive a WATI sales/drip message. WATI exposes NO API to remove
// a contact from a running campaign directly — a campaign is stopped for one contact by
// a stop/exit CONDITION on a contact attribute. So on a confirmed purchase we set
// purchased=yes (+ tier) via updateContactAttributes; the WATI campaign MUST be
// configured to exit contacts where purchased=yes. This sends NO message — it only
// updates the contact's attributes. Call it from the payment-confirm route's after().
export async function setWatiPurchasedAttributes(rawPhone: string | null, tier: string): Promise<void> {
  const to = rawPhone ? normalizePhone(rawPhone) : null;
  const endpoint = process.env.WATI_API_ENDPOINT;
  const token = process.env.WATI_ACCESS_TOKEN;
  if (!to || !endpoint || !token) {
    console.warn(`[wati] purchased-attributes skipped: phone=${to ? "ok" : "missing"} configured=${!!(endpoint && token)}`);
    return;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(`${endpoint}/api/v1/updateContactAttributes/${to}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token.replace(/^Bearer\s+/i, "")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ customParams: [{ name: "purchased", value: "yes" }, { name: "tier", value: tier }] }),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || data.result === false) {
      // Loud: a failure here means a buyer could still receive a drip message.
      console.error(`[wati] purchased-attributes FAILED (buyer may still get drip) ${res.status}: ${JSON.stringify(data)}`);
      return;
    }
    console.log(`[wati] purchased=yes tier=${tier} set for ****${to.slice(-4)}`);
  } catch (err) {
    console.error("[wati] purchased-attributes error (buyer may still get drip):", (err as Error).message);
  } finally {
    clearTimeout(timer);
  }
}

// Applies a payment.captured webhook atomically.
// Returns:
//   "processed"  — purchase row updated to paid (normal path)
//   "duplicate"  — row exists but already marked paid (safe idempotent retry)
//   "not_found"  — no purchases row for this order ID (payment unrecorded, needs investigation)
export async function capturePayment(
  sql: SqlFn,
  razorpayPaymentId: string,
  razorpayOrderId: string,
): Promise<"processed" | "duplicate" | "not_found"> {
  const updated = (await sql`
    UPDATE purchases
    SET
      razorpay_payment_id = ${razorpayPaymentId},
      status              = 'paid'
    WHERE
      razorpay_order_id   = ${razorpayOrderId}
      AND razorpay_payment_id IS NULL
    RETURNING id
  `) as { id: string }[];

  if (updated.length > 0) return "processed";

  const existing = (await sql`
    SELECT id FROM purchases WHERE razorpay_order_id = ${razorpayOrderId} LIMIT 1
  `) as { id: string }[];

  return existing.length > 0 ? "duplicate" : "not_found";
}
