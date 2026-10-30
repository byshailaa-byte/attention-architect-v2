// Deterministic fallback step — built straight from the base day, never a model. Used when generation
// errors or fails the validator twice. It is ALWAYS a valid, non-empty step that passes validateStep:
// composed only from the (clean, authored) base text, with an opening worded from the outcome, clean
// spoken lines, and — after a didnt_land — made measurably smaller.
import type { AdjustedStep, PlanOutcome } from "./types";
import { normalizeExactWords, spokenLineOk } from "./validate";

function clampWords(s: string, max: number): string {
  const w = (s || "").trim().replace(/\s+/g, " ").split(" ");
  return w.length <= max ? w.join(" ") : w.slice(0, max).join(" ");
}

// Verbatim quoted lines from the base prose that are safe to say straight to the child. Only DOUBLE /
// curly quotes delimit a spoken line — never the apostrophe (so "Reyansh's gaming" isn't mis-read as a
// quote). A line must end in sentence punctuation to count (guards against a stray opening quote).
function extractSpoken(text: string, childName?: string): string[] {
  const raw: string[] = [];
  for (const m of text.matchAll(/[“"]([^”"\n]{4,}?[.?!])[”"]/g)) raw.push(m[1]);
  return normalizeExactWords(raw).filter((q) => spokenLineOk(q, childName)).map((q) => clampWords(q, 30));
}

function inferMoment(text: string): string {
  const t = text.toLowerCase();
  if (/\bscreen/.test(t)) return "at screen-off time";
  if (/\bhomework\b/.test(t)) return "when homework starts";
  if (/\bbed(time)?\b/.test(t)) return "at bedtime";
  if (/\bmorning\b/.test(t)) return "in the morning";
  if (/\bgetting started|the start\b/.test(t)) return "right as they get started";
  return "at the usual moment today";
}

function inferNotice(text: string): string {
  const sentences = text.replace(/[*_]/g, "").split(/(?<=[.?!])\s+/);
  const watch = sentences.find((s) => /\b(watch|notice|see what)\b/i.test(s) && !/\d+\s*minute/i.test(s));
  if (watch) return clampWords(watch.trim(), 30);
  return "Watch whether it starts a little more easily than usual.";
}

const OPENING: Record<PlanOutcome, string> = {
  worked: "Yesterday worked — here's today, one small step on.",
  partly: "Yesterday was a partial win — here's the same step with one small tweak.",
  didnt_land: "Yesterday didn't land — here's a smaller, easier version for today.",
};

// baseTitle and baseText must already be token-filled. priorOutcome shapes the opening + the sizing.
export function fallbackStep(baseTitle: string, baseText: string, priorOutcome: PlanOutcome = "partly", childName?: string): AdjustedStep {
  const spoken = extractSpoken(baseText, childName);
  let exactWords = spoken.length ? spoken : ["You decide how to start this one — I'll follow your lead."];
  let minutes = 5;
  if (priorOutcome === "didnt_land") { exactWords = exactWords.slice(0, 1); minutes = 3; } // measurably smaller
  else exactWords = exactWords.slice(0, 2);
  return {
    opening: OPENING[priorOutcome],
    title: clampWords(baseTitle || "Today's small step", 12),
    moment: inferMoment(baseText),
    exactWords,
    notice: inferNotice(baseText),
    minutes,
  };
}
