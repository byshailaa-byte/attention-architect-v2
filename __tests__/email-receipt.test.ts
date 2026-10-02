import { describe, it, expect } from "vitest";
import { buildReceiptText, receiptCta, type ReceiptParams } from "@/lib/auth/email";
import { ENTITY } from "@/lib/entity";

const base: ReceiptParams = {
  to: "p@example.com",
  paymentId: "pay_TEST123",
  amount: 299900,
  tier: "tier1",
  paidAt: "2026-10-02T17:50:51.000Z",
  childName: "Shailaa",
  setPasswordUrl: "https://attentionparents.thehumandecision.in/lms/set-password?session=abc",
  loginUrl: "https://attentionparents.thehumandecision.in/lms/login",
};

describe("sendPurchasereceipt text part (F1/F6)", () => {
  it("has a non-empty plain-text part mirroring the HTML", () => {
    const t = buildReceiptText(base);
    expect(t).toContain("Payment received — Attention Architect");
    expect(t).toContain("Amount paid: ₹2,999");
    expect(t).toContain("Payment ID: pay_TEST123");
    expect(t).toContain("Shailaa");
    // F3 footer identity block present in text
    expect(t).toContain(ENTITY.legalName);
    expect(t).toContain(ENTITY.address);
    expect(t).toContain(ENTITY.supportEmail);
  });
});

describe("receipt CTA branch (F4/F6)", () => {
  it("new buyer → Set your password + set-password URL", () => {
    const c = receiptCta({ ...base, hasPassword: false });
    expect(c.label).toBe("Set your password and open the programme");
    expect(c.url).toBe(base.setPasswordUrl);
  });
  it("returning buyer with a password → Log in + login URL", () => {
    const c = receiptCta({ ...base, hasPassword: true });
    expect(c.label).toBe("Log in to the programme");
    expect(c.url).toBe(base.loginUrl);
  });
  it("text part reflects the F4 branch", () => {
    expect(buildReceiptText({ ...base, hasPassword: true })).toContain("Log in to the programme: " + base.loginUrl);
    expect(buildReceiptText({ ...base, hasPassword: false })).toContain("Set your password and open the programme: " + base.setPasswordUrl);
  });
});
