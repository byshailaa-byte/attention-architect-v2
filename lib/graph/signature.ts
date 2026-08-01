import type {
  HdgNode,
  HumanDecisionGraph,
  BehaviourGraph,
  BgSignalNode,
  BehaviourSignature,
  DimensionSignature,
  DimensionExpression,
  EvidenceTierBreakdown,
  EvidenceTier,
} from "./types";
import { ALL_DIMENSIONS } from "./types";
import { QUESTION_WEIGHTS, QUESTION_HOME_DIMENSION, CROSS_DIM_VALUE_MAP, DIMENSION_VALIDATION } from "./weights";
import type { ContributingNode } from "./evidence";

// Returns the evidence tier as the narrative engine should use it for rendering.
// When validated: false, caps at framework_interpretation so the LLM hedges
// rather than asserting flatly. The stored evidence_tier is left untouched.
export function effectiveTier(dim: DimensionSignature): EvidenceTier {
  if (!dim.validated && dim.evidence_tier === "direct_evidence") {
    return "framework_interpretation";
  }
  return dim.evidence_tier;
}

const DIMENSION_LABELS: Record<string, string> = {
  attention_shape: "Attention Shape",
  reward_driver: "Motivational Driver",
  friction_response: "Friction Response",
  parent_instinct: "Parent Instinct",
  attention_competition: "Attention Competition",
  recharge_type: "Recharge Type",
  support_response: "Support Response",
};

function resolveVotingValue(
  questionId: string,
  sourceValue: string,
  targetDimension: string
): string | null {
  if (QUESTION_HOME_DIMENSION[questionId] === targetDimension) return sourceValue;
  const key = `${questionId}:${targetDimension}:${sourceValue}`;
  if (key in CROSS_DIM_VALUE_MAP) return CROSS_DIM_VALUE_MAP[key];
  return null;
}

function buildContributors(
  hdg: HumanDecisionGraph,
  dimension: string
): ContributingNode[] {
  const result: ContributingNode[] = [];
  for (const node of hdg.nodes) {
    const weights = QUESTION_WEIGHTS[node.source_question] ?? [];
    const match = weights.find((w) => w.dimension === dimension);
    if (!match) continue;
    result.push({
      node_id: node.id,
      source_value: node.source_value,
      voting_value: resolveVotingValue(node.source_question, node.source_value, dimension),
      context: node.context,
      weight: match.weight,
      tier: match.tier,
    });
  }
  return result;
}

function buildExpression(
  signalNode: BgSignalNode,
  contributors: ContributingNode[],
  hdgById: Record<string, HdgNode>
): DimensionExpression {
  if (signalNode.evidence_tier === "insufficient_evidence") {
    return { type: "insufficient_evidence", value: null, tension: null };
  }

  // Only primary questions from the dimension's own question bank drive the expression.
  // Cross-dimension secondaries affect the weighted vote and confidence but not the
  // qualitative description shown to parents.
  const primaryHomeContribs = contributors.filter((c) => {
    const node = hdgById[c.node_id];
    if (!node) return false;
    return (
      QUESTION_HOME_DIMENSION[node.source_question] === signalNode.dimension &&
      c.tier === "primary"
    );
  });

  // Nodes whose answer aligns with the dominant value — unconditional first.
  const dominantNodes = primaryHomeContribs
    .filter((c) => c.source_value === signalNode.value)
    .map((c) => hdgById[c.node_id]!)
    .sort((a, b) => {
      if (a.context === b.context) return 0;
      return a.context === "unconditional" ? -1 : 1;
    });

  // Unconditional primary nodes voting for a DIFFERENT value — genuine opposition.
  // Conditional disagreement is already encoded in the hypothesis tier and does not
  // produce a tension object (it would inflate the structural contradiction signal).
  const dissentingNodes = primaryHomeContribs
    .filter((c) => c.context === "unconditional" && c.source_value !== signalNode.value)
    .map((c) => hdgById[c.node_id]!);

  const dominantTexts = dominantNodes.map((n) => n.choice);
  const dissentingTexts = dissentingNodes.map((n) => n.choice);

  const expressionValue =
    dominantTexts.length === 0
      ? null
      : dominantTexts.length === 1
        ? dominantTexts[0]
        : dominantTexts;

  const tension =
    dissentingTexts.length > 0
      ? {
          value_a: dominantTexts.join("; "),
          value_b: dissentingTexts.join("; "),
        }
      : null;

  return { type: "qualitative_tendency", value: expressionValue, tension };
}

function buildBreakdown(contributors: ContributingNode[]): EvidenceTierBreakdown {
  let direct_evidence = 0;
  let hypothesis = 0;
  for (const c of contributors) {
    if (c.context === "conditional" || c.weight < 0.5) {
      hypothesis++;
    } else {
      direct_evidence++;
    }
  }
  return {
    direct_evidence,
    framework_interpretation: 0,
    hypothesis,
    insufficient_evidence: 0,
  };
}

export function buildBehaviourSignature(
  hdg: HumanDecisionGraph,
  bg: BehaviourGraph
): BehaviourSignature {
  const hdgById = Object.fromEntries(hdg.nodes.map((n) => [n.id, n]));
  const signalByDim = Object.fromEntries(bg.signal_nodes.map((n) => [n.dimension, n]));

  const dimensions: DimensionSignature[] = ALL_DIMENSIONS.map((dim) => {
    const signalNode = signalByDim[dim];

    const validated = DIMENSION_VALIDATION[dim]?.validated ?? true;

    if (!signalNode) {
      return {
        dimension: dim,
        label: DIMENSION_LABELS[dim] ?? dim,
        evidence_tier: "insufficient_evidence",
        validated,
        expression: { type: "insufficient_evidence", value: null, tension: null },
        evidence_count: 0,
        evidence_tier_breakdown: {
          direct_evidence: 0,
          framework_interpretation: 0,
          hypothesis: 0,
          insufficient_evidence: 0,
        },
        contradiction_flag: false,
        source_questions: [],
      };
    }

    const contributors = buildContributors(hdg, dim);
    const expression = buildExpression(signalNode, contributors, hdgById);
    const breakdown = buildBreakdown(contributors);

    const sourceQuestions = [
      ...new Set(
        signalNode.source_nodes
          .map((id) => hdgById[id]?.source_question)
          .filter((q): q is string => q !== undefined)
      ),
    ];

    return {
      dimension: dim,
      label: DIMENSION_LABELS[dim] ?? dim,
      evidence_tier: signalNode.evidence_tier,
      validated,
      expression,
      evidence_count: contributors.length,
      evidence_tier_breakdown: breakdown,
      contradiction_flag: expression.tension !== null,
      source_questions: sourceQuestions,
    };
  });

  return { dimensions };
}
