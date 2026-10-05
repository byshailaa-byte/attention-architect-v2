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

// Report v2 pronouns: boy → he/him/his/himself, girl → she/her/her/herself, anything else →
// SINGULAR THEY (they/them/their/themselves) — NOT the name, and never "themself". Used only
// by report v2 copy; v1 keeps buildPronounTokens (name for unset).
// poss = possessive determiner ("his/her/their idea"); possPred = predicate possessive
// ("it's his/hers/theirs", "truly his/hers/theirs to run").
export function reportV2Pronouns(gender: Gender): { subj: string; obj: string; poss: string; possPred: string; reflexive: string } {
  if (gender === "boy")  return { subj: "he",   obj: "him",  poss: "his",   possPred: "his",   reflexive: "himself" };
  if (gender === "girl") return { subj: "she",  obj: "her",  poss: "her",   possPred: "hers",  reflexive: "herself" };
  return { subj: "they", obj: "them", poss: "their", possPred: "theirs", reflexive: "themselves" };
}

// Static report-v2 copy is authored with he/his tokens; when filled for the UNSET case ({they})
// a 3rd-person-singular verb right after "they" reads wrong ("they stays"). This fixes the verb
// to its base form (plural agreement) for the small, known verb set our copy uses. Scoped to a
// verb directly after they / they+adverb, so non-they subjects are never touched.
const THEY_VERB: Record<string, string> = {
  is: "are", was: "were", has: "have", does: "do", "doesn’t": "don’t", "isn’t": "aren’t",
  "hasn’t": "haven’t", "wasn’t": "weren’t",
  goes: "go", stays: "stay", picks: "pick", pushes: "push", slows: "slow", stops: "stop",
  needs: "need", throws: "throw", takes: "take", sees: "see", gets: "get", feels: "feel",
  keeps: "keep", steps: "step", starts: "start", works: "work", waits: "wait", begins: "begin",
  unwinds: "unwind", hands: "hand", lets: "let", digs: "dig", switches: "switch", drifts: "drift",
  comes: "come", turns: "turn", sends: "send", loses: "lose", dives: "dive", thinks: "think",
  likes: "like", resets: "reset", hates: "hate", wants: "want", finds: "find", finishes: "finish",
  catches: "catch", reads: "read", runs: "run", settles: "settle", locks: "lock", explores: "explore",
};
export function pluralizeThey(text: string): string {
  return text.replace(/\b([Tt]hey)(\s+(?:often|really|completely|just|still|always|also|then|soon))?\s+([a-z’]+)\b/g,
    (m, they, adv, verb) => (THEY_VERB[verb] ? `${they}${adv || ""} ${THEY_VERB[verb]}` : m));
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
