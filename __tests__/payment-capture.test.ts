import { describe, it, expect, vi } from "vitest";
import { capturePayment } from "../lib/razorpay/capture";

// The idempotency guarantee: calling capturePayment twice with the same
// razorpay_payment_id must not double-process. The guard is in the SQL:
//   WHERE razorpay_payment_id IS NULL
// The database returns 0 rows on the second call because that column is no longer
// null — this is the signal the function uses to detect duplicates.
// These tests inject a fake sql function so no real DB is required.

// Cast once at the boundary: vi.fn() at runtime accepts any call signature,
// including tagged template literals (called as sql`...`). The cast is safe
// because we only care about the return value in these tests.
type FakeSql = Parameters<typeof capturePayment>[0];

function makeSql(results: { id: string }[][]): FakeSql {
  const sql = vi.fn();
  for (const result of results) {
    sql.mockResolvedValueOnce(result);
  }
  return sql as unknown as FakeSql;
}

describe("capturePayment — idempotency", () => {
  it("first submission returns 'processed'", async () => {
    const sql = makeSql([[{ id: "purchase-abc" }]]);
    expect(await capturePayment(sql, "pay_001", "order_001")).toBe("processed");
  });

  it("duplicate submission (DB returns 0 rows) returns 'duplicate'", async () => {
    // Simulates: DB already has razorpay_payment_id set, WHERE clause matches nothing
    const sql = makeSql([[]]);
    expect(await capturePayment(sql, "pay_001", "order_001")).toBe("duplicate");
  });

  it("exactly one DB call per invocation — duplicate path makes no extra writes", async () => {
    // First call: new payment (1 row returned)
    // Second call: already processed (0 rows — DB guard fired)
    const sql = makeSql([[{ id: "purchase-abc" }], []]);

    await capturePayment(sql, "pay_001", "order_001");
    expect(sql).toHaveBeenCalledTimes(1); // one UPDATE on first delivery

    await capturePayment(sql, "pay_001", "order_001");
    expect(sql).toHaveBeenCalledTimes(2); // one more UPDATE (returns []) — no extra writes
    // The key guarantee: each invocation issues exactly ONE statement.
    // The duplicate path does not attempt a second UPDATE or INSERT.
  });

  it("two distinct payment IDs on two distinct orders both return 'processed'", async () => {
    const sql = makeSql([[{ id: "purchase-1" }], [{ id: "purchase-2" }]]);

    expect(await capturePayment(sql, "pay_A", "order_A")).toBe("processed");
    expect(await capturePayment(sql, "pay_B", "order_B")).toBe("processed");
    expect(sql).toHaveBeenCalledTimes(2);
  });

  it("same order with same payment_id delivered N times: always 'duplicate' after first", async () => {
    const sql = makeSql([
      [{ id: "purchase-abc" }], // first delivery → processed
      [],                        // second delivery → duplicate
      [],                        // third delivery → duplicate
    ]);

    expect(await capturePayment(sql, "pay_001", "order_001")).toBe("processed");
    expect(await capturePayment(sql, "pay_001", "order_001")).toBe("duplicate");
    expect(await capturePayment(sql, "pay_001", "order_001")).toBe("duplicate");
    expect(sql).toHaveBeenCalledTimes(3); // three calls, three DB writes — but only one update succeeded
  });
});
