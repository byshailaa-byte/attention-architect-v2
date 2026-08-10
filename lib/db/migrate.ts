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

  // Phase 11 — app_settings: key-value store for operational markers.
  // campaign_launch_at is the Meta campaign live time; admin dashboard defaults to showing only
  // data on/after this timestamp, keeping the default view clean of pre-launch test data.
  await sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    INSERT INTO app_settings (key, value)
    VALUES ('campaign_launch_at', '2026-07-20T12:15:00.000Z')
    ON CONFLICT (key) DO NOTHING
  `;

  // Phase 12 — phone number capture on assessments.
  // Nullable at DB level (enforced required at form layer).
  await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS phone TEXT`;

  // Phase 13 — whatsapp_report_sent_at: dedup guard for the "report ready" WhatsApp send.
  // First-writer-wins: the claim route atomically sets this with
  //   UPDATE ... SET whatsapp_report_sent_at = NOW() WHERE ... AND whatsapp_report_sent_at IS NULL
  // Only the UPDATE that returns a row fires the send — prevents double-sending when both
  // the primary gate and the ReportGate fallback hit the route close together.
  await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS whatsapp_report_sent_at TIMESTAMPTZ`;

  // Phase 14 — reports table: generate-once/store/version HDG-derived report content.
  //
  // Column split by audience:
  //   Parent-facing (behaviour_signature, archetype*, narrative_moments, family_attention_loop)
  //     — qualitative only, no numeric confidence values allowed.
  //   Internal-only (confidence_vector) — numeric, must never be serialised into parent-facing
  //     API responses. Guard test: __tests__/signature.test.ts "Confidence guardrail".
  //
  // Versioning: when a report is regenerated, the old row's superseded_by is set to the new
  // row's id. Active report = superseded_by IS NULL + desired status.
  await sql`
    CREATE TABLE IF NOT EXISTS reports (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      assessment_id         UUID NOT NULL REFERENCES assessments(id),

      -- Qualitative parent-facing content (no numeric confidence fields)
      behaviour_signature   JSONB NOT NULL DEFAULT '{}',
      archetype             TEXT,
      archetype_fit_tier    TEXT CHECK (archetype_fit_tier IN ('primary','secondary','weak','no_clear_fit')),
      parent_instinct       TEXT,
      narrative_moments     JSONB NOT NULL DEFAULT '[]',
      family_attention_loop JSONB NOT NULL DEFAULT '{}',

      -- Internal only: numeric confidence; never served to parents directly
      confidence_vector     JSONB,

      -- Lifecycle
      status                TEXT NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','preview','published')),
      generated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
      schema_version        INTEGER NOT NULL DEFAULT 1,

      -- Versioning: non-null means this row has been superseded by a newer report
      superseded_by         UUID REFERENCES reports(id),

      created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_reports_assessment ON reports(assessment_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_reports_active ON reports(assessment_id, status) WHERE superseded_by IS NULL`;

  // Phase 15 — archetype_fit_tier, parent_instinct_fit_tier, confidence_vector on assessments.
  // confidence_vector: internal-only, never served to parents — same rule as the reports table.
  // archetype_fit_tier and parent_instinct_fit_tier are computed at submit time so every new
  // assessment row carries them; historical rows stay NULL (backfill via admin script if needed).
  await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS archetype_fit_tier TEXT CHECK (archetype_fit_tier IN ('primary','secondary','weak','no_clear_fit'))`;
  await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS parent_instinct_fit_tier TEXT CHECK (parent_instinct_fit_tier IN ('primary','secondary','weak','no_clear_fit'))`;
  await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS confidence_vector JSONB`;

  // Phase 16 — quality_check_results on reports.
  // Stores the full QualityResult (passed bool + failure array) from the Quality Engine.
  // Queryable by admin tooling when deciding whether to promote a draft to published.
  // NULL means the report predates the Quality Engine (generated before Phase 6).
  await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS quality_check_results JSONB`;

  // Phase 17 — generation_attempts on assessments.
  // Counts total generation attempts per assessment — incremented AFTER composeReport returns,
  // so billing/auth/429 failures that never reach the model do not consume the attempt budget.
  // Quality failures and successful generations both count (both required the model to be called).
  // Caps cost from retry loops that keep hitting quality failures.
  await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS generation_attempts INTEGER NOT NULL DEFAULT 0`;

  // Phase 18 — parent_instinct_fit_tier on reports.
  // Mirrors archetype_fit_tier: stores the scorer-computed fit tier for the parent instinct so
  // admin tooling can see what tier drove the Loop section prompt, without re-running the scorer.
  // NULL for reports generated before this migration.
  await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS parent_instinct_fit_tier TEXT CHECK (parent_instinct_fit_tier IN ('primary','secondary','weak','no_clear_fit'))`;

  // Phase 19 — Admin promote tracking on reports.
  // promoted_at / promoted_by: recorded when an admin moves a report from draft/preview → published.
  // auto_generated: true when the report was created by the auto-generation pipeline (triggered on
  //   assessment completion), false when created via the manual /api/report/generate admin route.
  await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS promoted_at TIMESTAMPTZ`;
  await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS promoted_by TEXT`;
  await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN NOT NULL DEFAULT false`;

  // Phase 20 — Auto-generation pipeline settings in app_settings.
  // auto_generate_enabled: 'true' / 'false' — master switch; pipeline ignores submit hook when false.
  // auto_generate_pipeline_start_at: ISO timestamp when the pipeline first ran.
  //   Used to compute the 48-hour gating window (draft+alert until either 20 reports generated or 48h elapsed).
  await sql`
    INSERT INTO app_settings (key, value)
    VALUES ('auto_generate_enabled', 'false')
    ON CONFLICT (key) DO NOTHING
  `;

  // Phase 21 — funnel_events: add generating_page_view to the allowed event type set.
  await sql`ALTER TABLE funnel_events DROP CONSTRAINT IF EXISTS funnel_events_event_type_check`;
  await sql`
    ALTER TABLE funnel_events ADD CONSTRAINT funnel_events_event_type_check CHECK (event_type IN (
      'assessment_started',
      'assessment_dimension_complete',
      'assessment_complete',
      'report_gate_view',
      'generating_page_view',
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
