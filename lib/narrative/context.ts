// NarrativeContext — the full family context passed to every per-Moment call.
// Built once per report generation from the pipeline outputs.
// confidence_vector values never leave this struct into generated prose.

import type { HumanDecisionGraph, BehaviourGraph, BehaviourSignature, DimensionSignature } from "@/lib/graph/types";
import { effectiveTier } from "@/lib/graph/signature";
import type { FamilyAttentionLoop } from "@/lib/graph/loop";
import type { ScoringOutput } from "@/lib/engine/scorer";
import type { ConfidenceVector } from "@/lib/graph/confidence";
import type { Gender } from "@/lib/report/pronouns";
import { resolveChildPronoun } from "@/lib/report/pronouns";

export interface Pronouns {
  subj: string;
  obj: string;
  poss: string;
  reflexive: string;
}

export interface NarrativeContext {
  // Family identity
  childName: string;
  ageBand: string;
  gender: Gender;
  parentName: string;
  pronouns: Pronouns;
  // Parent's stated concerns from the assessment form (e.g. ["focus", "screens"])
  concerns: string[];
  // Follow-up answer echo text from the landing page (e.g. "They delay starting as long as possible").
  // Null/absent when the parent navigated directly to /assessment without the landing page flow.
  // Used exclusively as the required anchor for m_teaser — not used in any other moment.
  worryFollowup?: string | null;

  // Resolved outputs
  archetype: string;
  archetypeFitTier: string;
  parentInstinct: string;
  parentInstinctFitTier: string;

  // Graph pipeline (full graph data for evidence selection)
  hdg: HumanDecisionGraph;
  bg: BehaviourGraph;
  sig: BehaviourSignature;
  loop: FamilyAttentionLoop;

  // Internal only — never passed to LLM prompts as numeric values
  cv: ConfidenceVector;
  scoring: ScoringOutput;
}

export function buildNarrativeContext(
  assessment: {
    child_name: string | null;
    age_band: string;
    child_gender: string | null;
    parent_name: string;
    archetype: string;
    archetype_fit_tier: string;
    parent_pattern: string;
    parent_instinct_fit_tier: string;
    concerns?: string[];
    worry_followup?: string | null;
  },
  hdg: HumanDecisionGraph,
  bg: BehaviourGraph,
  sig: BehaviourSignature,
  loop: FamilyAttentionLoop,
  cv: ConfidenceVector,
  scoring: ScoringOutput,
): NarrativeContext {
  const gender = (assessment.child_gender ?? null) as Gender;
  return {
    childName: assessment.child_name || "your child",
    ageBand: assessment.age_band,
    gender,
    parentName: assessment.parent_name,
    concerns: assessment.concerns ?? [],
    worryFollowup: assessment.worry_followup ?? null,
    pronouns: {
      subj:      resolveChildPronoun(gender, "subj"),
      obj:       resolveChildPronoun(gender, "obj"),
      poss:      resolveChildPronoun(gender, "poss"),
      reflexive: resolveChildPronoun(gender, "reflexive"),
    },
    archetype: assessment.archetype,
    archetypeFitTier: assessment.archetype_fit_tier,
    parentInstinct: assessment.parent_pattern,
    parentInstinctFitTier: assessment.parent_instinct_fit_tier,
    hdg,
    bg,
    sig,
    loop,
    cv,
    scoring,
  };
}

// ── Context serialisation for LLM prompts ────────────────────────────────────

