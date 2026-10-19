-- ROLLBACK phase_72. Converts any 'opener' rows back to 'llm' so the narrowed CHECK holds, then
-- restores the ('script','llm') CHECK. (Openers are regenerated per day, so relabelling them is safe.)
UPDATE coach_messages SET origin = 'llm' WHERE origin = 'opener';
ALTER TABLE coach_messages DROP CONSTRAINT IF EXISTS coach_messages_origin_check;
ALTER TABLE coach_messages ADD CONSTRAINT coach_messages_origin_check
  CHECK (origin = ANY (ARRAY['script','llm']));
DELETE FROM schema_migrations WHERE phase = 'phase_72_coach_messages_opener_origin';
