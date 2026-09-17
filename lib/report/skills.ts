// Single source of truth for the six attention skills and the archetype→skill
// break-point mapping.
//
// Promoted verbatim from app/simplified/profile/page.tsx (BREAK_IDX, SKILL_NAMES)
// and app/simplified/profile/ProfileView.tsx (SKILL_LABELS) so the profile, the
// public children library, and the Phase 2 goal feature all resolve the same
// skill for a given archetype. Do not re-declare these anywhere else — import
// from here.

// Title-case skill names, ordered 1–6. Index is the canonical skill ordinal.
export const SKILL_NAMES = [
  "Starting",
  "Holding on",
  "Staying with it",
  "Recovering",
  "Carrying it over",
  "Running it themselves",
] as const;

// Uppercase display labels, same order — used by the profile skill grid.
export const SKILL_LABELS = [
  "STARTING",
  "HOLDING ON",
  "STAYING WITH IT",
  "RECOVERING",
  "CARRYING IT OVER",
  "RUNNING IT THEMSELVES",
] as const;

// 0-based break index per archetype (keyed by display name). This is the skill
// the child works toward — rendered as "STARTS HERE" on the profile. Derived
// from archetype only; there is deliberately no axis→skill mapping (a 4→6
// function needs clinical input we don't have).
export const BREAK_IDX: Record<string, number> = {
  "The Storm":      0,
  "The All-In Kid": 4,
  "The Inventor":   0,
  "The Explorer":   1,
  "The Magnet":     5,
  "The Glue":       1,
  "The Captain":    5,
  "The Live Wire":  2,
};

// Fallback index for an unknown archetype. Reproduces the old `?? 1` fallback
// from profile/page.tsx, which means an unknown archetype silently resolves to
// "Holding on". Harmless while this only picks a display label — but in Step 5
// it will select a parent's goal options, so a silent wrong default becomes a
// real decision. FLAG FOR STEP 5: decide whether an unknown archetype should
// fall back, hard-fail, or force the parent to pick manually.
export const DEFAULT_BREAK_IDX = 1;

export function breakIdxForArchetype(archetype: string): number {
  return BREAK_IDX[archetype] ?? DEFAULT_BREAK_IDX;
}

// Resolves an archetype to its break skill (index + title-case name).
export function skillForArchetype(archetype: string): { idx: number; name: string } {
  const idx = breakIdxForArchetype(archetype);
  return { idx, name: SKILL_NAMES[idx] };
}

// 1:1 skill→week ordering (Wk1 Starting … Wk6 Running it themselves).
export function weekForSkill(idx: number): number {
  return idx + 1;
}

// Six shared week titles — same for every parent. Source: THE_PLAN.pdf.
// Single source of truth for both the roadmap and the goal-section framing line.
export const WEEK_TITLES: Record<number, string> = {
  1: "Getting started without the push",
  2: "Handling what pulls them away",
  3: "Staying with it on an ordinary day",
  4: "Coming back after a slip",
  5: "Using it beyond homework",
  6: "Running it themselves",
};
