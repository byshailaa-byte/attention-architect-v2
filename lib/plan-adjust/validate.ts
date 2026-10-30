// A3 — deterministic validator. No model. Checks the generated step against hard rules; the generator
// gets ONE retry with the issues, then falls back to a deterministic base step. Rules:
//   • word limits (title/moment/notice/opening and each exact-words line)
//   • exact words present, and they are lines spoken TO the child — NOT nudges, observations, stage
//     directions, or third-person references (those belong in the opening / notice)
//   • banned: clinical/severity terms, promises, price/selling; no pattern names
//   • no invented numbers; the notice must not ask for longer than the step's minutes
//   • same week; for a didnt_land adjust the step must be measurably smaller than before
//   • on a limit topic (screens/time/money), reject an unconditional "whatever you say" agreement
import type { AdjustedStep, PlanOutcome } from "./types";

const BANNED =
  /\b(adhd|autis|asperger|dyslex|disorder|diagnos|clinical|syndrome|spectrum|therap|psychiatr|psycholog|medicat|symptom|mild|moderate|severe|disab|deficit|cure|guarantee|guaranteed|promise|promises|discount|upgrade|refund)\b/i;
const SELLING = /(₹|\brs\.?\b|\bprice\b|\bbuy\b|\bpurchase\b|\bsubscri)/i;
const PATTERN_NAMES = /\b(the storm|the explorer|the captain|the inventor|the all-?in kid|the live wire|the magnet|the glue)\b/i;

