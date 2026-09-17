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
