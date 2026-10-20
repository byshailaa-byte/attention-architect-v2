-- phase_69 — gold-example library for the conversational Coach. These are short, approved model
-- conversations retrieved (2–3 most similar) into the Coach's context for each situation. Seeded with
-- the v1 gold conversations; grows when an operator/advisor uses "Write a better reply" on a flagged
-- reply in the weekly review → a pending example → approved. ADDITIVE: one new table.
-- Seeding is done idempotently by scripts/seed_gold_examples.mjs (slug = natural key). Applied via
-- scripts/apply_phase_68_70.mjs (backup → create → verify on ep-green-truth-aqxygaj2).
CREATE TABLE IF NOT EXISTS gold_examples (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,                    -- stable natural key (for idempotent seeding)
  title         text NOT NULL,
  situation     text NOT NULL,                           -- short description used for similarity match
  archetype     text,                                    -- null = applies to any archetype
  worry         text,                                    -- null = any worry
  age_band      text,                                    -- null = any age band
  language      text NOT NULL DEFAULT 'en' CHECK (language IN ('en','hinglish','hi')),
  tags          text[] NOT NULL DEFAULT '{}',            -- e.g. {didnt_work, hindi, frustrated, price}
  conversation  jsonb NOT NULL,                          -- [{role:'coach'|'parent', text}]
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('seed','approved','pending')),
  source        text,                                    -- 'seed_v1' | 'admin' | advisor id
  source_message_id uuid,                                -- the flagged coach_messages row this improves (if any)
  created_by    text,
  approved_by   text,
  approved_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gold_examples_match_idx ON gold_examples (status, worry, archetype, age_band);

INSERT INTO schema_migrations (phase) VALUES ('phase_69_gold_examples') ON CONFLICT DO NOTHING;
