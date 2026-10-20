-- phase_71 — two ADDITIVE changes to both day-outcome tables:
--   1. add the 'not_tried' outcome value (a step not attempted yet / "what if" question / no time) —
--      distinct from 'tried_didnt_work'. Widens the existing CHECK; keeps all prior values.
--   2. add a nullable 'trigger' column — WHY a child stopped (hard | boring | didnt_know | upset |
--      unknown), when the parent gives it. Nullable; never required.
-- Down-migration: migrations/down/phase_71_down.sql. Applied via scripts/apply_phase_71.mjs
-- (backup → alter → verify on ep-green-truth-aqxygaj2).
ALTER TABLE lms_day_outcome DROP CONSTRAINT IF EXISTS lms_day_outcome_outcome_check;
ALTER TABLE lms_day_outcome ADD CONSTRAINT lms_day_outcome_outcome_check
  CHECK (outcome = ANY (ARRAY['tried_worked','tried_partly','tried_didnt_work','missed','unclear','not_tried','worked','sort_of','didnt_work']));
ALTER TABLE lms_day_outcome ADD COLUMN IF NOT EXISTS trigger text;

ALTER TABLE coach_trial_day_outcome DROP CONSTRAINT IF EXISTS coach_trial_day_outcome_outcome_check;
ALTER TABLE coach_trial_day_outcome ADD CONSTRAINT coach_trial_day_outcome_outcome_check
  CHECK (outcome = ANY (ARRAY['tried_worked','tried_partly','tried_didnt_work','missed','unclear','not_tried']));
ALTER TABLE coach_trial_day_outcome ADD COLUMN IF NOT EXISTS trigger text;

INSERT INTO schema_migrations (phase) VALUES ('phase_71_outcome_not_tried_trigger') ON CONFLICT DO NOTHING;
