-- phase_67 — end-number "where are you now?" capture for the results screens (paid weekly + trial
-- Day 4). Mirrors the Day-0 baseline question/options; the results screen shows a direct number ONLY
-- if it improved vs the baseline. ADDITIVE: one new table. Applied via scripts/apply_phase_67.mjs
-- (backup → create → verify on ep-green-truth-aqxygaj2).
CREATE TABLE IF NOT EXISTS coach_checkin_number (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind       text NOT NULL CHECK (kind IN ('paid','trial')),
  subject_id text NOT NULL,                 -- user_id (paid) or trial_id (trial)
  period     int  NOT NULL,                 -- paid: week 1..6 ; trial: 4 (Day 4)
  worry      text,                          -- the worry key → scale + direction for "improved"
  value      text NOT NULL,                 -- the chip value the parent tapped (never inferred)
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, subject_id, period)         -- one capture per period (re-answer replaces)
);

INSERT INTO schema_migrations (phase) VALUES ('phase_67_coach_checkin') ON CONFLICT DO NOTHING;
