import { describe, it, expect } from "vitest";
import { planTomorrow, didntLandStreak } from "@/lib/plan-adjust/tomorrow";
import { validateStep, normalizeExactWords, spokenLineOk } from "@/lib/plan-adjust/validate";
import { fallbackStep } from "@/lib/plan-adjust/fallback";
import { generateAdjustedStep, type ModelCall } from "@/lib/plan-adjust/generate";
import { preferCoachRow, nextPlanDay, trialNextDay, patternPlain, isLimitTopic } from "@/lib/plan-adjust/resolve";
import { runCoachTool } from "@/lib/coach/tools";
import type { AdjustedStep } from "@/lib/plan-adjust/types";

const GOOD: AdjustedStep = {
  opening: "Yesterday worked — here's today, one small step on.",
  title: "Offer the first choice",
  moment: "when homework starts",
  exactWords: ["You decide where we start — I'll follow your lead."],
  notice: "Watch whether getting started feels a little easier than usual.",
  minutes: 5,
};
const BASE = "Offer the choice today. Let them pick where to start. Watch what happens.";

function modelReturning(...steps: (AdjustedStep | null)[]): ModelCall {
  let i = 0;
  return async () => ({ step: steps[Math.min(i++, steps.length - 1)], inputTokens: 100, outputTokens: 40, model: "test-model" });
}

describe("A1 — outcome → tomorrow", () => {
  it("worked → step further", () => expect(planTomorrow("worked", 1).directive).toMatch(/one small step further/i));
  it("partly → one concrete tweak", () => expect(planTomorrow("partly", 1).directive).toMatch(/one concrete tweak/i));
  it("didnt_land → smaller version", () => expect(planTomorrow("didnt_land", 1).directive).toMatch(/smaller version/i));
  it("two didnt_land → banner on; pill does NOT mention the Coach; opening must not either (banner carries it once)", () => {
    const t = planTomorrow("didnt_land", 2);
    expect(t.showCoachLine).toBe(true);          // the banner carries the Coach suggestion, once
    expect(t.adjustedForYou).not.toMatch(/coach/i); // pill has no Coach mention
    expect(t.directive).toMatch(/do NOT mention the Coach in the opening/i); // opening is told not to repeat it
    expect(t.directive).toMatch(/second day in a row/i);
  });
  it("didntLandStreak walks back consecutive didnt_land only", () => {
    const by: Record<number, "worked" | "partly" | "didnt_land"> = { 1: "worked", 2: "didnt_land", 3: "didnt_land" };
    expect(didntLandStreak(3, (d) => by[d] ?? null)).toBe(2);
  });
});

describe("D2 — Day-1 observation maps into the same adapt logic", () => {
  // Calm→worked→step further; Some pushback→mixed(partly)→tweak; Big fight→didnt_land→smaller.
  it("calm (worked) → step further", () => expect(planTomorrow("worked", 0).kind).toBe("worked"));
  it("some pushback (partly) → tweak", () => expect(planTomorrow("partly", 0).kind).toBe("partly"));
  it("big fight (didnt_land) → smaller", () => expect(planTomorrow("didnt_land", 0).kind).toBe("didnt_land"));
});

describe("A3 — validator: content rules", () => {
  it("accepts a clean step", () => expect(validateStep(GOOD, BASE, { week: 1 }).ok).toBe(true));
  it("rejects clinical/severity words", () => expect(validateStep({ ...GOOD, notice: "helps a severe disorder" }, BASE, { week: 1 }).ok).toBe(false));
  it("rejects price/selling", () => expect(validateStep({ ...GOOD, notice: "then upgrade for ₹2,999" }, BASE, { week: 1 }).ok).toBe(false));
  it("rejects an invented number", () => expect(validateStep({ ...GOOD, moment: "after 7 reminders" }, BASE, { week: 1 }).ok).toBe(false));
  it("rejects a leaked pattern name", () => expect(validateStep({ ...GOOD, title: "The Storm's first move" }, BASE, { week: 1 }).ok).toBe(false));
  it("rejects a cross-week reference", () => expect(validateStep({ ...GOOD, notice: "come back to this in week 3" }, BASE, { week: 1 }).ok).toBe(false));
  it("rejects minutes outside 1–5", () => expect(validateStep({ ...GOOD, minutes: 20 }, BASE, { week: 1 }).ok).toBe(false));
  it("rejects an empty opening", () => expect(validateStep({ ...GOOD, opening: "" }, BASE, { week: 1 }).ok).toBe(false));
  it("C: notice must not ask for longer than the step's minutes", () =>
    expect(validateStep({ ...GOOD, minutes: 2, notice: "wait a full 5 minutes before checking in" }, BASE, { week: 1 }).ok).toBe(false));
});

