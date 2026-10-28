import { ALLOWED_AMOUNTS } from "./pricing";
import type { CallScript } from "./types";

// Deterministic validator for a generated script. Fails → caller does one retry, then a clean
// deterministic fallback (see generate.ts). Checks the hard rules + fact-traces numbers/₹/names/call-no.
export type ValidateCtx = {
  callNo: number;              // this is call N; the follow-up's "where you left off" is call N-1
  trialEligible: boolean;
  callerGender: "f" | "m" | "n";
  childNames: string[];        // the real child name(s) — the script must ground on these
  banNames?: string[];         // names that must NOT appear (other families' children; for tests)
};

const CLINICAL = /\b(adhd|a\.d\.h\.d|autis|asperger|dyslex|dyscalc|disorder|diagnos|clinical|syndrome|neurodiverg|spectrum|therap|counsell?or|psychiatr|psycholog|medicat|symptom|pagal|mandbuddhi|bimari|bimar|ilaaj|dawai|\bdawa\b|mental|vikaar)\b/i;
const SEVERITY = /\b(mild|moderate|severe|serious case|tier\s*\d|level\s*\d|grade\s*\d|category\s*\d|stage\s*\d|type\s*\d|halka|gambhir)\b/i;
const PRESSURE = /\b(only this week|limited time|last chance|hurry|offer ends|today only|act now|right now before|book now before|don'?t miss|ends soon|few seats|slots? left|jaldi karein|aaj hi)\b/i;
const PROMISE = /\b(guarantee|guaranteed|\bpromise|will definitely|definitely will|cure[sd]?\b|100%|surely fix|guarantee deta)\b/i;
const DISCOUNT = /\b(discount|% ?off|flat \d|save ₹|cashback|coupon|offer price|special price|chhoot)\b/i;
const TRIAL = /\b(trial|free 4-day|4-din|4 din|free coach|muft)\b/i;

function allText(s: CallScript): string {
  const parts: string[] = [s.opener, s.leftOff ?? "", s.since ?? ""];
  for (const sec of s.sections) parts.push(sec.title, sec.hint ?? "", ...sec.lines);
  for (const o of s.objections) parts.push(o.label, o.answer);
  return parts.join("\n");
}
function spokenWordCount(s: CallScript): number {
  const spoken: string[] = [s.opener];
  for (const sec of s.sections) spoken.push(...sec.lines);
  return spoken.join(" ").trim().split(/\s+/).filter(Boolean).length;
}

export function validateScript(s: CallScript, ctx: ValidateCtx): { ok: boolean; fails: string[] } {
  const text = allText(s);
  const fails: string[] = [];

  if (CLINICAL.test(text)) fails.push("clinical/diagnostic word");
  if (SEVERITY.test(text)) fails.push("severity/tier word");
  if (PRESSURE.test(text)) fails.push("pressure/deadline language");
  if (PROMISE.test(text)) fails.push("promise/guarantee");
  if (DISCOUNT.test(text)) fails.push("invented discount");

  // ₹: every amount must be an approved price (strip surrounding punctuation).
  for (const a of text.match(/₹\s?[\d,]+/g) ?? []) {
    const num = a.replace(/[^\d,]/g, "").replace(/,+$/, "");
    if (!ALLOWED_AMOUNTS.includes(num)) { fails.push(`unapproved ₹ amount ${a.trim()}`); break; }
  }

  // trial must not be mentioned when the parent is ineligible.
  if (!ctx.trialEligible && TRIAL.test(text)) fails.push("trial mentioned when ineligible");

  // call-no: "where you left off (call N …)" must be the prior call number.
  const m = (s.leftOff ?? "").match(/call\s+(\d+)/i);
  if (m && Number(m[1]) !== ctx.callNo - 1) fails.push(`wrong call number (said ${m[1]}, expected ${ctx.callNo - 1})`);

  // names: must ground on a real child name; must not contain a banned (other family's) name.
  const low = text.toLowerCase();
  if (ctx.childNames.length && !ctx.childNames.some((n) => n && low.includes(n.toLowerCase()))) fails.push("does not name the real child");
  for (const b of ctx.banNames ?? []) if (b && low.includes(b.toLowerCase())) { fails.push(`names another family's child (${b})`); break; }

  // Hinglish caller self-reference must match the caller's gender.
  if (s.lang === "hinglish") {
    if (ctx.callerGender === "f" && /\brah[ae]\s+h(oo|u)n\b/i.test(text) && /\braha\s+h(oo|u)n\b/i.test(text)) fails.push("wrong-gender verb (male form for female caller)");
    if (ctx.callerGender === "m" && /\brahi\s+h(oo|u)n\b/i.test(text)) fails.push("wrong-gender verb (female form for male caller)");
  }

  if (spokenWordCount(s) > 230) fails.push(`too long to read (${spokenWordCount(s)} words)`);
  if (!s.opener || !s.sections.length) fails.push("missing opener/sections");
  return { ok: fails.length === 0, fails };
}
