-- ============================================================================================
-- Report + Roadmap v3 + Adaptive Plan — PROD migrations (phase_80, 81, 82), in order.
-- Run on PROD ep-green-truth-aqxygaj2 AFTER a Neon backup, BEFORE merging to main (per runbook).
-- All additive / idempotent (IF NOT EXISTS, IF EXISTS). Verify: SELECT phase FROM schema_migrations
--   WHERE phase IN ('phase_80_adaptive_plan','phase_81_day1_observation','phase_82_report_v3_tonight');
-- ============================================================================================

-- ───────────────────────── phase_80 — adaptive plan ─────────────────────────
CREATE TABLE IF NOT EXISTS plan_adjustments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text NOT NULL,                 -- LMS user (paid)
  assessment_id   uuid,
  week            integer NOT NULL,
  day             integer NOT NULL,
  origin          text NOT NULL CHECK (origin IN ('auto','coach')),
  prior_outcome   text CHECK (prior_outcome IN ('worked','partly','didnt_land')), -- what triggered the auto-adjust
  streak          integer NOT NULL DEFAULT 0,    -- consecutive didnt_land ending yesterday
  step            json NOT NULL,                 -- AdjustedStep { title, moment, exactWords[], notice, minutes }
  source          text NOT NULL CHECK (source IN ('llm','fallback','coach')),
  reason          text,                          -- coach's reason → "Updated by your Coach: <reason>"
  validator_ok    boolean NOT NULL DEFAULT true,
  retry_used      boolean NOT NULL DEFAULT false,
  show_coach_line boolean NOT NULL DEFAULT false,-- two didnt_land in a row → surface the Coach line
  model           text,
  input_tokens    integer NOT NULL DEFAULT 0,
  output_tokens   integer NOT NULL DEFAULT 0,
  cost_paise      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week, day, origin)
);
CREATE INDEX IF NOT EXISTS plan_adjustments_lookup ON plan_adjustments (user_id, week, day);
INSERT INTO schema_migrations (phase) VALUES ('phase_80_adaptive_plan') ON CONFLICT DO NOTHING;

-- ───────────────────────── phase_81 — Day-1 observation ─────────────────────
ALTER TABLE lms_reflections DROP CONSTRAINT IF EXISTS lms_reflections_day_check;
ALTER TABLE lms_reflections ADD CONSTRAINT lms_reflections_day_check CHECK (day BETWEEN 1 AND 5);
INSERT INTO schema_migrations (phase) VALUES ('phase_81_day1_observation') ON CONFLICT DO NOTHING;

-- ───────────────────────── phase_82 — report_v3 tonight tap ─────────────────
CREATE TABLE IF NOT EXISTS report_tonight_tap (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL,
  outcome     text NOT NULL CHECK (outcome IN ('worked','mixed','didnt_land')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS report_tonight_tap_session_idx ON report_tonight_tap (session_id);
INSERT INTO schema_migrations (phase) VALUES ('phase_82_report_v3_tonight') ON CONFLICT DO NOTHING;
