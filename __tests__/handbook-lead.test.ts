import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// assertBootGuards runs at module load and would throw without ADMIN_PASSWORD — stub it.
vi.mock("@/lib/boot-guard", () => ({ assertBootGuards: () => {} }));

const h = vi.hoisted(() => ({
  sql: null as unknown as (s: TemplateStringsArray, ...v: unknown[]) => Promise<unknown>,
  enqueue: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({ getSql: () => h.sql }));
// Outbox-first delivery (WATI no longer called). normalizePhone → 91-prefixed; enqueueWhatsApp spied.
vi.mock("@/lib/whatsapp", () => ({ normalizePhone: (s: string) => "91" + s.replace(/\D/g, "").slice(-10) }));
vi.mock("@/lib/whatsapp/outbox", () => ({ enqueueWhatsApp: h.enqueue }));

import { POST } from "@/app/api/handbook-lead/route";

function makeSql() {
  const inserted: string[] = [];
  const calls: string[] = [];
  let nextId = 1;
  const fn = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join("?");
    calls.push(text);
    if (text.includes("SELECT phone FROM handbook_leads")) return Promise.resolve(inserted.map((p) => ({ phone: p })));
    if (text.includes("INSERT INTO handbook_leads")) { inserted.push(values[1] as string); return Promise.resolve([{ id: nextId++ }]); }
    return Promise.resolve([]);
  }) as unknown as (s: TemplateStringsArray, ...v: unknown[]) => Promise<unknown>;
  return { fn, calls, inserted };
}

function req(body: Record<string, unknown>): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

describe("POST /api/handbook-lead — outbox delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const s = makeSql();
    h.sql = s.fn;
    (h.sql as unknown as { _calls: string[] })._calls = s.calls;
  });

  it("enqueue sent -> wa_sent true + UPDATE", async () => {
    h.enqueue.mockResolvedValue({ id: "x", status: "sent", attempted: true });
    const res = await POST(req({ name: "Asha Rao", phone: "9876543210", ageBand: "3-5" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ saved: true, wa_sent: true, queued: false });
    expect(h.enqueue).toHaveBeenCalledTimes(1);
    expect(h.enqueue).toHaveBeenCalledWith(expect.objectContaining({ kind: "handbook", toPhone: "919876543210", params: { name: "Asha" }, ref: "handbook_lead:1" }));
    const calls = (h.sql as unknown as { _calls: string[] })._calls;
    expect(calls.some((c) => c.includes("UPDATE handbook_leads SET wa_sent = true"))).toBe(true);
  });

  it("enqueue queued (provider=none) -> wa_sent false, queued true, no UPDATE, never lost", async () => {
    h.enqueue.mockResolvedValue({ id: "x", status: "queued", attempted: false });
    const res = await POST(req({ name: "Asha Rao", phone: "9876543210", ageBand: "3-5" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ saved: true, wa_sent: false, queued: true });
    const calls = (h.sql as unknown as { _calls: string[] })._calls;
    expect(calls.some((c) => c.includes("UPDATE handbook_leads SET wa_sent = true"))).toBe(false);
  });

  it("invalid phone: 400, nothing saved, no enqueue", async () => {
    const res = await POST(req({ name: "Asha", phone: "12345", ageBand: "3-5" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Please enter a valid 10-digit mobile number");
    expect(h.enqueue).not.toHaveBeenCalled();
    const calls = (h.sql as unknown as { _calls: string[] })._calls;
    expect(calls.some((c) => c.includes("INSERT INTO handbook_leads"))).toBe(false);
  });

  it("duplicate within 10 min: one enqueue across two submissions", async () => {
    h.enqueue.mockResolvedValue({ id: "x", status: "sent", attempted: true });
    const first = await POST(req({ name: "Asha Rao", phone: "9876543210", ageBand: "3-5" }));
    const second = await POST(req({ name: "Asha Rao", phone: "+91 98765-43210", ageBand: "3-5" }));
    expect(await first.json()).toEqual({ saved: true, wa_sent: true, queued: false });
    expect(await second.json()).toEqual({ saved: true, wa_sent: false, deduped: true });
    expect(h.enqueue).toHaveBeenCalledTimes(1);
  });
});
