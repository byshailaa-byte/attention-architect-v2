import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { getLmsVersion, lmsLanding } from "@/lib/lms/lms-version";

// ── getLmsVersion + lmsLanding (routing decision) ──────────────────────────────
function sqlReturning(rows: unknown[]) {
  return (() => Promise.resolve(rows)) as unknown as (s: TemplateStringsArray, ...v: unknown[]) => Promise<unknown>;
}

describe("LMS version routing", () => {
  it("getLmsVersion: 'v1' row → v1; null/missing/throw → v2", async () => {
    expect(await getLmsVersion(sqlReturning([{ lms_version: "v1" }]), "u")).toBe("v1");
    expect(await getLmsVersion(sqlReturning([{ lms_version: "v2" }]), "u")).toBe("v2");
    expect(await getLmsVersion(sqlReturning([{ lms_version: null }]), "u")).toBe("v2");
    expect(await getLmsVersion(sqlReturning([]), "u")).toBe("v2");
    const throwing = (() => Promise.reject(new Error("no column"))) as unknown as (s: TemplateStringsArray, ...v: unknown[]) => Promise<unknown>;
    expect(await getLmsVersion(throwing, "u")).toBe("v2");
  });

  it("lmsLanding: v1 → /lms, v2 → /lms-v2", () => {
    expect(lmsLanding("v1")).toBe("/lms");
    expect(lmsLanding("v2")).toBe("/lms-v2");
  });
});

// ── module-read route idempotency ──────────────────────────────────────────────
vi.mock("@/lib/boot-guard", () => ({ assertBootGuards: () => {} }));
vi.mock("@/lib/auth/session", () => ({ COOKIE_NAME: "lms_session", verifySessionToken: () => "user-1" }));

const h = vi.hoisted(() => ({ stored: new Set<string>() }));
vi.mock("@/lib/db/client", () => ({
  getSql: () => ((strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join("?");
    if (text.includes("INSERT INTO lms_module_reads")) {
      // values: [userId, week, module] — emulate UNIQUE(user,week,module) + ON CONFLICT DO NOTHING
      h.stored.add(`${values[0]}:${values[1]}:${values[2]}`);
    }
    return Promise.resolve([]);
  }),
}));

import { POST } from "@/app/api/lms/module-read/route";

function req(body: Record<string, unknown>): NextRequest {
  return { cookies: { get: () => ({ value: "tok" }) }, json: async () => body } as unknown as NextRequest;
}

describe("POST /api/lms/module-read", () => {
  beforeEach(() => h.stored.clear());

  it("records a module read once even when opened twice", async () => {
    const a = await POST(req({ week: 1, module: 2 }));
    const b = await POST(req({ week: 1, module: 2 }));
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(h.stored.size).toBe(1); // deduped by UNIQUE(user, week, module)
  });

  it("rejects an out-of-range module", async () => {
    const res = await POST(req({ week: 1, module: 9 }));
    expect(res.status).toBe(400);
    expect(h.stored.size).toBe(0);
  });
});
