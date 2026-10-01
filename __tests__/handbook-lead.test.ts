import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// assertBootGuards runs at module load and would throw without ADMIN_PASSWORD — stub it.
vi.mock("@/lib/boot-guard", () => ({ assertBootGuards: () => {} }));

const h = vi.hoisted(() => ({
  sql: null as unknown as (s: TemplateStringsArray, ...v: unknown[]) => Promise<unknown>,
  sendWati: vi.fn(),
  opsAlert: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({ getSql: () => h.sql }));
vi.mock("@/lib/whatsapp", () => ({ sendWatiHandbook: h.sendWati }));
// Keep the REAL opsAlertBody (so we verify actual, PII-free formatting); spy sendOpsAlert.
vi.mock("@/lib/alerts/notify", async (orig) => ({
  ...(await orig<typeof import("@/lib/alerts/notify")>()),
  sendOpsAlert: h.opsAlert,
}));

import { POST } from "@/app/api/handbook-lead/route";

// Stateful fake sql: records inserted phones so the 10-minute dedupe SELECT can
// see them; returns an incrementing id from INSERT ... RETURNING.
function makeSql() {
  const inserted: string[] = [];
  const calls: string[] = [];
  let nextId = 1;
  const fn = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join("?");
    calls.push(text);
    if (text.includes("SELECT phone FROM handbook_leads")) {
      return Promise.resolve(inserted.map((p) => ({ phone: p })));
    }
    if (text.includes("INSERT INTO handbook_leads")) {
      inserted.push(values[1] as string); // VALUES (name, phone, ageBand, src)
      return Promise.resolve([{ id: nextId++ }]);
    }
    return Promise.resolve([]); // CREATE TABLE / ALTER / UPDATE
  }) as unknown as (s: TemplateStringsArray, ...v: unknown[]) => Promise<unknown>;
  return { fn, calls, inserted };
}

function req(body: Record<string, unknown>): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

describe("POST /api/handbook-lead — WATI delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const s = makeSql();
    h.sql = s.fn;
    (h.sql as unknown as { _calls: string[] })._calls = s.calls;
  });

  it("success: WATI send ok -> wa_sent true", async () => {
    h.sendWati.mockResolvedValue({ ok: true });
    const res = await POST(req({ name: "Asha Rao", phone: "9876543210", ageBand: "3-5" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ saved: true, wa_sent: true });
    expect(h.sendWati).toHaveBeenCalledTimes(1);
    // first name only, "there" fallback handled in the sender
    expect(h.sendWati).toHaveBeenCalledWith({ firstName: "Asha", contactName: "Asha Rao", rawPhone: "9876543210" });
    const calls = (h.sql as unknown as { _calls: string[] })._calls;
    expect(calls.some((c) => c.includes("UPDATE handbook_leads SET wa_sent = true"))).toBe(true);
  });

  it("WATI failure: wa_sent stays false + ops alert (lead id + error, no phone)", async () => {
    h.sendWati.mockResolvedValue({ ok: false, error: "WATI sendTemplateMessage 400: {\"result\":false}" });
    const res = await POST(req({ name: "Asha Rao", phone: "9876543210", ageBand: "3-5" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ saved: true, wa_sent: false });
    expect(h.opsAlert).toHaveBeenCalledTimes(1);
    const [subject, alertBody] = h.opsAlert.mock.calls[0] as [string, string];
    expect(subject).toContain("handbook");
    expect(alertBody).toContain("handbook_lead:1"); // lead id present
    expect(alertBody).toContain("sendTemplateMessage 400"); // WATI error present
    expect(alertBody).not.toContain("9876543210"); // phone MUST NOT appear
    const calls = (h.sql as unknown as { _calls: string[] })._calls;
    expect(calls.some((c) => c.includes("UPDATE handbook_leads SET wa_sent = true"))).toBe(false);
  });

  it("invalid phone: 400, nothing saved, no send", async () => {
    const res = await POST(req({ name: "Asha", phone: "12345", ageBand: "3-5" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Please enter a valid 10-digit mobile number");
    expect(h.sendWati).not.toHaveBeenCalled();
    const calls = (h.sql as unknown as { _calls: string[] })._calls;
    expect(calls.some((c) => c.includes("INSERT INTO handbook_leads"))).toBe(false);
  });

  it("duplicate within 10 min: one send across two submissions", async () => {
    h.sendWati.mockResolvedValue({ ok: true });
    const first = await POST(req({ name: "Asha Rao", phone: "9876543210", ageBand: "3-5" }));
    const second = await POST(req({ name: "Asha Rao", phone: "+91 98765-43210", ageBand: "3-5" })); // same number, diff format
    expect(await first.json()).toEqual({ saved: true, wa_sent: true });
    expect(await second.json()).toEqual({ saved: true, wa_sent: false, deduped: true });
    expect(h.sendWati).toHaveBeenCalledTimes(1); // only once
  });
});
