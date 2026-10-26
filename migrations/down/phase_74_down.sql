-- ROLLBACK phase_74. Drops the fallback-capture columns (diagnostics only).
ALTER TABLE report_generation_log DROP COLUMN IF EXISTS draft;
ALTER TABLE report_generation_log DROP COLUMN IF EXISTS judge_detail;
DELETE FROM schema_migrations WHERE phase = 'phase_74_report_fallback_capture';
