-- phase_81 — Day-1 observation tap. Day 1 now collects "What did you notice?" (Calm / Some pushback /
-- Big fight), stored in lms_reflections under the existing outcome enum (worked / mixed / didnt_land)
-- so Day 2 adapts from it. Relax the day check from 2–5 to 1–5. DEV ONLY until approved.
-- Down: migrations/down/phase_81_down.sql.
ALTER TABLE lms_reflections DROP CONSTRAINT IF EXISTS lms_reflections_day_check;
ALTER TABLE lms_reflections ADD CONSTRAINT lms_reflections_day_check CHECK (day BETWEEN 1 AND 5);

INSERT INTO schema_migrations (phase) VALUES ('phase_81_day1_observation') ON CONFLICT DO NOTHING;