// Describes a dimension in plain language for the prompt.
// Returns null if insufficient_evidence — caller decides whether to include or skip.
function describeSignatureDim(dim: DimensionSignature): string | null {
  if (dim.evidence_tier === "insufficient_evidence") return null;
  const expr = dim.expression;
  const val = Array.isArray(expr.value) ? expr.value.join("; ") : (expr.value ?? "unclear");
  // Use effectiveTier so unvalidated dimensions are capped at framework_interpretation.
  // The stored evidence_tier is not mutated — this is a rendering-level cap only.
  const rendered = effectiveTier(dim);
  const tierLabel = rendered === "direct_evidence"         ? "observed directly"
                  : rendered === "hypothesis"              ? "uncertain — hedge language required"
                  :                                          "inferred from combined signals";
  const validationNote = !dim.validated
    ? " [UNVALIDATED DIMENSION — hedge all claims, do not assert as established fact]"
    : "";
  let base = `${dim.label}: ${val} [${tierLabel}${validationNote}]`;
  if (expr.tension) {
    base += `\n  Note: this dimension carries a genuine tension — the child also shows: ${expr.tension.value_b}. Acknowledge both when writing about it.`;
  }
  return base;
}

// Builds the full family context block passed to every LLM call.
// Does NOT include numeric confidence values from cv — those are internal only.
//
// scopedNodeIds: when provided, the ASSESSMENT DECISIONS block is filtered to only
// those HDG node IDs. This is the enforcement mechanism that makes relevantQ an
// actual restriction rather than an additive suggestion — each moment call passes
// new Set(spec.humanDecisionRefs) so the LLM cannot synthesize from out-of-scope answers.
// When absent (no argument), the full HDG is included — used only by callers that need
// the complete context (e.g. tests, introspection utilities).
export function serialiseContext(ctx: NarrativeContext, scopedNodeIds?: Set<string>): string {
  const { childName, ageBand, parentName, archetype, parentInstinct, loop, sig, pronouns, hdg } = ctx;

  const pronStr = `${pronouns.subj}/${pronouns.obj}/${pronouns.poss}`;

  const dims = sig.dimensions
    .map(d => describeSignatureDim(d))
    .filter((s): s is string => s !== null)
    .join("\n");

  const visibleNodes = scopedNodeIds
    ? hdg.nodes.filter(n => scopedNodeIds.has(n.id))
    : hdg.nodes;

  const hdgSummary = visibleNodes.map(n =>
    `  [${n.id}] (${n.actor}, ${n.context}) ${n.trigger} → ${n.choice}`
  ).join("\n");

  const loopBlock = loop.detected && loop.loop_tension_point
    ? `FAMILY ATTENTION LOOP: detected
Mechanism: ${loop.loop_tension_point.mechanism}
Tension: ${loop.loop_tension_point.description}
Loop description: ${loop.loop_description}
Pattern summary: ${loop.pattern_summary}`
    : `FAMILY ATTENTION LOOP: not detected (thin-data or no rule fired)
Pattern summary: ${loop.pattern_summary}`;

  const concernsBlock = ctx.concerns.length > 0
    ? `Parent's stated concerns: ${ctx.concerns.join(", ")}`
    : "";

  return `FAMILY CONTEXT:
Child: ${childName}, age band ${ageBand}, pronouns ${pronStr}
Parent: ${parentName}
Child's archetype: ${archetype} (fit tier: ${ctx.archetypeFitTier})
Parent's instinct: ${parentInstinct} (fit tier: ${ctx.parentInstinctFitTier})
${concernsBlock}

BEHAVIOUR DIMENSIONS (from assessment):
${dims}

ASSESSMENT DECISIONS (HDG nodes — the raw answers behind the dimensions):
${hdgSummary}

${loopBlock}`;
}

// Returns HDG nodes relevant to a given list of source questions.
export function hdgNodesForQuestions(
  ctx: NarrativeContext,
  questionIds: string[],
): import("@/lib/graph/types").HdgNode[] {
  const ids = new Set(questionIds);
  return ctx.hdg.nodes.filter(n => ids.has(n.source_question));
}

// Returns BG signal node IDs for given dimensions.
export function bgNodeIdsForDims(
  ctx: NarrativeContext,
  dimensions: string[],
): string[] {
  const dimSet = new Set(dimensions);
  return ctx.bg.signal_nodes
    .filter(n => dimSet.has(n.dimension))
    .map(n => n.id);
}
