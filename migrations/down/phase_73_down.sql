-- ROLLBACK phase_73. Drops the client-stall telemetry table (diagnostics only, no parent-facing data).
DROP TABLE IF EXISTS coach_client_stall;
DELETE FROM schema_migrations WHERE phase = 'phase_73_coach_client_stall';
