-- phase_66 — Coach daily step-outcome tracking (5 values + the parent's own words), paid + trial.
--
-- ADDITIVE + backward-compatible. The lms_day_outcome CHECK is WIDENED (legacy 3 values kept so the
-- existing rows and the currently-deployed code keep working), plus note/source columns. A new
-- coach_trial_day_outcome mirrors it for trials. A normalised read view maps the legacy 3 values to
-- the 5-value vocabulary so there is ONE outcome vocabulary everywhere downstream.
-- Applied via scripts/apply_phase_66.mjs (backup → widen → verify on ep-green-truth-aqxygaj2).

-- 1) lms_day_outcome (PAID): widen the CHECK + add note/source.
ALTER TABLE lms_day_outcome DROP CONSTRAINT IF EXISTS lms_day_outcome_outcome_check;
ALTER TABLE lms_day_outcome ADD CONSTRAINT lms_day_outcome_outcome_check CHECK (outcome IN (
  'tried_worked','tried_partly','tried_didnt_work','missed','unclear',   -- new 5-value vocabulary
  'worked','sort_of','didnt_work'                                        -- legacy (kept for old rows + old code)
));
ALTER TABLE lms_day_outcome ADD COLUMN IF NOT EXISTS note   text;        -- the parent's own words (short)
ALTER TABLE lms_day_outcome ADD COLUMN IF NOT EXISTS source text;        -- 'tap' | 'chat'

-- 2) coach_trial_day_outcome (TRIAL): per-trial, per-day outcome.
CREATE TABLE IF NOT EXISTS coach_trial_day_outcome (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id   uuid NOT NULL REFERENCES coach_trials(id),
  day        int  NOT NULL,
  outcome    text NOT NULL CHECK (outcome IN ('tried_worked','tried_partly','tried_didnt_work','missed','unclear')),
  note       text,
  source     text,                                                       -- 'tap' | 'chat'
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ctdo_trial ON coach_trial_day_outcome (trial_id);

-- 3) Normalised read view (paid + trial) — ONE 5-value vocabulary for admin / Results / Insights.
CREATE OR REPLACE VIEW coach_day_outcome_v AS
  SELECT 'paid'::text  AS kind, user_id::text  AS subject_id, week, day,
         CASE outcome WHEN 'worked' THEN 'tried_worked'
                      WHEN 'sort_of' THEN 'tried_partly'
                      WHEN 'didnt_work' THEN 'tried_didnt_work'
                      ELSE outcome END AS outcome,
         note, source, created_at
    FROM lms_day_outcome
  UNION ALL
  SELECT 'trial'::text AS kind, trial_id::text AS subject_id, 1 AS week, day,
         outcome, note, source, created_at
    FROM coach_trial_day_outcome;

INSERT INTO schema_migrations (phase) VALUES ('phase_66_coach_outcomes') ON CONFLICT DO NOTHING;
