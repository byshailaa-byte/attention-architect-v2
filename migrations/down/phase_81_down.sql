-- Down for phase_81 — restore the days 2–5 reflection constraint.
ALTER TABLE lms_reflections DROP CONSTRAINT IF EXISTS lms_reflections_day_check;
ALTER TABLE lms_reflections ADD CONSTRAINT lms_reflections_day_check CHECK (day BETWEEN 2 AND 5);
DELETE FROM schema_migrations WHERE phase = 'phase_81_day1_observation';
