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

// Display-only name casing. If the stored name is ALL-CAPS or all-lowercase,
// render it Title Case ("SHAILAA" / "shailaa" → "Shailaa"); leave mixed case
// ("McKay", "de Souza") untouched. Never mutates stored data.
export function displayChildName(raw: string | null | undefined): string {
  const name = (raw ?? "").trim();
  if (!name) return CHILD_NAME_FALLBACK;
  const letters = name.replace(/[^A-Za-z]/g, "");
  const allUpper = letters.length > 0 && letters === letters.toUpperCase();
  const allLower = letters.length > 0 && letters === letters.toLowerCase();
  if (!allUpper && !allLower) return name; // mixed case — respect it
  return name.replace(/\b([A-Za-z])([A-Za-z]*)/g, (_m, a: string, b: string) => a.toUpperCase() + b.toLowerCase());
}

// Indefinite article for an archetype TYPE name shown on card 4 ("a Storm", "an Inventor",
// "an All-In Kid"). First letter's vowel sound is a good-enough heuristic for our 8 types.
export function articleFor(word: string): string {
  return /^[aeiou]/i.test(word.trim()) ? "an" : "a";
}

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

// Pronoun tokens for content substitution.
// boy/girl → he/him/his/himself or she/her/her/herself.
// Anything else (null, non-binary, prefer-not-to-say) → the child's DISPLAY NAME
// instead of they/them, so singular verb agreement always reads correctly
// ("Shailaa wanders", "Shailaa is", "Shailaa's choice"); reflexive stays
// "themself". childName should be the already-display-cased name.
export function buildPronounTokens(gender: Gender, childName?: string): Record<string, string> {
  if (gender === "boy" || gender === "girl") {
    return {
      child_pronoun_subj:      resolveChildPronoun(gender, "subj"),
      child_pronoun_obj:       resolveChildPronoun(gender, "obj"),
      child_pronoun_poss:      resolveChildPronoun(gender, "poss"),
      child_pronoun_reflexive: resolveChildPronoun(gender, "reflexive"),
    };
  }
  const name = (childName ?? "").trim() || CHILD_NAME_FALLBACK_MID;
  return {
    child_pronoun_subj:      name,          // "Shailaa wanders" (singular)
    child_pronoun_obj:       name,          // "…helps Shailaa"
    child_pronoun_poss:      `${name}'s`,   // "Shailaa's choice"
    child_pronoun_reflexive: "themself",
  };
}
