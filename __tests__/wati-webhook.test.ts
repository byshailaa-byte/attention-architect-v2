import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const h = vi.hoisted(() => ({ processWatiEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/db/client", () => ({ getSql: () => ((): Promise<unknown> => Promise.resolve([])) }));
vi.mock("@/lib/leads/wati-ingest", () => ({ processWatiEvent: h.processWatiEvent }));
vi.mock("@/lib/alerts/notify", () => ({ sendOpsAlert: vi.fn(), opsAlertBody: () => "" }));

function req(secret: string | null): NextRequest {
  const url = "http://localhost/api/webhooks/wati" + (secret !== null ? `?secret=${secret}` : "");
  return { nextUrl: new URL(url), json: async () => ({ waId: "9876543210" }) } as unknown as NextRequest;
}

describe("POST /api/webhooks/wati auth", () => {
  beforeEach(() => { vi.clearAllMocks(); process.env.WATI_WEBHOOK_SECRET = "right"; });

  it("wrong secret -> 401, no processing", async () => {
    const { POST } = await import("@/app/api/webhooks/wati/route");
    const res = await POST(req("wrong"));
    expect(res.status).toBe(401);
    expect(h.processWatiEvent).not.toHaveBeenCalled();
  });

  it("missing secret -> 401", async () => {
    const { POST } = await import("@/app/api/webhooks/wati/route");
    const res = await POST(req(null));
    expect(res.status).toBe(401);
  });

  it("correct secret -> 200 and processes", async () => {
    const { POST } = await import("@/app/api/webhooks/wati/route");
    const res = await POST(req("right"));
    expect(res.status).toBe(200);
    expect(h.processWatiEvent).toHaveBeenCalledTimes(1);
  });
});
