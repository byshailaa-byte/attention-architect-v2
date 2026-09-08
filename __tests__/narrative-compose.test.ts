// Tests for the Narrative Engine orchestration logic.
//
// These tests do NOT call the Anthropic API. generateMoment is mocked to return
// a deterministic fixture. Tests cover:
//   - Section count and moment_id structure (beats, not weeks)
//   - Loop section conditional (detected vs. not detected)
//   - fit_tier branching in compose-report instructions
//   - Roadmap format: 4 beats, section names don't contain "Week N"
//
// The Quality Engine (evidence citation checks, hedge-language validation) is
// a separate layer — tested when it is built.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NarrativeContext } from "@/lib/narrative/context";
import type { AttentionMoment } from "@/lib/narrative/types";

// ── Minimal fixtures ──────────────────────────────────────────────────────────

function makeHdgNode(id: string, question: string, value: string) {
  return {
    id,
    actor: "child" as const,
    trigger: `trigger for ${question}`,
    choice: `choice for ${question}:${value}`,
    source_question: question,
    source_value: value,
    context: "unconditional" as const,
  };
}

function makeSignalNode(dimension: string, value: string, tier: "direct_evidence" | "framework_interpretation" | "hypothesis") {
  return {
    id: `signal_${dimension}`,
    dimension,
    value,
    evidence_tier: tier,
    source_nodes: [`decision_${dimension}_G`],
    weight_sum: 1.0,
  };
}

function makeDimSig(dimension: string, value: string, tier: "direct_evidence" | "hypothesis" | "insufficient_evidence") {
  return {
    dimension,
    label: dimension,
    evidence_tier: tier,
    validated: true,
    expression: { type: "qualitative_tendency" as const, value, tension: null },
    evidence_count: 1,
    evidence_tier_breakdown: { direct_evidence: 1, framework_interpretation: 0, hypothesis: 0, insufficient_evidence: 0 },
    contradiction_flag: false,
    source_questions: ["G1"],
  };
}

function makeBaseCtx(overrides: Partial<NarrativeContext> = {}): NarrativeContext {
  const hdg = {
    nodes: [
      makeHdgNode("decision_G1", "G1", "narrow-deep"),
      makeHdgNode("decision_G2", "G2", "novelty"),
      makeHdgNode("decision_G3", "G3", "quick-fixer"),
    ],
  };
  const bg = {
    signal_nodes: [
      makeSignalNode("attention_shape", "narrow-deep", "direct_evidence"),
      makeSignalNode("reward_driver", "mastery", "direct_evidence"),
      makeSignalNode("friction_response", "solo-push", "framework_interpretation"),
      makeSignalNode("parent_instinct", "quick-fixer", "direct_evidence"),
      makeSignalNode("attention_competition", "novelty", "direct_evidence"),
      makeSignalNode("recharge_type", "sensory-quiet", "direct_evidence"),
    ],
    aggregates_edges: [],
  };
  const sig = {
    dimensions: [
      makeDimSig("attention_shape", "narrow-deep", "direct_evidence"),
      makeDimSig("reward_driver", "mastery", "direct_evidence"),
      makeDimSig("friction_response", "solo-push", "direct_evidence"),
      makeDimSig("parent_instinct", "quick-fixer", "direct_evidence"),
      makeDimSig("attention_competition", "novelty", "direct_evidence"),
      makeDimSig("recharge_type", "sensory-quiet", "direct_evidence"),
    ],
  };
  const loop = {
    detected: false,
    loop_tension_point: null,
    precedes_edges: [],
    pattern_summary: "quick-fixer; solo-push; mastery",
    loop_description: null,
  };
  const cv = {
    per_dimension_confidence: {},
    overall_confidence: 0.82,
    contradiction_score: 0,
    evidence_density: 1.0,
    evidence_quality: 0.9,
    missing_evidence: [],
  };
  const scoring = {
    archetype: "The All-In Kid",
    parent_pattern: "The Quick Fixer",
    archetype_fit_tier: "primary" as const,
    parent_instinct_fit_tier: "primary" as const,
    axes: {
      stability:  { value: 0.8, norm: 0.8, band: "Strong" as const, eligible: true },
      resistance: { value: 0.6, norm: 0.6, band: "Mixed" as const,  eligible: true },
      recovery:   { value: 0.5, norm: 0.5, band: "Mixed" as const,  eligible: true },
      attention:  { value: 0.5, norm: 0.5, band: "Mixed" as const,  eligible: true },
    },
    weakest_two: ["Resistance", "Recovery"],
    honest_flag: false,
    honest_trigger: null,
    data_richness: 0.8,
  };
  return {
    childName: "Arjun",
    ageBand: "10-11",
    gender: "boy",
    parentName: "Priya",
    pronouns: { subj: "he", obj: "him", poss: "his", reflexive: "himself" },
    concerns: [],
    archetype: "The All-In Kid",
    archetypeFitTier: "primary",
    parentInstinct: "The Quick Fixer",
    parentInstinctFitTier: "primary",
    hdg,
    bg,
    sig,
    loop,
    cv,
    scoring,
    ...overrides,
  };
}

