// Tests for Quality Engine check functions (lib/quality/checks.ts).
//
// All checks are pure functions — no LLM calls, no DB, no async.
// Tests use fixture AttentionMoments with realistic content to verify:
//   - Structural checks (traceability, loop citation) against node ref arrays
//   - Content checks (hypothesis hedge, label once, fit-tier, week-number,
//     pullquote, objective picker, opening similarity) against generated prose
//
// Tests for the orchestration layer (regeneration, retry logic) are in a
// separate file and require a mocked generateMoment.

import { describe, it, expect } from "vitest";
import type { AttentionMoment } from "@/lib/narrative/types";
import type { FamilyAttentionLoop } from "@/lib/graph/loop";
import {
  checkTraceability,
  checkHypothesisHedge,
  checkLabelOnce,
  checkFitTierCompliance,
  checkNoWeekNumberRoadmap,
  checkSinglePullquote,
  checkRoadmapLoopCitation,
  checkNoObjectivePicker,
  checkOpeningSimilarity,
  checkClinicalLanguage,
  checkBlameFraming,
  checkEarlyActionContent,
  checkRecognitionOrdering,
} from "@/lib/quality/checks";

// ── Fixture helpers ───────────────────────────────────────────────────────────

function makeM(
  overrides: Partial<AttentionMoment> & { moment_id: string; section: string; content: string },
): AttentionMoment {
  return {
    moment_type: "recognition",
    purpose: "test",
    evidence_source: ["decision_G1"],
    confidence_tier: "direct_evidence",
    emotional_objective: "test",
    behaviour_node_refs: ["signal_attention_shape"],
    human_decision_refs: ["decision_G1"],
    ...overrides,
  };
}

const ARCHETYPE = "The All-In Kid";
const PARENT_INSTINCT = "The Quick Fixer";

const LOOP_DETECTED: FamilyAttentionLoop = {
  detected: true,
  loop_tension_point: {
    parent_node_id: "decision_G3",
    child_node_id: "decision_G1",
    parent_dimension: "parent_instinct",
    child_dimension: "friction_response",
    mechanism: "intervenes_too_early",
    description: "Parent steps in before child resolves",
  },
  precedes_edges: [],
  pattern_summary: "quick-fixer; solo-push",
  loop_description: "Parent intervenes too early.",
};

const LOOP_NOT_DETECTED: FamilyAttentionLoop = {
  detected: false,
  loop_tension_point: null,
  precedes_edges: [],
  pattern_summary: "mastery; solo-push",
  loop_description: null,
};

// ── Check 1: Traceability ─────────────────────────────────────────────────────

describe("checkTraceability", () => {
  it("passes when every moment has at least one node ref", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: "He locks in completely." }),
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: "This is The All-In Kid pattern." }),
    ];
    expect(checkTraceability(moments)).toBeNull();
  });

  it("fails when a moment has no human_decision_refs AND no behaviour_node_refs", () => {
    const moments = [
      makeM({
        moment_id: "m_01",
        section: "Recognition",
        content: "He locks in completely.",
        human_decision_refs: [],
        behaviour_node_refs: [],
      }),
    ];
    const result = checkTraceability(moments);
    expect(result).not.toBeNull();
    expect(result!.check).toBe("traceability");
    expect(result!.moment_id).toBe("m_01");
  });

  it("fails when a moment at insufficient_evidence tier has substantial prose", () => {
    const moments = [
      makeM({
        moment_id: "m_05",
        section: "Where We Are Less Certain",
        content: "This paragraph has more than fifty characters and should not exist without traceable evidence.",
        confidence_tier: "insufficient_evidence",
        human_decision_refs: ["decision_G1"],
        behaviour_node_refs: ["signal_attention_shape"],
      }),
    ];
    const result = checkTraceability(moments);
    expect(result).not.toBeNull();
    expect(result!.check).toBe("traceability");
  });

  it("passes for a moment with only behaviour_node_refs (no human_decision_refs)", () => {
    const moments = [
      makeM({
        moment_id: "m_02",
        section: "Behaviour Pattern",
        content: "Arjun locks in on tasks he chose.",
        human_decision_refs: [],
        behaviour_node_refs: ["signal_attention_shape"],
      }),
    ];
    expect(checkTraceability(moments)).toBeNull();
  });
});

