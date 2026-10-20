import { describe, it, expect } from "vitest";
import { normalizeOutcome, extractOutcome, needsCall, OUTCOMES, type OutcomeRow } from "@/lib/lms/coach/outcomes";

describe("normalizeOutcome — single vocabulary", () => {
  it("maps legacy 3 → canonical 5", () => {
    expect(normalizeOutcome("worked")).toBe("tried_worked");
    expect(normalizeOutcome("sort_of")).toBe("tried_partly");
    expect(normalizeOutcome("didnt_work")).toBe("tried_didnt_work");
  });
  it("passes canonical values through", () => {
    for (const o of OUTCOMES) expect(normalizeOutcome(o)).toBe(o);
  });
});

describe("extractOutcome — from the parent's own words", () => {
  const cases: [string, string | null][] = [
    ["Sorry, I missed yesterday — didn't get a chance.", "missed"],
    ["I didn't really get what I was supposed to do.", "unclear"],
    ["I'm unable to comprehend this.", "unclear"],
    ["I tried it but it didn't work, she still wouldn't start.", "tried_didnt_work"],
    ["It sort of worked — he started but gave up halfway.", "tried_partly"],
    ["It worked! She started on her own.", "tried_worked"],
    ["What time should homework be?", null],
  ];
  for (const [msg, expected] of cases) {
    it(`"${msg.slice(0, 32)}…" → ${expected}`, () => {
      const r = extractOutcome(msg);
      expect(r ? r.outcome : null).toBe(expected);
      if (r) expect(r.note.length).toBeGreaterThan(0);
    });
  }
  it("keeps the parent's words as the note (≤160 chars)", () => {
    const r = extractOutcome("It didn't work at all, " + "x".repeat(300));
    expect(r?.note.length).toBeLessThanOrEqual(160);
  });
});

describe("needsCall — 2 unclear or 2 missed in a row", () => {
  const row = (outcome: string, t: number): OutcomeRow => ({ week: 1, day: t, outcome: outcome as OutcomeRow["outcome"], note: null, source: "chat", created_at: new Date(2026, 0, t).toISOString() });
  it("flags two unclear in a row", () => {
    expect(needsCall([row("tried_worked", 1), row("unclear", 2), row("unclear", 3)]).flag).toBe(true);
  });
  it("flags two missed in a row", () => {
    expect(needsCall([row("missed", 1), row("missed", 2)]).flag).toBe(true);
  });
  it("does NOT flag unclear then worked", () => {
    expect(needsCall([row("unclear", 1), row("tried_worked", 2)]).flag).toBe(false);
  });
  it("does NOT flag a single unclear", () => {
    expect(needsCall([row("unclear", 1)]).flag).toBe(false);
  });
  it("maps legacy values before checking (didnt_work ≠ missed)", () => {
    expect(needsCall([row("didnt_work", 1), row("didnt_work", 2)]).flag).toBe(false);
  });
});
