export type Gender = "boy" | "girl" | "non-binary" | "prefer-not-to-say" | null;
export type PronounForm = "subj" | "obj" | "poss" | "reflexive";

// Single source of truth for the display name when child_name is null/empty.
// Sentence-safe capitalisation ("Your child") — 12 of the 24 authored goals put
// the name at the start of the sentence, so the fallback must read correctly there.
// Use with a null/empty-catching operator: `child_name || CHILD_NAME_FALLBACK`.
export const CHILD_NAME_FALLBACK = "Your child";

// Mid-sentence form, for slots where the name is NOT sentence-initial
// (e.g. "How old is your child?", "…open your child's report"). Where a single
// value is threaded into both initial and mid slots, neither constant is correct —
// that needs per-slot capitalisation at the render site, not a source fallback.
export const CHILD_NAME_FALLBACK_MID = "your child";

export function resolveChildPronoun(gender: Gender, form: PronounForm): string {
  const isGirl = gender === "girl";
  const isBoy  = gender === "boy";
  switch (form) {
    case "subj":      return isBoy ? "he"      : isGirl ? "she"     : "they";
    case "obj":       return isBoy ? "him"     : isGirl ? "her"     : "them";
    case "poss":      return isBoy ? "his"     : isGirl ? "her"     : "their";
    case "reflexive": return isBoy ? "himself" : isGirl ? "herself" : "themself";
  }
}

export function buildPronounTokens(gender: Gender): Record<string, string> {
  return {
    child_pronoun_subj:      resolveChildPronoun(gender, "subj"),
    child_pronoun_obj:       resolveChildPronoun(gender, "obj"),
    child_pronoun_poss:      resolveChildPronoun(gender, "poss"),
    child_pronoun_reflexive: resolveChildPronoun(gender, "reflexive"),
  };
}
