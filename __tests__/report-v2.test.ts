import { describe, it, expect } from "vitest";
import {
  canonicalConcern, goalForConcern, headlineForConcern, worryLabelFor, worryMomentFor, CONCERN_GOAL,
} from "@/lib/report-v2/goal-mapping";
import {
  selectEvidence, rankDimensions, type AnsweredQuestion, type DimScore,
} from "@/lib/report-v2/evidence";
import { validateGenerated, isLengthOnly, fieldsFromErrors } from "@/lib/report-v2/validator";
import { composeFallback } from "@/content/report-v2/fallbacks";
import type { ReportV2Generated } from "@/lib/report-v2/types";

const boy = "boy" as const;

describe("concern → goal mapping", () => {
  it("maps each canonical concern to its decided goal string", () => {
    expect(goalForConcern("homework", "Aarav", boy)).toBe("Aarav starts homework without a fight.");
    expect(goalForConcern("reminders", "Aarav", boy)).toBe("Aarav starts on his own, the first time.");
    expect(goalForConcern("screens", "Aarav", boy)).toBe("Screens off without a battle.");
    expect(goalForConcern("confidence", "Aarav", boy)).toBe("Aarav tries the hard thing before asking for help.");
    expect(goalForConcern("giveup", "Aarav", boy)).toBe("Aarav keeps going after the first try fails.");
    expect(goalForConcern("finish", "Aarav", boy)).toBe("Aarav finishes what he starts.");
    expect(goalForConcern("other", "Aarav", boy)).toBe("Aarav starts and finishes on his own.");
  });

  it("resolves legacy aliases to canonical concerns", () => {
    expect(canonicalConcern("focus")).toBe("reminders");
    expect(canonicalConcern("attention")).toBe("reminders");
    expect(canonicalConcern("motivation")).toBe("giveup");
    expect(canonicalConcern("potential")).toBe("confidence");
    expect(canonicalConcern("school")).toBe("homework");
    expect(canonicalConcern("emotions")).toBe("other");
  });

  it("falls back to 'other' for unknown/empty concerns", () => {
    expect(canonicalConcern(undefined)).toBe("other");
    expect(canonicalConcern("")).toBe("other");
    expect(canonicalConcern("banana")).toBe("other");
  });

  it("fills pronoun tokens by gender", () => {
    expect(goalForConcern("reminders", "Mia", "girl")).toBe("Mia starts on her own, the first time.");
    expect(headlineForConcern("reminders", "Mia", "girl")).toBe("Mia needs reminders for almost everything.");
    expect(worryLabelFor("giveup")).toBe("giving up");
  });

  it("every canonical concern has a goal", () => {
    for (const key of ["homework","reminders","screens","confidence","giveup","finish","other"]) {
      expect(CONCERN_GOAL[key]).toBeTruthy();
    }
  });

  it("maps each worry to its moment (incl. legacy aliases)", () => {
    expect(worryMomentFor("reminders")).toBe("the moment of starting");
    expect(worryMomentFor("screens")).toBe("the screen-off moment");
    expect(worryMomentFor("confidence")).toBe("the moment something feels hard");
    expect(worryMomentFor("giveup")).toBe("the moment after the first failure");
    expect(worryMomentFor("finish")).toBe("the moment the child is about to stop early");
    expect(worryMomentFor("focus")).toBe("the moment of starting"); // alias → reminders
    expect(worryMomentFor(undefined)).toBe("the start of any daily task"); // → other
  });
});

