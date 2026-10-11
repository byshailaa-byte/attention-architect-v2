-- phase_58 — WhatsApp outbox (provider-agnostic send queue).
-- ADDITIVE ONLY: one new table + indexes. No changes to existing rows/tables.
-- Every outbound WhatsApp (report + handbook) is written here FIRST (status 'queued'); the
-- provider (cloud) moves it to 'sent' or 'failed'. With WHATSAPP_PROVIDER=none, or on any send
-- failure, rows stay 'queued' and are never lost.

BEGIN;

CREATE TABLE IF NOT EXISTS whatsapp_outbox (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         text NOT NULL CHECK (kind IN ('report','handbook')),
  to_phone     text NOT NULL,                 -- normalised 91XXXXXXXXXX
  template     text NOT NULL,                 -- WhatsApp template name
  params       jsonb NOT NULL DEFAULT '{}'::jsonb,  -- body/button variable values
  ref          text,                          -- session_id (report) or handbook_lead id
  status       text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed')),
  provider     text,                          -- which provider sent it ('cloud')
  attempts     int  NOT NULL DEFAULT 0,
  last_error   text,
  wa_message_id text,                         -- provider message id on success
  created_at   timestamptz NOT NULL DEFAULT now(),
  claimed_at   timestamptz,                   -- concurrency guard for the drainer
  sent_at      timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Dedup guard: one outbox row per (kind, ref) — a retry re-queues the same row, never a duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_outbox_kind_ref ON whatsapp_outbox (kind, ref) WHERE ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wa_outbox_status ON whatsapp_outbox (status, created_at);

INSERT INTO schema_migrations (phase) VALUES ('phase_58_whatsapp_outbox') ON CONFLICT DO NOTHING;

COMMIT;