// ── Check 2: Hypothesis hedge ─────────────────────────────────────────────────

describe("checkHypothesisHedge", () => {
  it("passes when a hypothesis-tier moment contains hedge language", () => {
    const moments = [
      makeM({
        moment_id: "m_05",
        section: "Where We Are Less Certain",
        content: "It appears that Arjun might disengage when pressure builds.",
        confidence_tier: "hypothesis",
      }),
    ];
    expect(checkHypothesisHedge(moments)).toBeNull();
  });

  it("fails when a hypothesis-tier moment has no hedge language", () => {
    const moments = [
      makeM({
        moment_id: "m_05",
        section: "Where We Are Less Certain",
        content: "Arjun disengages when pressure builds. This is a definite pattern.",
        confidence_tier: "hypothesis",
      }),
    ];
    const result = checkHypothesisHedge(moments);
    expect(result).not.toBeNull();
    expect(result!.check).toBe("hypothesis_hedge");
    expect(result!.moment_id).toBe("m_05");
  });

  it("passes for direct_evidence moments regardless of hedge language", () => {
    const moments = [
      makeM({
        moment_id: "m_01",
        section: "Recognition",
        content: "He locks in completely. No hedging needed for direct evidence.",
        confidence_tier: "direct_evidence",
      }),
    ];
    expect(checkHypothesisHedge(moments)).toBeNull();
  });

  it("recognises 'might' as a hedge word", () => {
    const moments = [
      makeM({
        moment_id: "m_05",
        section: "Where We Are Less Certain",
        content: "Arjun might disengage when the challenge feels too assigned.",
        confidence_tier: "hypothesis",
      }),
    ];
    expect(checkHypothesisHedge(moments)).toBeNull();
  });
});

// ── Check 3: Label once ───────────────────────────────────────────────────────

