// Shared concern card labels — single source of truth.
// Used by: app/page.tsx (card rendering), lib/narrative/compose-report.ts (m_teaser),
//          lib/narrative/context.ts (serialiseContext — concern key → human label for LLM).
// Keys match assessments.concerns[] values stored at assessment submit time.
export const CONCERN_CARD_LABELS: Record<string, string> = {
  // Current canonical keys (simplified start, 2026-08-11 onward)
  homework:   "Homework turns into a battle",
  reminders:  "I keep reminding them to focus",
  screens:    "Screens always win",
  confidence: "They've lost confidence",
  giveup:     "They give up too easily",
  finish:     "They start everything and finish nothing",
  other:      "Something else",
  // Legacy keys (pre-2026-08-11 landing page — present in older production sessions)
  focus:      "Focus comes and goes",
  emotions:   "Emotional ups and downs",
  school:     "Struggling day-to-day at school",
  potential:  "Not reaching their potential",
  attention:  "Attention",
  motivation: "Motivation",
};
