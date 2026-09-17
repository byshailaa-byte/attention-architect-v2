-- Backfill: mark 4 non-internal Unknown-archetype sessions as is_internal = true.
--
-- Decided 2026-09-16. These sessions produced archetype = 'Unknown' because their
-- answer values are not in the scorer's grid and therefore fall through to the default.
-- None are real users. Evidence for each session is in the comments below.
--
-- Pattern follows phase_36_is_internal_backfill.sql.
-- Run manually on prod. Production endpoint: ep-green-truth-aqxygaj2 (never branch label).
-- Idempotent — UPDATE WHERE session_id IN is safe to re-run.
-- No deletes.

UPDATE assessments
SET is_internal = true
WHERE session_id IN (
  -- Pre-launch garbage: all answers are the literal string "a" (invalid option value).
  -- Synthetic UUID; created 2026-07-20 before is_internal column existed.
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',

  -- Pre-launch garbage: all answers "a", attention_shape=3 data_points, reward_driver=3.
  -- Created 2026-07-20; no name, no email, no phone.
  '964ecfae-0668-41e5-ab3c-fe0ecb615dca',

  -- Pre-launch garbage: only G1="a" and G2="a", 1 data_point each dimension.
  -- Created 2026-07-20; no name, no email, no phone.
  '50763596-1568-4615-af64-2b2a450db5b1',

  -- Debug session from _debug_submit.mts (2026-09-16).
  -- D2 answers contain "intrinsic" (not a valid reward_driver option value; valid: mastery/novelty/social/autonomy).
  -- tallyDimension returns value="intrinsic", scorer grid has no entry, produces Unknown.
  '06f08a97-f6b9-4e46-9cbe-bf8d546b9fac'
);

-- Verify: should return 71 (67 from phase_36 backfill + 4 from this migration).
-- SELECT COUNT(*) FROM assessments WHERE is_internal = true;
