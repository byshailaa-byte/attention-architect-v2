import { describe, it, expect } from "vitest";
import { overDailyLimit, COACH_DAILY_LIMIT } from "@/lib/lms/coach/limits";
import { memorableRows } from "@/lib/lms/coach/memory";
import { isSellableTier } from "@/lib/checkout/tiers";

describe("coach daily limit", () => {
  it(`blocks at ${COACH_DAILY_LIMIT} parent messages`, () => {
    expect(overDailyLimit(0)).toBe(false);
    expect(overDailyLimit(COACH_DAILY_LIMIT - 1)).toBe(false);
    expect(overDailyLimit(COACH_DAILY_LIMIT)).toBe(true);
    expect(overDailyLimit(COACH_DAILY_LIMIT + 1)).toBe(true);
  });
});

describe("coach memory uses ONLY parent messages, never safety content", () => {
  it("keeps parent messages; drops coach replies, flagged messages, and safety replies", () => {
    const rows = [
      { role: "parent", content: "homework is at 6 at the dining table", safety_flag: false },
      { role: "coach", content: "Great — try one option. Screen off at 5:45?", safety_flag: false }, // coach idea — must drop
      { role: "parent", content: "my husband hits him", safety_flag: true },  // flagged — must drop
      { role: "safety", content: "This needs a person, not a coach…", safety_flag: true }, // safety reply — must drop
    ];
    const kept = memorableRows(rows);
    expect(kept.map((r) => r.role)).toEqual(["parent"]);            // parent-only
    expect(kept.some((r) => r.role === "coach")).toBe(false);       // never ingest the coach's own plan
    expect(kept.some((r) => r.safety_flag)).toBe(false);
    expect(kept.some((r) => r.role === "safety")).toBe(false);
    expect(kept.some((r) => /hits him/.test(r.content))).toBe(false);
    expect(kept.some((r) => /5:45/.test(r.content))).toBe(false);   // the coach's suggestion is gone
  });
});

describe("checkout tier gate", () => {
  it("sells only tier1 and tier2", () => {
    expect(isSellableTier("tier1")).toBe(true);
    expect(isSellableTier("tier2")).toBe(true);
    for (const t of ["module1", "full", "topup", "garbage", ""]) expect(isSellableTier(t), t).toBe(false);
  });
});
