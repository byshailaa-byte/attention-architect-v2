-- phase_72 — allow origin='opener' on coach_messages. The conversational Coach caches its speak-first
-- opener as a coach_messages row with origin='opener' (so it's generated once per parent per day and
-- is distinguishable from normal 'llm' replies). The old CHECK only allowed ('script','llm'), so every
-- opener insert 500'd and the Coach never loaded. ADDITIVE: widen the CHECK. Down: migrations/down/
-- phase_72_down.sql. Applied via scripts/apply_phase_72.mjs (backup → alter → verify ep-green-truth).
ALTER TABLE coach_messages DROP CONSTRAINT IF EXISTS coach_messages_origin_check;
ALTER TABLE coach_messages ADD CONSTRAINT coach_messages_origin_check
  CHECK (origin = ANY (ARRAY['script','llm','opener']));

INSERT INTO schema_migrations (phase) VALUES ('phase_72_coach_messages_opener_origin') ON CONFLICT DO NOTHING;
