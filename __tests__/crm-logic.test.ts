import { describe, it, expect } from "vitest";
import {
  replyWindow, composerMode, rowPill, waLink, telLink, maskPhone, nextLeadId, formatInr,
} from "@/lib/admin/crm/logic";

const NOW = new Date("2026-10-06T12:00:00Z");

describe("replyWindow", () => {
  it("open with hoursLeft when < 24h since last inbound", () => {
    const w = replyWindow(new Date("2026-10-06T09:00:00Z"), NOW); // 3h ago → 21h left
    expect(w.open).toBe(true);
    expect(w.hoursLeft).toBe(21);
  });
  it("closed at exactly 24h and beyond", () => {
    expect(replyWindow(new Date("2026-10-05T12:00:00Z"), NOW)).toEqual({ open: false, hoursLeft: 0 });
    expect(replyWindow(new Date("2026-10-04T12:00:00Z"), NOW)).toEqual({ open: false, hoursLeft: 0 });
  });
  it("closed when no inbound", () => {
    expect(replyWindow(null, NOW)).toEqual({ open: false, hoursLeft: 0 });
  });
  it("rounds hoursLeft up", () => {
    const w = replyWindow(new Date("2026-10-06T11:30:00Z"), NOW); // 30m ago → 23.5h → 24
    expect(w.hoursLeft).toBe(24);
  });
});

describe("composerMode + rowPill", () => {
  it("free text when open, template when closed", () => {
    expect(composerMode(replyWindow(new Date("2026-10-06T09:00:00Z"), NOW))).toBe("free");
    expect(composerMode(replyWindow(null, NOW))).toBe("template");
  });
  it("pill: open green, ≤3h red, closed grey", () => {
    expect(rowPill(replyWindow(new Date("2026-10-06T09:00:00Z"), NOW))).toEqual({ label: "Reply window 21h", kind: "open" });
    expect(rowPill(replyWindow(new Date("2026-10-05T14:30:00Z"), NOW))).toEqual({ label: "Window closes in 3h", kind: "closing" }); // 2.5h→ceil 3
    expect(rowPill(replyWindow(null, NOW))).toEqual({ label: "Window closed", kind: "closed" });
  });
});

describe("links + masking", () => {
  it("waLink encodes text and strips non-digits", () => {
    expect(waLink("+91 98•• ••• 210")).toBe("https://wa.me/9198210"); // mask isn't a real number; digits only
    expect(waLink("+919812345210", "Hi there")).toBe("https://wa.me/919812345210?text=Hi%20there");
  });
  it("telLink", () => {
    expect(telLink("+919812345210")).toBe("tel:+919812345210");
  });
  it("maskPhone", () => {
    expect(maskPhone("+919812345210")).toBe("+91 98•• ••• 210");
    expect(maskPhone("919912345418")).toBe("+91 99•• ••• 418");
  });
});

describe("nextLeadId", () => {
  const order = ["a", "b", "c"];
  it("returns the next id in queue order", () => {
    expect(nextLeadId("a", order)).toBe("b");
    expect(nextLeadId("b", order)).toBe("c");
  });
  it("returns null at the end or when not found", () => {
    expect(nextLeadId("c", order)).toBeNull();
    expect(nextLeadId("z", order)).toBeNull();
  });
});

describe("formatInr", () => {
  it("formats paise and whole rupees", () => {
    expect(formatInr(0.86)).toBe("₹0.86");
    expect(formatInr(0.12)).toBe("₹0.12");
    expect(formatInr(4999)).toBe("₹4,999");
    expect(formatInr(412)).toBe("₹412");
  });
});
