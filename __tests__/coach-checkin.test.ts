import { describe, it, expect } from "vitest";
import { isImproved } from "@/lib/lms/coach/checkin";

// "Improved" is worry-aware and computed ONLY from the ordered chip scale — never inferred.
describe("isImproved — count/time worries (lower is better)", () => {
  it("reminders: 3 → 2 is improved; 3 → 3 is not; 3 → 4 is not", () => {
    expect(isImproved("reminders", "3", "2")).toBe(true);
    expect(isImproved("reminders", "3", "3")).toBe(false);
    expect(isImproved("reminders", "3", "4")).toBe(false);
  });
  it("homework time: 20+ → 10–20 is improved", () => {
    expect(isImproved("homework", "20+", "10–20")).toBe(true);
    expect(isImproved("homework", "5–10", "20+")).toBe(false);
  });
});

describe("isImproved — finish (higher is better)", () => {
  it("none → half is improved; all → most is not", () => {
    expect(isImproved("finish", "none", "half")).toBe(true);
    expect(isImproved("finish", "all", "most")).toBe(false);
  });
});

describe("isImproved — never guesses", () => {
  it("returns false when baseline or now is missing", () => {
    expect(isImproved("reminders", null, "2")).toBe(false);
    expect(isImproved("reminders", "3", null)).toBe(false);
  });
  it("returns false when a value isn't on the scale (no inference)", () => {
    expect(isImproved("reminders", "3", "banana")).toBe(false);
  });
});
