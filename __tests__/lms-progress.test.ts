import { describe, it, expect } from "vitest";
import { isDayUnlocked, computeWeekTrend } from "../lib/lms/progress";
import type { LmsProgress } from "../lib/lms/progress";
import type { ReflectionOutcome } from "../content/types";

// ── Test helpers ──────────────────────────────────────────────────────────────

function progress(completedDays: number[], reflections: [number, ReflectionOutcome][] = []): LmsProgress {
  return {
    completedDays: new Set(completedDays),
    reflections: new Map(reflections),
  };
}

// ── isDayUnlocked ─────────────────────────────────────────────────────────────

describe("isDayUnlocked", () => {
  // Day 1
  it("Day 1 is always unlocked — empty progress", () => {
    expect(isDayUnlocked(1, progress([]))).toBe(true);
  });

  it("Day 1 is always unlocked — even with other days complete", () => {
    expect(isDayUnlocked(1, progress([2, 3, 4, 5]))).toBe(true);
  });

  // Day 2
  it("Day 2 is locked when Day 1 is not complete", () => {
    expect(isDayUnlocked(2, progress([]))).toBe(false);
  });

  it("Day 2 unlocks once Day 1 is complete", () => {
    expect(isDayUnlocked(2, progress([1]))).toBe(true);
  });

  // Day 5
  it("Day 5 is locked when Day 4 is not yet complete (even with 1-3 done)", () => {
    expect(isDayUnlocked(5, progress([1, 2, 3]))).toBe(false);
  });

  it("Day 5 unlocks once Day 4 is complete", () => {
    expect(isDayUnlocked(5, progress([1, 2, 3, 4]))).toBe(true);
  });

  // Weekend (day 0) — the gate the topup-eligible route depends on
  it("Weekend (day 0) is locked when no days are complete", () => {
    expect(isDayUnlocked(0, progress([]))).toBe(false);
  });

  it("Weekend (day 0) is locked when only days 1–4 are complete", () => {
    expect(isDayUnlocked(0, progress([1, 2, 3, 4]))).toBe(false);
  });

  it("Weekend (day 0) is locked when only days 2–5 are complete (day 1 missing)", () => {
    expect(isDayUnlocked(0, progress([2, 3, 4, 5]))).toBe(false);
  });

  it("Weekend (day 0) unlocks only when all five days 1–5 are complete", () => {
    expect(isDayUnlocked(0, progress([1, 2, 3, 4, 5]))).toBe(true);
  });

  it("403 scenario: a day one ahead of the furthest complete is locked", () => {
    // Parent has done days 1 and 2 — day 4 must not be accessible
    expect(isDayUnlocked(4, progress([1, 2]))).toBe(false);
  });
});

// ── computeWeekTrend ──────────────────────────────────────────────────────────

describe("computeWeekTrend", () => {
  // Skip-hatch default — the key guarantee: skipped taps count as "mixed",
  // so the weekend framing is never presumptuous in either direction.
  it("all four taps missing → 'mixed' (skip-hatch default)", () => {
    expect(computeWeekTrend(new Map())).toBe("mixed");
  });

  it("all four taps skipped via skip-hatch → weekend sees 'mixed', not 'worked' or 'didnt_land'", () => {
    // Explicit: the skip route does NOT write reflection rows, so reflections map is empty.
    const skipHatchProgress = progress([1, 2, 3, 4, 5]); // all complete, no reflections
    expect(computeWeekTrend(skipHatchProgress.reflections)).toBe("mixed");
  });

  // Threshold: 3+ "worked" → mostly_worked
  it("3 worked + 1 missing → 'mostly_worked' (missing counts as mixed, 3 >= threshold)", () => {
    expect(computeWeekTrend(new Map([[2, "worked"], [3, "worked"], [4, "worked"]]))).toBe("mostly_worked");
  });

  it("all 4 worked → 'mostly_worked'", () => {
    expect(computeWeekTrend(new Map<number, ReflectionOutcome>([
      [2, "worked"], [3, "worked"], [4, "worked"], [5, "worked"],
    ]))).toBe("mostly_worked");
  });

  it("2 worked + 2 missing → 'mixed' (below threshold of 3)", () => {
    expect(computeWeekTrend(new Map([[2, "worked"], [3, "worked"]]))).toBe("mixed");
  });

  // Threshold: 3+ "didnt_land" → mostly_didnt_land
  it("3 didnt_land + 1 missing → 'mostly_didnt_land'", () => {
    expect(computeWeekTrend(new Map<number, ReflectionOutcome>([
      [2, "didnt_land"], [3, "didnt_land"], [4, "didnt_land"],
    ]))).toBe("mostly_didnt_land");
  });

  it("all 4 didnt_land → 'mostly_didnt_land'", () => {
    expect(computeWeekTrend(new Map<number, ReflectionOutcome>([
      [2, "didnt_land"], [3, "didnt_land"], [4, "didnt_land"], [5, "didnt_land"],
    ]))).toBe("mostly_didnt_land");
  });

  it("2 didnt_land + 2 missing → 'mixed' (below threshold of 3)", () => {
    expect(computeWeekTrend(new Map<number, ReflectionOutcome>([
      [2, "didnt_land"], [3, "didnt_land"],
    ]))).toBe("mixed");
  });

  // Mixed bags — various combinations that should stay "mixed"
  it("2 worked + 1 didnt_land + 1 missing → 'mixed'", () => {
    expect(computeWeekTrend(new Map<number, ReflectionOutcome>([
      [2, "worked"], [3, "worked"], [4, "didnt_land"],
    ]))).toBe("mixed");
  });

  it("2 worked + 2 didnt_land → 'mixed' (neither threshold met)", () => {
    expect(computeWeekTrend(new Map<number, ReflectionOutcome>([
      [2, "worked"], [3, "worked"], [4, "didnt_land"], [5, "didnt_land"],
    ]))).toBe("mixed");
  });

  it("all 4 explicitly 'mixed' → 'mixed'", () => {
    expect(computeWeekTrend(new Map<number, ReflectionOutcome>([
      [2, "mixed"], [3, "mixed"], [4, "mixed"], [5, "mixed"],
    ]))).toBe("mixed");
  });

  // Boundary: exactly 3 is the threshold
  it("exactly 3 worked is enough for 'mostly_worked'", () => {
    expect(computeWeekTrend(new Map<number, ReflectionOutcome>([
      [2, "worked"], [3, "worked"], [4, "worked"], [5, "mixed"],
    ]))).toBe("mostly_worked");
  });

  it("exactly 3 didnt_land is enough for 'mostly_didnt_land'", () => {
    expect(computeWeekTrend(new Map<number, ReflectionOutcome>([
      [2, "didnt_land"], [3, "didnt_land"], [4, "didnt_land"], [5, "mixed"],
    ]))).toBe("mostly_didnt_land");
  });
});
