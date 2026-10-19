-- ROLLBACK phase_71. Any 'not_tried' rows are first converted to 'missed' so the restored (narrower)
-- CHECK holds; the trigger column is dropped. Data note: the distinction not_tried vs missed is lost
-- on rollback, and trigger values are discarded.
UPDATE lms_day_outcome SET outcome = 'missed' WHERE outcome = 'not_tried';
UPDATE coach_trial_day_outcome SET outcome = 'missed' WHERE outcome = 'not_tried';

ALTER TABLE lms_day_outcome DROP CONSTRAINT IF EXISTS lms_day_outcome_outcome_check;
ALTER TABLE lms_day_outcome ADD CONSTRAINT lms_day_outcome_outcome_check
  CHECK (outcome = ANY (ARRAY['tried_worked','tried_partly','tried_didnt_work','missed','unclear','worked','sort_of','didnt_work']));
ALTER TABLE lms_day_outcome DROP COLUMN IF EXISTS trigger;

ALTER TABLE coach_trial_day_outcome DROP CONSTRAINT IF EXISTS coach_trial_day_outcome_outcome_check;
ALTER TABLE coach_trial_day_outcome ADD CONSTRAINT coach_trial_day_outcome_outcome_check
  CHECK (outcome = ANY (ARRAY['tried_worked','tried_partly','tried_didnt_work','missed','unclear']));
ALTER TABLE coach_trial_day_outcome DROP COLUMN IF EXISTS trigger;

DELETE FROM schema_migrations WHERE phase = 'phase_71_outcome_not_tried_trigger';
