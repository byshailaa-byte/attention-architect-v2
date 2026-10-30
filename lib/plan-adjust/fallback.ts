// Deterministic fallback step — built straight from the base day, never a model. Used when generation
// errors or fails the validator twice. It is ALWAYS a valid, non-empty step: the parent never sees a
// blank day. Because it is composed only from the (clean, authored) base text, it passes validateStep.
import type { AdjustedStep } from "./types";

function clampWords(s: string, max: number): string {
  const w = (s || "").trim().replace(/\s+/g, " ").split(" ");
  return w.length <= max ? w.join(" ") : w.slice(0, max).join(" ");
}

// Pull up to two verbatim quoted lines out of the base prose (straight or curly quotes, markdown
// emphasis stripped). These are the "exact words" a parent already has in the base day.
function extractQuotes(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/[“"']([^”"'\n]{4,})[”"']/g)) {
    const q = m[1].replace(/[*_]/g, "").trim();
    if (q && !out.includes(q)) out.push(clampWords(q, 30));
    if (out.length >= 2) break;
  }
  return out;
}

// A short everyday moment, inferred from the base text keywords (kept well within the word limit).
function inferMoment(text: string): string {
  const t = text.toLowerCase();
  if (/\bscreen/.test(t)) return "at screen-off time";
  if (/\bhomework\b/.test(t)) return "when homework starts";
  if (/\bbed(time)?\b/.test(t)) return "at bedtime";
  if (/\bmorning\b/.test(t)) return "in the morning";
  if (/\bgetting started|the start\b/.test(t)) return "right as they get started";
  return "at the usual moment today";
}

// A short "what to notice" line — prefer a base sentence about watching/noticing, else a safe generic.
function inferNotice(text: string): string {
  const sentences = text.replace(/[*_]/g, "").split(/(?<=[.?!])\s+/);
  const watch = sentences.find((s) => /\b(watch|notice|see what)\b/i.test(s));
  if (watch) return clampWords(watch.trim(), 30);
  return "Watch what happens — and whether it starts a little more easily than usual.";
}

// baseTitle and baseText must already be token-filled (child name + pronouns resolved).
export function fallbackStep(baseTitle: string, baseText: string): AdjustedStep {
  const quotes = extractQuotes(baseText);
  const exactWords = quotes.length ? quotes : ["You decide how to start this one — I'll follow your lead."];
  return {
    title: clampWords(baseTitle || "Today's small step", 12),
    moment: inferMoment(baseText),
    exactWords,
    notice: inferNotice(baseText),
    minutes: 5,
  };
}
