// Report v2 generated-content validator. Enforces the gold voice: plain words only,
// short sentences (≤16 words), high readability (Flesch ≥70 on prose), no abstract nouns,
// no hedges/clinical/comparative/parent-blame, the parent (not the child) did the answering,
// quoted switch lines a parent would say, tonight steps ≤2 sentences, and length caps.
import type { ReportV2Generated } from "./types";
import type { Gender } from "@/lib/report/pronouns";

export type ValidationResult = { ok: boolean; errors: string[] };

const MAX_SENTENCE_WORDS = 16;

// Exact-format rules for the two v3 card-1 voice fields.
// seenIt: ONE sentence starting "When ", ≤16 words, no worry/problem words, never "You've seen".
// hardPart: two sentences "<Name> isn't … . <He/She/They>…'s? … .", each sentence ≤10 words.
const SEEN_IT_START_RE = /^When\s+/i;
const SEEN_IT_SEEN_RE = /you['’]?ve\s+seen/i;
// Problem/worry words seenIt must NOT contain (it shows the child FOCUSING WELL, never the worry).
const SEEN_IT_PROBLEM_RE = /\b(worr\w*|struggl\w*|can['’]?t|won['’]?t|fight\w*|argu\w*|sulk\w*|remind\w*|quit\w*|distract\w*|refus\w*|nag\w*|avoid\w*|stuck|meltdown|tantrum|gives?\s+up|problem|hard\s+time|drift\w*|halfway)\b/i;
const HARD_PART_RE = /^[^.]+? isn[’']t [^.]+\. (He|She|They)[’'](s|re) [^.]+\.$/;
const HARD_PART_SENTENCE_MAX_WORDS = 10;

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
  { re: /\bstakes?\b/i,                label: "bargaining (stake/stakes)" },
  { re: /\bbet\b/i,                    label: "bargaining (bet)" },
  { re: /\brewards?\b/i,               label: "bargaining (reward)" },
  { re: /\btreats?\b/i,                label: "bargaining (treat)" },
  { re: /\bdeal\b/i,                   label: "bargaining (deal)" },
  { re: /\bearn(ed)?\b/i,              label: "bargaining (earn)" },
  // spec §7 additions: never frame change as a threat, a showdown, or a test of the parent.
  { re: /\bconsequences?\b/i,          label: "banned (consequence)" },
  { re: /\bpunish\w*/i,                label: "banned (punish)" },
  { re: /\bfirm\b/i,                   label: "banned (firm)" },
  { re: /no\s+negotiation/i,           label: "banned (no negotiation)" },
  { re: /no\s+debate/i,                label: "banned (no debate)" },
  { re: /hold\s+the\s+line/i,          label: "banned (hold the line)" },
  { re: /testing\s+you/i,              label: "banned (testing you)" },
];

const CAP = {
  seenIt: 170, hardPart: 170,
  instead: 72, try: 72, after: 150, tonight: 120,
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

  const check = (text: string, cap: number, field: string, maxSentences?: number) => {
    if (text.length > cap) e.push(`${field}: over ${cap} chars (${text.length})`);
    for (const b of bans) if (b.re.test(text)) e.push(`${field}: ${b.label}`);
    if (maxSentenceWords(text) > MAX_SENTENCE_WORDS) e.push(`${field}: sentence over ${MAX_SENTENCE_WORDS} words`);
    if (maxSentences && sentences(text).length > maxSentences) e.push(`${field}: more than ${maxSentences} sentences`);
  };

  // The 16-word cap, the no-abstract-noun bans and the judge govern the short instruction
  // lines (tonight / switch.after); Flesch is no longer applied (v3 drops the prose paragraphs).
  // Card 1 voice fields (v3 shapes).
  const seenIt = g.seenIt.trim();
  check(g.seenIt, CAP.seenIt, "seenIt");
  if (!SEEN_IT_START_RE.test(seenIt)) e.push('seenIt: must start with "When "');
  if (sentences(g.seenIt).length > 1) e.push("seenIt: must be one sentence");
  if (SEEN_IT_SEEN_RE.test(g.seenIt)) e.push('seenIt: must not say "You\'ve seen"');
  if (SEEN_IT_PROBLEM_RE.test(g.seenIt)) e.push("seenIt: must not mention the worry/problem");

  check(g.hardPart, CAP.hardPart, "hardPart");
  const hp = g.hardPart.trim();
  if (!HARD_PART_RE.test(hp)) e.push('hardPart: must match "<Name> isn\'t X. <He/She/They>…\'s? Y."');
  else {
    // Each of the two sentences ≤10 words.
    for (const s of sentences(hp)) {
      if (words(s).length > HARD_PART_SENTENCE_MAX_WORDS) {
        e.push(`hardPart: sentence over ${HARD_PART_SENTENCE_MAX_WORDS} words`);
        break;
      }
    }
  }

  check(g.switch.instead, CAP.instead, "switch.instead");
  check(g.switch.try,     CAP.try,     "switch.try");
  check(g.switch.after,   CAP.after,   "switch.after");
  if (!isQuotedLine(g.switch.instead)) e.push("switch.instead: must be a quoted line a parent says");
  if (!isQuotedLine(g.switch.try))     e.push("switch.try: must be a quoted line a parent says");
  g.tonight.forEach((t, i) => check(t, CAP.tonight, `tonight[${i}]`, 2));
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
