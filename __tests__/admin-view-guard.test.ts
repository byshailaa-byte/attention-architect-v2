import { describe, it, expect } from "vitest";
import type { NextRequest } from "next/server";
import { isAdminLmsView, blockIfAdminView } from "@/lib/lms/admin-view-guard";
import { runImpersonated, currentImpersonation } from "@/lib/lms/impersonation";

function mockReq({ header, cookie }: { header?: string; cookie?: string }): NextRequest {
  return {
    headers: { get: (k: string) => (k.toLowerCase() === "x-aa-admin-view" ? header ?? null : null) },
    cookies: { get: (k: string) => (k === "aa_lms_view" && cookie ? { value: cookie } : undefined) },
  } as unknown as NextRequest;
}

describe("admin view guard — header-only, request-scoped", () => {
  it("normal request (no header) → NOT blocked", () => {
    expect(isAdminLmsView(mockReq({}))).toBe(false);
    expect(blockIfAdminView(mockReq({}))).toBeNull();
  });

  it("x-aa-admin-view: 1 header → blocked 403", () => {
    expect(isAdminLmsView(mockReq({ header: "1" }))).toBe(true);
    expect(blockIfAdminView(mockReq({ header: "1" }))?.status).toBe(403);
  });

  it("stale aa_lms_view cookie ONLY (no header) → NOT blocked — the leaky cookie is ignored", () => {
    expect(isAdminLmsView(mockReq({ cookie: "1" }))).toBe(false);
    expect(blockIfAdminView(mockReq({ cookie: "1" }))).toBeNull();
  });
});

describe("impersonation is strictly request-scoped (no cross-request leak)", () => {
  it("a normal request sees NO impersonated user while another request is impersonating", async () => {
    const tick = () => new Promise((r) => setTimeout(r, 5));
    const [impersonated, normal] = await Promise.all([
      runImpersonated({ userId: "A", readOnly: true }, async () => { await tick(); return currentImpersonation()?.userId ?? null; }),
      (async () => { await tick(); return currentImpersonation()?.userId ?? null; })(),
    ]);
    expect(impersonated).toBe("A");   // the impersonated branch resolves its target
    expect(normal).toBeNull();        // the concurrent normal branch is unaffected
  });
});
