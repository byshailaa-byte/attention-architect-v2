-- Phase 37: at most one live (published, non-superseded) report per assessment.
--
-- PRE-CONDITION: every assessment must have at most one row satisfying
-- (superseded_by IS NULL AND status = 'published') before this runs.
-- CONCURRENTLY will fail during the index build if the uniqueness condition
-- is violated for any existing row. Verify with:
--   SELECT assessment_id, COUNT(*)
--   FROM reports
--   WHERE superseded_by IS NULL AND status = 'published'
--   GROUP BY assessment_id
--   HAVING COUNT(*) > 1;
-- Expected result: 0 rows.
--
-- CONCURRENTLY: builds the index without holding a write lock on the table.
-- Cannot run inside a transaction block — do NOT wrap this in BEGIN/COMMIT.
-- The neon serverless HTTP driver sends each statement as its own autocommit
-- request (no implicit transaction), so this runner is safe as-is.

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_one_live_per_assessment
  ON reports (assessment_id)
  WHERE superseded_by IS NULL AND status = 'published';