describe("deterministic evidence selection", () => {
  const answered: AnsweredQuestion[] = [
    { id: "G1", dimension: "attention_shape", label: "Going deep into one thing" },
    { id: "G2", dimension: "attention_competition", label: "A new idea popping into their head" },
    { id: "D2.1", dimension: "reward_driver", label: "Figuring out something really hard" },
    { id: "D3.1", dimension: "friction_response", label: "They push through it" },
    { id: "D6.1", dimension: "recharge_type", label: "Quiet and low stimulation" },
  ];
  const dims: DimScore[] = [
    { dimension: "reward_driver", winning_votes: 3 },
    { dimension: "attention_shape", winning_votes: 2 },
    { dimension: "friction_response", winning_votes: 2 },
    { dimension: "attention_competition", winning_votes: 1 },
    { dimension: "recharge_type", winning_votes: 1 },
  ];

  it("ranks dimensions by winning_votes desc, tie-broken by name", () => {
    expect(rankDimensions(dims)).toEqual([
      "reward_driver", "attention_shape", "friction_response", "attention_competition", "recharge_type",
    ]);
  });

  it("picks the top-3 driving dimensions' answers, verbatim and in rank order", () => {
    const ev = selectEvidence(answered, rankDimensions(dims), "Aarav", boy);
    expect(ev.map((e) => e.quote)).toEqual([
      "Figuring out something really hard", // reward_driver (3)
      "Going deep into one thing",          // attention_shape (2)
      "They push through it",               // friction_response (2, tie-broken by name)
    ]);
  });

  it("is fully deterministic — same inputs, same output", () => {
    const a = selectEvidence(answered, rankDimensions(dims), "Aarav", boy);
    const b = selectEvidence(answered, rankDimensions(dims), "Aarav", boy);
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
  });

  it("backfills in sequence order when fewer than 3 distinct dimensions answered", () => {
    const few: AnsweredQuestion[] = [
      { id: "G1", dimension: "attention_shape", label: "deep" },
      { id: "D1.2", dimension: "attention_shape", label: "lose track" },
      { id: "D2.1", dimension: "reward_driver", label: "mastery" },
    ];
    const ev = selectEvidence(few, ["attention_shape", "reward_driver"], "Aarav", boy);
    expect(ev.map((e) => e.quote)).toEqual(["deep", "mastery", "lose track"]);
  });

  it("fills {Name} into the lead-in", () => {
    const ev = selectEvidence(answered, rankDimensions(dims), "Aarav", boy);
    expect(ev[0].leadIn).toContain("Aarav");
  });
});

