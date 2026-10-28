-- phase_79 — per-call script cache. One script per parent-person per call number; regenerate
-- overwrites. Keyed by (parent_key, call_no) so it survives across the person's assessments (same
-- grouping the Parents desk uses). ADDITIVE (new table). Down: migrations/down/phase_79_down.sql.
CREATE TABLE IF NOT EXISTS call_script_cache (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_key    text NOT NULL,              -- normalised phone/email (personKey); the Parents desk grouping
  session_id    uuid,                       -- the child the script is about
  assessment_id uuid,
  call_no       integer NOT NULL,           -- 1 = first call, 2+ = follow-up
  kind          text NOT NULL CHECK (kind IN ('first','followup')),
  lang          text NOT NULL DEFAULT 'en' CHECK (lang IN ('en','hinglish')),
  script        json NOT NULL,              -- the generated CallScript shape
  source        text NOT NULL CHECK (source IN ('llm','fallback')),
  model         text,
  input_tokens  integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cost_paise    integer NOT NULL DEFAULT 0,
  outcome       text,                        -- 'ok' | 'validator_fail' | 'api_error'
  reason        text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_key, call_no, lang)
);
CREATE INDEX IF NOT EXISTS call_script_cache_session_idx ON call_script_cache (session_id);

INSERT INTO schema_migrations (phase) VALUES ('phase_79_call_script_cache') ON CONFLICT DO NOTHING;
