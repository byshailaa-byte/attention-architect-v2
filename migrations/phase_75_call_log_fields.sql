-- phase_75 — richer call_log for the Parents calling desk. ADDITIVE columns + widen the outcome CHECK
-- to the two new call outcomes the buckets need (trial_offered, other_course). Down: phase_75_down.sql.
ALTER TABLE call_log ADD COLUMN IF NOT EXISTS next_steps text;
ALTER TABLE call_log ADD COLUMN IF NOT EXISTS duration_sec integer;
ALTER TABLE call_log ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE call_log ADD COLUMN IF NOT EXISTS objection text;

ALTER TABLE call_log DROP CONSTRAINT IF EXISTS call_log_outcome_check;
ALTER TABLE call_log ADD CONSTRAINT call_log_outcome_check CHECK (outcome = ANY (ARRAY[
  'interested','callback','not_interested','purchased','no_answer','busy','wrong_number','do_not_call',
  'trial_offered','other_course'
]));

INSERT INTO schema_migrations (phase) VALUES ('phase_75_call_log_fields') ON CONFLICT DO NOTHING;
