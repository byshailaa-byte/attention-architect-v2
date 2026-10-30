-- Down for phase_80 — adaptive plan.
DROP TABLE IF EXISTS plan_adjustments;
DELETE FROM schema_migrations WHERE phase = 'phase_80_adaptive_plan';
