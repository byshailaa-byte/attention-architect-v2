import { describe, it, expect } from "vitest";
import { planTomorrow, didntLandStreak } from "@/lib/plan-adjust/tomorrow";
import { validateStep } from "@/lib/plan-adjust/validate";
import { fallbackStep } from "@/lib/plan-adjust/fallback";
import { generateAdjustedStep, type ModelCall } from "@/lib/plan-adjust/generate";
import { preferCoachRow, nextPlanDay, patternPlain } from "@/lib/plan-adjust/resolve";
import { runCoachTool } from "@/lib/coach/tools";
import type { AdjustedStep } from "@/lib/plan-adjust/types";

const GOOD: AdjustedStep = {
  title: "Offer the first choice",
  moment: "when homework starts",
  exactWords: ["You decide where we start — I'll follow your lead."],
  notice: "Watch whether getting started feels a little easier than usual.",
  minutes: 5,
};
const BASE = "Offer the choice today. Let them pick where to start. Watch what happens.";

// Build a ModelCall that returns a fixed sequence of steps (one per attempt).
function modelReturning(...steps: (AdjustedStep | null)[]): ModelCall {
  let i = 0;
  return async () => ({ step: steps[Math.min(i++, steps.length - 1)], inputTokens: 100, outputTokens: 40, model: "test-model" });
}

describe("A1 — outcome → tomorrow", () => {
  it("worked → step further, same moment/skill", () => {
    const t = planTomorrow("worked", 1);
    expect(t.kind).toBe("worked");
    expect(t.directive).toMatch(/one small step further/i);
    expect(t.showCoachLine).toBe(false);
  });
  it("partly → one concrete tweak", () => {
    const t = planTomorrow("partly", 1);
    expect(t.directive).toMatch(/one concrete tweak/i);
    expect(t.showCoachLine).toBe(false);
  });
  it("didnt_land → smaller version / better moment", () => {
    const t = planTomorrow("didnt_land", 1);
    expect(t.directive).toMatch(/smaller version/i);
    expect(t.showCoachLine).toBe(false);
  });
  it("two didnt_land in a row → also suggest the Coach, at the top", () => {
    const t = planTomorrow("didnt_land", 2);
    expect(t.showCoachLine).toBe(true);
    expect(t.directive).toMatch(/talk it through with their Coach/i);
    expect(t.adjustedForYou).toMatch(/Coach/);
  });
  it("no prior outcome → base (no adjustment)", () => {
    expect(planTomorrow(null, 0).kind).toBe("base");
  });
  it("didntLandStreak walks back consecutive didnt_land only", () => {
    const by: Record<number, "worked" | "partly" | "didnt_land"> = { 1: "worked", 2: "didnt_land", 3: "didnt_land" };
    expect(didntLandStreak(3, (d) => by[d] ?? null)).toBe(2);
    expect(didntLandStreak(1, (d) => by[d] ?? null)).toBe(0);
  });
});

describe("A3 — deterministic validator", () => {
  it("accepts a clean step", () => {
    expect(validateStep(GOOD, BASE, { week: 1 }).ok).toBe(true);
  });
  it("rejects clinical/severity words", () => {
    const r = validateStep({ ...GOOD, notice: "This helps a severe attention disorder." }, BASE, { week: 1 });
    expect(r.ok).toBe(false);
    expect(r.issues.join(" ")).toMatch(/banned/i);
  });
  it("rejects price/selling language", () => {
    expect(validateStep({ ...GOOD, notice: "Then upgrade for ₹2,999." }, BASE, { week: 1 }).ok).toBe(false);
  });
  it("rejects an invented number not in the base", () => {
    const r = validateStep({ ...GOOD, moment: "after 7 reminders" }, BASE, { week: 1 });
    expect(r.ok).toBe(false);
    expect(r.issues.join(" ")).toMatch(/invented number/i);
  });
  it("rejects a missing exact-words line", () => {
    expect(validateStep({ ...GOOD, exactWords: [] }, BASE, { week: 1 }).ok).toBe(false);
  });
  it("rejects a leaked pattern name", () => {
    expect(validateStep({ ...GOOD, title: "The Storm's first move" }, BASE, { week: 1 }).ok).toBe(false);
  });
  it("rejects a cross-week reference", () => {
    expect(validateStep({ ...GOOD, notice: "Come back to this in week 3." }, BASE, { week: 1 }).ok).toBe(false);
  });
  it("rejects minutes outside 1–5", () => {
    expect(validateStep({ ...GOOD, minutes: 20 }, BASE, { week: 1 }).ok).toBe(false);
  });
});