describe("A — exact words must be spoken TO the child (from the review's #5 / #6 / #10 / day-3)", () => {
  // #5 magnet two-in-a-row: a Coach nudge, a stage-direction/third-person line.
  it("#5: rejects a line that mentions the Coach", () =>
    expect(validateStep({ ...GOOD, exactWords: ["Two days in a row is worth a chat with your Coach first."] }, BASE, { week: 1 }).ok).toBe(false));
  it("#5: rejects a third-person observation ('if he keeps going, just watch')", () =>
    expect(validateStep({ ...GOOD, exactWords: ["If he keeps going, just watch."] }, BASE, { week: 1 }).ok).toBe(false));
  it("#5: rejects naming the child in the third person", () =>
    expect(validateStep({ ...GOOD, exactWords: ["Sit with Vivaan, then quietly move one step away."] }, BASE, { week: 1, childName: "Vivaan" }).ok).toBe(false));
  // #6 glue: a parenthetical stage direction + third person ('her').
  it("#6: rejects parentheses / stage directions", () =>
    expect(validateStep({ ...GOOD, exactWords: ["How's everyone doing today? (meaning her friends, not her tasks)"] }, BASE, { week: 1 }).ok).toBe(false));
  // day-3 didnt_land screenshot style: a 'watch whether…' observation smuggled into the spoken line.
  it("day-3: rejects a 'watch whether…' observation", () =>
    expect(validateStep({ ...GOOD, exactWords: ["Watch whether they settle without a prompt."] }, BASE, { week: 1 }).ok).toBe(false));
  it("spokenLineOk accepts a clean second-person line", () =>
    expect(spokenLineOk("You pick where we start — your choice.")).toBe(true));
});

describe("C — negotiate on limits (#10)", () => {
  it("rejects an unconditional 'ok, let's go with that' on a limit topic", () =>
    expect(validateStep({ ...GOOD, exactWords: ["How much time feels fair today?", "OK, let's go with that."] }, "screen time rules", { week: 1, limitTopic: true }).ok).toBe(false));
  it("rejects 'whatever you want' on a limit topic", () =>
    expect(validateStep({ ...GOOD, exactWords: ["Whatever you want for screen time is fine."] }, "screens", { week: 1, limitTopic: true }).ok).toBe(false));
  it("allows an honest negotiation line", () =>
    expect(validateStep({ ...GOOD, exactWords: ["How much feels fair? Let's see if we can meet in the middle."] }, "screens", { week: 1, limitTopic: true }).ok).toBe(true));
});

describe("1 — limit-topic detector only fires on an actual RULE", () => {
  it("screen-time negotiation IS a limit topic", () => {
    expect(isLimitTopic("screen time limits", "how much time feels fair to you today?")).toBe(true);
    expect(isLimitTopic("", "let them propose the screen rule")).toBe(true);
    expect(isLimitTopic("pocket money", "")).toBe(true);
  });
  it("homework-start / reminders / notepad / screen-OFF are NOT limit topics", () => {
    expect(isLimitTopic("starting homework", "offer a choice before homework")).toBe(false);
    expect(isLimitTopic("needing reminders", "keep a notepad next to the work")).toBe(false);
    expect(isLimitTopic("screen-off battles", "sit nearby without steering what they're doing")).toBe(false);
  });
});

describe("3 — the opening never mentions the Coach", () => {
  it("rejects a Coach mention in the opening", () =>
    expect(validateStep({ ...GOOD, opening: "Two hard days — talk to your Coach, then try this." }, BASE, { week: 1 }).ok).toBe(false));
  it("allows the Coach in the banner", () =>
    expect(validateStep({ ...GOOD, banner: "It may help to talk it through with your Coach." }, BASE, { week: 1 }).ok).toBe(true));
});

describe("C — a didnt_land adjust must be measurably smaller", () => {
  it("rejects >2 spoken lines after didnt_land", () =>
    expect(validateStep({ ...GOOD, exactWords: ["a", "b", "c"], minutes: 3 }, BASE, { week: 1, priorOutcome: "didnt_land" }).ok).toBe(false));
  it("rejects >3 minutes after didnt_land", () =>
    expect(validateStep({ ...GOOD, minutes: 5 }, BASE, { week: 1, priorOutcome: "didnt_land" }).ok).toBe(false));
  it("accepts a small step after didnt_land", () =>
    expect(validateStep({ ...GOOD, exactWords: ["You choose the first one."], minutes: 2 }, BASE, { week: 1, priorOutcome: "didnt_land" }).ok).toBe(true));
});

describe("quote normalization (#11) — never double-wrap", () => {
  it("strips surrounding quotes from each spoken line", () => {
    expect(normalizeExactWords(['“You pick where to start.”', '"Your call."'])).toEqual(["You pick where to start.", "Your call."]);
  });
});

