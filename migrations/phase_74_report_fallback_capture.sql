-- phase_74 — instrument report fallbacks. Adds draft + judge_detail (jsonb) to report_generation_log
-- so that when a generation FALLS BACK, the rejected draft and the judge's per-question verdicts/reasons
-- are persisted (populated only on fallback; 30-day retention enforced in generateAndStoreReportV2 by
-- nulling out rows older than 30 days on each write). ADDITIVE, nullable columns — old code ignores them.
-- Down: migrations/down/phase_74_down.sql. NOT YET APPLIED to prod (ships with the next deploy).
ALTER TABLE report_generation_log ADD COLUMN IF NOT EXISTS draft jsonb;
ALTER TABLE report_generation_log ADD COLUMN IF NOT EXISTS judge_detail jsonb;

INSERT INTO schema_migrations (phase) VALUES ('phase_74_report_fallback_capture') ON CONFLICT DO NOTHING;
