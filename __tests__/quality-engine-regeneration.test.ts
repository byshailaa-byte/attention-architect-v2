// Tests for the Quality Engine orchestration layer — regeneration and retry logic.
//
// generateMoment is mocked so no real LLM calls are made.
// These tests exercise the engine's loop: detect failing moment → call generateMoment
// with that moment's spec → re-check → stop if clean.
//
// The label_once case tested here is the one that previously returned moment_id=null
// (making regeneration impossible). The fix in checkLabelOnce now returns the specific
// offending moment_id so the engine can regenerate surgically.

import { vi, describe, it, expect, beforeEach } from "vitest";
import type { AttentionMoment } from "@/lib/narrative/types";
import type { MomentSpec } from "@/lib/narrative/generate-moment";
import type { FamilyAttentionLoop } from "@/lib/graph/loop";
import type { NarrativeContext } from "@/lib/narrative/context";

// Must be declared before the import it targets — vitest hoists vi.mock() automatically.
vi.mock("@/lib/narrative/generate-moment");

import { generateMoment } from "@/lib/narrative/generate-moment";
import { runQualityEngine } from "@/lib/quality/engine";

const ARCHETYPE = "The Explorer";
const PARENT_INSTINCT = "The Encourager";

const LOOP_NOT_DETECTED: FamilyAttentionLoop = {
  detected: false,
  loop_tension_point: null,
  precedes_edges: [],
  pattern_summary: "narrow-deep; autonomy",
  loop_description: null,
};

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

function makeSpec(momentId: string, section: string): MomentSpec {
  return {
    momentId,
    momentType: "recognition",
    section,
    purpose: "test",
    emotionalObjective: "test",
    confidenceTier: "direct_evidence",
    behaviourNodeRefs: ["signal_attention_shape"],
    humanDecisionRefs: ["decision_G1"],
    evidenceText: ["child explores independently"],
  };
}

describe("Quality Engine — label_once incremental regeneration", () => {
  beforeEach(() => {
    vi.mocked(generateMoment).mockReset();
  });

  it("regenerates the moment when archetype label appears in Behaviour Pattern (template-duplicate scenario)", async () => {
    // Situation: LLM wrote "The Explorer" in BP prose. The template ALSO injects
    // "We call this pattern The Explorer…" as a label line → user sees it twice.
    // checkLabelOnce now returns moment_id="m_02" → engine regenerates m_02.
    const originalM02 = makeM({
      moment_id: "m_02",
      section: "Behaviour Pattern",
      content: "The Explorer pattern is unmistakable here. She goes all the way in.",
    });

    const moments: AttentionMoment[] = [
      makeM({ moment_id: "m_01", section: "Recognition",        content: "Shailaa locks in when the task is hers." }),
      originalM02,
      makeM({ moment_id: "m_04", section: "What This Explains", content: "This is why she resists being told what to do." }),
      makeM({ moment_id: "m_06", section: "Hope",               content: "There is a real path forward." }),
    ];

    // Mock: clean version of BP with the prose label removed
    const cleanM02 = makeM({
      moment_id: "m_02",
      section: "Behaviour Pattern",
      content: "She goes all the way in and won't surface until it's done.",
    });
    vi.mocked(generateMoment).mockResolvedValueOnce(cleanM02);

    const specs: Record<string, MomentSpec> = {
      m_01: makeSpec("m_01", "Recognition"),
      m_02: makeSpec("m_02", "Behaviour Pattern"),
      m_04: makeSpec("m_04", "What This Explains"),
      m_06: makeSpec("m_06", "Hope"),
    };

    const result = await runQualityEngine({
      moments,
      specs,
      archetype: ARCHETYPE,
      archetypeFitTier: "primary",
      parentInstinct: PARENT_INSTINCT,
      parentInstinctFitTier: "no_clear_fit",
      loop: LOOP_NOT_DETECTED,
      priorRecognitionTexts: [],
      ctx: {} as NarrativeContext,
    });

    // Engine called generateMoment exactly once — for m_02
    expect(vi.mocked(generateMoment)).toHaveBeenCalledTimes(1);
    const calledSpec = vi.mocked(generateMoment).mock.calls[0][0] as MomentSpec;
    expect(calledSpec.momentId).toBe("m_02");

    // Final report passes — no remaining failures
    expect(result.qualityResult.passed).toBe(true);
    expect(result.qualityResult.failures).toHaveLength(0);

    // The regenerated moment replaced m_02 and no longer contains the label
    const finalM02 = result.moments.find(m => m.moment_id === "m_02");
    expect(finalM02?.content).toBe(cleanM02.content);
    expect(finalM02?.content).not.toContain("The Explorer");
  });

  it("does not call generateMoment when archetype label is absent from all content", async () => {
    // Template provides the label line; LLM prose must not echo it.
    const moments: AttentionMoment[] = [
      makeM({ moment_id: "m_01", section: "Recognition",        content: "Shailaa locks in when the task is hers." }),
      makeM({ moment_id: "m_02", section: "Behaviour Pattern",  content: "She goes all the way in and won't surface until it's done." }),
      makeM({ moment_id: "m_04", section: "What This Explains", content: "This is why she resists being told what to do." }),
    ];

    const specs: Record<string, MomentSpec> = {
      m_01: makeSpec("m_01", "Recognition"),
      m_02: makeSpec("m_02", "Behaviour Pattern"),
      m_04: makeSpec("m_04", "What This Explains"),
    };

    const result = await runQualityEngine({
      moments,
      specs,
      archetype: ARCHETYPE,
      archetypeFitTier: "primary",
      parentInstinct: PARENT_INSTINCT,
      parentInstinctFitTier: "no_clear_fit",
      loop: LOOP_NOT_DETECTED,
      priorRecognitionTexts: [],
      ctx: {} as NarrativeContext,
    });

    expect(vi.mocked(generateMoment)).not.toHaveBeenCalled();
    expect(result.qualityResult.passed).toBe(true);
  });
});
