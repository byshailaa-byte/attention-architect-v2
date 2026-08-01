// Family Attention Loop — detects cross-person, cross-dimension tension points.
//
// A loop_tension_point is structurally distinct from a DimensionExpression.tension:
//   dimension_tension  — intra-dimension, intra-person: two of a child's primary
//                        unconditional answers on the same dimension disagree.
//   loop_tension_point — cross-person, cross-dimension: the parent's instinctive
//                        response creates a conflict with the child's behavioral pattern.
//
// Loop candidates are built via precedes edges (temporal ordering of HDG decisions)
// and retained only when a genuine tension point clears the rule bar.
// When no rule fires, the thin-data fallback returns pattern_summary only —
// no loop is forced, no description is generated.
//
// Reading expression.tension from the Signature (per Phase 3 constraint):
// intra-dimension tension is noted in the loop_description when present, but it
// does not drive loop detection — the rules operate on BG signal values and HDG node IDs.

import type { HumanDecisionGraph, BehaviourGraph, BehaviourSignature } from "./types";
import { deriveArchetype } from "@/lib/engine/scorer";

export interface PrecedesEdge {
  type: "precedes";
  from_node: string;
  to_node: string;
  mechanism: string;
}

export interface LoopTensionPoint {
  parent_node_id: string;
  child_node_id: string;
  parent_dimension: string;
  child_dimension: string;
  mechanism: "intervenes_too_early" | "stays_too_long" | "misaligned_response";
  description: string;
}

