-- Phase 36: is_internal flag on assessments
-- Marks sessions that are our own internal testing — never deletes data.
-- Run manually against production (ep-green-truth-aqxygaj2) before deploy.
-- After running: INSERT INTO schema_migrations (phase) VALUES ('phase_36_is_internal') ON CONFLICT DO NOTHING;

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_assessments_is_internal
  ON assessments (is_internal);
