-- phase_59 — delivery-status columns on whatsapp_outbox (for the Cloud API status webhook).
-- ADDITIVE ONLY: two new nullable timestamp columns. No existing rows/tables changed.
BEGIN;

ALTER TABLE whatsapp_outbox ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE whatsapp_outbox ADD COLUMN IF NOT EXISTS read_at      timestamptz;

INSERT INTO schema_migrations (phase) VALUES ('phase_59_whatsapp_outbox_status') ON CONFLICT DO NOTHING;

COMMIT;
