// Goal content registry, keyed by the six attention skills.
//
// The keys are sourced from SKILL_NAMES in lib/report/skills.ts (the single
// source of truth) via computed property names — they are NOT retyped here, so
// the registry can never drift from the canonical skill list. The Record's key
// type is the SKILL_NAMES union, so a missing or misspelled skill fails tsc.

import { SKILL_NAMES } from "@/lib/report/skills";
import type { GoalSkillContent, BridgeConcern } from "@/content/types";

import { starting }            from "./starting";
import { holdingOn }           from "./holding-on";
import { stayingWithIt }       from "./staying-with-it";
import { recovering }          from "./recovering";
import { carryingItOver }      from "./carrying-it-over";
import { runningItThemselves } from "./running-it-themselves";

export const goalsBySkill: Record<(typeof SKILL_NAMES)[number], GoalSkillContent> = {
  [SKILL_NAMES[0]]: starting,            // "Starting"
  [SKILL_NAMES[1]]: holdingOn,           // "Holding on"
  [SKILL_NAMES[2]]: stayingWithIt,       // "Staying with it"
  [SKILL_NAMES[3]]: recovering,          // "Recovering"
  [SKILL_NAMES[4]]: carryingItOver,      // "Carrying it over"
  [SKILL_NAMES[5]]: runningItThemselves, // "Running it themselves"
};

// ── Concern → bridge resolution ───────────────────────────────────────────────
// Bridges are keyed by the 7 canonical concerns (BridgeConcern). Older sessions
// carry legacy concern keys; map each to its nearest canonical bridge so every
// stored concern resolves to a real bridge line.
export const LEGACY_CONCERN_ALIAS: Record<string, BridgeConcern> = {
  focus:      "reminders",
  attention:  "reminders",
  motivation: "giveup",
  potential:  "confidence",
  school:     "homework",
  emotions:   "other",
};

// Exhaustive over BridgeConcern — tsc fails here if a canonical key is added or
// removed without updating this list, keeping the runtime set in sync with the type.
const CANONICAL_KEYS: Record<BridgeConcern, true> = {
  homework:   true,
  reminders:  true,
  screens:    true,
  confidence: true,
  giveup:     true,
  finish:     true,
  other:      true,
};
const CANONICAL: ReadonlySet<string> = new Set(Object.keys(CANONICAL_KEYS));

// Resolves any concern key — canonical, legacy, unknown, empty, or null — to a
// canonical BridgeConcern. Never returns undefined: a missing bridge is
// impossible by construction. Anything unmapped falls back to "other".
export function bridgeConcernFor(key: string | null | undefined): BridgeConcern {
  if (!key) return "other";
  if (CANONICAL.has(key)) return key as BridgeConcern;
  return LEGACY_CONCERN_ALIAS[key] ?? "other";
}

// ── Framing line (Part 4) ─────────────────────────────────────────────────────
// Shown once in the goal section and once on the roadmap. Resolves the tension
// between a universal six-week sequence and the child's per-skill break week.
// {{child_name}} is filled by fillLmsContent; {{n}} (skills already strong),
// {{N}} (break-week number) and {{week_title}} are runtime values supplied by the
// render layer — NOT child tokens, so fillLmsContent leaves them untouched.
export const GOAL_FRAMING_LINE =
  "The six weeks run in order, because the skills build on each other. {{child_name}} already has the first {{n}} — those weeks will move quickly. The work is week {{N}}: {{week_title}}.";

// Special case for Starting (break = week 1), where "already has the first {{n}}"
// would be empty. Skills: "starting" (or archetypes The Storm / The Inventor).
export const GOAL_FRAMING_LINE_STARTING =
  "The six weeks run in order, because the skills build on each other. For {{child_name}}, the work starts at week one and the rest builds from there.";

// ── Safeguarding response (Part 5) ────────────────────────────────────────────
// Fixed copy. Never generated. Shown instead of any goal mapping when the screen
// fires. The triggering wordlist is deliberately not here — it needs clinical
// review (see lib/safeguarding, Step 2).
export const SAFEGUARDING_RESPONSE =
  "**Thank you for telling us that.**\n\n" +
  "What you've described is beyond what a programme like this should handle, and we don't want to hand you an attention plan when something more important is going on.\n\n" +
  "Speaking to your child's doctor, or a child mental health professional, is the right next step — and worth doing soon rather than waiting to see.\n\n" +
  "Your assessment and report are saved and unchanged. Nothing has been sent to anyone. You can come back to the plan whenever you want to.";
