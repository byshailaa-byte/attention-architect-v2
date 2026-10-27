-- ROLLBACK phase_75. Restore the narrower outcome CHECK (only if no new-value rows exist) + drop columns.
UPDATE call_log SET outcome = 'not_interested' WHERE outcome IN ('trial_offered','other_course');
ALTER TABLE call_log DROP CONSTRAINT IF EXISTS call_log_outcome_check;
ALTER TABLE call_log ADD CONSTRAINT call_log_outcome_check CHECK (outcome = ANY (ARRAY[
  'interested','callback','not_interested','purchased','no_answer','busy','wrong_number','do_not_call']));
ALTER TABLE call_log DROP COLUMN IF EXISTS next_steps;
ALTER TABLE call_log DROP COLUMN IF EXISTS duration_sec;
ALTER TABLE call_log DROP COLUMN IF EXISTS status;
ALTER TABLE call_log DROP COLUMN IF EXISTS objection;
DELETE FROM schema_migrations WHERE phase = 'phase_75_call_log_fields';
