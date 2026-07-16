// Extracted so tests can inject a fake sql function and prove the idempotency
// guarantee without a live database.
type SqlFn = (strings: TemplateStringsArray, ...values: unknown[]) => unknown;

// Applies a payment.captured webhook atomically.
// Returns "processed" if the purchase row was updated, "duplicate" if it was
// already marked paid (razorpay_payment_id was non-null — idempotency guard).
// Exactly one DB write per invocation either way.
export async function capturePayment(
  sql: SqlFn,
  razorpayPaymentId: string,
  razorpayOrderId: string,
): Promise<"processed" | "duplicate"> {
  const rows = (await sql`
    UPDATE purchases
    SET
      razorpay_payment_id = ${razorpayPaymentId},
      status              = 'paid'
    WHERE
      razorpay_order_id   = ${razorpayOrderId}
      AND razorpay_payment_id IS NULL
    RETURNING id
  `) as { id: string }[];

  return rows.length > 0 ? "processed" : "duplicate";
}
