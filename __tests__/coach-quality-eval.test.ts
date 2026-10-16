import { describe, it, expect } from "vitest";
import { CONVERSATIONS, scoreCheck, parentMConvo } from "@/lib/lms/coach/conversation-evals";
import { buildSystemPrompt, coachPronoun } from "@/lib/lms/coach/prompt";
import { behaviourRules } from "@/lib/lms/coach/behaviour";

// Deterministic checks for the conversation eval set + scorers (no network). The live LLM run lives
// in scripts/coach-quality-eval.mts (gated by COACH_EVAL_LIVE).

describe("coach-quality conversation eval set", () => {
  it("has at least 10 conversations incl. the anonymised Parent M case", () => {
    expect(CONVERSATIONS.length).toBeGreaterThanOrEqual(10);
    const pm = parentMConvo();
    expect(pm).toBeTruthy();
    // Parent M covers: missed, didn't get it, it didn't work, unable to comprehend.
    const joined = pm.turns.map((t) => t.parent.toLowerCase()).join(" | ");
    expect(joined).toMatch(/missed/);
    expect(joined).toMatch(/didn'?t really get|didn'?t get/);
    expect(joined).toMatch(/didn'?t work/);
    expect(joined).toMatch(/comprehend/);
    // And the right checks are asserted on it.
    const checks = new Set(pm.turns.flatMap((t) => t.expect));
    expect(checks.has("checkin_first")).toBe(true);
    expect(checks.has("concrete_scene")).toBe(true);
    expect(checks.has("offer_call")).toBe(true);
  });

  it("no real names leak into the eval set (anonymised fixtures only)", () => {
    const all = JSON.stringify(CONVERSATIONS).toLowerCase();
    expect(all).not.toContain("parent m's"); // the anonymised label only, never a real name
  });
});

describe("scoreCheck — scorers behave", () => {
  const ctx = { child: "Uma" };

  it("checkin_first: passes when it asks what happened with no new technique; fails when it dumps a technique", () => {
    expect(scoreCheck("checkin_first", "Did you get to try it? What happened?", ctx).pass).toBe(true);
    expect(scoreCheck("checkin_first", 'Try this tonight: say "Uma, you pick where to start." It helps her begin.', ctx).pass).toBe(false);
  });

  it("concrete_scene: needs a concrete scene + the child's name + a re-ask", () => {
    expect(scoreCheck("concrete_scene", "Picture this evening: Uma sits down and stalls. Which part is still unclear?", ctx).pass).toBe(true);
    expect(scoreCheck("concrete_scene", "Let me rephrase that more clearly in the abstract.", ctx).pass).toBe(false);
  });

  it("offer_call: passes only when a call is offered", () => {
    expect(scoreCheck("offer_call", "Let's hop on a quick call with our team to walk through it.", ctx).pass).toBe(true);
    expect(scoreCheck("offer_call", "Okay, let me explain it one more time.", ctx).pass).toBe(false);
  });

  it("five_part: needs a quoted sentence, a make-sense check, and a tomorrow check-in", () => {
    const good = 'Tonight before homework, say "Uma, you pick where to start." It helps her begin on her own. You might see her hesitate, then choose. Does that make sense, or is any part unclear? I\'ll ask how it went tomorrow.';
    expect(scoreCheck("five_part", good, { child: "Uma", stepDelivery: true }).pass).toBe(true);
    expect(scoreCheck("five_part", "Just offer her a choice tonight.", { child: "Uma", stepDelivery: true }).pass).toBe(false);
  });

  it("no_banned: catches the new metaphor bans", () => {
    expect(scoreCheck("no_banned", "This helps the habit anchor over time.", ctx).pass).toBe(false);
    expect(scoreCheck("no_banned", "Give her a real choice and step back.", ctx).pass).toBe(true);
  });

  it("length: enforces 90 normal / 160 step", () => {
    const words = (n: number) => Array.from({ length: n }, () => "word").join(" ");
    expect(scoreCheck("length", words(95), ctx).pass).toBe(false);
    expect(scoreCheck("length", words(95), { child: "Uma", stepDelivery: true }).pass).toBe(true);
  });
});

describe("behaviour block wiring", () => {
  it("buildSystemPrompt includes the behaviour rules by default and drops them when behaviour:false", () => {
    const vars = {
      parent: "there", child: "Uma", age_band: "10-11", archetype: "The Live Wire", week: 1,
      pronoun: coachPronoun("girl"), support_email: "t@e.in",
      archetype_description: "desc", day_title: "Step", day_body: "body", week_goal: "goal", hard_part: "hard",
      language: "en" as const,
    };
    expect(buildSystemPrompt(vars)).toContain("One step at a time");
    expect(buildSystemPrompt(vars)).toContain("Picture this evening");
    expect(buildSystemPrompt(vars, { behaviour: false })).not.toContain("One step at a time");
  });

  it("behaviourRules names the child and forbids the metaphors", () => {
    const b = behaviourRules("there", "Uma", "she");
    expect(b).toContain("Uma");
    expect(b).toMatch(/locks into|anchor|lean into/);
    expect(b).toContain("Picture this evening");
  });
});
