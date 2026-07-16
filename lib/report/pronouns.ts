export type Gender = "boy" | "girl" | "non-binary" | "prefer-not-to-say" | null;
export type PronounForm = "subj" | "obj" | "poss" | "reflexive";

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
