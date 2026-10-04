import { describe, it, expect, vi } from "vitest";

// Verifies the Plan v2 CTAs hit the EXISTING checkout route with the existing tiers/amounts.
// tier2 = ₹4,999 (Plan + 3 calls), tier1 = ₹2,999 (plan on its own).

vi.mock("@/lib/boot-guard", () => ({ assertBootGuards: () => {} }));

function setup() {
  const orders: { amount: number }[] = [];
  vi.doMock("@/lib/razorpay/client", () => ({
    getRazorpayClient: () => ({ orders: { create: async (o: { amount: number; currency: string }) => { orders.push(o); return { id: "order_test", amount: o.amount, currency: o.currency }; } } }),
    getPublicKeyId: () => "rzp_test_key",
  }));
  vi.doMock("@/lib/db/client", () => ({
    getSql: () => (strings: TemplateStringsArray, ...values: unknown[]) => {
      const text = strings.join("?");
      if (/FROM assessments/.test(text)) return Promise.resolve([{ id: "aid", email: "p@example.com", phone: null, pricing_variant: "control" }]);
      if (/FROM users/.test(text)) return Promise.resolve([{ id: "uid" }]);
      return Promise.resolve([]);
    },
  }));
  return { orders };
}

const SID = "11111111-1111-1111-1111-111111111111";
const req = (body: unknown) => ({ json: async () => body } as unknown as import("next/server").NextRequest);

describe("Plan v2 tiers → existing /api/checkout/order", () => {
  it("tier2 (Plan + 3 calls) creates a ₹4,999 order", async () => {
    vi.resetModules();
    const { orders } = setup();
    const { POST } = await import("@/app/api/checkout/order/route");
    const res = await POST(req({ sessionId: SID, tier: "tier2" }));
    expect(res.status).toBe(200);
    expect((await res.json()).orderId).toBe("order_test");
    expect(orders[0].amount).toBe(499900); // ₹4,999 in paise
  });

  it("tier1 (plan on its own) creates a ₹2,999 order", async () => {
    vi.resetModules();
    const { orders } = setup();
    const { POST } = await import("@/app/api/checkout/order/route");
    const res = await POST(req({ sessionId: SID, tier: "tier1" }));
    expect(res.status).toBe(200);
    expect(orders[0].amount).toBe(299900); // ₹2,999 in paise
  });

  it("rejects an unknown tier (the plan only ever sends tier1/tier2)", async () => {
    vi.resetModules();
    setup();
    const { POST } = await import("@/app/api/checkout/order/route");
    const res = await POST(req({ sessionId: SID, tier: "banana" }));
    expect(res.status).toBe(400);
  });
});

describe("Plan v2 week-outcome table", () => {
  it("has 6 outcome lines for all 7 worries, with no 'homework' outside the homework row", async () => {
    const { WEEK_OUTCOMES } = await import("@/content/report-v2/plan-outcomes");
    const worries = ["reminders", "homework", "screens", "confidence", "giveup", "finish", "other"];
    for (const w of worries) {
      expect(WEEK_OUTCOMES[w], w).toHaveLength(6);
      if (w !== "homework") {
        for (const line of WEEK_OUTCOMES[w]) expect(/homework/i.test(line), `${w}: ${line}`).toBe(false);
      }
    }
  });
});