describe("checkLabelOnce", () => {
  it("passes when archetype label appears exactly once (in Behaviour Pattern)", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: "He locks in completely." }),
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: `This is The All-In Kid pattern.` }),
    ];
    expect(checkLabelOnce(moments, ARCHETYPE, PARENT_INSTINCT)).toHaveLength(0);
  });

  it("fails when archetype label appears more than once within Behaviour Pattern — flags BP moment_id", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: "He locks in completely." }),
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: `The All-In Kid pattern is clear. The All-In Kid drives all engagement.` }),
    ];
    const failures = checkLabelOnce(moments, ARCHETYPE, PARENT_INSTINCT);
    expect(failures.some(f => f.check === "label_once")).toBe(true);
    expect(failures.some(f => f.reason.includes("2 times"))).toBe(true);
    // Duplicates within BP — the BP moment itself is the offending one
    expect(failures.some(f => f.moment_id === "m_02")).toBe(true);
  });

  it("identifies the non-BP moment when label appears in Behaviour Pattern AND another section", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: "He locks in completely." }),
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: "The All-In Kid pattern is clear here." }),
      makeM({ moment_id: "m_04", section: "What This Explains", content: "This is why The All-In Kid resists structure." }),
    ];
    const failures = checkLabelOnce(moments, ARCHETYPE, PARENT_INSTINCT);
    // Exactly one failure — the extra occurrence in m_04, not a report-level null
    expect(failures).toHaveLength(1);
    expect(failures[0].check).toBe("label_once");
    expect(failures[0].moment_id).toBe("m_04");
    expect(failures[0].moment_id).not.toBeNull();
    expect(failures[0].reason).toContain("must appear only in Behaviour Pattern");
  });

  it("fails when archetype label appears in the Recognition section (before supporting pattern)", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: `The All-In Kid was visible here.` }),
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: "The pattern is clear." }),
    ];
    const failures = checkLabelOnce(moments, ARCHETYPE, PARENT_INSTINCT);
    expect(failures.some(f => f.moment_id === "m_01")).toBe(true);
  });

  it("fails when parent instinct label appears more than once in primary-tier loop report", () => {
    const moments = [
      makeM({ moment_id: "m_03", section: "Family Attention Loop", content: `The Quick Fixer tends to step in. The Quick Fixer is a well-meaning response.` }),
    ];
    const failures = checkLabelOnce(moments, ARCHETYPE, PARENT_INSTINCT, "primary");
    expect(failures.some(f => f.reason.includes(`"${PARENT_INSTINCT}"`))).toBe(true);
  });

  it("passes when both labels appear zero times with no_clear_fit tier", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: "He locks in completely." }),
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: "The pattern shows deep engagement with chosen tasks." }),
    ];
    expect(checkLabelOnce(moments, ARCHETYPE, PARENT_INSTINCT, "no_clear_fit")).toHaveLength(0);
  });

  it("fails when parent instinct label is absent and tier is primary (no-loop report)", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: "He locks in completely." }),
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: "The All-In Kid pattern is clear." }),
      makeM({ moment_id: "m_04", section: "What This Explains", content: "This explains the homework standoffs." }),
    ];
    const failures = checkLabelOnce(moments, ARCHETYPE, PARENT_INSTINCT, "primary");
    expect(failures.some(f => f.reason.includes("currently absent"))).toBe(true);
    expect(failures.some(f => f.reason.includes('"What This Explains"'))).toBe(true);
  });

  it("fails when parent instinct label is absent and tier is primary (loop report)", () => {
    const moments = [
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: "The All-In Kid pattern is clear." }),
      makeM({ moment_id: "m_03", section: "Family Attention Loop", content: "The loop repeats." }),
      makeM({ moment_id: "m_04", section: "What This Explains", content: "This explains the standoffs." }),
    ];
    const failures = checkLabelOnce(moments, ARCHETYPE, PARENT_INSTINCT, "primary");
    expect(failures.some(f => f.reason.includes("currently absent"))).toBe(true);
    expect(failures.some(f => f.reason.includes('"Family Attention Loop"'))).toBe(true);
  });

  it("passes when parent instinct label appears once in What This Explains (no-loop, primary tier)", () => {
    const moments = [
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: "The All-In Kid pattern is clear." }),
      makeM({ moment_id: "m_04", section: "What This Explains", content: `The kind of instinct we'd call ${PARENT_INSTINCT} — stepping in when it fires.` }),
    ];
    expect(checkLabelOnce(moments, ARCHETYPE, PARENT_INSTINCT, "primary")).toHaveLength(0);
  });

  it("passes when parent instinct label appears once in Family Attention Loop (loop, primary tier)", () => {
    const moments = [
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: "The All-In Kid pattern is clear." }),
      makeM({ moment_id: "m_03", section: "Family Attention Loop", content: `The Quick Fixer steps in — that's the loop.` }),
      makeM({ moment_id: "m_04", section: "What This Explains", content: "This explains the standoffs." }),
    ];
    expect(checkLabelOnce(moments, ARCHETYPE, PARENT_INSTINCT, "primary")).toHaveLength(0);
  });

  it("fails when parent instinct label appears in wrong section (loop report expects FAL, found in WTE)", () => {
    const moments = [
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: "The All-In Kid pattern." }),
      makeM({ moment_id: "m_03", section: "Family Attention Loop", content: "The loop repeats without the label." }),
      makeM({ moment_id: "m_04", section: "What This Explains", content: `The Quick Fixer fires here.` }),
    ];
    const failures = checkLabelOnce(moments, ARCHETYPE, PARENT_INSTINCT, "primary");
    expect(failures.some(f => f.reason.includes('"Family Attention Loop"'))).toBe(true);
  });

  it("passes when parent instinct label is absent and tier is no_clear_fit", () => {
    const moments = [
      makeM({ moment_id: "m_04", section: "What This Explains", content: "The parent tends to step in quickly." }),
    ];
    expect(checkLabelOnce(moments, ARCHETYPE, PARENT_INSTINCT, "no_clear_fit")).toHaveLength(0);
  });

  it("passes when parent instinct label is absent and tier is weak", () => {
    const moments = [
      makeM({ moment_id: "m_04", section: "What This Explains", content: "The parent tends to step in quickly." }),
    ];
    expect(checkLabelOnce(moments, ARCHETYPE, PARENT_INSTINCT, "weak")).toHaveLength(0);
  });
});

