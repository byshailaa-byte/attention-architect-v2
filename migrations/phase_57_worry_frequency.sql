-- phase_57 — optional "how often?" captured on the worry screen (C2).
-- ADDITIVE ONLY: one new nullable column. No DELETE/UPDATE of existing rows, no CHECK changes
-- (start_worry / assessment_intro_view are already in the funnel_events CHECK from phase_56).
-- Stored keys: d1_2 | d3_4 | most | daily (null when the parent skips the question).

BEGIN;

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS worry_frequency text
  CHECK (worry_frequency IS NULL OR worry_frequency IN ('d1_2','d3_4','most','daily'));

INSERT INTO schema_migrations (phase) VALUES ('phase_57_worry_frequency') ON CONFLICT DO NOTHING;

COMMIT;
