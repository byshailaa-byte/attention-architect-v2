import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log("Running v2 migrations…");

  await sql`
    CREATE TABLE IF NOT EXISTS assessments (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id    UUID NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

      child_name    TEXT NOT NULL,
      age_band      TEXT NOT NULL CHECK (age_band IN ('8-9','10-11','12-14')),
      concerns      TEXT[]  NOT NULL DEFAULT '{}',

      answers       JSONB NOT NULL DEFAULT '{}',
      dimensions    JSONB NOT NULL DEFAULT '{}',

      archetype     TEXT,
      parent_pattern TEXT,

      axes          JSONB,
      weakest_two   TEXT[],

      -- SENSITIVE: Gate 3 — honest_flag and honest_trigger must never appear in
      -- admin views, analytics events, pixels, or marketing segmentation.
      -- See docs/specs/honest-path-trigger-spec.md §7.
      honest_flag    BOOLEAN,
      honest_trigger TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS assessment_sessions (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id   UUID NOT NULL,
      dimension    TEXT NOT NULL,
      answered_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      device       JSONB NOT NULL DEFAULT '{}',
      utm          JSONB NOT NULL DEFAULT '{}'
    )
  `;

  // Phase 5 — users and purchases tables

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone         TEXT UNIQUE,          -- nullable; kept for legacy Razorpay records
      email         TEXT,
      password_hash TEXT,
      city          TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL`;

  await sql`
    CREATE TABLE IF NOT EXISTS purchases (
      id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id              UUID NOT NULL REFERENCES users(id),
      assessment_id        UUID REFERENCES assessments(id),
      tier                 TEXT NOT NULL CHECK (tier IN ('module1','full','topup')),
      amount_paise         INTEGER NOT NULL,
      razorpay_order_id    TEXT UNIQUE NOT NULL,
      razorpay_payment_id  TEXT UNIQUE,      -- NULL until webhook fires
      status               TEXT NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','paid','failed')),
      created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_purchases_order ON purchases(razorpay_order_id)`;

  // Phase 4 additions — post-assessment capture fields
  await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS child_gender TEXT`;
  await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS parent_name TEXT`;
  await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS email TEXT`;
  await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS tried TEXT[] DEFAULT '{}'`;
  await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS better TEXT[] DEFAULT '{}'`;
  await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS utm JSONB DEFAULT '{}'`;
  await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS device JSONB DEFAULT '{}'`;

  await sql`CREATE INDEX IF NOT EXISTS idx_assessments_session ON assessments(session_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_session ON assessment_sessions(session_id)`;

  // Phase 6 — Password auth + LMS progress tables

  await sql`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES users(id),
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at    TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_prt_user ON password_reset_tokens(user_id)`;

  // day 0 = weekend review / week-level completion marker.
  // Using 0 instead of NULL avoids the PostgreSQL unique-index edge case
  // where multiple NULL rows satisfy UNIQUE(user_id, week, day).
  await sql`
    CREATE TABLE IF NOT EXISTS lms_progress (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id       UUID NOT NULL REFERENCES users(id),
      assessment_id UUID REFERENCES assessments(id),
      week          INTEGER NOT NULL,
      day           INTEGER NOT NULL DEFAULT 0
                      CHECK (day BETWEEN 0 AND 5),
      completed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(user_id, week, day)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_lms_progress_user ON lms_progress (user_id, week)`;

  // One row per (user, week, day) for days 2–5 — 4 rows per completing week.
  await sql`
    CREATE TABLE IF NOT EXISTS lms_reflections (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES users(id),
      week       INTEGER NOT NULL,
      day        INTEGER NOT NULL CHECK (day BETWEEN 2 AND 5),
      outcome    TEXT NOT NULL CHECK (outcome IN ('worked','mixed','didnt_land')),
      note       TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(user_id, week, day)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_lms_reflections_user ON lms_reflections (user_id, week)`;

  // Phase 7a — parent_details_at: when the parent filled in name/email to claim their report.
  // Nullable, no backfill — historical rows correctly stay NULL.
  await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS parent_details_at TIMESTAMPTZ`;

  // Phase 7 — Funnel events (one row per session per event type)
  await sql`
    CREATE TABLE IF NOT EXISTS funnel_events (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type TEXT NOT NULL CHECK (event_type IN ('assessment_started', 'report_viewed')),
      session_id UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(session_id, event_type)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_funnel_events_type ON funnel_events(event_type)`;

  // Phase 8 — Widen funnel_events into a general session event log
  await sql`ALTER TABLE funnel_events ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'`;
  // Drop old UNIQUE(session_id, event_type) — too restrictive for multi-fire events like dimension_complete
  await sql`ALTER TABLE funnel_events DROP CONSTRAINT IF EXISTS funnel_events_session_id_event_type_key`;
  // Drop narrow 2-type check before renaming rows (old constraint would reject new names)
  await sql`ALTER TABLE funnel_events DROP CONSTRAINT IF EXISTS funnel_events_event_type_check`;
  // Rename existing rows BEFORE adding new constraint (ADD CONSTRAINT validates all existing rows)
  await sql`UPDATE funnel_events SET event_type = 'report_view' WHERE event_type = 'report_viewed'`;
  // Add expanded constraint with all 12 event types
  await sql`
    ALTER TABLE funnel_events ADD CONSTRAINT funnel_events_event_type_check CHECK (event_type IN (
      'assessment_started',
      'assessment_dimension_complete',
      'assessment_complete',
      'report_gate_view',
      'generate_lead',
      'report_view',
      'view_item',
      'begin_checkout',
      'purchase',
      'lms_day_complete',
      'lms_reflection_submitted',
      'scroll_milestone'
    ))
  `;
  // Index for per-session timeline queries (also powers the drop-off view)
  await sql`CREATE INDEX IF NOT EXISTS idx_funnel_events_session ON funnel_events(session_id, created_at)`;
  // Dedup scroll milestones: at most one row per (session, page, depth)
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_funnel_scroll_dedup ON funnel_events(session_id, (metadata->>'page'), (metadata->>'depth')) WHERE event_type = 'scroll_milestone'`;

  // Phase 9 — Normalize archetype casing: one legacy test row was written as 'storm'
  // (the scorer always produces 'The Storm'; this corrects the pre-existing bad row)
  await sql`UPDATE assessments SET archetype = 'The Storm' WHERE archetype = 'storm'`;

  // Phase 10a — child_name: make nullable so the form can be submitted without a name.
  // Empty-string inserts from before this migration are fine; new blank submissions will insert NULL.
  await sql`ALTER TABLE assessments ALTER COLUMN child_name DROP NOT NULL`;

  // Phase 10b — funnel_events: add exit_intent_shown to the allowed event type set.
  // Drop + re-add constraint to include the new type (Postgres doesn't support ALTER CONSTRAINT).
  await sql`ALTER TABLE funnel_events DROP CONSTRAINT IF EXISTS funnel_events_event_type_check`;
  await sql`
    ALTER TABLE funnel_events ADD CONSTRAINT funnel_events_event_type_check CHECK (event_type IN (
      'assessment_started',
      'assessment_dimension_complete',
      'assessment_complete',
      'report_gate_view',
      'generate_lead',
      'report_view',
      'view_item',
      'begin_checkout',
      'purchase',
      'lms_day_complete',
      'lms_reflection_submitted',
      'scroll_milestone',
      'exit_intent_shown'
    ))
  `;

  console.log("Migrations complete.");
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
