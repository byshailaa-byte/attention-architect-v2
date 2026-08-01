import type {
  HumanDecisionGraph,
  BehaviourGraph,
  BgSignalNode,
  AggregatesEdge,
} from "./types";
import { ALL_DIMENSIONS } from "./types";
import { QUESTION_WEIGHTS, QUESTION_HOME_DIMENSION, CROSS_DIM_VALUE_MAP } from "./weights";
import { resolveEvidenceTier, type ContributingNode } from "./evidence";

// Resolve the value this node should cast in the target dimension's weighted vote.
// For primary-dimension contributors the source value is already in the right vocabulary.
// For cross-dimension contributors the value must be translated; if no translation exists
// the node still counts for evidence density but casts no vote (returns null).
function resolveVotingValue(
  questionId: string,
  sourceValue: string,
  targetDimension: string
): string | null {
  if (QUESTION_HOME_DIMENSION[questionId] === targetDimension) {
    return sourceValue;
  }
  const key = `${questionId}:${targetDimension}:${sourceValue}`;
  if (key in CROSS_DIM_VALUE_MAP) {
    return CROSS_DIM_VALUE_MAP[key];
  }
  // Unknown cross-dimension mapping — treat as no vote
  return null;
}

// Aggregate HDG nodes into Behaviour Graph signal nodes.
//
// For each of the 6 dimensions:
// - Collect every HDG node whose source question has a weight for this dimension
// - Resolve voting value (translated for cross-dimension contributions)
// - Determine dominant value via weighted vote (highest total weight wins)
// - Resolve evidence tier per Part 4 mixed-certainty aggregation rules
// - Emit one signal node + one aggregates edge
//
// Dimensions with no contributing HDG nodes are omitted from signal_nodes
// (insufficient_evidence is implicit for absent dimensions).
export function buildBehaviourGraph(hdg: HumanDecisionGraph): BehaviourGraph {
  const signal_nodes: BgSignalNode[] = [];
  const aggregates_edges: AggregatesEdge[] = [];

  for (const dimension of ALL_DIMENSIONS) {
    const contributors: ContributingNode[] = [];

    for (const hdgNode of hdg.nodes) {
      const weights = QUESTION_WEIGHTS[hdgNode.source_question] ?? [];
      const match = weights.find((w) => w.dimension === dimension);
      if (!match) continue;

      const votingValue = resolveVotingValue(
        hdgNode.source_question,
        hdgNode.source_value,
        dimension
      );

      contributors.push({
        node_id: hdgNode.id,
        source_value: hdgNode.source_value,
        voting_value: votingValue,
        context: hdgNode.context,
        weight: match.weight,
        tier: match.tier,
      });
    }

    if (contributors.length === 0) continue;

    // Weighted vote for dominant value (only voting_value !== null participates)
    const votes: Record<string, number> = {};
    for (const c of contributors) {
      if (c.voting_value !== null) {
        votes[c.voting_value] = (votes[c.voting_value] ?? 0) + c.weight;
      }
    }

    if (Object.keys(votes).length === 0) continue; // all contributors have null voting values

    const dominantValue = Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
    const weightSum = contributors.reduce((s, c) => s + c.weight, 0);

    const evidence_tier = resolveEvidenceTier(contributors);
    const signalNodeId = `signal_${dimension}`;

    signal_nodes.push({
      id: signalNodeId,
      dimension,
      value: dominantValue,
      evidence_tier,
      source_nodes: contributors.map((c) => c.node_id),
      weight_sum: weightSum,
    });

    aggregates_edges.push({
      type: "aggregates",
      from_nodes: contributors.map((c) => c.node_id),
      to_node: signalNodeId,
    });
  }

  return { signal_nodes, aggregates_edges };
}