// Mock generateMoment to return a deterministic Moment for any spec
vi.mock("@/lib/narrative/generate-moment", () => ({
  generateMoment: vi.fn(async (spec: { momentId: string; momentType: string; section: string; purpose: string; emotionalObjective: string; confidenceTier: string; behaviourNodeRefs: string[]; humanDecisionRefs: string[]; evidenceText: string[]; additionalInstruction?: string; wordTarget?: string }) => {
    const moment: AttentionMoment = {
      moment_id: spec.momentId,
      moment_type: spec.momentType as AttentionMoment["moment_type"],
      section: spec.section,
      purpose: spec.purpose,
      evidence_source: spec.humanDecisionRefs,
      confidence_tier: spec.confidenceTier as AttentionMoment["confidence_tier"],
      emotional_objective: spec.emotionalObjective,
      behaviour_node_refs: spec.behaviourNodeRefs,
      human_decision_refs: spec.humanDecisionRefs,
      content: `[fixture content for ${spec.section}]`,
    };
    return moment;
  }),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("composeReport — no loop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("produces exactly 11 moments (1 cover + 6 narrative + 4 roadmap beats) when loop is not detected", async () => {
    const { composeReport } = await import("@/lib/narrative/compose-report");
    const ctx = makeBaseCtx();
    const result = await composeReport(ctx);
    // 1 cover: Cover
    // 6 narrative: Recognition, Behaviour Pattern, What This Explains,
    //              Where We Are Less Certain, Hope, Future Story
    // 4 roadmap beats: b1–b4
    expect(result.report.moments).toHaveLength(11);
  });

  it("never produces a Roadmap section named 'Week N'", async () => {
    const { composeReport } = await import("@/lib/narrative/compose-report");
    const ctx = makeBaseCtx();
    const result = await composeReport(ctx);
    const roadmapMoments = result.report.moments.filter(m => m.section.startsWith("Roadmap"));
    for (const m of roadmapMoments) {
      expect(m.section).not.toMatch(/Week \d/);
    }
  });

  it("produces exactly 4 roadmap beats", async () => {
    const { composeReport } = await import("@/lib/narrative/compose-report");
    const ctx = makeBaseCtx();
    const result = await composeReport(ctx);
    const roadmapMoments = result.report.moments.filter(m => m.section.startsWith("Roadmap"));
    expect(roadmapMoments).toHaveLength(4);
  });

  it("roadmap beat moment_ids are m_roadmap_b1..b4", async () => {
    const { composeReport } = await import("@/lib/narrative/compose-report");
    const ctx = makeBaseCtx();
    const result = await composeReport(ctx);
    const ids = result.report.moments
      .filter(m => m.section.startsWith("Roadmap"))
      .map(m => m.moment_id);
    expect(ids).toEqual(["m_roadmap_b1", "m_roadmap_b2", "m_roadmap_b3", "m_roadmap_b4"]);
  });

  it("does not include a Family Attention Loop moment when loop is not detected", async () => {
    const { composeReport } = await import("@/lib/narrative/compose-report");
    const ctx = makeBaseCtx();
    const result = await composeReport(ctx);
    const loopMoments = result.report.moments.filter(m => m.section === "Family Attention Loop");
    expect(loopMoments).toHaveLength(0);
  });

  it("returns correct archetype and fit tier metadata", async () => {
    const { composeReport } = await import("@/lib/narrative/compose-report");
    const ctx = makeBaseCtx();
    const result = await composeReport(ctx);
    expect(result.report.archetype).toBe("The All-In Kid");
    expect(result.report.archetype_fit_tier).toBe("primary");
    expect(result.report.parent_instinct).toBe("The Quick Fixer");
    expect(result.report.parent_instinct_fit_tier).toBe("primary");
  });
});

