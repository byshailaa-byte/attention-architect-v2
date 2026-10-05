// Report v2 generated-content validator. Enforces the gold voice: plain words only,
// short sentences (≤16 words), high readability (Flesch ≥70 on prose), no abstract nouns,
// no hedges/clinical/comparative/parent-blame, the parent (not the child) did the answering,
// quoted switch lines a parent would say, tonight steps ≤2 sentences, and length caps.
import type { ReportV2Generated } from "./types";
import type { Gender } from "@/lib/report/pronouns";

export type ValidationResult = { ok: boolean; errors: string[] };

const MAX_SENTENCE_WORDS = 16;
const MIN_FLESCH = 70;

// Exact-format rules for the two new card-1 voice fields.
const SEEN_IT_PREFIX = "You’ve seen it yourself.";
const HARD_PART_RE = /^The hard part isn’t [^.]+\. It’s [^.]+\.$/;

const BANNED: { re: RegExp; label: string }[] = [
  // Approved-voice bans (rule 5).
  { re: /\bfix(es)?\b/i,               label: "banned (fix/fixes)" },
  { re: /nothing\s+is\s+wrong/i,       label: "banned (nothing is wrong)" },
  // Rule 3 — never label the child. The type name appears ONLY on card 4.
  { re: /\b(types?|patterns?|traits?|profiles?)\b/i, label: "label-word (type/pattern/trait/profile)" },
  { re: /\b(may|might|could)\b/i,      label: "hedge (may/might/could)" },
  { re: /can['’]?t\s+promise/i,        label: "hedge (can't promise)" },
  { re: /\b(diagnos\w*|adhd|disorder)\b/i, label: "clinical (diagnose/ADHD/disorder)" },
  { re: /you['’]?ve\s+been\b/i,        label: "parent-blame (you've been)" },
  { re: /\byour\s+mistake\b/i,         label: "parent-blame (your mistake)" },
  { re: /\byou\s+always\b/i,           label: "parent-blame (you always)" },
  // Abstract nouns — say what actually happens instead.
  { re: /\bmethods?\b/i,               label: "abstract (method)" },
  { re: /\bownership\b/i,              label: "abstract (ownership)" },
  { re: /\bprocess(es)?\b/i,           label: "abstract (process)" },
  { re: /\btransitions?\b/i,           label: "abstract (transition)" },
  { re: /\bthreads?\b/i,               label: "abstract (thread)" },
  { re: /\bapproach(es)?\b/i,          label: "abstract (approach)" },
  { re: /\bautonom\w*/i,               label: "abstract (autonomy)" },
  { re: /\bstructure[sd]?\b/i,         label: "abstract (structure)" },
  { re: /\bengag\w*/i,                 label: "abstract (engagement)" },
  { re: /\bbelong\w*/i,                label: "abstract (belongs)" },
  // Jargon / not-plain-words.
  { re: /\bsystems?\b/i,               label: "jargon (system)" },
  { re: /\bre-?entry\b/i,              label: "jargon (re-entry)" },
  { re: /\bbrain\b/i,                  label: "jargon (brain)" },
  { re: /\bneuro\w*/i,                 label: "jargon (neuro)" },
  { re: /\bexile\b/i,                  label: "jargon (exile)" },
  { re: /\bdopamine\b/i,               label: "jargon (dopamine)" },
  { re: /\bregulat\w*/i,               label: "jargon (regulate)" },
  { re: /\boff-?ramp\b/i,              label: "jargon (off-ramp)" },
  { re: /\bupstairs\b/i,               label: "assumes-a-house (upstairs)" },
  // Comparative claims about other children (no invented comparisons).
  { re: /\brare\b/i,                   label: "comparative (rare)" },
  { re: /\bmost\s+kids\b/i,            label: "comparative (most kids)" },
  { re: /\bmost\s+children\b/i,        label: "comparative (most children)" },
  { re: /\bunlike\s+other\s+children\b/i, label: "comparative (unlike other children)" },
  { re: /\bfew\s+children\b/i,         label: "comparative (few children)" },
  // The PARENT answered the questions, never the child.
  { re: /\b(he|she|they)\s+told\b/i,   label: "child-attribution (he/she/they told)" },
  // No bargaining: the stop time is fixed; never trade the task for a reward.
  // (whole-word, case-insensitive; "earn" must not match "learn")
  { re: /\bworth\s+it\b/i,             label: "bargaining (worth it)" },
  { re: /\bstakes?\b/i,                label: "bargaining (stake)" },
  { re: /\brewards?\b/i,               label: "bargaining (reward)" },
  { re: /\btreats?\b/i,                label: "bargaining (treat)" },
  { re: /\bdeal\b/i,                   label: "bargaining (deal)" },
  { re: /\bearn(ed)?\b/i,              label: "bargaining (earn)" },
];

const CAP = {
  seenIt: 170, hardPart: 170,
  shortGood: 110, shortWhy: 90, shortFix: 90,
  whyPara: 320, instead: 72, try: 72, after: 150, tonight: 120,
} as const;

// switch.instead / switch.try must be WORDS A PARENT SAYS, wrapped in quotes.
const QUOTE_OPEN = /^["“]/;
const QUOTE_CLOSE = /["”]$/;
function isQuotedLine(s: string): boolean {
  const t = s.trim();
  return QUOTE_OPEN.test(t) && QUOTE_CLOSE.test(t) && t.length >= 2;
}

function sentences(text: string): string[] {
  return text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
}
function words(text: string): string[] {
  return text.split(/\s+/).map((w) => w.replace(/[^A-Za-z]/g, "")).filter(Boolean);
}
function countSyllables(word: string): number {
  const w = word.toLowerCase();
  if (!w) return 0;
  const groups = w.match(/[aeiouy]+/g);
  let n = groups ? groups.length : 1;
  if (w.length > 2 && w.endsWith("e")) n -= 1; // silent e
  return Math.max(1, n);
}
export function fleschReadingEase(text: string): number {
  const ss = sentences(text);
  const ws = words(text);
  if (ss.length === 0 || ws.length === 0) return 100;
  const syll = ws.reduce((s, w) => s + countSyllables(w), 0);
  return 206.835 - 1.015 * (ws.length / ss.length) - 84.6 * (syll / ws.length);
}
function maxSentenceWords(text: string): number {
  return sentences(text).reduce((m, s) => Math.max(m, words(s).length), 0);
}

export function validateGenerated(g: ReportV2Generated, opts?: { childName?: string; gender?: Gender }): ValidationResult {
  const e: string[] = [];
  const bans = [...BANNED];
  if (opts?.childName) {
    const nm = opts.childName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    bans.push({ re: new RegExp(`\\b${nm}\\s+told\\b`, "i"), label: "child-attribution ({Name} told)" });
  }
  // Pronoun leak: only the child's own gender's pronouns may appear. Unset → singular they,
  // so NO gendered pronoun at all. Checked on the filled text; repairable.
  if (opts && "gender" in opts) {
    if (opts.gender === "boy") bans.push({ re: /\b(she|her|hers|herself)\b/i, label: "pronoun-leak (she/her)" });
    else if (opts.gender === "girl") bans.push({ re: /\b(he|him|his|himself)\b/i, label: "pronoun-leak (he/him)" });
    else bans.push({ re: /\b(he|him|his|himself|she|her|hers|herself|themself)\b/i, label: "pronoun-leak (gendered / themself)" });
  }

  const check = (text: string, cap: number, field: string, prose: boolean, maxSentences?: number) => {
    if (text.length > cap) e.push(`${field}: over ${cap} chars (${text.length})`);
    for (const b of bans) if (b.re.test(text)) e.push(`${field}: ${b.label}`);
    if (maxSentenceWords(text) > MAX_SENTENCE_WORDS) e.push(`${field}: sentence over ${MAX_SENTENCE_WORDS} words`);
    if (maxSentences && sentences(text).length > maxSentences) e.push(`${field}: more than ${maxSentences} sentences`);
    if (prose && words(text).length >= 8) {
      const f = fleschReadingEase(text);
      if (f < MIN_FLESCH) e.push(`${field}: Flesch ${f.toFixed(0)} < ${MIN_FLESCH}`);
    }
  };

  // Flesch is gated ONLY on the prose paragraphs (whyParas). On short, concrete
  // instructions (tonight / switch.after) the formula misreads plain words like
  // "reminder"/"offer" — the gold-voice examples themselves score 61–66 there — so those
  // are governed by the 16-word cap, the no-abstract-noun bans, and the judge instead.
  // Card 1 voice fields.
  check(g.seenIt, CAP.seenIt, "seenIt", false);
  if (!g.seenIt.trim().startsWith(SEEN_IT_PREFIX)) e.push(`seenIt: must start with “${SEEN_IT_PREFIX}”`);
  check(g.hardPart, CAP.hardPart, "hardPart", false);
  if (!HARD_PART_RE.test(g.hardPart.trim())) e.push("hardPart: must match “The hard part isn’t X. It’s Y.”");
  // "You’ve seen it yourself." belongs to card 1 (seenIt) ONLY — card 2 must not reuse it.
  if (g.whyParas[0].trim().startsWith(SEEN_IT_PREFIX)) e.push(`whyParas[0]: must NOT start with “${SEEN_IT_PREFIX}”`);

  check(g.shortGood, CAP.shortGood, "shortGood", false);
  check(g.shortWhy,  CAP.shortWhy,  "shortWhy",  false);
  check(g.shortFix,  CAP.shortFix,  "shortFix",  false);
  // Card 2: para 1 ≤ 3 sentences AND ≤ 45 words; bold line ≤ 2 sentences.
  check(g.whyParas[0], CAP.whyPara, "whyParas[0]", true, 3);
  if (words(g.whyParas[0]).length > 45) e.push(`whyParas[0]: over 45 words (${words(g.whyParas[0]).length})`);
  check(g.whyParas[1], CAP.whyPara, "whyParas[1]", true, 2);
  check(g.switch.instead, CAP.instead, "switch.instead", false);
  check(g.switch.try,     CAP.try,     "switch.try",     false);
  check(g.switch.after,   CAP.after,   "switch.after",   false);
  if (!isQuotedLine(g.switch.instead)) e.push("switch.instead: must be a quoted line a parent says");
  if (!isQuotedLine(g.switch.try))     e.push("switch.try: must be a quoted line a parent says");
  g.tonight.forEach((t, i) => check(t, CAP.tonight, `tonight[${i}]`, false, 2));
  return { ok: e.length === 0, errors: e };
}

// Does an error list contain ONLY mechanical length/readability problems (shortenable by a
// cheap repair call) — i.e. no banned words, quote, child-attribution, or structural issue?
const LENGTHY_RE = /over \d+ chars|sentence over \d+ words|Flesch \d+ < \d+|more than \d+ sentences/i;
export function isLengthOnly(errors: string[]): boolean {
  return errors.length > 0 && errors.every((x) => LENGTHY_RE.test(x));
}
// Failures the targeted repair call can fix in place: length/readability AND bargaining words
// (a repair can restate the stop plainly and drop the traded reward). Harder content issues
// (clinical, parent-blame, missing quotes, child-attribution, comparatives) still need a full
// retry, not a line-level rewrite.
export function isRepairable(errors: string[]): boolean {
  return errors.length > 0 && errors.every((x) => LENGTHY_RE.test(x) || /bargaining \(/.test(x) || /pronoun-leak/.test(x));
}
// The set of field names referenced by a list of errors (prefix before the first colon).
export function fieldsFromErrors(errors: string[]): string[] {
  const set = new Set<string>();
  for (const x of errors) {
    const field = x.split(":")[0].trim();
    if (field) set.add(field);
  }
  return [...set];
}
