import { describe, it, expect } from "vitest";
import { validateScript, type ValidateCtx } from "@/lib/call-script/validate";
import { fallbackScript, type GenerateInput } from "@/lib/call-script/generate";
import type { CallScript } from "@/lib/call-script/types";

const base = (over: Partial<CallScript> = {}): CallScript => ({
  kind: "followup", lang: "en", callNo: 3,
  header: { caller: "Shaily", parent: "Asha", child: "Aarav", ageBand: "10-11", worry: "homework", builtFrom: [] },
  leftOff: "Where you left off (call 2, 16 Oct): interested.",
  opener: "Hi Asha, this is Shaily. Last time we spoke about Aarav.",
  sections: [{ title: "Check the step", lines: ["Did Aarav get a chance to try it?"] }],
  objections: [{ label: "Price", answer: "The plan is ₹2,999 one-time, with a 7-day full refund." }],
  ...over,
});
const ctx = (over: Partial<ValidateCtx> = {}): ValidateCtx => ({ callNo: 3, trialEligible: true, callerGender: "f", childNames: ["Aarav"], ...over });
const gi = (over: Partial<GenerateInput> = {}): GenerateInput => ({
  kind: "first", lang: "en", callNo: 1, caller: "Shaily", callerGender: "f", parent: "Asha", child: "Aarav",
  ageBand: "10-11", worry: "homework", archetype: "The All-In Kid", assessedDaysAgo: 1,
  report: { patternLine: "Aarav focuses best when he has a say.", strength: "Goes deep", stuck: "Starting homework", pull: "Screens", todayToward: [["Battle to start", "One calm cue"]], tonightStep: "Offer a choice", tonightTap: null }, answersSummary: "", trialEligible: true, ...over,
});

describe("call-script validator", () => {
  it("baseline valid script passes", () => {
    expect(validateScript(base(), ctx()).ok).toBe(true);
  });
  it("1. wrong call number is caught", () => {
    const v = validateScript(base({ leftOff: "Where you left off (call 1, 16 Oct): interested." }), ctx());
    expect(v.fails.join()).toMatch(/wrong call number/);
  });
  it("2. invented ₹ amount is caught", () => {
    const v = validateScript(base({ objections: [{ label: "Price", answer: "It's just ₹1,500 today." }] }), ctx());
    expect(v.fails.join()).toMatch(/unapproved ₹/);
  });
  it("3. another family's child name is caught", () => {
    const v = validateScript(base({ opener: "Hi Asha, this is Shaily, calling about Aarav and Rohan." }), ctx({ banNames: ["Rohan"] }));
    expect(v.fails.join()).toMatch(/another family/);
  });
  it("4. trial mentioned when ineligible is caught", () => {
    const v = validateScript(base({ sections: [{ title: "Next", lines: ["I can send a free 4-day trial."] }] }), ctx({ trialEligible: false }));
    expect(v.fails.join()).toMatch(/trial mentioned when ineligible/);
  });
  it("5. wrong-gender Hinglish verb is caught", () => {
    const v = validateScript(base({ lang: "hinglish", opener: "Namaste Asha, main Shaily baat kar raha hoon, Aarav ke baare mein." }), ctx({ callerGender: "f" }));
    expect(v.fails.join()).toMatch(/wrong-gender verb/);
  });
  it("6. Hinglish clinical word is caught", () => {
    const v = validateScript(base({ lang: "hinglish", sections: [{ title: "x", lines: ["Aarav ko mental problem lagta hai, Aarav."] }] }), ctx());
    expect(v.fails.join()).toMatch(/clinical/);
  });
  it("7. multi-child: naming any real child passes", () => {
    const v = validateScript(base({ opener: "Hi Asha, this is Shaily, about Diya today." }), ctx({ childNames: ["Aarav", "Diya"] }));
    expect(v.ok).toBe(true);
  });
  it("8. trial-ineligible with NO trial mention passes", () => {
    expect(validateScript(base(), ctx({ trialEligible: false })).ok).toBe(true);
  });
  it("9. old vs fresh lead: fallback opener acknowledges delay only when old", () => {
    const old = fallbackScript(gi({ assessedDaysAgo: 10 }));
    const fresh = fallbackScript(gi({ assessedDaysAgo: 1 }));
    expect(old.opener.toLowerCase()).toMatch(/only calling now|sorry/);
    expect(fresh.opener.toLowerCase()).not.toMatch(/only calling now/);
  });
});
