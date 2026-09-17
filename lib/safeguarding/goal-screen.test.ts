import { describe, it, expect } from "vitest";
import { screenGoalText, type SafeguardingReason } from "./goal-screen";

const REASONS: SafeguardingReason[] = ["self_harm", "harm_by_others", "crisis", "not_eating"];

describe("screenGoalText — flags each category", () => {
  const triggers: { text: string; reason: SafeguardingReason }[] = [
    { text: "He keeps saying he wants to hurt himself", reason: "self_harm" },
    { text: "I think he might be suicidal", reason: "self_harm" },
    { text: "She told me she wants to die", reason: "self_harm" },
    { text: "His older brother hits him every day", reason: "harm_by_others" },
    { text: "I think someone at school is abusing him", reason: "harm_by_others" },
    { text: "He says there is no point going on", reason: "crisis" },
    { text: "He said he would be better off dead", reason: "crisis" },
    { text: "He has stopped eating properly", reason: "not_eating" },
    { text: "He hasn't eaten in two days", reason: "not_eating" },
  ];
  for (const { text, reason } of triggers) {
    it(`flags "${text}" as ${reason}`, () => {
      const r = screenGoalText(text);
      expect(r.flagged).toBe(true);
      if (r.flagged) expect(r.reason).toBe(reason);
    });
  }
});

describe("screenGoalText — returns a category, never the phrase", () => {
  it("result carries only flagged + reason, never matched text", () => {
    const r = screenGoalText("he wants to die");
    expect(r).toEqual({ flagged: true, reason: "self_harm" });
    // the input phrase must not travel out of the function
    expect(JSON.stringify(r)).not.toContain("die");
    expect(JSON.stringify(r)).not.toContain("wants");
  });
  it("reason is always one of the known categories", () => {
    const r = screenGoalText("he is suicidal");
    if (r.flagged) expect(REASONS).toContain(r.reason);
  });
});

describe("screenGoalText — case-insensitive & whitespace-tolerant", () => {
  it("matches uppercase", () => {
    expect(screenGoalText("HE IS SUICIDAL").flagged).toBe(true);
  });
  it("matches across collapsed whitespace and newlines", () => {
    expect(screenGoalText("he   wants\n  to    die").flagged).toBe(true);
  });
  it("tolerates leading/trailing whitespace", () => {
    expect(screenGoalText("   he stopped eating   ").flagged).toBe(true);
  });
});

describe("screenGoalText — clean, empty, null (never throws)", () => {
  it("clean goal text is not flagged", () => {
    expect(screenGoalText("I want him to start his homework without being asked twice")).toEqual({ flagged: false });
    expect(screenGoalText("He is killing it at football this season")).toEqual({ flagged: false });
  });
  it("empty string → not flagged", () => {
    expect(screenGoalText("")).toEqual({ flagged: false });
  });
  it("whitespace-only → not flagged", () => {
    expect(screenGoalText("   \n\t ")).toEqual({ flagged: false });
  });
  it("null → not flagged", () => {
    expect(screenGoalText(null)).toEqual({ flagged: false });
  });
  it("undefined → not flagged", () => {
    expect(screenGoalText(undefined)).toEqual({ flagged: false });
  });
  it("unparseable / non-string → not flagged, never throws", () => {
    expect(() => screenGoalText(123 as unknown as string)).not.toThrow();
    expect(screenGoalText(123 as unknown as string)).toEqual({ flagged: false });
    expect(screenGoalText({} as unknown as string)).toEqual({ flagged: false });
  });
});

// ── KNOWN OVER-FIRES (documented, not bugs) ───────────────────────────────────
// The placeholder screen deliberately errs toward over-firing. Each case below
// is a trigger word in an innocuous context that the current patterns flag. We
// assert the CURRENT behaviour (flagged, with reason) rather than the desired
// behaviour (not flagged), so the suite stays green while the trade-off lives in
// the file, not in review notes.
//
// These are NOT to be "fixed" by narrowing the wordlist. Tightening any of them
// also introduces misses (e.g. distinguishing "hurt himself on the trampoline"
// from "hurt himself" needs context a keyword screen doesn't have). Whether each
// stays a flag is a CLINICAL-REVIEW decision, recorded here for that review.
describe("screenGoalText — known over-fires (flagged for clinical review)", () => {
  const overFires: { text: string; reason: SafeguardingReason; note: string }[] = [
    { text: "He is not eating his vegetables again", reason: "not_eating",
      note: "fussy eating reads identically to concerning under-eating at the keyword level" },
    { text: "He won't eat until he has finished his game", reason: "not_eating",
      note: "conditional/temporary refusal, not a food-intake concern" },
    { text: "The loud assembly hall really hurts him", reason: "harm_by_others",
      note: "'hurts him' about sensory discomfort, no third party causing harm" },
    { text: "I'm worried he'll hurt himself on the trampoline", reason: "self_harm",
      note: "accidental physical risk, not self-harm intent — needs context to separate" },
    { text: "He abuses his screen-time privileges", reason: "harm_by_others",
      note: "colloquial 'abuse' of a privilege, not child abuse" },
    { text: "We can't go on having the same homework fight every night", reason: "crisis",
      note: "parent venting about routine, not a crisis statement" },
  ];
  for (const { text, reason, note } of overFires) {
    // Asserts the over-fire is still happening. If a future wordlist change stops
    // flagging this, that's a signal to revisit — hence the assertion, not a skip.
    it(`over-fires as ${reason} — ${note}: "${text}"`, () => {
      expect(screenGoalText(text)).toEqual({ flagged: true, reason });
    });
  }
});
