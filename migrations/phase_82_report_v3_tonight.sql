-- phase_82 — Report v3 Card-5 "Try this tonight" tap. Stores Worked / Partly / Didn't work (same enum
-- as the LMS: worked / mixed / didnt_land). This is BEFORE the plan starts, so it pre-generates
-- nothing — only the reply line shows. DB-only (never GA/Meta). One row per (session, tap). DEV ONLY
-- until the B/C/D deploy. The broader v3 DB-only events (card_view/dwell/skip/plan_section) land in
-- stage D. Down: migrations/down/phase_82_down.sql.
CREATE TABLE IF NOT EXISTS report_tonight_tap (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL,
  outcome     text NOT NULL CHECK (outcome IN ('worked','mixed','didnt_land')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS report_tonight_tap_session_idx ON report_tonight_tap (session_id);

INSERT INTO schema_migrations (phase) VALUES ('phase_82_report_v3_tonight') ON CONFLICT DO NOTHING;
