// Deterministic fallback step — built straight from the base day, never a model. Used when generation
// errors or fails the validator twice. It reuses the base step's OWN moment and notice (no boilerplate),
// keeps an honest opening (never claims a change the step didn't make), and after a didnt_land is made
// measurably smaller. Always valid, never garbage.
import type { AdjustedStep, PlanOutcome } from "./types";
import { normalizeExactWords, spokenLineOk } from "./validate";

function clampWords(s: string, max: number): string {
  const w = (s || "").trim().replace(/\s+/g, " ").split(" ");
  return w.length <= max ? w.join(" ") : w.slice(0, max).join(" ");
}

// Verbatim quoted lines from the base prose that are safe to say straight to the child. Only DOUBLE /
// curly quotes delimit a spoken line (never the apostrophe), and the line must end in sentence punctuation.
function extractSpoken(text: string, childName?: string): string[] {
  const raw: string[] = [];
  for (const m of text.matchAll(/[“"]([^”"\n]{4,}?[.?!])[”"]/g)) raw.push(m[1]);
  return normalizeExactWords(raw).filter((q) => spokenLineOk(q, childName)).map((q) => clampWords(q, 30));
}

// The base step's OWN moment: the first sentence/clause carrying an everyday time cue. "" if none.
function baseMoment(text: string): string {
  const t = text.replace(/[*_]/g, "");
  const cue = /(before|after|when|as|during|right as|at)\s+[^.?!]{0,40}?\b(homework|screen|bed|bedtime|morning|dinner|snack|school|starts?|begins?|sit down|gets? going|time)\b/i;
  const m = t.match(cue);
  return m ? clampWords(m[0].trim().replace(/^[a-z]/, (c) => c), 14) : "";
}

// The base step's OWN "what to watch" sentence (watch / notice / see). "" if none, and never one that
// asks for more minutes than the step.
function baseNotice(text: string, minutes: number): string {
  const sentences = text.replace(/[*_]/g, "").split(/(?<=[.?!])\s+/);
  const watch = sentences.find((s) => /\b(watch|notice|see (what|whether|if)|did )/i.test(s));
  if (!watch) return "";
  const mins = watch.match(/(\d+)\s*minute/i);
  if (mins && Number(mins[1]) > minutes) return "";
  return clampWords(watch.trim(), 30);
}

// baseTitle and baseText must already be token-filled. priorOutcome shapes sizing + the (honest) opening.
export function fallbackStep(baseTitle: string, baseText: string, priorOutcome: PlanOutcome = "partly", childName?: string): AdjustedStep {
  const didnt = priorOutcome === "didnt_land";
  const minutes = didnt ? 3 : 5;
  let exactWords = extractSpoken(baseText, childName);
  if (!exactWords.length) exactWords = ["You decide how to start this one — I'll follow your lead."];
  exactWords = exactWords.slice(0, didnt ? 1 : 2); // smaller after a didnt_land
  return {
    // Honest: never claim a tweak/step-further for an unchanged base step.
    opening: didnt ? "Here's a smaller, gentler version for today." : "Here's today's step.",
    title: clampWords(baseTitle || "Today's step", 12),
    moment: baseMoment(baseText) || "when you sit down to it today",
    exactWords,
    notice: baseNotice(baseText, minutes) || `Notice how ${childName || "your child"} takes to it today.`,
    minutes,
  };
}
