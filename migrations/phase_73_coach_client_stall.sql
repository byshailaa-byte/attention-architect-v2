-- phase_73 — coach_client_stall: client-side stall telemetry. When the chat UI's 20s watchdog fires
-- (the stream delivered no terminal {done}), the client POSTs diagnostic METRICS ONLY (no message text)
-- to /api/coach/client-stall; the row is surfaced in /admin/coach-review and logged at error level.
-- ADDITIVE new table — the currently-deployed code ignores it, so this is safe before the code deploy.
-- Down: migrations/down/phase_73_down.sql. Applied via scripts/apply_phase_73.mjs.
CREATE TABLE IF NOT EXISTS coach_client_stall (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text,
  subject_id text,
  user_id text,
  turn_id text,
  ms integer,
  bytes integer,
  deltas integer,
  done boolean,
  last_event text,
  reason text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS coach_client_stall_created_idx ON coach_client_stall (created_at DESC);

INSERT INTO schema_migrations (phase) VALUES ('phase_73_coach_client_stall') ON CONFLICT DO NOTHING;
