-- phase_64 — delivery-status columns on whatsapp_outbox (for the Cloud API status webhook).
-- Renumbered from the originally-drafted phase_59: on the 2c branch it was #59, but main had
-- meanwhile shipped phases 60–63, so the ordered runner (GUARD 1) would refuse a #59 behind #63.
-- The change is purely additive and order-independent, so bumping to #64 is safe.
-- ADDITIVE ONLY: two new nullable timestamp columns. No existing rows/tables changed.
BEGIN;

ALTER TABLE whatsapp_outbox ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE whatsapp_outbox ADD COLUMN IF NOT EXISTS read_at      timestamptz;

INSERT INTO schema_migrations (phase) VALUES ('phase_64_whatsapp_outbox_status') ON CONFLICT DO NOTHING;

COMMIT;
