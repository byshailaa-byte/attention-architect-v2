// Thin final check on a completed reply (replaces the old regen/guard loop). It does NOT rewrite the
// streamed reply — it detects the few hard-rule violations and returns them so the live path can LOG
// them (surfaced in the weekly review) and the evals can GATE on them: no outcome promises, numbers
// match what the parent actually gave, reply language = stored preference, no medical advice. The
// pre-model safety gate still runs before any of this.
import { detectLanguage, type Language } from "@/lib/coach/lang";

export type FinalIssue = "outcome_promise" | "number_mismatch" | "language_mismatch" | "medical_advice";
export type FinalCheckResult = { ok: boolean; issues: FinalIssue[]; detail: string[] };

const PROMISE_RE = /\b(in \d+\s+(days?|weeks?|months?)[^.?!]*\b(will|he'?ll|she'?ll|they'?ll|you'?ll)\b|i promise|guarantee|guaranteed|definitely will|for sure (she|he|they) will|by (day|week) \d+[^.?!]*\bwill\b)/i;
const MEDICAL_ADVICE_RE = /\b(you should (get|start|give)[^.?!]*\b(medication|medicine|dose|mg|tablets?)\b|(give|start) (her|him|them)[^.?!]*\b(medication|medicine|\d+\s*mg)\b|(i think|sounds like|probably|likely) (it'?s|she has|he has|they have) (adhd|autism|odd|dyslexia|depression|anxiety disorder))/i;

// Pull counting-style numbers the reply CLAIMS the parent reported ("from 4 to 2", "down to 2",
// "about 4–5"). Prices, day/week numbers, "number 3", and durations ("5 minutes") are excluded.
function claimedCounts(text: string): number[] {
  const out: number[] = [];
  const re = /\b(?:from|to|down to|up to|about|around|now at)\s+(\d{1,3})(?:\s*(?:–|-|to|or)\s*(\d{1,3}))?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    // skip if immediately followed by a time/price/ordinal unit
    const tail = text.slice(m.index + m[0].length, m.index + m[0].length + 14).toLowerCase();
    if (/^\s*(min|minute|sec|second|hour|day|week|month|year|rupee|rs\b|₹|%|am\b|pm\b|o'?clock)/.test(tail)) continue;
    out.push(Number(m[1]));
    if (m[2]) out.push(Number(m[2]));
  }
  return out;
}

export function finalCheck(text: string, opts: { language: Language; recordedNumbers: number[] }): FinalCheckResult {
  const issues: FinalIssue[] = [];
  const detail: string[] = [];
  const t = text || "";

  if (PROMISE_RE.test(t)) { issues.push("outcome_promise"); detail.push("reply promises a future outcome"); }
  if (MEDICAL_ADVICE_RE.test(t)) { issues.push("medical_advice"); detail.push("reply gives medical/diagnosis advice"); }

  const recorded = new Set(opts.recordedNumbers);
  const bad = claimedCounts(t).filter((n) => !recorded.has(n));
  if (bad.length) { issues.push("number_mismatch"); detail.push(`counts not in recorded values: ${bad.join(",")}`); }

  // Language: only flag a clear mismatch (reply plainly English when pref is Hindi, or vice-versa).
  const replyLang = detectLanguage(t);
  if (opts.language === "hi" && replyLang === "en") { issues.push("language_mismatch"); detail.push("pref=hi but reply in English"); }
  if (opts.language === "en" && replyLang === "hi") { issues.push("language_mismatch"); detail.push("pref=en but reply in Hindi"); }

  return { ok: issues.length === 0, issues, detail };
}