describe("composeReport — with loop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("produces exactly 11 moments (7 narrative + 4 roadmap beats) when loop is detected", async () => {
    const { composeReport } = await import("@/lib/narrative/compose-report");
    const ctx = makeBaseCtx({
      loop: {
        detected: true,
        loop_tension_point: {
          parent_node_id: "decision_G3",
          child_node_id: "decision_G1",
          parent_dimension: "parent_instinct",
          child_dimension: "friction_response",
          mechanism: "intervenes_too_early",
          description: "Quick-fixer fires when child is stuck, preempting coping",
        },
        precedes_edges: [],
        pattern_summary: "quick-fixer; solo-push; mastery",
        loop_description: "Parent intervenes before child can resolve.",
      },
    });
    const result = await composeReport(ctx);
    // 1 cover: Cover
    // 7 narrative: Recognition, Behaviour Pattern, Family Attention Loop, What This Explains,
    //              Where We Are Less Certain, Hope, Future Story
    // 4 roadmap beats: b1–b4
    expect(result.report.moments).toHaveLength(12);
  });

  it("includes a Family Attention Loop moment when loop is detected", async () => {
    const { composeReport } = await import("@/lib/narrative/compose-report");
    const ctx = makeBaseCtx({
      loop: {
        detected: true,
        loop_tension_point: {
          parent_node_id: "decision_G3",
          child_node_id: "decision_G1",
          parent_dimension: "parent_instinct",
          child_dimension: "friction_response",
          mechanism: "intervenes_too_early",
          description: "Quick-fixer fires when child is stuck",
        },
        precedes_edges: [],
        pattern_summary: "quick-fixer; solo-push; mastery",
        loop_description: "Parent intervenes before child can resolve.",
      },
    });
    const result = await composeReport(ctx);
    const loopMoments = result.report.moments.filter(m => m.section === "Family Attention Loop");
    expect(loopMoments).toHaveLength(1);
  });
});

