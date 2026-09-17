-- Phase 39: goal system — goal fields on assessments + weekly goal-count table.
--
-- Standalone mirror of the phase_39_goal block in lib/db/migrate.ts.
-- Safe to run multiple times (IF NOT EXISTS on every statement).
-- Run manually on prod with DATABASE_URL override BEFORE deploying the UI change.
-- Production endpoint: ep-green-truth-aqxygaj2 (verify by endpoint ID, never by branch label).
--
-- All goal_* columns are nullable except goal_flagged (NOT NULL DEFAULT false).
-- Postgres 11+ treats ADD COLUMN ... DEFAULT false as a metadata-only add (no rewrite).

-- 1) Goal fields on assessments.
ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS goal_skill     TEXT,
  ADD COLUMN IF NOT EXISTS goal_key       TEXT,
  ADD COLUMN IF NOT EXISTS goal_text      TEXT,
  ADD COLUMN IF NOT EXISTS goal_source    TEXT CHECK (goal_source IN ('recommended','chosen','free_text')),
  ADD COLUMN IF NOT EXISTS goal_free_text TEXT,
  -- SENSITIVE: Gate 3 — goal_flagged must NEVER appear in admin views, parent
  -- APIs, report rendering, analytics events, pixels, or marketing segmentation.
  -- Stored only. Treat exactly like honest_flag. See lib/safeguarding/goal-screen.ts.
  ADD COLUMN IF NOT EXISTS goal_flagged   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS goal_baseline  INTEGER,
  ADD COLUMN IF NOT EXISTS goal_final     INTEGER;

-- 2) Weekly goal-count table (one editable tally per user per week).
CREATE TABLE IF NOT EXISTS lms_weekly_goal_count (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  week       INTEGER NOT NULL,
  count      INTEGER NOT NULL DEFAULT 0,
  logged_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week)
);

-- 3) Record the migration. ACTIVE statement (NOT commented) — phase_38's was
-- commented out and the phase went unrecorded. Run this as part of the file.
INSERT INTO schema_migrations (phase) VALUES ('phase_39_goal') ON CONFLICT DO NOTHING;
