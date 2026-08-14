// Shared concern card labels — single source of truth.
// Used by: app/page.tsx (card rendering), lib/narrative/compose-report.ts (m_teaser).
// Keys match assessments.concerns[] values stored at assessment submit time.
export const CONCERN_CARD_LABELS: Record<string, string> = {
  homework:   "Homework turns into a battle",
  reminders:  "I keep reminding them to focus",
  screens:    "Screens always win",
  confidence: "They've lost confidence",
  giveup:     "They give up too easily",
  finish:     "They start everything and finish nothing",
  other:      "Something else",
};
