import { ALLOWED_AMOUNTS } from "./pricing";
import type { CallScript } from "./types";

// Deterministic validator for a generated script. Enforces the hard rules directly (fast, no extra
// LLM cost): no clinical/diagnostic words, no promises/guarantees, no pressure/deadlines, no invented
// prices or discounts, and short enough to read aloud in about a minute.
const CLINICAL = /\b(adhd|a\.d\.h\.d|\badd\b|autis|asperger|dyslex|dyscalc|disorder|diagnos|clinical|syndrome|neurodiverg|spectrum|therap|counsell?or|psychiatr|psycholog|medicat|symptom)\b/i;
const PRESSURE = /\b(only this week|limited time|last chance|hurry|offer ends|today only|act now|right now before|book now before|don'?t miss|ends soon|few seats|slots? left)\b/i;
const PROMISE = /\b(guarantee|guaranteed|\bpromise|will definitely|definitely will|cure[sd]?\b|100%|surely fix|fix(es|ed)? (it|them) for sure)\b/i;
const DISCOUNT = /\b(discount|% ?off|flat \d|save ₹|cashback|coupon|offer price|special price)\b/i;

function allText(s: CallScript): string {
  const parts: string[] = [s.opener, s.leftOff ?? "", s.since ?? ""];
  for (const sec of s.sections) parts.push(sec.title, sec.hint ?? "", ...sec.lines);
  for (const o of s.objections) parts.push(o.label, o.answer);
  return parts.join("\n");
}

// "Under a minute to read" = what the caller actually says to the parent: the opener + the section
// lines. leftOff/since are glance-context (shown in a box, not spoken), objection answers are a
// reference bank (only if it comes up), hints are silent — none count toward the minute.
function spokenWordCount(s: CallScript): number {
  const spoken: string[] = [s.opener];
  for (const sec of s.sections) spoken.push(...sec.lines);
  return spoken.join(" ").trim().split(/\s+/).filter(Boolean).length;
}

export function validateScript(s: CallScript): { ok: boolean; fails: string[] } {
  const text = allText(s);
  const fails: string[] = [];
  if (CLINICAL.test(text)) fails.push("clinical/diagnostic word");
  if (PRESSURE.test(text)) fails.push("pressure/deadline language");
  if (PROMISE.test(text)) fails.push("promise/guarantee");
  if (DISCOUNT.test(text)) fails.push("invented discount");
  // Any rupee amount must be one of the allowed prices (strip surrounding punctuation like a trailing comma).
  const amounts = text.match(/₹\s?[\d,]+/g) ?? [];
  for (const a of amounts) {
    const num = a.replace(/[^\d,]/g, "").replace(/,+$/, "");
    if (!ALLOWED_AMOUNTS.includes(num)) { fails.push(`unapproved price ${a.trim()}`); break; }
  }
  const words = spokenWordCount(s);
  if (words > 230) fails.push(`too long to read (${words} words)`);
  if (!s.opener || !s.sections.length) fails.push("missing opener/sections");
  return { ok: fails.length === 0, fails };
}
