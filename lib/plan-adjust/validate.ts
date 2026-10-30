// A3 — deterministic validator. No model. Checks the generated step against hard rules; the generator
// gets ONE retry with the issues, then falls back to a deterministic base step. Rules:
//   • word limits (title/moment/notice and each exact-words line)
//   • exact words present (at least one non-empty line — the thing rendered in quotes)
//   • banned: clinical/severity terms, promises, price/selling
//   • no invented numbers (any digit in the step must appear in the base day text)
//   • same skill + week (no cross-week reference; no pattern-name leak)
import type { AdjustedStep } from "./types";

// Clinical / severity / diagnosis vocabulary + promissory + price/selling. Mirrors the report + copy
// banned list. "cure/guarantee/promise" are the promises; ₹/price/buy/upgrade/discount are selling.
const BANNED =
  /\b(adhd|autis|asperger|dyslex|disorder|diagnos|clinical|syndrome|spectrum|therap|psychiatr|psycholog|medicat|symptom|mild|moderate|severe|disab|deficit|cure|guarantee|guaranteed|promise|promises|discount|upgrade|refund)\b/i;
const SELLING = /(₹|\brs\.?\b|\bprice\b|\bbuy\b|\bpurchase\b|\bsubscri)/i;
const PATTERN_NAMES = /\b(the storm|the explorer|the captain|the inventor|the all-?in kid|the live wire|the magnet|the glue)\b/i;

const LIMITS = { title: 12, moment: 18, notice: 30, exactLine: 30 };

function words(s: string): number {
  return (s || "").trim().split(/\s+/).filter(Boolean).length;
}
// Every standalone number in the step must be justified by the base text (so the Coach/model can't
// invent "do it 7 times"). Minutes is checked separately (1–5). Numbers written as words are fine.
function numbersIn(s: string): string[] {
  return (s.match(/\d+/g) ?? []).filter((n) => n.length > 0);
}

export type ValidationResult = { ok: boolean; issues: string[] };

export function validateStep(step: AdjustedStep, baseText: string, ctx: { week: number }): ValidationResult {
  const issues: string[] = [];
  const base = (baseText || "").toLowerCase();

  if (!step || typeof step !== "object") return { ok: false, issues: ["step is not an object"] };

  if (!step.title?.trim()) issues.push("empty title");
  if (!step.moment?.trim()) issues.push("empty moment");
  if (!step.notice?.trim()) issues.push("empty notice");
  if (!Array.isArray(step.exactWords) || step.exactWords.filter((w) => w?.trim()).length === 0)
    issues.push("no exact words to say");

  if (words(step.title) > LIMITS.title) issues.push(`title too long (>${LIMITS.title} words)`);
  if (words(step.moment) > LIMITS.moment) issues.push(`moment too long (>${LIMITS.moment} words)`);
  if (words(step.notice) > LIMITS.notice) issues.push(`notice too long (>${LIMITS.notice} words)`);
  for (const line of step.exactWords ?? []) {
    if (words(line) > LIMITS.exactLine) issues.push(`an exact-words line is too long (>${LIMITS.exactLine} words)`);
  }

  if (!(step.minutes >= 1 && step.minutes <= 5)) issues.push("minutes must be between 1 and 5");

  const all = [step.title, step.moment, step.notice, ...(step.exactWords ?? [])].join("  ");
  if (BANNED.test(all)) issues.push(`banned/clinical/promissory word: "${all.match(BANNED)?.[0]}"`);
  if (SELLING.test(all)) issues.push(`price/selling language: "${all.match(SELLING)?.[0]}"`);
  if (PATTERN_NAMES.test(all)) issues.push(`pattern name leaked: "${all.match(PATTERN_NAMES)?.[0]}"`);

  // No invented numbers: each digit-run in the step (minutes aside) must appear in the base day text.
  for (const n of numbersIn(all)) {
    if (!base.includes(n)) issues.push(`invented number "${n}" (not in the base step)`);
  }

  // Same week: never point the parent at another week.
  const weekRef = all.match(/week\s*(\d+)/i);
  if (weekRef && Number(weekRef[1]) !== ctx.week) issues.push(`references week ${weekRef[1]} (should stay in week ${ctx.week})`);

  return { ok: issues.length === 0, issues };
}
