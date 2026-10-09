import { describe, it, expect } from "vitest";
import {
  canonicalConcern, goalForConcern, headlineForConcern, worryLabelFor, worryMomentFor, CONCERN_GOAL,
} from "@/lib/report-v2/goal-mapping";
import {
  selectEvidence, rankDimensions, type AnsweredQuestion, type DimScore,
} from "@/lib/report-v2/evidence";
import { validateGenerated, isLengthOnly, isRepairable, fieldsFromErrors } from "@/lib/report-v2/validator";
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

  // ITEM 2: evidence must BACK the archetype's need and never contradict it.
  describe("archetype-aware selection (card 3 backs the conclusion)", () => {
    // All-In Kid = narrow-deep × mastery, need "time to go deep". A SOCIAL driver answer and a
    // NOVELTY competition answer point to OTHER needs — they must be dropped as contradictors.
    const allInAnswers: AnsweredQuestion[] = [
      { id: "G1", dimension: "attention_shape", label: "deep", value: "narrow-deep" },        // supports
      { id: "D2.1", dimension: "reward_driver", label: "cracks hard things", value: "mastery" }, // supports
      { id: "R1", dimension: "recovery_response", label: "on their own", value: "autonomous" }, // supports
      { id: "D2.2", dimension: "reward_driver", label: "people proud", value: "social" },       // CONTRADICTS (social driver)
      { id: "D1.1", dimension: "attention_shape", label: "with others", value: "social-anchored" }, // CONTRADICTS (shape)
    ];
    const dimRank = ["reward_driver", "attention_shape", "recovery_response"];

    it("prefers supporting answers and NEVER shows a contradicting one", () => {
      const ev = selectEvidence(allInAnswers, dimRank, "Aarav", boy, "The All-In Kid");
      const picks = ev.map((e) => `${e.qid}:${e.optionValue}`);
      expect(picks).toContain("G1:narrow-deep");
      expect(picks).toContain("D2.1:mastery");
      expect(picks).toContain("R1:autonomous");
      expect(picks).not.toContain("D2.2:social");
      expect(picks).not.toContain("D1.1:social-anchored");
      expect(ev).toHaveLength(3);
    });

    it("shows exactly 2 when only 2 supporting answers exist", () => {
      const two = allInAnswers.filter((a) => a.id !== "R1"); // leaves 2 supporting + 2 contradicting
      const ev = selectEvidence(two, dimRank, "Aarav", boy, "The All-In Kid");
      expect(ev).toHaveLength(2);
      expect(ev.every((e) => e.optionValue !== "social" && e.optionValue !== "social-anchored")).toBe(true);
    });

    it("falls back to top-dimension picks (minus contradictors) when <2 supporting", () => {
      // Only one supporting answer; the rest are neutral (recharge) — never a contradictor.
      const fewSupport: AnsweredQuestion[] = [
        { id: "G1", dimension: "attention_shape", label: "deep", value: "narrow-deep" }, // supports
        { id: "D6.1", dimension: "recharge_type", label: "quiet", value: "sensory-quiet" }, // neutral
        { id: "D2.2", dimension: "reward_driver", label: "people proud", value: "social" }, // CONTRADICTS
      ];
      const ev = selectEvidence(fewSupport, ["attention_shape", "recharge_type", "reward_driver"], "Aarav", boy, "The All-In Kid");
      expect(ev.map((e) => `${e.qid}:${e.optionValue}`)).not.toContain("D2.2:social");
      expect(ev.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("validator (v3 shapes)", () => {
  const ok: ReportV2Generated = composeFallback("The Inventor", "reminders", "Aarav", boy);
  // Inject a bad word via tonight[0] — a validated carrier field under the bans + 16-word cap.
  const withTonight = (w: string) => ({ ...ok, tonight: [w, ok.tonight[1], ok.tonight[2]] as [string, string, string] });

  it("accepts clean fallback copy", () => {
    const v = validateGenerated(ok);
    expect(v.errors).toEqual([]);
    expect(v.ok).toBe(true);
  });

  it("rejects hedging words", () => {
    const v = validateGenerated(withTonight("Aarav might start on his own."));
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("hedge"))).toBe(true);
  });

  it("rejects clinical claims", () => {
    const v = validateGenerated(withTonight("This looks like a disorder."));
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("clinical"))).toBe(true);
  });

  it("rejects parent-blame", () => {
    const v = validateGenerated(withTonight("You always step in too fast."));
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("parent-blame"))).toBe(true);
  });

  it("rejects a sentence over 16 words", () => {
    const long = "This is a long sentence that keeps going on and on and clearly goes well over sixteen words.";
    const v = validateGenerated(withTonight(long));
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("16 words"))).toBe(true);
  });

  it("rejects a field over its length cap", () => {
    const v = validateGenerated(withTonight("x".repeat(200)));
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("over 120 chars"))).toBe(true);
  });

  it("rejects jargon words (system/brain/dopamine/re-entry/regulate/off-ramp)", () => {
    for (const w of ["This is how the system works.", "It is a brain thing.", "A dopamine hit.", "The re-entry is hard.", "Helps them regulate.", "Give a clear off-ramp."]) {
      const v = validateGenerated(withTonight(w));
      expect(v.ok, w).toBe(false);
      expect(v.errors.some((e) => e.includes("jargon"))).toBe(true);
    }
  });

  it("rejects abstract nouns (method/ownership/process/transition/thread/approach/autonomy/structure/engagement/belongs)", () => {
    for (const w of ["Protect his method here.", "It builds ownership.", "Trust the process.", "Ease the transition.", "He lost the thread.", "Change the approach.", "It grows autonomy.", "Add some structure.", "Boost his engagement.", "It belongs to him."]) {
      const v = validateGenerated(withTonight(w));
      expect(v.ok, w).toBe(false);
      expect(v.errors.some((e) => e.includes("abstract"))).toBe(true);
    }
  });

  it("rejects 'upstairs' (assumes a house)", () => {
    const v = validateGenerated(withTonight("Then leave him upstairs."));
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("upstairs"))).toBe(true);
  });

  it("rejects attributing the answers to the child, not the parent", () => {
    const he = validateGenerated(withTonight("He told us he hates it."));
    expect(he.ok).toBe(false);
    expect(he.errors.some((e) => e.includes("child-attribution"))).toBe(true);
    const named = validateGenerated(withTonight("Aarav told you he waits."), { childName: "Aarav" });
    expect(named.ok).toBe(false);
    expect(named.errors.some((e) => e.includes("child-attribution"))).toBe(true);
  });

  it("rejects a tonight step with more than 2 sentences", () => {
    const v = validateGenerated(withTonight("Do this. Then that. And also this."));
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("more than 2 sentences"))).toBe(true);
  });

  it("rejects comparative claims about other children", () => {
    for (const w of ["That focus is rare.", "Most kids do this.", "Most children do this.", "Unlike other children, he waits.", "Few children can do it."]) {
      const v = validateGenerated(withTonight(w));
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

  it("rejects bargaining + spec §7 banned words, but not 'learn'", () => {
    for (const w of ["Make it worth it.", "Raise the stake.", "Up the stakes.", "A reward for finishing.", "No treats first.", "A treat if he starts.", "Offer a deal.", "He can earn it.", "She earned it.", "Make a bet.", "Face the consequence.", "Never punish him.", "Stay firm.", "No negotiation here.", "No debate about it.", "Just hold the line.", "He is testing you."]) {
      const v = validateGenerated(withTonight(w));
      expect(v.ok, w).toBe(false);
      expect(v.errors.some((e) => e.includes("bargaining") || e.includes("banned")), w).toBe(true);
    }
    // "learn"/"learned" must NOT trip the "earn" ban
    const fine = validateGenerated(withTonight("He will learn to start alone."));
    expect(fine.errors.some((e) => e.includes("bargaining"))).toBe(false);
  });

  it("enforces the new seenIt shape (starts 'When ', one sentence, no 'You've seen', no worry words)", () => {
    const base = ok;
    expect(validateGenerated({ ...base, seenIt: "You've seen it. He starts alone." }).errors.some((e) => e.startsWith("seenIt"))).toBe(true);
    expect(validateGenerated({ ...base, seenIt: "When Aarav fights the screen, he argues." }).errors.some((e) => e.startsWith("seenIt"))).toBe(true);
    expect(validateGenerated({ ...base, seenIt: "He focuses deeply on his own way." }).errors.some((e) => e.startsWith("seenIt"))).toBe(true);
  });

  it("enforces the new hardPart shape ('<Name> isn't X. <He>'s Y.', each sentence ≤12 words)", () => {
    expect(validateGenerated({ ...ok, hardPart: "The hard part isn’t X. It’s Y." }).errors.some((e) => e.startsWith("hardPart: must match"))).toBe(true);
    // second sentence is 13 words → over the ≤12 cap
    const tooLong = "Aarav isn’t ignoring you at all today. He’s waiting a very long while to start on his own way now.";
    expect(validateGenerated({ ...ok, hardPart: tooLong }).errors.some((e) => e.startsWith("hardPart"))).toBe(true);
  });

  it("flags subject-verb agreement in AI fields (name singular; singular-they base verb)", () => {
    // (b) child name + base/plural verb — name is singular, verb must take -s.
    const nameBase = validateGenerated(
      { ...composeFallback("The All-In Kid", "reminders", "Test", boy), seenIt: "When Test settle into one thing, he stays with it." },
      { childName: "Test", gender: boy },
    );
    expect(nameBase.errors.some((e) => e.startsWith("seenIt: agreement"))).toBe(true);
    const nameBase2 = validateGenerated(
      { ...composeFallback("The All-In Kid", "reminders", "Aarav", boy), seenIt: "When Aarav go to the task, he stays with it." },
      { childName: "Aarav", gender: boy },
    );
    expect(nameBase2.errors.some((e) => e.startsWith("seenIt: agreement"))).toBe(true);
    // (a) "they" + 3rd-singular verb — singular they takes the base verb.
    const theySing = validateGenerated(
      { ...composeFallback("The All-In Kid", "reminders", "Aarav", null), hardPart: "Aarav isn’t lazy. They focuses best when left alone." },
      { childName: "Aarav", gender: null },
    );
    expect(theySing.errors.some((e) => e.includes("agreement"))).toBe(true);
    // clean fallback copy carries NO agreement error (checker matches the fixed-copy grammar).
    expect(
      validateGenerated(composeFallback("The All-In Kid", "reminders", "Aarav", null), { childName: "Aarav", gender: null })
        .errors.some((e) => e.includes("agreement")),
    ).toBe(false);
  });

  it("routes bargaining + length failures through the repair path, not full retry", () => {
    expect(isRepairable(["switch.try: bargaining (stake/stakes)"])).toBe(true);
    expect(isRepairable(["tonight[0]: sentence over 16 words", "tonight[0]: bargaining (reward)"])).toBe(true);
    expect(isRepairable(["tonight[0]: abstract (method)"])).toBe(false); // needs a full rewrite
    expect(isRepairable(["switch.try: must be a quoted line a parent says"])).toBe(false);
  });

  it("classifies length-only errors (for the cheap repair path) vs content errors", () => {
    expect(isLengthOnly(["seenIt: sentence over 16 words", "tonight[1]: over 120 chars (140)"])).toBe(true);
    expect(isLengthOnly(["tonight[0]: abstract (method)"])).toBe(false); // needs a full rewrite
    expect(isLengthOnly(["switch.try: must be a quoted line a parent says"])).toBe(false);
    expect(isLengthOnly([])).toBe(false);
    expect(fieldsFromErrors(["seenIt: sentence over 16 words", "tonight[1]: over 120 chars (140)"]))
      .toEqual(["seenIt", "tonight[1]"]);
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

  it("fallback is deterministic and fully populated (v3 shapes)", () => {
    const a = composeFallback("The Magnet", "screens", "Mia", "girl");
    const b = composeFallback("The Magnet", "screens", "Mia", "girl");
    expect(a).toEqual(b);
    expect(a.tonight).toHaveLength(3);
    expect(a.switch.instead).toBeTruthy();
    // v3: seenIt is one sentence starting "When "; hardPart is "<Name> isn't X. <She>'s Y."
    expect(a.seenIt.startsWith("When ")).toBe(true);
    expect(/^Mia isn[’']t .+\. (He|She|They)[’'](s|re) .+\.$/.test(a.hardPart)).toBe(true);
    // whyParas/shortGood/shortWhy/shortFix are no longer produced
    expect(a.whyParas).toBeUndefined();
    expect(a.shortGood).toBeUndefined();
  });

  it("unknown archetype still yields valid fallback copy", () => {
    const g = composeFallback("The Unknown", "other", "Aarav", boy);
    expect(validateGenerated(g).ok).toBe(true);
  });

  it("tonight's 3rd step is a 'Notice:' check of the worry outcome", () => {
    expect(composeFallback("The Inventor", "reminders", "Aarav", boy).tonight[2])
      .toBe("Notice: did he start without a second reminder?");
    expect(composeFallback("The Storm", "screens", "Mia", "girl").tonight[2])
      .toBe("Notice: did it end without a fight?");
    expect(composeFallback("The Magnet", "confidence", "Mia", "girl").tonight[2])
      .toBe("Notice: did she try the hard part before asking?");
    // every archetype × worry ends on a Notice step
    for (const a of ARCHETYPES) for (const w of WORRIES) {
      expect(composeFallback(a, w, "Aarav", boy).tonight[2].startsWith("Notice:")).toBe(true);
    }
  });
});

describe("evidence backfill never shows a foreign-archetype signal (ITEM 2 follow-up)", () => {
  it("All-In Kid with <2 supporting answers excludes a G2 'novelty' answer from backfill", () => {
    const answers: AnsweredQuestion[] = [
      { id: "D1.1", dimension: "attention_shape", label: "goes deep", value: "narrow-deep" },     // 1 supporting
      { id: "G2", dimension: "attention_competition", label: "a new idea pulls them away", value: "novelty" }, // foreign signal → must be dropped
      { id: "D5.1", dimension: "screen_pull", label: "screens fill empty time", value: "boredom-avoidance" },  // neutral → ok
      { id: "D6.1", dimension: "recharge_type", label: "quiet time alone", value: "sensory-quiet" },           // neutral → ok
    ];
    const rank = ["attention_shape", "attention_competition", "screen_pull", "recharge_type"];
    const ev = selectEvidence(answers, rank, "Aarav", boy, "The All-In Kid");
    const picks = ev.map((e) => `${e.qid}:${e.optionValue}`);
    expect(picks).not.toContain("G2:novelty");          // the flagged contradicting answer
    expect(picks).toContain("D1.1:narrow-deep");        // the supporting one is kept
  });
});

describe("validator — banned phrase 'from being handed'", () => {
  it("rejects a hardPart containing 'from being handed'", () => {
    const base = composeFallback("The Inventor", "reminders", "Aarav", boy);
    const g = { ...base, hardPart: "Aarav isn't ignoring you. He's switched off from being handed instructions." } as ReportV2Generated;
    expect(validateGenerated(g).errors.some((e) => /from being handed/i.test(e))).toBe(true);
  });
});
