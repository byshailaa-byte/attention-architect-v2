import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";
import type { NextRequest } from "next/server";

vi.mock("@/lib/boot-guard", () => ({ assertBootGuards: () => {} }));
const h = vi.hoisted(() => ({ rec: vi.fn((..._a: unknown[]) => Promise.resolve()) }));
vi.mock("@/lib/whatsapp/outbox", () => ({ recordDeliveryStatus: h.rec }));

process.env.WA_VERIFY_TOKEN = "verify-xyz";
process.env.WA_APP_SECRET = "app-secret-123";

import { GET, POST } from "@/app/api/webhooks/whatsapp/route";

function getReq(params: Record<string, string>): NextRequest {
  const u = new URL("https://x/api/webhooks/whatsapp");
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return { nextUrl: u } as unknown as NextRequest;
}
function postReq(raw: string, sig: string | null): NextRequest {
  return { text: async () => raw, headers: { get: (k: string) => (k.toLowerCase() === "x-hub-signature-256" ? sig : null) } } as unknown as NextRequest;
}
const sign = (raw: string) => "sha256=" + createHmac("sha256", "app-secret-123").update(raw).digest("hex");

describe("WhatsApp Cloud webhook", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET verify: correct token → challenge", async () => {
    const res = await GET(getReq({ "hub.mode": "subscribe", "hub.verify_token": "verify-xyz", "hub.challenge": "42" }));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("42");
  });
  it("GET verify: wrong token → 403", async () => {
    const res = await GET(getReq({ "hub.mode": "subscribe", "hub.verify_token": "nope", "hub.challenge": "42" }));
    expect(res.status).toBe(403);
  });

  it("POST: bad signature → 401, no status recorded", async () => {
    const raw = JSON.stringify({ entry: [] });
    const res = await POST(postReq(raw, "sha256=deadbeef"));
    expect(res.status).toBe(401);
    expect(h.rec).not.toHaveBeenCalled();
  });
  it("POST: missing signature → 401", async () => {
    const res = await POST(postReq("{}", null));
    expect(res.status).toBe(401);
  });

  it("POST: valid signature → 200, records delivered + failed statuses", async () => {
    const raw = JSON.stringify({ entry: [{ changes: [{ value: { statuses: [
      { id: "wamid.AAA", status: "delivered" },
      { id: "wamid.BBB", status: "failed", errors: [{ title: "undeliverable" }] },
    ] } }] }] });
    const res = await POST(postReq(raw, sign(raw)));
    expect(res.status).toBe(200);
    const calls = h.rec.mock.calls.map((c) => [c[0], c[1], c[2]]);
    expect(calls).toContainEqual(["wamid.AAA", "delivered", undefined]);
    expect(calls).toContainEqual(["wamid.BBB", "failed", "undeliverable"]);
  });

  it("POST: inbound messages are ignored (statuses only)", async () => {
    const raw = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ id: "m1", text: { body: "hi" } }] } }] }] });
    const res = await POST(postReq(raw, sign(raw)));
    expect(res.status).toBe(200);
    expect(h.rec).not.toHaveBeenCalled();
  });
});
