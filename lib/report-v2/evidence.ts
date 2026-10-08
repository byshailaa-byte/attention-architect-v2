// Deterministic evidence selection for Report v2 §3: the 3 of the parent's OWN answers
// that most drove the archetype. Pure + deterministic: same inputs → same 3, in the same
// order. "Most drove the archetype" = the dimensions ranked by winning_votes (how strongly
// that dimension pointed), tie-broken by dimension name; one answer per dimension, in that
// order, backfilled in sequence order if fewer than 3 distinct dimensions answered.
import { displayChildName, buildPronounTokens, type Gender } from "@/lib/report/pronouns";
import type { EvidenceItem } from "./types";

export type AnsweredQuestion = { id: string; dimension: string; label: string; value?: string };
export type DimScore = { dimension: string; winning_votes: number };

const LEAD_IN: Record<string, string> = {
  attention_shape:       "You said what pulls {Name} in is",
  reward_driver:         "You said what lights {Name} up is",
  friction_response:     "You said when it gets hard, {Name}",
  recharge_type:         "You said {Name} resets by",
  attention_competition: "You said what pulls {Name} away is",
};

export function rankDimensions(dims: DimScore[]): string[] {
  return [...dims]
    .sort((a, b) => b.winning_votes - a.winning_votes || a.dimension.localeCompare(b.dimension))
    .map((d) => d.dimension);
}

export function selectEvidence(
  answered: AnsweredQuestion[],
  dimRank: string[],
  name: string,
  gender: Gender,
): EvidenceItem[] {
  const nm = name.trim() ? displayChildName(name) : "your child";
  const t = buildPronounTokens(gender, nm);
  const leadFor = (dim: string) =>
    (LEAD_IN[dim] ?? "You said {Name}")
      .replace(/\{Name\}/g, nm)
      .replace(/\{they\}/g, t.child_pronoun_subj);

  // Card 3 shows the CHILD's own answers — never the parent_instinct question (about the parent).
  const childAnswers = answered.filter((a) => a.dimension !== "parent_instinct");
  const childRank = dimRank.filter((d) => d !== "parent_instinct");

  const picked: AnsweredQuestion[] = [];
  const usedIds = new Set<string>();
  // one per dimension, in rank order
  for (const dim of childRank) {
    if (picked.length >= 3) break;
    const hit = childAnswers.find((a) => a.dimension === dim && !usedIds.has(a.id));
    if (hit) { picked.push(hit); usedIds.add(hit.id); }
  }
  // backfill in sequence order if fewer than 3 distinct dimensions answered
  for (const a of childAnswers) {
    if (picked.length >= 3) break;
    if (!usedIds.has(a.id)) { picked.push(a); usedIds.add(a.id); }
  }
  // qid + optionValue thread the pick's question id and chosen option value onto the item for
  // v3's card-3 PLAIN_ANSWER lookup; leadIn/quote/dim stay for the v1/v2 consumers.
  return picked.slice(0, 3).map((a) => ({
    leadIn: leadFor(a.dimension), quote: a.label, dim: a.dimension, qid: a.id, optionValue: a.value,
  }));
}
