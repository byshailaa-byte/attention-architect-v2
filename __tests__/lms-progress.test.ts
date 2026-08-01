import { describe, it, expect } from "vitest";
import { isDayUnlocked, computeWeekTrend, UNLOCK_DELAY_MS } from "../lib/lms/progress";
import type { LmsProgress } from "../lib/lms/progress";
import type { ReflectionOutcome } from "../content/types";

// ── Test helpers ──────────────────────────────────────────────────────────────

const HOUR = 60 * 60 * 1000;

// Build an LmsProgress where the given days were completed `hoursAgo` hours before `now`.
// Passing hoursAgo=25 → unlocked; hoursAgo=23 → still locked (below 24h threshold).
function progressCompletedHoursAgo(
  days: number[],
  hoursAgo: number,
  now: Date,
  reflections: [number, ReflectionOutcome][] = [],
): LmsProgress {
  const completionTime = new Date(now.getTime() - hoursAgo * HOUR);
  return {
    completedDays: new Set(days),
    completionTimes: new Map(days.map((d) => [d, completionTime])),
    reflections: new Map(reflections),
  };
}

// Build an LmsProgress with no completion times (previous day not yet done).
function progressEmpty(): LmsProgress {
  return { completedDays: new Set(), completionTimes: new Map(), reflections: new Map() };
}

// ── isDayUnlocked ─────────────────────────────────────────────────────────────

const NOW = new Date("2026-08-01T12:00:00Z");

describe("isDayUnlocked", () => {
  // ── Week 1 Day 1 — always free ─────────────────────────────────────────────
  it("Week 1 Day 1 is always unlocked — empty progress", () => {
    expect(isDayUnlocked(1, 1, progressEmpty(), null, NOW)).toBe(true);
  });

  it("Week 1 Day 1 is always unlocked — even with other days complete", () => {
    expect(isDayUnlocked(1, 1, progressCompletedHoursAgo([2, 3, 4, 5], 0, NOW), null, NOW)).toBe(true);
  });

  // ── Same-week days — completion only ──────────────────────────────────────
  it("Day 2 is locked when Day 1 is not complete", () => {
    expect(isDayUnlocked(2, 1, progressEmpty(), null, NOW)).toBe(false);
  });

  it("Day 2 is locked when Day 1 just completed (< 24h elapsed)", () => {
    expect(isDayUnlocked(2, 1, progressCompletedHoursAgo([1], 23, NOW), null, NOW)).toBe(false);
  });

  it("Day 2 unlocks when Day 1 was completed ≥ 24h ago", () => {
    expect(isDayUnlocked(2, 1, progressCompletedHoursAgo([1], 25, NOW), null, NOW)).toBe(true);
  });

  it("Day 2 unlocks at exactly 24h (boundary — rolling from completion time)", () => {
    const p = progressCompletedHoursAgo([1], 0, NOW); // completed AT now
    const twentyFourHoursLater = new Date(NOW.getTime() + UNLOCK_DELAY_MS);
    expect(isDayUnlocked(2, 1, p, null, twentyFourHoursLater)).toBe(true);
  });

  it("Day 5 is locked when Day 4 is not complete (even with Days 1–3 done)", () => {
    expect(isDayUnlocked(5, 1, progressCompletedHoursAgo([1, 2, 3], 25, NOW), null, NOW)).toBe(false);
  });

  it("Day 5 is locked when Day 4 completed < 24h ago", () => {
    expect(isDayUnlocked(5, 1, progressCompletedHoursAgo([1, 2, 3, 4], 10, NOW), null, NOW)).toBe(false);
  });

  it("Day 5 unlocks when Day 4 was completed ≥ 24h ago", () => {
    expect(isDayUnlocked(5, 1, progressCompletedHoursAgo([1, 2, 3, 4], 25, NOW), null, NOW)).toBe(true);
  });

  // ── Weekend (day 0) ───────────────────────────────────────────────────────
  it("Weekend (day 0) is locked when no days are complete", () => {
    expect(isDayUnlocked(0, 1, progressEmpty(), null, NOW)).toBe(false);
  });

  it("Weekend (day 0) is locked when only days 1–4 are complete (Day 5 missing)", () => {
    expect(isDayUnlocked(0, 1, progressCompletedHoursAgo([1, 2, 3, 4], 25, NOW), null, NOW)).toBe(false);
  });

  it("Weekend (day 0) is locked when only days 2–5 are complete (Day 1 missing)", () => {
    expect(isDayUnlocked(0, 1, progressCompletedHoursAgo([2, 3, 4, 5], 25, NOW), null, NOW)).toBe(false);
  });

  it("Weekend (day 0) is locked when all 5 days complete but Day 5 < 24h ago", () => {
    expect(isDayUnlocked(0, 1, progressCompletedHoursAgo([1, 2, 3, 4, 5], 10, NOW), null, NOW)).toBe(false);
  });

  it("Weekend (day 0) unlocks when all 5 days complete AND Day 5 ≥ 24h ago", () => {
    expect(isDayUnlocked(0, 1, progressCompletedHoursAgo([1, 2, 3, 4, 5], 25, NOW), null, NOW)).toBe(true);
  });

  // ── Prevents the specific bypass that occurred ────────────────────────────
  it("403 scenario: a day two ahead of the furthest complete is locked", () => {
    expect(isDayUnlocked(4, 1, progressCompletedHoursAgo([1, 2], 25, NOW), null, NOW)).toBe(false);
  });

  it("cannot skip to Day 5 by completing only Day 1 even if > 24h ago", () => {
    expect(isDayUnlocked(5, 1, progressCompletedHoursAgo([1], 48, NOW), null, NOW)).toBe(false);
  });

  it("customer bypass scenario: Days 1–4 all completed in rapid succession (<1h ago) → Day 5 locked", () => {
    // This is exactly what happened: mark done, immediately navigate next.
    const p = progressCompletedHoursAgo([1, 2, 3, 4], 0, NOW);
    expect(isDayUnlocked(5, 1, p, null, NOW)).toBe(false);
  });

  // ── Week boundary gating ──────────────────────────────────────────────────
  it("Week 2 Day 1 is locked when prevWeekProgress is null", () => {
    expect(isDayUnlocked(1, 2, progressEmpty(), null, NOW)).toBe(false);
  });

  it("Week 2 Day 1 is locked when Week 1 Day 5 is not complete", () => {
    const prevProg = progressCompletedHoursAgo([1, 2, 3, 4], 25, NOW); // Day 5 missing
    expect(isDayUnlocked(1, 2, progressEmpty(), prevProg, NOW)).toBe(false);
  });

  it("Week 2 Day 1 is locked when Week 1 Day 5 completed < 24h ago", () => {
    const prevProg = progressCompletedHoursAgo([1, 2, 3, 4, 5], 10, NOW);
    expect(isDayUnlocked(1, 2, progressEmpty(), prevProg, NOW)).toBe(false);
  });

  it("Week 2 Day 1 unlocks when Week 1 Day 5 completed ≥ 24h ago", () => {
    const prevProg = progressCompletedHoursAgo([1, 2, 3, 4, 5], 25, NOW);
    expect(isDayUnlocked(1, 2, progressEmpty(), prevProg, NOW)).toBe(true);
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
    const skipHatchProgress = progressCompletedHoursAgo([1, 2, 3, 4, 5], 25, NOW);
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

  // Mixed bags
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
