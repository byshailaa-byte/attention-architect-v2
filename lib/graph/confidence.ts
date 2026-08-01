// ConfidenceVector — numeric, internal only.
//
// NEVER pass this structure (or any of its fields) to parent-facing API
// responses or report templates. The numeric values are for internal pipeline
// use and admin tooling only.
//
// The confidence guard test in __tests__/signature.test.ts enforces that
// BehaviourSignature (the parent-facing type) contains no numeric confidence
// fields. Add similar assertions to any new consumer of this module.

import type {
  HumanDecisionGraph,
  BehaviourGraph,
  BgSignalNode,
  EvidenceTier,
  BehaviourSignature,
} from "./types";
import { ALL_DIMENSIONS } from "./types";
import { QUESTION_WEIGHTS } from "./weights";

export interface ConfidenceVector {
  per_dimension_confidence: Record<string, number>;
  overall_confidence: number;
  contradiction_score: number;  // 0–1: proportion of populated dims with tension
  evidence_density: number;     // 0–1: populated dims / 6
  evidence_quality: number;     // 0–1: primary-tier weight / total weight
  missing_evidence: string[];   // dimensions with no contributing evidence
}

const TIER_BASE: Record<EvidenceTier, number> = {
  direct_evidence: 0.85,
  framework_interpretation: 0.80,
  hypothesis: 0.40,
  insufficient_evidence: 0.0,
};

function dimConfidence(
  signalNode: BgSignalNode,
  hdg: HumanDecisionGraph
): number {
  const base = TIER_BASE[signalNode.evidence_tier];
  if (base === 0.0) return 0.0;

  let totalWeight = 0;
  let conditionalWeight = 0;

  for (const hdgNode of hdg.nodes) {
    const weights = QUESTION_WEIGHTS[hdgNode.source_question] ?? [];
    const match = weights.find((w) => w.dimension === signalNode.dimension);
    if (!match) continue;
    totalWeight += match.weight;
    if (hdgNode.context === "conditional") conditionalWeight += match.weight;
  }

  const conditionalShare = totalWeight > 0 ? conditionalWeight / totalWeight : 0;
  return base * (1 - 0.5 * conditionalShare);
}

export function buildConfidenceVector(
  hdg: HumanDecisionGraph,
  bg: BehaviourGraph,
  signature: BehaviourSignature
): ConfidenceVector {
  const per_dimension_confidence: Record<string, number> = {};
  let totalWeight = 0;
  let totalPrimaryWeight = 0;

  for (const signalNode of bg.signal_nodes) {
    per_dimension_confidence[signalNode.dimension] = dimConfidence(signalNode, hdg);

    for (const hdgNode of hdg.nodes) {
      const weights = QUESTION_WEIGHTS[hdgNode.source_question] ?? [];
      const match = weights.find((w) => w.dimension === signalNode.dimension);
      if (!match) continue;
      totalWeight += match.weight;
      if (match.tier === "primary") totalPrimaryWeight += match.weight;
    }
  }

  const populatedCount = bg.signal_nodes.length;

  const overall_confidence =
    populatedCount > 0
      ? Object.values(per_dimension_confidence).reduce((s, v) => s + v, 0) /
        populatedCount
      : 0.0;

  const contradiction_score =
    populatedCount > 0
      ? signature.dimensions.filter((d) => d.contradiction_flag).length / populatedCount
      : 0.0;

  const evidence_density = populatedCount / ALL_DIMENSIONS.length;
  const evidence_quality = totalWeight > 0 ? totalPrimaryWeight / totalWeight : 0.0;

  const populatedDims = new Set(bg.signal_nodes.map((n) => n.dimension));
  const missing_evidence = (ALL_DIMENSIONS as readonly string[]).filter(
    (d) => !populatedDims.has(d)
  );

  return {
    per_dimension_confidence,
    overall_confidence,
    contradiction_score,
    evidence_density,
    evidence_quality,
    missing_evidence,
  };
}
