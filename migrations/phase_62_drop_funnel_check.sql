-- phase_62: remove the duplicate funnel event-type CHECK.
-- The /api/funnel/event route already validates event_type against CATALOG (Object.keys) and
-- returns 400 for anything unknown — that is the single source of truth. The DB CHECK was a
-- second allowlist that had to be hand-synced via migrations; it drifted both ways and SILENTLY
-- dropped inserts when migrations ran out of order (phase_55 applied after phase_56 recreated the
-- CHECK without handbook_lead → ~6 lost handbook_lead rows). Dropping it ends the dual-maintenance;
-- bad data still can't enter (route 400s unknown events), and insert errors are now logged +
-- counted (see funnel_event_errors + the admin funnel page).
-- Approved as a DROP (not additive). Schema backed up first.
ALTER TABLE funnel_events DROP CONSTRAINT IF EXISTS funnel_events_event_type_check;

-- Record insert failures that still occur (DB/transient), for the admin error count.
CREATE TABLE IF NOT EXISTS funnel_event_errors (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type TEXT NOT NULL,
  error      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS funnel_event_errors_created_idx ON funnel_event_errors (created_at DESC);