// ── Check 4: fit_tier compliance ──────────────────────────────────────────────

describe("checkFitTierCompliance", () => {
  it("no_clear_fit: fails if archetype label appears anywhere in prose", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: "He locks in completely." }),
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: `This child shows The All-In Kid tendencies.` }),
    ];
    const result = checkFitTierCompliance(moments, ARCHETYPE, "no_clear_fit");
    expect(result).not.toBeNull();
    expect(result!.check).toBe("fit_tier_compliance");
  });

  it("no_clear_fit: passes if archetype label is absent", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: "He locks in completely." }),
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: "The pattern shows deep engagement with chosen tasks." }),
    ];
    expect(checkFitTierCompliance(moments, ARCHETYPE, "no_clear_fit")).toBeNull();
  });

  it("weak: fails if label is present but without hedge language", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: "He locks in completely." }),
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: `Arjun matches The All-In Kid pattern exactly.` }),
    ];
    const result = checkFitTierCompliance(moments, ARCHETYPE, "weak");
    expect(result).not.toBeNull();
    expect(result!.check).toBe("fit_tier_compliance");
  });

  it("weak: passes if label present with hedge language", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: "He locks in completely." }),
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: `It appears that Arjun might match The All-In Kid pattern.` }),
    ];
    expect(checkFitTierCompliance(moments, ARCHETYPE, "weak")).toBeNull();
  });

  it("weak: passes if label is absent (label is optional for weak tier)", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: "He locks in completely." }),
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: "The pattern shows chosen-task engagement." }),
    ];
    expect(checkFitTierCompliance(moments, ARCHETYPE, "weak")).toBeNull();
  });

  it("primary: fails if archetype label missing from Behaviour Pattern", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: "He locks in completely." }),
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: "The pattern shows deep engagement." }),
    ];
    const result = checkFitTierCompliance(moments, ARCHETYPE, "primary");
    expect(result).not.toBeNull();
    expect(result!.check).toBe("fit_tier_compliance");
  });

  it("primary: passes if archetype label present in Behaviour Pattern", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: "He locks in completely." }),
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: `Arjun is The All-In Kid. This means chosen tasks consume him.` }),
    ];
    expect(checkFitTierCompliance(moments, ARCHETYPE, "primary")).toBeNull();
  });

  it("secondary: fails if archetype label missing from Behaviour Pattern", () => {
    const moments = [
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: "Deep engagement with chosen tasks." }),
    ];
    const result = checkFitTierCompliance(moments, ARCHETYPE, "secondary");
    expect(result).not.toBeNull();
    expect(result!.check).toBe("fit_tier_compliance");
  });
});

// ── Check 5: No week-number roadmap ──────────────────────────────────────────

