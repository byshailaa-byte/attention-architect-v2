// Report v2 generated-content validator. Rejects: hedges (may/might/could/can't promise),
// clinical claims (diagnose/ADHD/disorder), parent-blame, any sentence over 20 words,
// Flesch reading ease < 60 (on prose fields), and any field over its 390×700-card length cap.
import type { ReportV2Generated } from "./types";

export type ValidationResult = { ok: boolean; errors: string[] };

const BANNED: { re: RegExp; label: string }[] = [
  { re: /\b(may|might|could)\b/i,      label: "hedge (may/might/could)" },
  { re: /can['’]?t\s+promise/i,        label: "hedge (can't promise)" },
  { re: /\b(diagnos\w*|adhd|disorder)\b/i, label: "clinical (diagnose/ADHD/disorder)" },
  { re: /you['’]?ve\s+been\b/i,        label: "parent-blame (you've been)" },
  { re: /\byour\s+mistake\b/i,         label: "parent-blame (your mistake)" },
  { re: /\byou\s+always\b/i,           label: "parent-blame (you always)" },
  // Jargon / not-plain-words (expanded 2026-10-04 after the generator drifted technical).
  { re: /\bsystems?\b/i,               label: "jargon (system)" },
  { re: /\bre-?entry\b/i,              label: "jargon (re-entry)" },
  { re: /\bbrain\b/i,                  label: "jargon (brain)" },
  { re: /\bneuro\w*/i,                 label: "jargon (neuro)" },
  { re: /\bexile\b/i,                  label: "jargon (exile)" },
  { re: /\bdopamine\b/i,               label: "jargon (dopamine)" },
  { re: /\bregulat\w*/i,               label: "jargon (regulate)" },
  { re: /\bownership\b/i,              label: "jargon (ownership)" },
  { re: /\boff-?ramp\b/i,              label: "jargon (off-ramp)" },
  { re: /\bprocess\b/i,                label: "jargon (process)" },
  { re: /\bthread\b/i,                 label: "jargon (thread)" },
  { re: /\bupstairs\b/i,               label: "assumes-a-house (upstairs)" },
  // Comparative claims about other children (no invented comparisons).
  { re: /\brare\b/i,                   label: "comparative (rare)" },
  { re: /\bmost\s+kids\b/i,            label: "comparative (most kids)" },
  { re: /\bmost\s+children\b/i,        label: "comparative (most children)" },
  { re: /\bunlike\s+other\s+children\b/i, label: "comparative (unlike other children)" },
  { re: /\bfew\s+children\b/i,         label: "comparative (few children)" },
];

const CAP = {
  shortGood: 90, shortWhy: 90, shortFix: 90,
  whyPara: 320, instead: 72, try: 72, after: 160, tonight: 130,
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

function check(text: string, cap: number, field: string, errors: string[], prose: boolean) {
  if (text.length > cap) errors.push(`${field}: over ${cap} chars (${text.length})`);
  for (const b of BANNED) if (b.re.test(text)) errors.push(`${field}: ${b.label}`);
  if (maxSentenceWords(text) > 20) errors.push(`${field}: sentence over 20 words`);
  // Flesch is unreliable on < 8-word phrases, so only gate prose fields.
  if (prose && words(text).length >= 8) {
    const f = fleschReadingEase(text);
    if (f < 60) errors.push(`${field}: Flesch ${f.toFixed(0)} < 60`);
  }
}

export function validateGenerated(g: ReportV2Generated): ValidationResult {
  const e: string[] = [];
  check(g.shortGood, CAP.shortGood, "shortGood", e, false);
  check(g.shortWhy,  CAP.shortWhy,  "shortWhy",  e, false);
  check(g.shortFix,  CAP.shortFix,  "shortFix",  e, false);
  g.whyParas.forEach((p, i) => check(p, CAP.whyPara, `whyParas[${i}]`, e, true));
  check(g.switch.instead, CAP.instead, "switch.instead", e, false);
  check(g.switch.try,     CAP.try,     "switch.try",     e, false);
  check(g.switch.after,   CAP.after,   "switch.after",   e, true);
  if (!isQuotedLine(g.switch.instead)) e.push("switch.instead: must be a quoted line a parent says");
  if (!isQuotedLine(g.switch.try))     e.push("switch.try: must be a quoted line a parent says");
  g.tonight.forEach((t, i) => check(t, CAP.tonight, `tonight[${i}]`, e, true));
  return { ok: e.length === 0, errors: e };
}