describe("validator", () => {
  const ok: ReportV2Generated = composeFallback("The Inventor", "reminders", "Aarav", boy);

  it("accepts clean fallback copy", () => {
    const v = validateGenerated(ok);
    expect(v.errors).toEqual([]);
    expect(v.ok).toBe(true);
  });

  it("rejects hedging words", () => {
    const bad = { ...ok, shortGood: "Aarav might start on his own." };
    const v = validateGenerated(bad);
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("hedge"))).toBe(true);
  });

  it("rejects clinical claims", () => {
    const bad = { ...ok, shortWhy: "This looks like a focus disorder." };
    const v = validateGenerated(bad);
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("clinical"))).toBe(true);
  });

  it("rejects parent-blame", () => {
    const bad = { ...ok, shortFix: "You always step in too fast." };
    const v = validateGenerated(bad);
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("parent-blame"))).toBe(true);
  });

  it("rejects a sentence over 16 words", () => {
    const long = "This is a long sentence that keeps going on and on and clearly goes well over sixteen words.";
    const bad = { ...ok, whyParas: [long, ok.whyParas[1]] as [string, string] };
    const v = validateGenerated(bad);
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("16 words"))).toBe(true);
  });

  it("rejects a field over its length cap", () => {
    const bad = { ...ok, shortWhy: "x".repeat(200) };
    const v = validateGenerated(bad);
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("over 90 chars"))).toBe(true);
  });

  it("rejects jargon words (system/brain/dopamine/re-entry/regulate/off-ramp)", () => {
    for (const w of ["This is how the system works.", "It is a brain thing.", "A dopamine hit.", "The re-entry is hard.", "Helps them regulate.", "Give a clear off-ramp."]) {
      const v = validateGenerated({ ...ok, whyParas: [w, ok.whyParas[1]] as [string, string] });
      expect(v.ok, w).toBe(false);
      expect(v.errors.some((e) => e.includes("jargon"))).toBe(true);
    }
  });

  it("rejects abstract nouns (method/ownership/process/transition/thread/approach/autonomy/structure/engagement/belongs)", () => {
    for (const w of ["Protect his method here.", "It builds ownership.", "Trust the process.", "Ease the transition.", "He lost the thread.", "Change the approach.", "It grows autonomy.", "Add some structure.", "Boost his engagement.", "It belongs to him."]) {
      const v = validateGenerated({ ...ok, whyParas: [w, ok.whyParas[1]] as [string, string] });
      expect(v.ok, w).toBe(false);
      expect(v.errors.some((e) => e.includes("abstract"))).toBe(true);
    }
  });

  it("rejects 'upstairs' (assumes a house)", () => {
    const v = validateGenerated({ ...ok, whyParas: ["Send him to work alone.", "Then leave him upstairs."] as [string, string] });
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("upstairs"))).toBe(true);
  });

  it("rejects attributing the answers to the child, not the parent", () => {
    const he = validateGenerated({ ...ok, whyParas: ["He told us he hates it.", ok.whyParas[1]] as [string, string] });
    expect(he.ok).toBe(false);
    expect(he.errors.some((e) => e.includes("child-attribution"))).toBe(true);
    const named = validateGenerated({ ...ok, whyParas: ["Aarav told you he waits.", ok.whyParas[1]] as [string, string] }, { childName: "Aarav" });
    expect(named.ok).toBe(false);
    expect(named.errors.some((e) => e.includes("child-attribution"))).toBe(true);
  });

  it("rejects a whyParas paragraph below Flesch 70", () => {
    const dense = "Subsequently the aforementioned complications necessitated considerable administrative reconsideration overnight.";
    const v = validateGenerated({ ...ok, whyParas: [dense, ok.whyParas[1]] as [string, string] });
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("Flesch"))).toBe(true);
  });

  it("rejects a tonight step with more than 2 sentences", () => {
    const bad = { ...ok, tonight: ["Do this. Then that. And also this.", ok.tonight[1], ok.tonight[2]] as [string, string, string] };
    const v = validateGenerated(bad);
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("more than 2 sentences"))).toBe(true);
  });

  it("rejects comparative claims about other children", () => {
    for (const w of ["That focus is rare.", "Most kids do this.", "Most children do this.", "Unlike other children, he waits.", "Few children can do it."]) {
      const v = validateGenerated({ ...ok, shortGood: "x", whyParas: [w, ok.whyParas[1]] as [string, string] });
      expect(v.ok, w).toBe(false);
      expect(v.errors.some((e) => e.includes("comparative"))).toBe(true);
    }
  });

  it("rejects a switch line that is not a quoted parent line", () => {
    const bad = { ...ok, switch: { ...ok.switch, instead: ok.switch.instead.replace(/[“”"]/g, "") } };
    const v = validateGenerated(bad);
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("quoted line a parent says"))).toBe(true);
  });

  it("accepts a properly quoted switch line", () => {
    const good = { ...ok, switch: { instead: "“Do it now.”", try: "“Your call — how do you start?”", after: ok.switch.after } };
    const v = validateGenerated(good);
    expect(v.errors.filter((e) => e.includes("quoted"))).toEqual([]);
  });

  it("classifies length-only errors (for the cheap repair path) vs content errors", () => {
    expect(isLengthOnly(["whyParas[0]: sentence over 16 words", "tonight[1]: over 120 chars (140)"])).toBe(true);
    expect(isLengthOnly(["whyParas[0]: Flesch 55 < 70"])).toBe(true);
    expect(isLengthOnly(["shortWhy: abstract (method)"])).toBe(false); // needs a full rewrite
    expect(isLengthOnly(["switch.try: must be a quoted line a parent says"])).toBe(false);
    expect(isLengthOnly([])).toBe(false);
    expect(fieldsFromErrors(["whyParas[0]: sentence over 16 words", "whyParas[0]: Flesch 55 < 70", "tonight[1]: over 120 chars (140)"]))
      .toEqual(["whyParas[0]", "tonight[1]"]);
  });
});

describe("static fallbacks (archetype × worry)", () => {
  const ARCHETYPES = ["The Storm","The All-In Kid","The Inventor","The Explorer","The Magnet","The Glue","The Captain","The Live Wire"];
  const WORRIES = ["homework","reminders","screens","confidence","giveup","finish","other"];

  it("every archetype × worry fallback passes the validator", () => {
    for (const a of ARCHETYPES) {
      for (const w of WORRIES) {
        const g = composeFallback(a, w, "Aarav", boy);
        const v = validateGenerated(g);
        expect(v.errors, `${a} × ${w}: ${v.errors.join("; ")}`).toEqual([]);
      }
    }
  });

  it("fallback is deterministic and fully populated", () => {
    const a = composeFallback("The Magnet", "screens", "Mia", "girl");
    const b = composeFallback("The Magnet", "screens", "Mia", "girl");
    expect(a).toEqual(b);
    expect(a.whyParas).toHaveLength(2);
    expect(a.tonight).toHaveLength(3);
    expect(a.switch.instead).toBeTruthy();
    expect(a.shortGood).toContain("Mia");
  });

  it("unknown archetype still yields valid fallback copy", () => {
    const g = composeFallback("The Unknown", "other", "Aarav", boy);
    expect(validateGenerated(g).ok).toBe(true);
  });
});
