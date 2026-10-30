-- phase_80 — adaptive plan. Per-day adjusted step: an 'auto' row (generated at unlock from the base
-- day + how yesterday went) and/or a 'coach' override row (written by the Coach's adjust_next_step
-- tool). A Coach override ALWAYS wins over the auto row (resolve.ts orders origin='coach' first).
-- ADDITIVE (new table only). DEV ONLY for now — do NOT apply to prod until the 12 adaptations are
-- reviewed. Down: migrations/down/phase_80_down.sql.
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
