-- phase_78 — let admin_view_log record session-based parent-page views (report/plan/roadmap), not just
-- the LMS "view-as" (which logs viewed_user_id). Operator opens of /report, /plan, /roadmap are logged
-- here instead of writing funnel_events (see lib/admin/admin-view.ts + lib/analytics gating). ADDITIVE:
-- nullable new columns; viewed_user_id becomes nullable (session-based rows have no user). The existing
-- LMS-view writer is unaffected. Down: migrations/down/phase_78_down.sql.
ALTER TABLE admin_view_log ADD COLUMN IF NOT EXISTS session_id uuid;
ALTER TABLE admin_view_log ADD COLUMN IF NOT EXISTS kind text;
ALTER TABLE admin_view_log ALTER COLUMN viewed_user_id DROP NOT NULL;

INSERT INTO schema_migrations (phase) VALUES ('phase_78_admin_view_log_sessions') ON CONFLICT DO NOTHING;
