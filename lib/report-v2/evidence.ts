// Deterministic evidence selection for Report v2 §3: the 3 of the parent's OWN answers
// that most drove the archetype. Pure + deterministic: same inputs → same 3, in the same
// order. "Most drove the archetype" = the dimensions ranked by winning_votes (how strongly
// that dimension pointed), tie-broken by dimension name; one answer per dimension, in that
// order, backfilled in sequence order if fewer than 3 distinct dimensions answered.
import { displayChildName, buildPronounTokens, type Gender } from "@/lib/report/pronouns";
import type { EvidenceItem } from "./types";

export type AnsweredQuestion = { id: string; dimension: string; label: string };
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

  const picked: AnsweredQuestion[] = [];
  const usedIds = new Set<string>();
  // one per dimension, in rank order
  for (const dim of dimRank) {
    if (picked.length >= 3) break;
    const hit = answered.find((a) => a.dimension === dim && !usedIds.has(a.id));
    if (hit) { picked.push(hit); usedIds.add(hit.id); }
  }
  // backfill in sequence order if fewer than 3 distinct dimensions answered
  for (const a of answered) {
    if (picked.length >= 3) break;
    if (!usedIds.has(a.id)) { picked.push(a); usedIds.add(a.id); }
  }
  return picked.slice(0, 3).map((a) => ({ leadIn: leadFor(a.dimension), quote: a.label, dim: a.dimension }));
}