describe("checkNoWeekNumberRoadmap", () => {
  it("passes when no roadmap moment contains 'Week N'", () => {
    const moments = [
      makeM({ moment_id: "m_roadmap_b1", section: "Roadmap — What changes first", content: "The first change you will notice is a slight softening." }),
      makeM({ moment_id: "m_roadmap_b2", section: "Roadmap — What changes next", content: "The standoffs shorten." }),
    ];
    expect(checkNoWeekNumberRoadmap(moments)).toBeNull();
  });

  it("fails when a roadmap moment contains 'Week 1'", () => {
    const moments = [
      makeM({ moment_id: "m_roadmap_b1", section: "Roadmap — What changes first", content: "Week 1: introduce one chosen task per day." }),
    ];
    const result = checkNoWeekNumberRoadmap(moments);
    expect(result).not.toBeNull();
    expect(result!.check).toBe("no_week_number_roadmap");
    expect(result!.moment_id).toBe("m_roadmap_b1");
  });

  it("fails for 'Week 2' in any roadmap section", () => {
    const moments = [
      makeM({ moment_id: "m_roadmap_b1", section: "Roadmap — What changes first", content: "The first change is visible." }),
      makeM({ moment_id: "m_roadmap_b2", section: "Roadmap — What changes next", content: "In Week 2, the dynamic shifts." }),
    ];
    const result = checkNoWeekNumberRoadmap(moments);
    expect(result).not.toBeNull();
    expect(result!.moment_id).toBe("m_roadmap_b2");
  });

  it("does not flag non-roadmap sections for 'Week' mentions", () => {
    const moments = [
      makeM({ moment_id: "m_07", section: "Future Story", content: "Six weeks from now, evenings feel different." }),
    ];
    expect(checkNoWeekNumberRoadmap(moments)).toBeNull();
  });

  it("is case-insensitive (catches 'week 3')", () => {
    const moments = [
      makeM({ moment_id: "m_roadmap_b3", section: "Roadmap — What becomes different", content: "By week 3 you will see this." }),
    ];
    expect(checkNoWeekNumberRoadmap(moments)).not.toBeNull();
  });
});

// ── Check 6: Single pull-quote cap ────────────────────────────────────────────

describe("checkSinglePullquote", () => {
  it("passes with zero pull-quotes", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: "He locks in completely when the task is his idea." }),
    ];
    expect(checkSinglePullquote(moments)).toBeNull();
  });

  it("passes with exactly one pull-quote (a full paragraph in quotation marks)", () => {
    const moments = [
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: `The pattern is clear.\n\n"Every child who needs it to be his idea is one real challenge away from unstoppable."\n\nThis manifests in chosen tasks.` }),
    ];
    expect(checkSinglePullquote(moments)).toBeNull();
  });

  it("fails with two pull-quotes across the report", () => {
    const moments = [
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: `"One real challenge away from unstoppable."` }),
      makeM({ moment_id: "m_06", section: "Hope", content: `"Something becomes possible when this is understood."` }),
    ];
    const result = checkSinglePullquote(moments);
    expect(result).not.toBeNull();
    expect(result!.check).toBe("single_pullquote");
  });

  it("does not flag inline quotes within a sentence", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: `He says "I don't want to" and then disengages. That's the pattern.` }),
    ];
    expect(checkSinglePullquote(moments)).toBeNull();
  });
});

// ── Check 7: Roadmap loop citation ────────────────────────────────────────────

describe("checkRoadmapLoopCitation", () => {
  it("passes when no loop is detected (check skipped)", () => {
    const moments = [
      makeM({ moment_id: "m_roadmap_b1", section: "Roadmap — What changes first", content: "The first change is visible.", behaviour_node_refs: ["signal_attention_shape"] }),
    ];
    expect(checkRoadmapLoopCitation(moments, LOOP_NOT_DETECTED)).toBeNull();
  });

  it("passes when loop is detected and all roadmap beats cite the loop dimension", () => {
    const moments = [
      makeM({ moment_id: "m_roadmap_b1", section: "Roadmap — What changes first", content: "First change.", behaviour_node_refs: ["signal_friction_response", "signal_attention_shape"] }),
      makeM({ moment_id: "m_roadmap_b2", section: "Roadmap — What changes next", content: "Second change.", behaviour_node_refs: ["signal_friction_response", "signal_attention_shape"] }),
    ];
    expect(checkRoadmapLoopCitation(moments, LOOP_DETECTED)).toBeNull();
  });

  it("fails when a roadmap beat is missing the loop dimension citation", () => {
    const moments = [
      makeM({ moment_id: "m_roadmap_b1", section: "Roadmap — What changes first", content: "First change.", behaviour_node_refs: ["signal_attention_shape"] }), // missing friction_response
    ];
    const result = checkRoadmapLoopCitation(moments, LOOP_DETECTED);
    expect(result).not.toBeNull();
    expect(result!.check).toBe("roadmap_loop_citation");
    expect(result!.moment_id).toBe("m_roadmap_b1");
    expect(result!.reason).toContain("friction_response");
  });
});

