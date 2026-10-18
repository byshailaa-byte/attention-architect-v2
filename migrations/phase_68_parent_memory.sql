-- phase_68 — conversational-Coach state. Two ADDITIVE tables:
--   parent_memory       — per-parent memory (facts + summary), read FIRST every turn, written after
--                         each session. Keyed (kind, subject_id) so it covers BOTH trial and paid
--                         (the old coach_memory was user_id-only / paid-only). Backfilled before any
--                         parent is moved to the new Coach, so nobody is greeted as a stranger.
--   coach_tracked_number — free conversational numbers (baselines + later counts) recorded via the
--                         record_baseline / record_number tools. Numbers are NEVER rounded; a range
--                         said by the parent ("4 or 5") is stored as min_val=4, max_val=5 with the
--                         parent's exact words in parent_words. "Improved?" is judged on the range.
-- Applied via scripts/apply_phase_68_70.mjs (backup → create → verify on ep-green-truth-aqxygaj2).
CREATE TABLE IF NOT EXISTS parent_memory (
  kind        text NOT NULL CHECK (kind IN ('paid','trial')),
  subject_id  text NOT NULL,                 -- user_id (paid) or trial_id (trial)
  facts       jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary     text  NOT NULL DEFAULT '',
  language    text,                          -- stored reply-language preference: 'en'|'hinglish'|'hi' (NULL = not set yet)
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, subject_id)
);

CREATE TABLE IF NOT EXISTS coach_tracked_number (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         text NOT NULL CHECK (kind IN ('paid','trial')),
  subject_id   text NOT NULL,                -- user_id (paid) or trial_id (trial)
  metric       text NOT NULL,               -- e.g. 'arguments_per_session' (the real measure agreed)
  min_val      numeric NOT NULL,            -- low end of the stated range (= max_val for a single number)
  max_val      numeric NOT NULL,            -- high end of the stated range
  unit         text,                        -- e.g. 'arguments', 'minutes' (free text, optional)
  parent_words text,                        -- the parent's exact words ("maybe 4 or 5"), verbatim
  phase        text NOT NULL CHECK (phase IN ('baseline','checkin')),
  day          int  NOT NULL DEFAULT 0,     -- 0 for the baseline; the day for later check-ins
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (max_val >= min_val),
  UNIQUE (kind, subject_id, metric, phase, day)   -- re-answer replaces (upsert)
);

INSERT INTO schema_migrations (phase) VALUES ('phase_68_parent_memory') ON CONFLICT DO NOTHING;
