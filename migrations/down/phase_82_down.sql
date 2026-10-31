-- Down for phase_82 — Report v3 tonight tap.
DROP TABLE IF EXISTS report_tonight_tap;
DELETE FROM schema_migrations WHERE phase = 'phase_82_report_v3_tonight';