// ── Check 8: No objective picker ─────────────────────────────────────────────

describe("checkNoObjectivePicker", () => {
  it("passes for normal report prose", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: "He locks in completely when the task is his idea." }),
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: "The All-In Kid pattern explains this fully." }),
    ];
    expect(checkNoObjectivePicker(moments)).toBeNull();
  });

  it("fails when content includes 'which matters most' selection language", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: "Tell us which concern matters most to you from the list below." }),
    ];
    const result = checkNoObjectivePicker(moments);
    expect(result).not.toBeNull();
    expect(result!.check).toBe("no_objective_picker");
  });

  it("fails when content includes checkbox syntax", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: "Select one:\n[ ] Homework battles\n[ ] Screen time\n[ ] Focus" }),
    ];
    expect(checkNoObjectivePicker(moments)).not.toBeNull();
  });

  it("fails when content includes 'select one objective'", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: "Please select one objective before we continue." }),
    ];
    expect(checkNoObjectivePicker(moments)).not.toBeNull();
  });
});

// ── Check 9: Opening similarity ───────────────────────────────────────────────

describe("checkOpeningSimilarity", () => {
  it("passes when there are no prior reports to compare against", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: "Arjun locks in completely when the task is chosen by him." }),
    ];
    expect(checkOpeningSimilarity(moments, [])).toBeNull();
  });

  it("passes when the Recognition section is sufficiently different from priors", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: "Arjun locks in completely when the task is chosen by him." }),
    ];
    const priors = ["Priya watches her daughter draw for hours without stopping when the subject is her own idea."];
    expect(checkOpeningSimilarity(moments, priors)).toBeNull();
  });

  it("fails when the Recognition section is near-identical to a prior report", () => {
    const content = "Arjun locks in completely when the task is chosen by him and nobody interrupts.";
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content }),
    ];
    // Near-identical text — should exceed the 0.40 Jaccard threshold
    const priors = [content];
    const result = checkOpeningSimilarity(moments, priors);
    expect(result).not.toBeNull();
    expect(result!.check).toBe("opening_similarity");
  });

  it("uses a configurable threshold", () => {
    const content = "Arjun locks in completely when the task is chosen by him.";
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content }),
    ];
    // With threshold=1.0, nothing should fail except perfect duplicates
    expect(checkOpeningSimilarity(moments, ["Arjun locks in when chosen tasks appear before him."], 1.0)).toBeNull();
  });

  it("skips the check when there is no Recognition section", () => {
    const moments = [
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: "Pattern content here." }),
    ];
    expect(checkOpeningSimilarity(moments, ["some prior text"])).toBeNull();
  });
});

// ── Check 12: Clinical language (Rule 6) ─────────────────────────────────────