describe("fallback — always a valid, non-empty step from the base", () => {
  it("passes the validator and extracts the base's quoted words", () => {
    const base = 'Offer the choice. Say: "You pick where to start." Watch what happens.';
    const step = fallbackStep("Offer the first choice", base);
    expect(step.exactWords[0]).toMatch(/You pick where to start/);
    expect(validateStep(step, base, { week: 1 }).ok).toBe(true);
  });
  it("still produces a usable step when the base has no quotes", () => {
    const step = fallbackStep("Try a calm start", "Just begin together today and see how it goes.");
    expect(step.exactWords.length).toBeGreaterThan(0);
    expect(validateStep(step, "Just begin together today and see how it goes.", { week: 1 }).ok).toBe(true);
  });
});

describe("A2 — generate: validate → retry → fallback", () => {
  it("good first attempt → source llm, no retry", async () => {
    const r = await generateAdjustedStep(genInput("worked"), modelReturning(GOOD));
    expect(r.source).toBe("llm");
    expect(r.validatorOk).toBe(true);
    expect(r.retryUsed).toBe(false);
    expect(r.costPaise).toBeGreaterThan(0);
  });
  it("bad then good → one retry, source llm", async () => {
    const bad = { ...GOOD, notice: "helps a severe disorder" };
    const r = await generateAdjustedStep(genInput("partly"), modelReturning(bad, GOOD));
    expect(r.retryUsed).toBe(true);
    expect(r.source).toBe("llm");
    expect(r.validatorOk).toBe(true);
  });
  it("always bad → deterministic fallback, validatorOk false", async () => {
    const bad = { ...GOOD, title: "The Storm move", notice: "severe disorder" };
    const r = await generateAdjustedStep(genInput("didnt_land"), modelReturning(bad, bad));
    expect(r.source).toBe("fallback");
    expect(r.validatorOk).toBe(false);
    expect(r.retryUsed).toBe(true);
    expect(r.step.exactWords.length).toBeGreaterThan(0); // never an empty day
  });
  it("model emits nothing → fallback", async () => {
    const r = await generateAdjustedStep(genInput("worked"), modelReturning(null, null));
    expect(r.source).toBe("fallback");
  });
});

describe("resolve helpers", () => {
  it("a Coach override always beats an auto-adjust", () => {
    const auto = { origin: "auto" as const, tag: "auto" };
    const coach = { origin: "coach" as const, tag: "coach" };
    expect(preferCoachRow([auto, coach])?.tag).toBe("coach");
    expect(preferCoachRow([coach, auto])?.tag).toBe("coach");
    expect(preferCoachRow([auto])?.tag).toBe("auto");
    expect(preferCoachRow([])).toBeNull();
  });
  it("nextPlanDay walks within the week, then to the next week, then ends", () => {
    expect(nextPlanDay(1, 1)).toEqual({ week: 1, day: 2 });
    expect(nextPlanDay(1, 5)).toEqual({ week: 2, day: 1 });
    expect(nextPlanDay(6, 5)).toBeNull();
  });
  it("patternPlain is name-free, fully filled, never a label", () => {
    const p = patternPlain("storm", "boy");
    expect(p).not.toMatch(/\{[^}]*\}/);
    expect(p).not.toMatch(/storm/i);
    expect(p.toLowerCase()).toContain("he");
  });
});

describe("A4 — adjust_next_step tool gating (trial users included)", () => {
  it("is refused for a trial parent (adjustable plan is paid-only)", async () => {
    const rec = await runCoachTool(
      { kind: "trial", subjectId: "t1", assessmentId: null, week: 1, day: 1, archetype: "storm", ageBand: "10-11", childName: "Aarav", childGender: "boy" },
      "adjust_next_step",
      { reason: "smaller start", step_patch: {} },
    );
    expect(rec.ok).toBe(false);
    expect(rec.detail).toMatch(/full plan/i);
  });
  it("is refused when the reason is missing", async () => {
    const rec = await runCoachTool(
      { kind: "paid", subjectId: "u1", assessmentId: null, week: 1, day: 1, archetype: "storm", ageBand: "10-11", childName: "Aarav", childGender: "boy" },
      "adjust_next_step",
      { reason: "", step_patch: {} },
    );
    expect(rec.ok).toBe(false);
  });
});

function genInput(outcome: "worked" | "partly" | "didnt_land") {
  return {
    childName: "Aarav", ageBand: "10-11", patternPlain: "Full of energy. Pulled toward screens.",
    worryLabel: "starting homework", week: 1, day: 2, baseTitle: "Offer the first choice",
    baseText: BASE, priorOutcome: outcome, priorNote: null, directive: planTomorrow(outcome, 1).directive,
  };
}
