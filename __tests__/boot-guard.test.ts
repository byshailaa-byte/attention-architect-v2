import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { assertBootGuards } from "@/lib/boot-guard";

// Regression guard for the ~10-day prod freeze: a Sensitive ADMIN_PASSWORD is absent from the
// BUILD environment, so running the boot checks during `next build` page-data collection threw and
// failed every deploy. assertBootGuards must now skip during the build phase ONLY, while still
// failing closed at request time (where NEXT_PHASE is unset) if ADMIN_PASSWORD is missing.
describe("assertBootGuards — build-phase skip vs runtime fail-closed", () => {
  const TOUCHED = ["NEXT_PHASE", "ADMIN_PASSWORD", "DATABASE_URL", "VERCEL_ENV"];
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    // Snapshot then clear the vars these tests control, plus any ambient live-Razorpay-looking var
    // that would otherwise trip the unrelated payment guard.
    saved = {};
    for (const k of TOUCHED) { saved[k] = process.env[k]; delete process.env[k]; }
    for (const [k, v] of Object.entries(process.env)) {
      if (k.startsWith("rzp_live_") || (v ?? "").startsWith("rzp_live_")) { saved[k] = v; delete process.env[k]; }
    }
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  });

  it("build phase: does NOT throw even when ADMIN_PASSWORD is unset (missing build-time secret can't freeze prod)", () => {
    process.env.NEXT_PHASE = "phase-production-build";
    delete process.env.ADMIN_PASSWORD;
    expect(() => assertBootGuards()).not.toThrow();
  });

  it("runtime: fails closed when ADMIN_PASSWORD is unset", () => {
    delete process.env.NEXT_PHASE; // not a build
    delete process.env.ADMIN_PASSWORD;
    expect(() => assertBootGuards()).toThrow(/\[BOOT GUARD\] ADMIN_PASSWORD is unset/);
  });

  it("runtime: passes when ADMIN_PASSWORD is set", () => {
    delete process.env.NEXT_PHASE;
    process.env.ADMIN_PASSWORD = "set-for-test"; // presence is all the guard checks; value irrelevant
    expect(() => assertBootGuards()).not.toThrow();
  });
});
