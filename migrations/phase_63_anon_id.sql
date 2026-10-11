-- phase_63: first-party anonymous visitor id (distinct-visitor counting; no personal data).
-- A random id lives in the aa_anon cookie (1 year, SameSite=Lax), minted client-side. It is sent
-- ONLY to our own funnel/session endpoints and stored here — NEVER to GA4, Meta or OpenAI.
-- Additive (nullable columns + one index); pre-migration rows correctly stay NULL.
ALTER TABLE flow_sessions ADD COLUMN IF NOT EXISTS anon_id TEXT;
ALTER TABLE funnel_events ADD COLUMN IF NOT EXISTS anon_id TEXT;
CREATE INDEX IF NOT EXISTS idx_flow_sessions_anon ON flow_sessions (anon_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_anon ON funnel_events (anon_id);
