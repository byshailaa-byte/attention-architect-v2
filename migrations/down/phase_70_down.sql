-- ROLLBACK phase_70. DESTRUCTIVE: drops coach_call_request (the Coach's call queue). Any OPEN
-- requests should be actioned first (SELECT * FROM coach_call_request WHERE status='open'). call_log
-- (the sales list) is untouched.
DROP INDEX IF EXISTS coach_call_request_open_idx;
DROP TABLE IF EXISTS coach_call_request;
DELETE FROM schema_migrations WHERE phase = 'phase_70_call_flags';