describe("fit_tier branching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Behaviour Pattern moment is called with no_clear_fit instruction when tier is no_clear_fit", async () => {
    const { generateMoment } = await import("@/lib/narrative/generate-moment");
    const { composeReport } = await import("@/lib/narrative/compose-report");

    const ctx = makeBaseCtx({ archetypeFitTier: "no_clear_fit" });
    await composeReport(ctx);

    const calls = vi.mocked(generateMoment).mock.calls;
    const patternCall = calls.find(([spec]) => spec.section === "Behaviour Pattern");
    expect(patternCall).toBeDefined();
    const instruction = patternCall![0].additionalInstruction ?? "";
    // Must NOT include the archetype name in any form — not quoted, not bare
    expect(instruction).not.toContain("The All-In Kid");
    // Must contain the instruction to skip the label
    expect(instruction).toMatch(/Do NOT name an archetype label/i);
  });

  it("Behaviour Pattern moment names archetype with hedge when tier is weak", async () => {
    const { generateMoment } = await import("@/lib/narrative/generate-moment");
    const { composeReport } = await import("@/lib/narrative/compose-report");

    const ctx = makeBaseCtx({ archetypeFitTier: "weak" });
    await composeReport(ctx);

    const calls = vi.mocked(generateMoment).mock.calls;
    const patternCall = calls.find(([spec]) => spec.section === "Behaviour Pattern");
    const instruction = patternCall![0].additionalInstruction ?? "";
    expect(instruction).toContain("The All-In Kid");
    expect(instruction).toMatch(/closest.*found|most.*toward/i);
  });

  it("Behaviour Pattern moment names archetype directly when tier is primary", async () => {
    const { generateMoment } = await import("@/lib/narrative/generate-moment");
    const { composeReport } = await import("@/lib/narrative/compose-report");

    const ctx = makeBaseCtx({ archetypeFitTier: "primary" });
    await composeReport(ctx);

    const calls = vi.mocked(generateMoment).mock.calls;
    const patternCall = calls.find(([spec]) => spec.section === "Behaviour Pattern");
    const instruction = patternCall![0].additionalInstruction ?? "";
    // The archetype name appears in the instruction
    expect(instruction).toContain("The All-In Kid");
    // No tier-qualifier hedge (weak uses "closest", secondary uses "genuine but not the strongest")
    expect(instruction).not.toMatch(/closest.*found/i);
    expect(instruction).not.toMatch(/genuine but not the strongest/i);
  });

  it("Behaviour Pattern moment names archetype with graded confidence when tier is secondary", async () => {
    const { generateMoment } = await import("@/lib/narrative/generate-moment");
    const { composeReport } = await import("@/lib/narrative/compose-report");

    const ctx = makeBaseCtx({ archetypeFitTier: "secondary" });
    await composeReport(ctx);

    const calls = vi.mocked(generateMoment).mock.calls;
    const patternCall = calls.find(([spec]) => spec.section === "Behaviour Pattern");
    const instruction = patternCall![0].additionalInstruction ?? "";
    // Names the archetype directly
    expect(instruction).toContain("The All-In Kid");
    // Acknowledges the fit is genuine but not the strongest — graded confidence
    expect(instruction).toMatch(/genuine but not the strongest possible/i);
    // Does NOT use the weak-tier "closest pattern" hedge
    expect(instruction).not.toMatch(/closest.*found/i);
    // Does NOT suppress the label (that's no_clear_fit only)
    expect(instruction).not.toMatch(/Do NOT name an archetype label/i);
  });
});

describe("roadmap format invariants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("roadmap additionalInstruction forbids week-number format", async () => {
    const { generateMoment } = await import("@/lib/narrative/generate-moment");
    const { composeReport } = await import("@/lib/narrative/compose-report");

    const ctx = makeBaseCtx();
    await composeReport(ctx);

    const calls = vi.mocked(generateMoment).mock.calls;
    const roadmapCalls = calls.filter(([spec]) => spec.section.startsWith("Roadmap"));

    expect(roadmapCalls).toHaveLength(4);
    for (const [spec] of roadmapCalls) {
      const instr = spec.additionalInstruction ?? "";
      // Must contain the format prohibition
      expect(instr).toMatch(/Do NOT write.*Week \d/i);
      // Must say "outcome" not "curriculum"
      expect(instr).toMatch(/outcome/i);
    }
  });

  it("roadmap moment_type is 'action' for all beats", async () => {
    const { composeReport } = await import("@/lib/narrative/compose-report");
    const ctx = makeBaseCtx();
    const result = await composeReport(ctx);
    const roadmapMoments = result.report.moments.filter(m => m.section.startsWith("Roadmap"));
    for (const m of roadmapMoments) {
      expect(m.moment_type).toBe("action");
    }
  });
});