describe("checkClinicalLanguage", () => {
  it("passes for normal report prose with no clinical terms", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: "Arjun locks in completely when the task is chosen by him." }),
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: "The pattern shows deep engagement with chosen, mastery-driven tasks." }),
    ];
    expect(checkClinicalLanguage(moments)).toBeNull();
  });

  it("fails when 'ADHD' appears in prose", () => {
    const moments = [
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: "This is not ADHD — it is a different kind of attention shape." }),
    ];
    const result = checkClinicalLanguage(moments);
    expect(result).not.toBeNull();
    expect(result!.check).toBe("clinical_language");
    expect(result!.moment_id).toBe("m_02");
    expect(result!.reason).toContain("ADHD");
  });

  it("fails for 'diagnosis' in any form", () => {
    const moments = [
      makeM({ moment_id: "m_04", section: "What This Explains", content: "No diagnosis is implied here." }),
    ];
    expect(checkClinicalLanguage(moments)).not.toBeNull();
  });

  it("fails for 'neurodivergent'", () => {
    const moments = [
      makeM({ moment_id: "m_04", section: "What This Explains", content: "Some neurodivergent children show this pattern." }),
    ];
    expect(checkClinicalLanguage(moments)).not.toBeNull();
  });

  it("fails for 'executive function'", () => {
    const moments = [
      makeM({ moment_id: "m_05", section: "Where We Are Less Certain", content: "Executive function demands are higher for these tasks." }),
    ];
    expect(checkClinicalLanguage(moments)).not.toBeNull();
  });

  it("fails for 'spectrum'", () => {
    const moments = [
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: "This sits on the spectrum of attention regulation." }),
    ];
    expect(checkClinicalLanguage(moments)).not.toBeNull();
  });

  it("does not flag 'anxiety' — excluded per calibration (false-positive risk)", () => {
    const moments = [
      makeM({ moment_id: "m_06", section: "Hope", content: "The anxiety around homework starts to ease when ownership shifts." }),
    ];
    expect(checkClinicalLanguage(moments)).toBeNull();
  });

  it("is case-insensitive", () => {
    const moments = [
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: "Some children are diagnosed with attention disorders." }),
    ];
    expect(checkClinicalLanguage(moments)).not.toBeNull();
  });
});

// ── Check 13: Blame framing (Rule 5) ─────────────────────────────────────────

describe("checkBlameFraming", () => {
  it("passes for prose that frames parent instinct as care redirected", () => {
    const moments = [
      makeM({ moment_id: "m_03", section: "Family Attention Loop", content: "The quick-fixer response fires at exactly the moment Arjun is trying to push through. It is care — arriving at a structurally difficult point." }),
    ];
    expect(checkBlameFraming(moments)).toBeNull();
  });

  it("fails when prose says 'you've caused this problem'", () => {
    const moments = [
      makeM({ moment_id: "m_04", section: "What This Explains", content: "You've caused this problem by stepping in too often." }),
    ];
    const result = checkBlameFraming(moments);
    expect(result).not.toBeNull();
    expect(result!.check).toBe("blame_framing");
    expect(result!.moment_id).toBe("m_04");
  });

  it("fails when prose says 'your fault'", () => {
    const moments = [
      makeM({ moment_id: "m_03", section: "Family Attention Loop", content: "This loop isn't your fault, but it began with your pattern." }),
    ];
    // "your fault" is present — the phrase appears even in softened form
    const result = checkBlameFraming(moments);
    expect(result).not.toBeNull();
    expect(result!.check).toBe("blame_framing");
  });

  it("fails for 'harmful approach'", () => {
    const moments = [
      makeM({ moment_id: "m_04", section: "What This Explains", content: "This is a harmful approach to building independence." }),
    ];
    expect(checkBlameFraming(moments)).not.toBeNull();
  });

  it("fails for 'wrong instinct'", () => {
    const moments = [
      makeM({ moment_id: "m_03", section: "Family Attention Loop", content: "The wrong instinct at the wrong moment creates the loop." }),
    ];
    expect(checkBlameFraming(moments)).not.toBeNull();
  });

  it("does not flag 'push' or 'pushing' — these describe behaviour, not blame", () => {
    const moments = [
      makeM({ moment_id: "m_03", section: "Family Attention Loop", content: "When you push to help, Arjun pulls back. The pushing and the pulling reinforce each other." }),
    ];
    expect(checkBlameFraming(moments)).toBeNull();
  });

  it("does not flag care-framed parent instinct descriptions", () => {
    const moments = [
      makeM({ moment_id: "m_04", section: "What This Explains", content: "The quick-fixer instinct is not wrong in itself — it is the right care arriving in the wrong window." }),
    ];
    // "wrong" appears but as 'wrong window', not in a blame pattern
    expect(checkBlameFraming(moments)).toBeNull();
  });
});

// ── Check 14: Early action content (Rule 3) ───────────────────────────────────

