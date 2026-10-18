-- phase_70 — the Coach's own call-request queue. call_log is the sales calling list (NOT NULL
-- outcome with a fixed CHECK of sales outcomes), so Coach "please call this parent" requests get
-- their own table. Covers BOTH trial and paid (keyed kind+subject_id), carries urgency, and is what
-- the weekly review reads. ADDITIVE: one new table (+ the harmless urgency/source columns added to
-- call_log by the first cut of this phase are left in place). Applied via scripts/apply_phase_68_70.mjs.
CREATE TABLE IF NOT EXISTS coach_call_request (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL CHECK (kind IN ('paid','trial')),
  subject_id  text NOT NULL,                 -- user_id (paid) or trial_id (trial)
  assessment_id uuid,                        -- resolved when available (for the team), optional
  urgency     text NOT NULL CHECK (urgency IN ('urgent','normal')),
  reason      text,                          -- short reason (no diagnosis)
  source      text NOT NULL DEFAULT 'coach_flag',  -- 'coach_flag' | 'needs_a_call'
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','dismissed')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by text
);
CREATE INDEX IF NOT EXISTS coach_call_request_open_idx ON coach_call_request (status, urgency, created_at);

INSERT INTO schema_migrations (phase) VALUES ('phase_70_call_flags') ON CONFLICT DO NOTHING;
