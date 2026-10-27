-- ROLLBACK phase_79. Drops the call_script_cache table (cache only — safe to drop; regenerates on demand).
DROP TABLE IF EXISTS call_script_cache;
DELETE FROM schema_migrations WHERE phase = 'phase_79_call_script_cache';
