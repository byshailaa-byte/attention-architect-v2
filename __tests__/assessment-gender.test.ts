import { describe, it, expect, vi } from "vitest";
import type { NextRequest } from "next/server";

// assertBootGuards runs at module load — stub it.
vi.mock("@/lib/boot-guard", () => ({ assertBootGuards: () => {} }));

import { POST } from "@/app/api/assessment/submit/route";

function req(body: Record<string, unknown>): NextRequest {
  return { json: async () => body, nextUrl: { origin: "http://localhost" } } as unknown as NextRequest;
}

const base = { sessionId: "11111111-1111-1111-1111-111111111111", ageBand: "10-11", answers: {}, questionSequence: [] };

describe("POST /api/assessment/submit — gender required (new submissions)", () => {
  it("missing gender → 400", async () => {
    const res = await POST(req({ ...base })); // no gender
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Child's gender is required");
  });

  it("null / empty gender → 400", async () => {
    expect((await POST(req({ ...base, gender: null }))).status).toBe(400);
    expect((await POST(req({ ...base, gender: "  " }))).status).toBe(400);
  });
});
