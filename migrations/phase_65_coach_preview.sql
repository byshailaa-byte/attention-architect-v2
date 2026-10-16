-- phase_65 — Preview Coach: sandbox trial support on coach_trials + admin reply flags.
--
-- ADDITIVE columns + a partial-unique-index swap. Preview (sandbox) trials must never consume
-- the one-REAL-trial-per-parent slot, so UNIQUE(parent_key) becomes UNIQUE(parent_key) WHERE
-- is_preview = false. Real grants still dedupe (ON CONFLICT ... WHERE is_preview = false); a
-- preview + a real trial for the same parent both succeed; two real trials still collapse to one.
--
-- NOTE on atomicity: the generic file runner (scripts/run-migrations.mts) splits on ';' and runs
-- each statement autocommit, so the DROP/CREATE below are NOT atomic under that runner. This phase
-- was applied via scripts/apply_phase_65.mjs, which runs the DROP+CREATE inside a single
-- neon transaction() (per the agreed condition). This file is the faithful, replayable record.

ALTER TABLE coach_trials   ADD COLUMN IF NOT EXISTS is_preview    boolean NOT NULL DEFAULT false;
ALTER TABLE coach_trials   ADD COLUMN IF NOT EXISTS owner_admin   text;
ALTER TABLE coach_trials   ADD COLUMN IF NOT EXISTS focus_concern text;
ALTER TABLE coach_trials   ADD COLUMN IF NOT EXISTS approved_by   text;
ALTER TABLE coach_trials   ADD COLUMN IF NOT EXISTS approved_at   timestamptz;

ALTER TABLE coach_messages ADD COLUMN IF NOT EXISTS admin_flagged_at timestamptz;
ALTER TABLE coach_messages ADD COLUMN IF NOT EXISTS admin_flag_note  text;

DROP INDEX IF EXISTS idx_coach_trials_parent_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_coach_trials_parent_key ON coach_trials (parent_key) WHERE is_preview = false;

INSERT INTO schema_migrations (phase) VALUES ('phase_65_coach_preview') ON CONFLICT DO NOTHING;
