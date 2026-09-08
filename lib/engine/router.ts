// Deterministic routing engine — implements §5 Rules 1–4 from assessment spec exactly.
// No heuristics. Every G1×G2×G3 combination resolves to a specific question sequence.

import {
  Question,
  GATEWAY_QUESTIONS,
  D1_1, D1_2,
  D2_1, D2_2, D2_3, D2_CONFIRM,
  D3_1, D3_2, D3_3, D3_CONFIRM,
  P1, P2,
  D5_1, D5_2,
  D6_1, D6_2, D6_3, D6_CONFIRM,
  R1, R2, R3,
} from "./questions";

export type GatewayAnswers = {
  G1: string; // attention_shape value
  G2: string; // attention_competition value
  G3: string; // parent_instinct value
};

export type DepthSet = {
  slot1: "reward_driver";       // always reward_driver (Rule 1)
  slot2: "attention_shape" | "friction_response";
  slot3: "friction_response" | "recharge_type" | "attention_competition" | "parent_instinct" | null;
};

export function resolveDepthSet(g: GatewayAnswers): DepthSet {
  // Rule 1: reward_driver always gets full depth.
  const slot1 = "reward_driver" as const;

  // Rule 2: if G2==novelty AND G1!=wide-shifting → attention_shape gets slot 2.
  // Otherwise Rule 3: friction_response gets slot 2.
  const rule2Fires = g.G2 === "novelty" && g.G1 !== "wide-shifting";
  const slot2 = rule2Fires
    ? ("attention_shape" as const)
    : ("friction_response" as const);

  // Rule 4: at most one slot-3 assignment, checked in order.
  let slot3: DepthSet["slot3"] = null;

  if (g.G2 === "internal") {
    // friction_response is already in slot 2 via Rule 3 (Rule 2 can't fire when G2=internal,
    // since internal≠novelty) → slot 3 goes to recharge_type.
    slot3 = "recharge_type";
  } else if (g.G2 === "social") {
    slot3 = "attention_competition";
  } else if (g.G3 === "quick-fixer" || g.G3 === "pusher") {
    slot3 = "parent_instinct";
  }
  // else: no slot 3

  return { slot1, slot2, slot3 };
}

// Anchored dimensions: Gateway answer stands alone if not in depth (no confirm).
const ANCHORED = new Set(["attention_shape", "attention_competition", "parent_instinct"]);

// Questions for each dimension at full depth (in order).
const DEPTH_QUESTIONS: Record<string, Question[]> = {
  reward_driver: [D2_1, D2_2, D2_3],
  attention_shape: [D1_1, D1_2],
  friction_response: [D3_1, D3_2, D3_3],
  parent_instinct: [P1, P2],
  attention_competition: [D5_1, D5_2],
  recharge_type: [D6_1, D6_2, D6_3],
};

// Single confirming question for unanchored dimensions not selected for depth.
const CONFIRM_QUESTIONS: Record<string, Question> = {
  reward_driver: D2_CONFIRM,
  friction_response: D3_CONFIRM,
  recharge_type: D6_CONFIRM,
};

export function buildQuestionSequence(g: GatewayAnswers): Question[] {
  const depth = resolveDepthSet(g);
  const inDepth = new Set<string>([depth.slot1, depth.slot2]);
  if (depth.slot3) inDepth.add(depth.slot3);

  const seq: Question[] = [...GATEWAY_QUESTIONS];

  // Depth slot 1 (reward_driver — always)
  seq.push(...DEPTH_QUESTIONS[depth.slot1]);

  // Depth slot 2
  seq.push(...DEPTH_QUESTIONS[depth.slot2]);

  // Depth slot 3 (optional)
  if (depth.slot3) {
    seq.push(...DEPTH_QUESTIONS[depth.slot3]);
  }

  // Recovery response — always asked regardless of routing
  seq.push(R1, R2, R3);
  inDepth.add("recovery_response");

  // Fill remaining dimensions
  const allDimensions = [
    "attention_shape",
    "reward_driver",
    "friction_response",
    "parent_instinct",
    "attention_competition",
    "recharge_type",
    "recovery_response",
  ];

  // Gateway-anchored dimensions already answered by G1/G2/G3 — no further questions if not in depth.
  // Unanchored dimensions not in depth get their single confirm question.
  for (const dim of allDimensions) {
    if (inDepth.has(dim)) continue;
    if (ANCHORED.has(dim)) continue; // Gateway answer stands alone
    seq.push(CONFIRM_QUESTIONS[dim]);
  }

  return seq;
}

export function progressMilestone(
  questionIndex: number,
  totalQuestions: number
): "Warming up" | "Getting specific" | "Almost there" {
  const pct = questionIndex / totalQuestions;
  if (pct < 0.33) return "Warming up";
  if (pct < 0.67) return "Getting specific";
  return "Almost there";
}
