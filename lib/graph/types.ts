export type Actor = "child" | "parent";
export type Context = "unconditional" | "conditional";
export type EvidenceTier =
  | "direct_evidence"
  | "framework_interpretation"
  | "hypothesis"
  | "insufficient_evidence";

export const ALL_DIMENSIONS = [
  "attention_shape",
  "reward_driver",
  "friction_response",
  "parent_instinct",
  "attention_competition",
  "recharge_type",
  "recovery_response",
] as const;

export type Dimension = (typeof ALL_DIMENSIONS)[number];

export interface HdgNode {
  id: string;
  actor: Actor;
  trigger: string;
  choice: string;
  source_question: string;
  source_value: string;
  context: Context;
}

export interface AggregatesEdge {
  type: "aggregates";
  from_nodes: string[];
  to_node: string;
}

export interface BgSignalNode {
  id: string;
  dimension: string;
  value: string;
  evidence_tier: EvidenceTier;
  source_nodes: string[];
  weight_sum: number;
}

export interface HumanDecisionGraph {
  nodes: HdgNode[];
}

export interface BehaviourGraph {
  signal_nodes: BgSignalNode[];
  aggregates_edges: AggregatesEdge[];
}

// ── Behaviour Signature ───────────────────────────────────────────────────────

// value is NEVER numeric — hard brand guardrail.
// Numeric confidence lives exclusively in ConfidenceVector (lib/graph/confidence.ts),
// which must never be serialised into parent-facing responses or report templates.
// string for a single tendency; string[] for compatible facets of one tendency.
// tension is non-null only for genuinely competing (not merely multi-faceted) tendencies.
export interface DimensionExpression {
  type: "qualitative_tendency" | "insufficient_evidence";
  value: string | string[] | null;
  tension: { value_a: string; value_b: string } | null;
}

// direct_evidence   = unconditional contributors with weight >= 0.5
// framework_interpretation = always 0 (aggregate concept, not per-node)
// hypothesis        = conditional or supporting-only (weight < 0.5) contributors
export interface EvidenceTierBreakdown {
  direct_evidence: number;
  framework_interpretation: number;
  hypothesis: number;
  insufficient_evidence: number;
}

export interface DimensionSignature {
  dimension: string;
  label: string;
  evidence_tier: EvidenceTier;
  // Whether this dimension has passed the real-production signal-threshold review.
  // false → narrative engine caps rendering confidence at framework_interpretation.
  // The stored evidence_tier is never mutated by this flag.
  validated: boolean;
  expression: DimensionExpression;
  evidence_count: number;
  evidence_tier_breakdown: EvidenceTierBreakdown;
  contradiction_flag: boolean;
  source_questions: string[];
}

// Fixed-shape: one entry per dimension in ALL_DIMENSIONS, regardless of routing.
// Absent dimensions get evidence_tier "insufficient_evidence" and
// expression.type "insufficient_evidence".
export interface BehaviourSignature {
  dimensions: DimensionSignature[];
}
