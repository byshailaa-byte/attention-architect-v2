// /api/funnel/event validation: accepts the two new click events, and rejects a null
// session for every event EXCEPT whatsapp_click (which is accepted but not stored, since
// funnel_events.session_id is NOT NULL).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CATALOG } from "@/lib/analytics/catalog";

const h = vi.hoisted(() => ({ sqlMock: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/boot-guard", () => ({ assertBootGuards: () => {} }));
vi.mock("@/lib/db/client", () => ({ getSql: () => h.sqlMock }));

const VALID = "11111111-1111-1111-1111-111111111111";

function req(body: unknown): Request {
  return new Request("http://localhost/api/funnel/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/funnel/event validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts roadmap_cta_click with a valid session (and stores it)", async () => {
    const { POST } = await import("@/app/api/funnel/event/route");
    const res = await POST(req({ event_type: "roadmap_cta_click", session_id: VALID, metadata: { position: "hero" } }));
    expect(res.status).toBe(200);
    expect(h.sqlMock).toHaveBeenCalledTimes(1);
  });

  it("accepts whatsapp_click with a valid session (and stores it)", async () => {
    const { POST } = await import("@/app/api/funnel/event/route");
    const res = await POST(req({ event_type: "whatsapp_click", session_id: VALID, metadata: { path: "/report/x" } }));
    expect(res.status).toBe(200);
    expect(h.sqlMock).toHaveBeenCalledTimes(1);
  });

  it("rejects roadmap_cta_click with NO session", async () => {
    const { POST } = await import("@/app/api/funnel/event/route");
    const res = await POST(req({ event_type: "roadmap_cta_click", metadata: { position: "hero" } }));
    expect(res.status).toBe(400);
    expect(h.sqlMock).not.toHaveBeenCalled();
  });

  it("rejects a normal event (assessment_started) with NO session", async () => {
    const { POST } = await import("@/app/api/funnel/event/route");
    const res = await POST(req({ event_type: "assessment_started" }));
    expect(res.status).toBe(400);
    expect(h.sqlMock).not.toHaveBeenCalled();
  });

  it("accepts whatsapp_click with NO session but does NOT store it", async () => {
    const { POST } = await import("@/app/api/funnel/event/route");
    const res = await POST(req({ event_type: "whatsapp_click", metadata: { path: "/" } }));
    expect(res.status).toBe(200);
    expect(h.sqlMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown event_type", async () => {
    const { POST } = await import("@/app/api/funnel/event/route");
    const res = await POST(req({ event_type: "nope", session_id: VALID }));
    expect(res.status).toBe(400);
  });
});

// (a) Catalog is the single source of truth (DB CHECK dropped in phase_62). EVERY catalog event
// must be accepted; anything not in the catalog must be rejected. Fails the build on drift.
describe("/api/funnel/event — catalog coverage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts every catalog event (200)", async () => {
    const { POST } = await import("@/app/api/funnel/event/route");
    const bad: string[] = [];
    for (const event_type of Object.keys(CATALOG)) {
      const res = await POST(req({ event_type, session_id: VALID, metadata: {} }));
      if (res.status !== 200) bad.push(`${event_type} → ${res.status}`);
    }
    expect(bad).toEqual([]);
  });

  it("rejects an event that is NOT in the catalog (400)", async () => {
    const { POST } = await import("@/app/api/funnel/event/route");
    const res = await POST(req({ event_type: "definitely_not_in_catalog", session_id: VALID }));
    expect(res.status).toBe(400);
  });
});