// Exact-words must be spoken TO the child (second person). These never belong in a spoken line:
const THIRD_PERSON = /\b(he|him|his|she|her|hers|they|them|their|theirs)\b/i;   // talking ABOUT the child
const COACH_OR_OBSERVE = /\b(coach|yourself|you might|you could try|watch (him|her|them|for|whether|if|how)|notice (whether|if|how|him|her|them))\b/i;
const STAGE_DIRECTION = /[()*\[\]]/;                                             // "(meaning her friends)", "*pause*"
// Unconditional acceptance of a child-set limit (screens/time/money) — the Coach should negotiate.
const UNCONDITIONAL = /\b(ok(ay)?|sure|fine|great|perfect|deal|done),?\s*(let'?s (go with|do|stick with)|we'?ll (go with|do|take)|that'?s (fine|settled|it|good))\b|\bwhatever you (say|want|decide|think|choose|like)\b/i;

const LIMITS = { opening: 48, title: 12, moment: 18, notice: 30, exactLine: 30 };

const words = (s: string) => (s || "").trim().split(/\s+/).filter(Boolean).length;
const numbersIn = (s: string) => s.match(/\d+/g) ?? [];

// Is this line something a parent can say straight TO the child? (no nudge/observation/stage
// direction/third person). Shared by the validator and the deterministic fallback.
export function spokenLineOk(line: string, childName?: string): boolean {
  if (COACH_OR_OBSERVE.test(line) || STAGE_DIRECTION.test(line) || THIRD_PERSON.test(line)) return false;
  if (childName) { const re = new RegExp(`\\b${childName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"); if (re.test(line)) return false; }
  return true;
}

export type ValidationResult = { ok: boolean; issues: string[] };
export type ValidateCtx = { week: number; childName?: string; priorOutcome?: PlanOutcome | null; limitTopic?: boolean };

export function validateStep(step: AdjustedStep, baseText: string, ctx: ValidateCtx): ValidationResult {
  const issues: string[] = [];
  const base = (baseText || "").toLowerCase();
  if (!step || typeof step !== "object") return { ok: false, issues: ["step is not an object"] };

  if (!step.opening?.trim()) issues.push("empty opening");
  if (!step.title?.trim()) issues.push("empty title");
  if (!step.moment?.trim()) issues.push("empty moment");
  if (!step.notice?.trim()) issues.push("empty notice");
  const lines = (step.exactWords ?? []).filter((w) => w?.trim());
  if (lines.length === 0) issues.push("no exact words to say");

  if (words(step.opening) > LIMITS.opening) issues.push(`opening too long (>${LIMITS.opening} words)`);
  if (words(step.title) > LIMITS.title) issues.push(`title too long (>${LIMITS.title} words)`);
  if (words(step.moment) > LIMITS.moment) issues.push(`moment too long (>${LIMITS.moment} words)`);
  if (words(step.notice) > LIMITS.notice) issues.push(`notice too long (>${LIMITS.notice} words)`);
  for (const line of lines) if (words(line) > LIMITS.exactLine) issues.push(`an exact-words line is too long (>${LIMITS.exactLine} words)`);

  if (!(step.minutes >= 1 && step.minutes <= 5)) issues.push("minutes must be between 1 and 5");

  // ── Exact-words are spoken TO the child: no nudges, observations, stage directions, third person.
  const nameRe = ctx.childName ? new RegExp(`\\b${ctx.childName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i") : null;
  for (const line of lines) {
    if (COACH_OR_OBSERVE.test(line)) issues.push(`exact words contain a nudge/observation (belongs in the opening or notice): "${line}"`);
    if (STAGE_DIRECTION.test(line)) issues.push(`exact words contain a stage direction / parentheses: "${line}"`);
    if (THIRD_PERSON.test(line)) issues.push(`exact words refer to the child in the third person (say it TO them): "${line}"`);
    if (nameRe && nameRe.test(line)) issues.push(`exact words name the child in the third person: "${line}"`);
    if (ctx.limitTopic && UNCONDITIONAL.test(line)) issues.push(`unconditional agreement on a limit — negotiate honestly instead: "${line}"`);
  }

  // The Coach is mentioned ONLY in the banner — never in the opening (that would duplicate the banner).
  if (/\bcoach\b/i.test(step.opening)) issues.push("the opening must not mention the Coach — put any Coach nudge in the banner");

  const all = [step.opening, step.title, step.moment, step.notice, ...lines, step.banner ?? ""].join("  ");
  if (BANNED.test(all)) issues.push(`banned/clinical/promissory word: "${all.match(BANNED)?.[0]}"`);
  if (SELLING.test(all)) issues.push(`price/selling language: "${all.match(SELLING)?.[0]}"`);
  if (PATTERN_NAMES.test(all)) issues.push(`pattern name leaked: "${all.match(PATTERN_NAMES)?.[0]}"`);

  for (const n of numbersIn(all)) if (!base.includes(n)) issues.push(`invented number "${n}" (not in the base step)`);

  // The notice must not ask for longer than the step itself.
  const noticeMin = step.notice.match(/(\d+)\s*minute/i);
  if (noticeMin && Number(noticeMin[1]) > step.minutes) issues.push(`notice asks for ${noticeMin[1]} minutes but the step is ${step.minutes}`);

  const weekRef = all.match(/week\s*(\d+)/i);
  if (weekRef && Number(weekRef[1]) !== ctx.week) issues.push(`references week ${weekRef[1]} (should stay in week ${ctx.week})`);

  // A didnt_land adjust must be measurably smaller than before: at most two spoken lines and ≤3 min.
  if (ctx.priorOutcome === "didnt_land") {
    if (lines.length > 2) issues.push("a didnt_land adjust must be smaller: at most two spoken lines");
    if (step.minutes > 3) issues.push("a didnt_land adjust must be smaller: ≤3 minutes");
  }

  return { ok: issues.length === 0, issues };
}

// Strip any surrounding quote marks from each spoken line so the UI single-wraps them (never “ “x” ”).
export function normalizeExactWords(lines: string[]): string[] {
  return (lines ?? [])
    .map((w) => (w ?? "").trim().replace(/^[“”"'‘’]+/, "").replace(/[“”"'‘’]+$/, "").trim())
    .filter(Boolean);
}
