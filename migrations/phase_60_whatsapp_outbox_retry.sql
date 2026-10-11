-- phase_60 — retry window for the WhatsApp outbox.
-- ADDITIVE ONLY: one new nullable column (first_attempt_at). Set on the first send attempt so the
-- 24h retry window is measured from the first try, not from creation (correct across a none→wati
-- flip, where a backlog row is only first attempted after the flip).
-- (phase_59 is reserved by the committed-but-undeployed Cloud adapter branch.)
BEGIN;

ALTER TABLE whatsapp_outbox ADD COLUMN IF NOT EXISTS first_attempt_at timestamptz;

INSERT INTO schema_migrations (phase) VALUES ('phase_60_whatsapp_outbox_retry') ON CONFLICT DO NOTHING;

COMMIT;