describe("fallback — valid, non-empty, smaller after didnt_land", () => {
  it("passes the validator and has an opening", () => {
    const base = 'Offer the choice. Say: "You pick where to start." Watch what happens.';
    const step = fallbackStep("Offer the first choice", base, "partly");
    expect(step.opening).toBeTruthy();
    expect(validateStep(step, base, { week: 1 }).ok).toBe(true);
  });
  it("after didnt_land: ≤1 line and ≤3 minutes, passes the smaller-check", () => {
    const base = 'Offer the choice. Say: "You pick where to start." And say: "Your call, go for it." Watch what happens.';
    const step = fallbackStep("Offer the first choice", base, "didnt_land");
    expect(step.exactWords.length).toBeLessThanOrEqual(1);
    expect(step.minutes).toBeLessThanOrEqual(3);
    expect(validateStep(step, base, { week: 1, priorOutcome: "didnt_land" }).ok).toBe(true);
  });
  it("drops base quotes that aren't clean spoken lines", () => {
    const base = 'Say: "Watch whether he settles." Then: "You decide how to start."';
    const step = fallbackStep("x", base, "partly");
    expect(step.exactWords.every((w) => spokenLineOk(w))).toBe(true);
  });
  it("does NOT mistake apostrophes for quotes (no garbage from \"Reyansh's gaming…\")", () => {
    const base = "Notice what you do during Reyansh's gaming that you're tempted to do, and don't.";
    const step = fallbackStep("Same move", base, "worked");
    expect(step.exactWords.join(" ")).not.toContain("gaming that you");
    expect(validateStep(step, base, { week: 2 }).ok).toBe(true);
  });
});

describe("A2 — generate: validate → retry → fallback", () => {
  it("good first attempt → source llm, no retry", async () => {
    const r = await generateAdjustedStep(genInput("worked"), modelReturning(GOOD));
    expect(r.source).toBe("llm"); expect(r.retryUsed).toBe(false); expect(r.step.opening).toBeTruthy();
  });
  it("bad then good → one retry", async () => {
    const r = await generateAdjustedStep(genInput("partly"), modelReturning({ ...GOOD, notice: "severe disorder" }, GOOD));
    expect(r.retryUsed).toBe(true); expect(r.source).toBe("llm");
  });
  it("always bad → fallback", async () => {
    const r = await generateAdjustedStep(genInput("didnt_land"), modelReturning({ ...GOOD, exactWords: ["watch whether he settles"] }, { ...GOOD, exactWords: ["watch whether he settles"] }));
    expect(r.source).toBe("fallback"); expect(r.validatorOk).toBe(false); expect(r.step.exactWords.length).toBeGreaterThan(0);
  });
});

describe("resolve + trial helpers", () => {
  it("a Coach override always beats an auto-adjust", () => {
    expect(preferCoachRow([{ origin: "auto" as const, t: "a" }, { origin: "coach" as const, t: "c" }])?.t).toBe("c");
  });
  it("nextPlanDay walks week then ends", () => {
    expect(nextPlanDay(1, 1)).toEqual({ week: 1, day: 2 });
    expect(nextPlanDay(6, 5)).toBeNull();
  });
  it("trialNextDay over the 4-day quick start", () => {
    expect(trialNextDay(1)).toBe(2); expect(trialNextDay(4)).toBeNull();
  });
  it("patternPlain is name-free and filled", () => {
    const p = patternPlain("storm", "boy");
    expect(p).not.toMatch(/\{|storm/i); expect(p.toLowerCase()).toContain("he");
  });
});

describe("A4 — adjust_next_step gating (paid + REAL trial, not preview)", () => {
  it("refused for a PREVIEW trial", async () => {
    const r = await runCoachTool(
      { kind: "trial", subjectId: "t1", assessmentId: null, week: 1, day: 1, archetype: "storm", ageBand: "10-11", childName: "Aarav", childGender: "boy", isPreview: true },
      "adjust_next_step", { reason: "smaller start", step_patch: {} });
    expect(r.ok).toBe(false); expect(r.detail).toMatch(/preview/i);
  });
  it("refused when the reason is missing", async () => {
    const r = await runCoachTool(
      { kind: "paid", subjectId: "u1", assessmentId: null, week: 1, day: 1, archetype: "storm", ageBand: "10-11", childName: "Aarav", childGender: "boy" },
      "adjust_next_step", { reason: "", step_patch: {} });
    expect(r.ok).toBe(false);
  });
  it("refused when child context is missing", async () => {
    const r = await runCoachTool(
      { kind: "paid", subjectId: "u1", assessmentId: null, week: 1, day: 1 },
      "adjust_next_step", { reason: "x", step_patch: {} });
    expect(r.ok).toBe(false); expect(r.detail).toMatch(/context/i);
  });
});

function genInput(outcome: "worked" | "partly" | "didnt_land") {
  return {
    childName: "Aarav", ageBand: "10-11", pronoun: "he/him/his", patternPlain: "Full of energy. Pulled toward screens.",
    worryLabel: "starting homework", week: 1, day: 3, baseTitle: "Offer the first choice",
    baseText: BASE, priorOutcome: outcome, priorNote: null, directive: planTomorrow(outcome, 1).directive,
  };
}