export interface FamilyAttentionLoop {
  detected: boolean;
  loop_tension_point: LoopTensionPoint | null;
  precedes_edges: PrecedesEdge[];
  pattern_summary: string;
  loop_description: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hdgNode(hdg: HumanDecisionGraph, sourceQuestion: string) {
  return hdg.nodes.find((n) => n.source_question === sourceQuestion);
}

// First expression text for a dimension, used in pattern_summary.
function dimText(sig: BehaviourSignature, dimension: string): string {
  const dim = sig.dimensions.find((d) => d.dimension === dimension);
  if (!dim || dim.evidence_tier === "insufficient_evidence") return "";
  const v = dim.expression.value;
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

function patternSummary(sig: BehaviourSignature): string {
  const parts = [
    dimText(sig, "parent_instinct"),
    dimText(sig, "friction_response"),
    dimText(sig, "reward_driver"),
  ].filter(Boolean);
  return parts.length > 0
    ? parts.join("; ")
    : "Insufficient data to characterise the family attention pattern.";
}

function noLoop(sig: BehaviourSignature): FamilyAttentionLoop {
  return {
    detected: false,
    loop_tension_point: null,
    precedes_edges: [],
    pattern_summary: patternSummary(sig),
    loop_description: null,
  };
}

// ── Rule implementations ──────────────────────────────────────────────────────

// Rule 1 — quick-fixer × friction_response (hypothesis tier or solo-push value)
//
// Parent steps in "when child is stuck or struggling" — the exact moment
// the child's friction pattern would activate. If friction is still at hypothesis
// (conditional evidence, no reliable pattern yet) or the dominant value is solo-push,
// the parent's arrival preempts the child's own coping attempt in a systematic way.
function rule1QuickFixer(
  hdg: HumanDecisionGraph,
  bg: BehaviourGraph,
  sig: BehaviourSignature,
  g3Node: NonNullable<ReturnType<typeof hdgNode>>
): FamilyAttentionLoop | null {
  const frictionSignal = bg.signal_nodes.find((n) => n.dimension === "friction_response");
  const frictionDim = sig.dimensions.find((d) => d.dimension === "friction_response");
  if (!frictionSignal || !frictionDim) return null;

  const fires =
    frictionDim.evidence_tier === "hypothesis" || frictionSignal.value === "solo-push";
  if (!fires) return null;

  // Read dimension tension (per Phase 3 constraint) — note it in the description
  // but it does not change detection outcome here.
  const hasDimTension = frictionDim.expression.tension !== null;
  const frictionNode =
    hdgNode(hdg, "D3.2") ??
    hdg.nodes.find((n) => frictionSignal.source_nodes.includes(n.id));
  if (!frictionNode) return null;

  const tensionNote = hasDimTension
    ? " (the dimension itself carries competing friction patterns)"
    : "";

  return {
    detected: true,
    loop_tension_point: {
      parent_node_id: g3Node.id,
      child_node_id: frictionNode.id,
      parent_dimension: "parent_instinct",
      child_dimension: "friction_response",
      mechanism: "intervenes_too_early",
      description:
        "Quick-fixer instinct fires when child is stuck, preempting the child's own coping attempt before it can resolve",
    },
    precedes_edges: [
      {
        type: "precedes",
        from_node: frictionNode.id,
        to_node: g3Node.id,
        mechanism: "child struggle triggers parent quick-fix response",
      },
      {
        type: "precedes",
        from_node: g3Node.id,
        to_node: frictionNode.id,
        mechanism:
          "parent intervention preempts child's coping attempt, perpetuating the struggle",
      },
    ],
    pattern_summary: patternSummary(sig),
    loop_description: `The parent's instinct (${g3Node.choice}) fires at the same moment the child's friction response is still forming${tensionNote}. The child never completes their own coping cycle — each intervention resets the uncertainty.`,
  };
}

// Rule 2 — pusher × mastery with D2.3 disengagement
//
// D2.3=mastery means the child disengages "when it stopped being challenging" —
// their internal signal of task completion. The pusher reads disengagement as
// quitting and activates exactly at the moment the child has already finished.
function rule2PusherMastery(
  hdg: HumanDecisionGraph,
  bg: BehaviourGraph,
  sig: BehaviourSignature,
  g3Node: NonNullable<ReturnType<typeof hdgNode>>
): FamilyAttentionLoop | null {
  const rewardSignal = bg.signal_nodes.find((n) => n.dimension === "reward_driver");
  if (!rewardSignal || rewardSignal.value !== "mastery") return null;

  const d23Node = hdgNode(hdg, "D2.3");
  if (!d23Node || !rewardSignal.source_nodes.includes(d23Node.id)) return null;

  const rechargeSig = bg.signal_nodes.find((n) => n.dimension === "recharge_type");
  const rechargeNode = rechargeSig
    ? hdg.nodes.find((n) => rechargeSig.source_nodes.includes(n.id))
    : null;

  // Read dimension tension (per Phase 3 constraint).
  const rewardDim = sig.dimensions.find((d) => d.dimension === "reward_driver");
  const hasDimTension = rewardDim?.expression.tension !== null;

  const secondTo = rechargeNode ?? d23Node;
  const secondMechanism = rechargeNode
    ? "push conflicts with child's need to disengage and recharge autonomously after completion"
    : "push continues past the child's own completion signal, creating friction around a resolved challenge";

  return {
    detected: true,
    loop_tension_point: {
      parent_node_id: g3Node.id,
      child_node_id: d23Node.id,
      parent_dimension: "parent_instinct",
      child_dimension: "reward_driver",
      mechanism: "stays_too_long",
      description:
        "Pusher instinct fires when child disengages, misreading the child's mastery-completion signal as giving up",
    },
    precedes_edges: [
      {
        type: "precedes",
        from_node: d23Node.id,
        to_node: g3Node.id,
        mechanism: "child's mastery-completion disengagement triggers parent push",
      },
      {
        type: "precedes",
        from_node: g3Node.id,
        to_node: secondTo.id,
        mechanism: secondMechanism,
      },
    ],
    pattern_summary: patternSummary(sig),
    loop_description: `The child's disengagement ("${d23Node.choice}") is an internal completion signal${hasDimTension ? ", complicated by competing motivational facets" : ""}. The parent's push arrives after the child has already finished, making continued effort feel like an imposition rather than a challenge.`,
  };
}

// Rule 4 — negotiator × All-In Kid × recharge=cognitive-displacement
//
// Fires per-family only: requires this specific child's resolved recharge_type to be
// cognitive-displacement. 3 of 10 All-In Kid × Negotiator families don't show it and
// correctly fall through to noLoop. Source: Phase 4 broader dimension sweep (183 families):
//   - 70% of All-In Kid × negotiator cell (n=10); D6.confirm confirmed 6/9 non-depth
//     families; the one G2=internal family chose cognitive-displacement at all three
//     D6 sub-questions (D6.1, D6.2, D6.3).
//   - Archetype-wide All-In Kid recharge baseline: sensory-quiet=44%. The cell reverses
//     this to cognitive-displacement=70%, sensory-quiet=10%.
//
// Tension: archetype-expected recovery (sensory-quiet) vs this child's actual recovery
// (cognitive-displacement). Mechanism offered as a plausible explanation, not a proved cause.
//
// FUTURE CANDIDATES (logged, not implemented — await more data):
//   Explorer × negotiator: recharge_type=social-connection, 67% (n=6), +2.3 rows above baseline.
//   All-In Kid × steady-hand: recharge_type=autonomous-unstructured, 38% (n=8), +1.8 rows
//     above baseline. Same sensory-quiet suppression pattern as Rule 4 cell but borderline.
function rule4NegotiatorAllInKidCogDisp(
  hdg: HumanDecisionGraph,
  bg: BehaviourGraph,
  sig: BehaviourSignature,
  g3Node: NonNullable<ReturnType<typeof hdgNode>>
): FamilyAttentionLoop | null {
  // Check archetype = The All-In Kid via deriveArchetype to catch both primary
  // (narrow-deep × mastery) and fallback-routed (narrow-deep × social) families.
  const shapeSignal  = bg.signal_nodes.find((n) => n.dimension === "attention_shape");
  const driverSignal = bg.signal_nodes.find((n) => n.dimension === "reward_driver");
  if (!shapeSignal || !driverSignal) return null;
  if (deriveArchetype(shapeSignal.value, driverSignal.value) !== "The All-In Kid") return null;

  // Check this family's recharge_type = cognitive-displacement (per-family, not blanket)
  const rechargeSignal = bg.signal_nodes.find((n) => n.dimension === "recharge_type");
  if (rechargeSignal?.value !== "cognitive-displacement") return null;

  // Prefer D6.1 (depth families, G2=internal) over D6.confirm (confirm-only families)
  const rechargeNode =
    hdgNode(hdg, "D6.1") ??
    hdgNode(hdg, "D6.confirm") ??
    hdg.nodes.find((n) => rechargeSignal.source_nodes.includes(n.id));
  if (!rechargeNode) return null;

  const rechargeDim  = sig.dimensions.find((d) => d.dimension === "recharge_type");
  const hasDimTension = rechargeDim?.expression.tension !== null;

  return {
    detected: true,
    loop_tension_point: {
      parent_node_id:   g3Node.id,
      child_node_id:    rechargeNode.id,
      parent_dimension: "parent_instinct",
      child_dimension:  "recharge_type",
      mechanism:        "misaligned_response",
      description:
        "Negotiator trade structure may be teaching recovery as earned engagement: the absorbing activity after the hard part becomes the recovery route, not quiet",
    },
    precedes_edges: [
      {
        type:      "precedes",
        from_node: rechargeNode.id,
        to_node:   g3Node.id,
        mechanism:
          "child recharges through cognitive engagement rather than rest — deal structure offers an absorbing reward at the moment the child needs to disengage, not quiet down",
      },
      {
        type:      "precedes",
        from_node: g3Node.id,
        to_node:   rechargeNode.id,
        mechanism:
          "trade reward (the absorbing activity) reinforces cognitive-displacement as the recovery route, sustaining the link between 'done' and 'earned engagement'",
      },
    ],
    pattern_summary: patternSummary(sig),
    loop_description: `For most All-In Kids, recovery means uninterrupted quiet. For this child, it is resolving as cognitive-displacement — absorbing engagement rather than rest${hasDimTension ? " (the recharge dimension itself shows competing signals)" : ""}. The negotiator's trade structure ("get through this first, then the reward") may be teaching the link: the reward that follows the hard part is the absorbing activity, so "done" has come to mean "now I get to engage," not "now I rest." Correlation confirmed in 70% of All-In Kid × Negotiator families (n=10). Mechanism offered as a plausible explanation; causal direction is not provable from this data.`,
  };
}

// Rule 3 — pusher × autonomy × avoid
//
// The child avoids hard tasks (friction=avoid). The pusher escalates.
// But this child disengages specifically when feeling controlled or micromanaged
// (reward_driver=autonomy, D2.3 disengagement trigger). The push activates the
// exact disengagement mechanism it is trying to prevent — escalating avoidance,
// not resolving it.
function rule3PusherAutonomyAvoid(
  hdg: HumanDecisionGraph,
  bg: BehaviourGraph,
  sig: BehaviourSignature,
  g3Node: NonNullable<ReturnType<typeof hdgNode>>
): FamilyAttentionLoop | null {
  const rewardSignal = bg.signal_nodes.find((n) => n.dimension === "reward_driver");
  const frictionSignal = bg.signal_nodes.find((n) => n.dimension === "friction_response");
  if (rewardSignal?.value !== "autonomy" || frictionSignal?.value !== "avoid") return null;

  const d32Node =
    hdgNode(hdg, "D3.2") ??
    hdg.nodes.find((n) => frictionSignal.source_nodes.includes(n.id));
  if (!d32Node) return null;

  // D2.3=autonomy choice: "disengaged when feeling controlled or micromanaged"
  // — the exact disengagement mechanism the push activates.
  const d23Node = hdgNode(hdg, "D2.3") ?? null;

  // Read dimension tension (per Phase 3 constraint).
  const frictionDim = sig.dimensions.find((d) => d.dimension === "friction_response");
  const hasDimTension = frictionDim?.expression.tension !== null;

  const edges: PrecedesEdge[] = [
    {
      type: "precedes",
      from_node: d32Node.id,
      to_node: g3Node.id,
      mechanism: "child avoidance triggers parent push response",
    },
  ];

  if (d23Node) {
    edges.push(
      {
        type: "precedes",
        from_node: g3Node.id,
        to_node: d23Node.id,
        mechanism: "parent push reads as control, triggering autonomy-driven disengagement",
      },
      {
        type: "precedes",
        from_node: d23Node.id,
        to_node: d32Node.id,
        mechanism: "heightened disengagement reinforces the avoidance pattern, closing the loop",
      }
    );
  } else {
    edges.push({
      type: "precedes",
      from_node: g3Node.id,
      to_node: d32Node.id,
      mechanism: "push escalates the avoidance it is trying to prevent",
    });
  }

  const violationText = d23Node?.choice ?? "loss of control";

  return {
    detected: true,
    loop_tension_point: {
      parent_node_id: g3Node.id,
      child_node_id: d32Node.id,
      parent_dimension: "parent_instinct",
      child_dimension: "friction_response",
      mechanism: "misaligned_response",
      description:
        "Push response to avoidance triggers autonomy violation, deepening the avoidance it was trying to address",
    },
    precedes_edges: edges,
    pattern_summary: patternSummary(sig),
    loop_description: `The push escalates the avoidance it is trying to prevent${hasDimTension ? " (the friction dimension itself carries competing patterns)" : ""}. "${violationText}" — this is what increased pressure produces in a child with this pattern, not renewed effort.`,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export function buildFamilyAttentionLoop(
  hdg: HumanDecisionGraph,
  bg: BehaviourGraph,
  sig: BehaviourSignature
): FamilyAttentionLoop {
  const parentSignal = bg.signal_nodes.find((n) => n.dimension === "parent_instinct");
  if (!parentSignal) return noLoop(sig);

  const g3 = hdgNode(hdg, "G3");
  if (!g3) return noLoop(sig);

  const parentInstinct = parentSignal.value;

  if (parentInstinct === "quick-fixer") {
    const result = rule1QuickFixer(hdg, bg, sig, g3);
    if (result) return result;
  }

  if (parentInstinct === "pusher") {
    // Rule 2 takes priority over Rule 3 when both reward_driver=mastery and the
    // disengagement node is present — mastery completion is the cleaner signal.
    const r2 = rule2PusherMastery(hdg, bg, sig, g3);
    if (r2) return r2;

    const r3 = rule3PusherAutonomyAvoid(hdg, bg, sig, g3);
    if (r3) return r3;
  }

  if (parentInstinct === "negotiator") {
    // Rule 4: only fires for All-In Kid children with recharge=cognitive-displacement.
    // 7/10 All-In Kid × Negotiator families qualify; the other 3 fall through to noLoop.
    const r4 = rule4NegotiatorAllInKidCogDisp(hdg, bg, sig, g3);
    if (r4) return r4;
  }

  return noLoop(sig);
}
