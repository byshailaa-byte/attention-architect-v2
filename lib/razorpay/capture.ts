// Extracted so tests can inject a fake sql function and prove the idempotency
// guarantee without a live database.
type SqlFn = (strings: TemplateStringsArray, ...values: unknown[]) => unknown;

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
