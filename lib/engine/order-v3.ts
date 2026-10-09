// Assessment v3 presentation order — three labelled parts. The question SET and branch decision
// are UNCHANGED (buildQuestionSequence); this only reorders presentation and makes P1/P2 fixed in
// Part 2 for every parent. Scoring is unaffected: archetype = shape × reward_driver tallies, and
// the within-dimension answer order (G1 before D1.x; D2.1→D2.2→D2.3; D3.1→D3.2→D3.3; R1→R2→R3) is
// preserved, so tallyDimension (and its first-answer tiebreak) produces identical dimensions.
import { Question, GATEWAY_QUESTIONS, D1_1, D1_2, D2_1, D2_2, D2_3, P1, P2 } from "./questions";
import { buildQuestionSequence, type GatewayAnswers } from "./router";

export type AssessmentPart = { part: 1 | 2 | 3; label: string; questions: Question[] };

const [G1, G2, G3] = GATEWAY_QUESTIONS;

export const PART_LABELS: Record<1 | 2 | 3, string> = {
  1: "About {Name}'s day",
  2: "How you handle it",
  3: "When it gets hard",
};

// Part 2 opener line (shown once at the top of Part 2).
export const PART2_OPENER = "No right answers. This shapes your plan, not {Name}'s result.";

export function buildOrderedPartsV3(g: GatewayAnswers): AssessmentPart[] {
  const full = buildQuestionSequence(g);              // same set + branch as today
  const byId = new Map(full.map((q) => [q.id, q]));

  // Part 1 — About the day: reward-driver depth woven with the two shape-gateway questions.
  const part1 = [G2, D2_1, G1, D2_2, D2_3];

  // Part 2 — How you handle it: G3 + P1 + P2 for EVERY parent (P1/P2 may not be in `full`).
  const part2 = [G3, P1, P2];

  // Part 3 — When it gets hard: everything else, in the existing sequence order (D1.x shape depth,
  // D3.x friction, D5.x competition, D6.x recharge, R1–R3, and the repeat/confirm checks).
  const moved = new Set([G1.id, G2.id, G3.id, D2_1.id, D2_2.id, D2_3.id, P1.id, P2.id]);
  const part3 = full.filter((q) => !moved.has(q.id));
  // D1.x belong to Part 3 but are emitted by buildQuestionSequence right after the gateway when
  // attention_shape has depth — the filter above keeps them (they are not in `moved`).
  void D1_1; void D1_2;

  return [
    { part: 1, label: PART_LABELS[1], questions: part1 },
    { part: 2, label: PART_LABELS[2], questions: part2 },
    { part: 3, label: PART_LABELS[3], questions: part3.filter((q) => byId.has(q.id)) },
  ];
}

// Flat ordered sequence for the client (Part 1 ++ Part 2 ++ Part 3).
export function buildOrderedSequenceV3(g: GatewayAnswers): Question[] {
  return buildOrderedPartsV3(g).flatMap((p) => p.questions);
}

// The part a given 0-based flat index falls into, for the "Part X of 3 · <label>" header.
export function partForIndex(parts: AssessmentPart[], flatIndex: number): AssessmentPart {
  let acc = 0;
  for (const p of parts) {
    if (flatIndex < acc + p.questions.length) return p;
    acc += p.questions.length;
  }
  return parts[parts.length - 1];
}
