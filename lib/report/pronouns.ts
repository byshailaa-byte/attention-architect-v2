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

// Explicit subject-verb agreement for the report-v3 fixed copy. he/she take the 3rd-person
// SINGULAR form; singular "they" takes the PLURAL (base) form. The copy carries both forms as
// explicit tokens — `{s:focuses|focus}` → "focuses" for he/she, "focus" for they — so no
// after-the-fact verb munging (pluralizeThey) is needed for v3. isThey(gender) picks the fork.
export function isThey(gender: Gender): boolean {
  return reportV2Pronouns(gender).subj === "they";
}

// Shared token filler for report v2 + v3 fixed copy. Returns a function that fills ALL the
// pronoun/name/agreement tokens for one child. The two layouts (cards-copy / fallbacks) share
// this so they fill pronouns identically. Verbs are made explicit via {s:AAA|BBB}; no
// after-the-fact pluralizeThey is applied here.
//
// Tokens:
//   {Name}                              display name (or "Your child")
//   {he} {him} {his}(determiner) {himself}   lower-case pronouns
//   {He} {Him} {His}(determiner) {Himself} {They}   capitalised (sentence-initial)
//   {HE} {HIM} {HIS}(determiner)         UPPER-CASE (WHY_BOXES labels)
//   {hisown} / {HISOWN}                 STANDALONE possessive  his/hers/theirs · HIS/HERS/THEIRS
//   {s:AAA|BBB} / {S:AAA|BBB}           verb/word agreement  AAA (he/she) | BBB (they)
//   {is} {has} {'s} / {'S}              is·is·are / has·has·have / ’s·’s·’re / ’S·’S·’RE
export function fillTokens(name: string, gender: Gender): (tmpl: string) => string {
  const nm = name.trim() ? displayChildName(name) : CHILD_NAME_FALLBACK;
  const p = reportV2Pronouns(gender);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const up = (s: string) => s.toUpperCase();
  const they = p.subj === "they";
  // Determiner forms: his/her/their. Standalone possessive: his/hers/theirs (= possPred).
  const det = p.poss;
  const own = p.possPred;
  return (tmpl: string) =>
    tmpl
      // explicit agreement pairs first (before anything that could sit inside AAA/BBB)
      .replace(/\{s:([^|}]*)\|([^}]*)\}/g, (_m, a, b) => (they ? b : a))
      .replace(/\{S:([^|}]*)\|([^}]*)\}/g, (_m, a, b) => (they ? b : a))
      .replace(/\{Name\}/g, nm)
      // contraction "is/has" after the subject: ’s / ’s / ’re
      .replace(/\{'S\}/g, they ? "’RE" : "’S")
      .replace(/\{'s\}/g, they ? "’re" : "’s")
      .replace(/\{is\}/g, they ? "are" : "is")
      .replace(/\{has\}/g, they ? "have" : "has")
      .replace(/\{isn't\}/g, they ? "aren't" : "isn't")
      .replace(/\{doesn't\}/g, they ? "don't" : "doesn't")
      // standalone possessive  his / hers / theirs
      .replace(/\{HISOWN\}/g, up(own))
      .replace(/\{hisown\}/g, own)
      // UPPER-CASE label forms (v3 WHY_BOXES). Do these before the capitalised/lower forms.
      .replace(/\{HE\}/g, up(p.subj)).replace(/\{HIM\}/g, up(p.obj)).replace(/\{HIS\}/g, up(det))
      .replace(/\{He\}/g, cap(p.subj)).replace(/\{They\}/g, cap(p.subj))
      .replace(/\{His\}/g, cap(det)).replace(/\{Him\}/g, cap(p.obj))
      .replace(/\{Himself\}/g, cap(p.reflexive))
      .replace(/\{he\}/g, p.subj).replace(/\{they\}/g, p.subj)
      .replace(/\{him\}/g, p.obj).replace(/\{them\}/g, p.obj)
      .replace(/\{theirs\}/g, own)
      .replace(/\{his\}/g, det).replace(/\{their\}/g, det)
      .replace(/\{himself\}/g, p.reflexive).replace(/\{themselves\}/g, p.reflexive);
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
  // report-v3 fixed copy (verbs following a they-subject in the new tables / seenIt / hardPart):
  argues: "argue", sulks: "sulk", wanders: "wander", fades: "fade", cracks: "crack",
  discovers: "discover", notices: "notice", sticks: "stick", enjoys: "enjoy", pulls: "pull",
  chases: "chase", disappears: "disappear", lights: "light", includes: "include", cares: "care",
  avoids: "avoid", drains: "drain", handles: "handle", connects: "connect", trusts: "trust",
  drops: "drop", sits: "sit", walks: "walk", asks: "ask", says: "say", moves: "move",
  recharges: "recharge",
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
