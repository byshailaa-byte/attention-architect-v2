-- ROLLBACK phase_68. DESTRUCTIVE: drops parent_memory (per-parent facts/summary/language) and
-- coach_tracked_number (conversational baselines). Back up both tables before running if the data
-- matters. The conversational Coach degrades gracefully without them (greets fresh, no stored numbers).
DROP TABLE IF EXISTS coach_tracked_number;
DROP TABLE IF EXISTS parent_memory;
DELETE FROM schema_migrations WHERE phase = 'phase_68_parent_memory';
