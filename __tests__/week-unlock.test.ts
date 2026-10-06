import { describe, it, expect } from "vitest";
import { isWeekUnlocked, type LmsProgress } from "@/lib/lms/progress";

const empty: LmsProgress = { completedDays: new Set(), completionTimes: new Map(), reflections: new Map() };
function withDay5(completedAt: Date): LmsProgress {
  return { completedDays: new Set([5]), completionTimes: new Map([[5, completedAt]]), reflections: new Map() };
}
const NOW = new Date("2026-02-10T12:00:00.000Z");
const hoursAgo = (n: number) => new Date(NOW.getTime() - n * 3600_000);

describe("isWeekUnlocked (v2 week lock)", () => {
  it("Week 1 is always unlocked", () => {
    expect(isWeekUnlocked(1, null, NOW)).toBe(true);
    expect(isWeekUnlocked(1, empty, NOW)).toBe(true);
  });

  it("Week 2 is locked with no progress", () => {
    expect(isWeekUnlocked(2, empty, NOW)).toBe(false);
    expect(isWeekUnlocked(2, null, NOW)).toBe(false);
  });

  it("Week 2 is locked at Week 1 Day 5 + 23h", () => {
    expect(isWeekUnlocked(2, withDay5(hoursAgo(23)), NOW)).toBe(false);
  });

  it("Week 2 opens at Week 1 Day 5 + 24h", () => {
    expect(isWeekUnlocked(2, withDay5(hoursAgo(24)), NOW)).toBe(true);
    expect(isWeekUnlocked(2, withDay5(hoursAgo(25)), NOW)).toBe(true);
  });

  it("Week 3 is locked if only Week 1 is done (Week 2 Day 5 missing)", () => {
    // The gating input for Week 3 is Week 2's progress — empty here.
    expect(isWeekUnlocked(3, empty, NOW)).toBe(false);
  });
});
