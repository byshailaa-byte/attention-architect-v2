-- ROLLBACK phase_69. DESTRUCTIVE: drops gold_examples (seed + any admin-approved examples). Export
-- approved rows first if they matter (SELECT * FROM gold_examples WHERE status='approved').
DROP INDEX IF EXISTS gold_examples_match_idx;
DROP TABLE IF EXISTS gold_examples;
DELETE FROM schema_migrations WHERE phase = 'phase_69_gold_examples';
