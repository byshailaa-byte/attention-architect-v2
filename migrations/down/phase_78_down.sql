-- ROLLBACK phase_78. Drops the session-view columns. viewed_user_id is left nullable (re-adding NOT NULL
-- would fail if any session-based rows exist); that is harmless for the LMS-view writer, which always sets it.
ALTER TABLE admin_view_log DROP COLUMN IF EXISTS session_id;
ALTER TABLE admin_view_log DROP COLUMN IF EXISTS kind;
DELETE FROM schema_migrations WHERE phase = 'phase_78_admin_view_log_sessions';
