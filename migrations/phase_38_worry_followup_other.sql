-- Phase 38: add worry_followup_other column to assessments.
--
-- When a parent selects "Something else" on the follow-up screen, worry_followup
-- stores the fixed label "Something else" (so the option set stays countable) and
-- worry_followup_other stores the parent's typed free text.
-- TEXT NULL: no length constraint in Postgres — the 200-char cap is enforced server-side
-- at /api/assessment/submit before insert.
--
-- Safe to run multiple times (IF NOT EXISTS).
-- No index needed — this column is not queried for aggregation or filtering.
-- Run manually on prod with DATABASE_URL override before deploying the UI change.
-- Production endpoint: ep-green-truth-aqxygaj2 (never by branch label).

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS worry_followup_other TEXT NULL;

-- Record migration (run this separately via psql or the migrate runner):
-- INSERT INTO schema_migrations (phase) VALUES ('phase_38_worry_followup_other') ON CONFLICT DO NOTHING;
