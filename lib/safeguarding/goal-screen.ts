// ─────────────────────────────────────────────────────────────────────────────
// PLACEHOLDER WORDLIST — NOT FOR PRODUCTION.
//
// The patterns below are ILLUSTRATIVE ONLY and have NOT had clinical review.
// They must be reviewed and finalised by a qualified clinician before this
// ships. Getting the list approximately right is not good enough — both misses
// and false positives carry real cost here (see goal-content-for-review.md
// Part 5). Do not treat this set as authoritative.
// ─────────────────────────────────────────────────────────────────────────────
//
// Deterministic screen for parent-typed goal free-text. Pure keyword/regex:
// no model call, no network, not async. Runs BEFORE any model call and BEFORE
// any storage of the free text — see screenGoalText() docs below.
//
// Returns a reason CATEGORY only. The matched phrase never leaves this function.

export type SafeguardingReason =
  | "self_harm"
  | "harm_by_others"
  | "crisis"
  | "not_eating";

export type SafeguardingResult =
  | { flagged: false }
  | { flagged: true; reason: SafeguardingReason };

// Patterns are tested against normalised input (lowercased, whitespace
// collapsed). Order matters: the first category to match wins, and self_harm is
// checked before harm_by_others so "hurt himself" resolves to self_harm.
const CATEGORIES: { reason: SafeguardingReason; patterns: RegExp[] }[] = [
  {
    reason: "self_harm",
    patterns: [
      /\b(?:kill|hurt|cut|cutting|harm|harming)\s+(?:my|him|her|them)self\b/,
      /\bself[-\s]?harm(?:ing|ed)?\b/,
      /\bwants?\s+to\s+die\b/,
      /\bsuicid(?:e|al)\b/,
    ],
  },
  {
    reason: "harm_by_others",
    patterns: [
      /\b(?:hit|hits|hitting|beat|beats|beaten|beating|hurt|hurts|hurting)\s+(?:him|her|them)\b/,
      /\babus(?:e|es|ed|ing|ive)\b/,
      /\btouch(?:es|ed|ing)?\s+(?:him|her|them)\s+(?:in|down)\b/,
    ],
  },
  {
    reason: "crisis",
    patterns: [
      /\bwants?\s+to\s+disappear\b/,
      /\bno\s+point\s+(?:in\s+)?(?:living|going\s+on)\b/,
      /\bbetter\s+off\s+dead\b/,
      /\bcan'?t\s+go\s+on\b/,
    ],
  },
  {
    reason: "not_eating",
    patterns: [
      /\b(?:not|stopped|won'?t|refus(?:e|es|ing))\s+eat(?:ing)?\b/,
      /\b(?:hasn'?t|has\s+not)\s+eaten\b/,
    ],
  },
];

// Lowercase, collapse all whitespace to single spaces, trim.
// Non-string / null / undefined → "" (treated as empty).
function normalise(text: unknown): string {
  if (typeof text !== "string") return "";
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Deterministic safeguarding screen for parent-typed goal free-text.
 *
 * REQUEST-PATH POSITION: called at the top of the goal write endpoint
 * (app/api/report/goal/route.ts, Phase 2 Step 4), immediately after the free
 * text is read and trimmed, and BEFORE (a) any model call and (b) any DB write
 * of the text. On a flag the endpoint returns the fixed SAFEGUARDING_RESPONSE
 * and records only the boolean goal_flagged — the raw text is not sent onward.
 *
 * Guarantees:
 * - Pure and synchronous. No model call, no network.
 * - Case-insensitive, whitespace-tolerant (see normalise()).
 * - Returns a reason category, never the matched phrase.
 * - Never throws. Empty / null / undefined / unparseable input → not flagged.
 */
export function screenGoalText(text: string | null | undefined): SafeguardingResult {
  try {
    const norm = normalise(text);
    if (!norm) return { flagged: false };
    for (const category of CATEGORIES) {
      for (const pattern of category.patterns) {
        if (pattern.test(norm)) return { flagged: true, reason: category.reason };
      }
    }
    return { flagged: false };
  } catch {
    // Fail open to "not flagged" — a screen error must never break goal submission,
    // and must never surface the input. Genuine risks rely on the patterns above,
    // not on exception behaviour.
    return { flagged: false };
  }
}