describe("checkEarlyActionContent", () => {
  it("passes when action phrasing appears only in roadmap (action-type) moments", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: "Arjun locks in when the task is his idea.", moment_type: "recognition" }),
      makeM({ moment_id: "m_roadmap_b1", section: "Roadmap — What changes first", content: "Start by giving him one chosen task per day.", moment_type: "action" }),
    ];
    expect(checkEarlyActionContent(moments)).toBeNull();
  });

  it("fails when 'try this' appears in a recognition moment", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: "He locks in on chosen tasks. Try this: give him one real choice each morning.", moment_type: "recognition" }),
    ];
    const result = checkEarlyActionContent(moments);
    expect(result).not.toBeNull();
    expect(result!.check).toBe("early_action_content");
    expect(result!.moment_id).toBe("m_01");
  });

  it("fails when 'first step' appears in a Behaviour Pattern moment", () => {
    const moments = [
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: "The first step is understanding why this pattern exists.", moment_type: "reflection" }),
    ];
    expect(checkEarlyActionContent(moments)).not.toBeNull();
  });

  it("fails when 'start by' appears in a Hope section", () => {
    const moments = [
      makeM({ moment_id: "m_06", section: "Hope", content: "Six months from now, start by offering him ownership of one hard thing.", moment_type: "hope" }),
    ];
    expect(checkEarlyActionContent(moments)).not.toBeNull();
  });

  it("does not flag forward-looking language in Hope/Future Story (not action-imperative)", () => {
    const moments = [
      makeM({ moment_id: "m_06", section: "Hope", content: "Six months from now, evenings feel different. The battle doesn't start the moment homework appears.", moment_type: "hope" }),
      makeM({ moment_id: "m_07", section: "Future Story", content: "That version of Arjun — the one who picks up something hard without being told — is not a fantasy.", moment_type: "reframing" }),
    ];
    expect(checkEarlyActionContent(moments)).toBeNull();
  });

  it("does not flag 'step' as a word (only 'step N' or 'first/next step' are prohibited)", () => {
    const moments = [
      makeM({ moment_id: "m_04", section: "What This Explains", content: "Each step back creates more distance between Arjun and the task.", moment_type: "insight" }),
    ];
    expect(checkEarlyActionContent(moments)).toBeNull();
  });
});

// ── Check 15: Recognition ordering (Rule 2) ───────────────────────────────────

describe("checkRecognitionOrdering", () => {
  it("passes when recognition moment appears before any insight moment", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: "He locks in.", moment_type: "recognition" }),
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: "The pattern.", moment_type: "reflection" }),
      makeM({ moment_id: "m_04", section: "What This Explains", content: "This explains.", moment_type: "insight" }),
    ];
    expect(checkRecognitionOrdering(moments)).toBeNull();
  });

  it("passes for a report with no insight moments (not all reports have them)", () => {
    const moments = [
      makeM({ moment_id: "m_01", section: "Recognition", content: "He locks in.", moment_type: "recognition" }),
      makeM({ moment_id: "m_06", section: "Hope", content: "Hope.", moment_type: "hope" }),
    ];
    expect(checkRecognitionOrdering(moments)).toBeNull();
  });

  it("fails when no recognition moment is present at all", () => {
    const moments = [
      makeM({ moment_id: "m_02", section: "Behaviour Pattern", content: "The pattern.", moment_type: "reflection" }),
      makeM({ moment_id: "m_04", section: "What This Explains", content: "This explains.", moment_type: "insight" }),
    ];
    const result = checkRecognitionOrdering(moments);
    expect(result).not.toBeNull();
    expect(result!.check).toBe("recognition_ordering");
    expect(result!.moment_id).toBeNull();
  });

  it("fails when an insight moment appears before the recognition moment", () => {
    const moments = [
      makeM({ moment_id: "m_04", section: "What This Explains", content: "This explains.", moment_type: "insight" }),
      makeM({ moment_id: "m_01", section: "Recognition", content: "He locks in.", moment_type: "recognition" }),
    ];
    const result = checkRecognitionOrdering(moments);
    expect(result).not.toBeNull();
    expect(result!.check).toBe("recognition_ordering");
    expect(result!.moment_id).toBe("m_04");
    expect(result!.reason).toContain("index 0");
  });
});
