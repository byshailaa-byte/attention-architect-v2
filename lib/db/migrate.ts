import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log("Running v2 migrations…");

  // Migration tracking — created first so every subsequent phase can record itself.
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      phase      TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  const rows = await sql`SELECT phase FROM schema_migrations` as { phase: string }[];
  const applied = new Set(rows.map((r) => r.phase));

  // Backfill: phases confirmed applied to production before tracking existed.
  // Phase 21 intentionally excluded — production has a stale funnel constraint that needs re-run.
  // Any phase not listed here will run on the next invocation and mark itself.
  for (const phase of [
    "phase_01_core_tables",
    "phase_05_users_purchases",
    "phase_04_assessment_columns",
    "phase_06_auth_lms",
    "phase_07a_parent_details",
    "phase_07_08_funnel",
    "phase_09_archetype_fix",
    "phase_10a_child_name",
    "phase_10b_exit_intent",
    "phase_11_app_settings",
    "phase_12_phone",
    "phase_13_wa_dedup",
    "phase_14_reports",
    "phase_15_assessment_fit",
    "phase_16_quality_check",
    "phase_17_generation_attempts",
    "phase_18_parent_instinct_reports",
    "phase_19_admin_promote",
    "phase_20_auto_generate",
  ]) {
    if (!applied.has(phase)) {
      await sql`INSERT INTO schema_migrations (phase) VALUES (${phase}) ON CONFLICT DO NOTHING`;
      applied.add(phase);
    }
  }

  // Phase 01 — core tables: assessments and assessment_sessions.
  if (!applied.has("phase_01_core_tables")) {
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
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_01_core_tables') ON CONFLICT DO NOTHING`;
  }

  // Phase 05 — users and purchases tables.
  if (!applied.has("phase_05_users_purchases")) {
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
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_05_users_purchases') ON CONFLICT DO NOTHING`;
  }

  // Phase 04 — post-assessment capture fields on assessments.
  if (!applied.has("phase_04_assessment_columns")) {
    await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS child_gender TEXT`;
    await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS parent_name TEXT`;
    await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS email TEXT`;
    await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS tried TEXT[] DEFAULT '{}'`;
    await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS better TEXT[] DEFAULT '{}'`;
    await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS utm JSONB DEFAULT '{}'`;
    await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS device JSONB DEFAULT '{}'`;
    await sql`CREATE INDEX IF NOT EXISTS idx_assessments_session ON assessments(session_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_session ON assessment_sessions(session_id)`;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_04_assessment_columns') ON CONFLICT DO NOTHING`;
  }

  // Phase 06 — password auth and LMS progress tables.
  if (!applied.has("phase_06_auth_lms")) {
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
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_06_auth_lms') ON CONFLICT DO NOTHING`;
  }

  // Phase 07a — parent_details_at: when the parent filled in name/email to claim their report.
  // Nullable, no backfill — historical rows correctly stay NULL.
  if (!applied.has("phase_07a_parent_details")) {
    await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS parent_details_at TIMESTAMPTZ`;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_07a_parent_details') ON CONFLICT DO NOTHING`;
  }

  // Phase 07/08 — Funnel events table, then widened into a general session event log.
  if (!applied.has("phase_07_08_funnel")) {
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
    // Phase 8 — widen funnel_events into a general session event log
    await sql`ALTER TABLE funnel_events ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'`;
    // Drop old UNIQUE(session_id, event_type) — too restrictive for multi-fire events like dimension_complete
    await sql`ALTER TABLE funnel_events DROP CONSTRAINT IF EXISTS funnel_events_session_id_event_type_key`;
    // Drop narrow 2-type check before renaming rows (old constraint would reject new names)
    await sql`ALTER TABLE funnel_events DROP CONSTRAINT IF EXISTS funnel_events_event_type_check`;
    // Rename existing rows BEFORE adding new constraint (ADD CONSTRAINT validates all existing rows)
    await sql`UPDATE funnel_events SET event_type = 'report_view' WHERE event_type = 'report_viewed'`;
    // Add expanded constraint — kept in sync with Phase 21 (the canonical final state).
    await sql`
      ALTER TABLE funnel_events ADD CONSTRAINT funnel_events_event_type_check CHECK (event_type IN (
        'assessment_started',
        'assessment_question_complete',
        'assessment_dimension_complete',
        'assessment_complete',
        'report_gate_view',
        'generating_page_view',
        'generate_lead',
        'report_view',
        'view_item',
        'pricing_section_viewed',
        'begin_checkout',
        'checkout_modal_opened',
        'checkout_modal_dismissed',
        'purchase',
        'lms_day_complete',
        'lms_reflection_submitted',
        'scroll_milestone',
        'exit_intent_shown',
        'landing_step_age',
        'landing_step_concern',
        'landing_step_followup',
        'pricing_variant_assigned',
        'phone_capture_shown',
        'teaser_shown',
        'paywall_shown'
      ))
    `;
    // Index for per-session timeline queries (also powers the drop-off view)
    await sql`CREATE INDEX IF NOT EXISTS idx_funnel_events_session ON funnel_events(session_id, created_at)`;
    // Dedup scroll milestones: at most one row per (session, page, depth)
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_funnel_scroll_dedup ON funnel_events(session_id, (metadata->>'page'), (metadata->>'depth')) WHERE event_type = 'scroll_milestone'`;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_07_08_funnel') ON CONFLICT DO NOTHING`;
  }

  // Phase 09 — Normalize archetype casing: one legacy test row was written as 'storm'
  if (!applied.has("phase_09_archetype_fix")) {
    await sql`UPDATE assessments SET archetype = 'The Storm' WHERE archetype = 'storm'`;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_09_archetype_fix') ON CONFLICT DO NOTHING`;
  }

  // Phase 10a — child_name: make nullable so the form can be submitted without a name.
  if (!applied.has("phase_10a_child_name")) {
    await sql`ALTER TABLE assessments ALTER COLUMN child_name DROP NOT NULL`;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_10a_child_name') ON CONFLICT DO NOTHING`;
  }

  // Phase 10b — funnel_events: add exit_intent_shown to the allowed event type set.
  if (!applied.has("phase_10b_exit_intent")) {
    await sql`ALTER TABLE funnel_events DROP CONSTRAINT IF EXISTS funnel_events_event_type_check`;
    await sql`
      ALTER TABLE funnel_events ADD CONSTRAINT funnel_events_event_type_check CHECK (event_type IN (
        'assessment_started',
        'assessment_question_complete',
        'assessment_dimension_complete',
        'assessment_complete',
        'report_gate_view',
        'generating_page_view',
        'generate_lead',
        'report_view',
        'view_item',
        'pricing_section_viewed',
        'begin_checkout',
        'checkout_modal_opened',
        'checkout_modal_dismissed',
        'purchase',
        'lms_day_complete',
        'lms_reflection_submitted',
        'scroll_milestone',
        'exit_intent_shown',
        'landing_step_age',
        'landing_step_concern',
        'landing_step_followup',
        'pricing_variant_assigned',
        'phone_capture_shown',
        'teaser_shown',
        'paywall_shown'
      ))
    `;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_10b_exit_intent') ON CONFLICT DO NOTHING`;
  }

  // Phase 11 — app_settings: key-value store for operational markers.
  if (!applied.has("phase_11_app_settings")) {
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
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_11_app_settings') ON CONFLICT DO NOTHING`;
  }

  // Phase 12 — phone number capture on assessments.
  if (!applied.has("phase_12_phone")) {
    await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS phone TEXT`;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_12_phone') ON CONFLICT DO NOTHING`;
  }

  // Phase 13 — whatsapp_report_sent_at: dedup guard for the "report ready" WhatsApp send.
  if (!applied.has("phase_13_wa_dedup")) {
    await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS whatsapp_report_sent_at TIMESTAMPTZ`;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_13_wa_dedup') ON CONFLICT DO NOTHING`;
  }

  // Phase 14 — reports table: generate-once/store/version HDG-derived report content.
  //
  // confidence_vector is internal-only — must never be serialised into parent-facing API responses.
  // Guard test: __tests__/signature.test.ts "Confidence guardrail".
  if (!applied.has("phase_14_reports")) {
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
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_14_reports') ON CONFLICT DO NOTHING`;
  }

  // Phase 15 — archetype_fit_tier, parent_instinct_fit_tier, confidence_vector on assessments.
  // confidence_vector: internal-only, never served to parents — same rule as the reports table.
  if (!applied.has("phase_15_assessment_fit")) {
    await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS archetype_fit_tier TEXT CHECK (archetype_fit_tier IN ('primary','secondary','weak','no_clear_fit'))`;
    await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS parent_instinct_fit_tier TEXT CHECK (parent_instinct_fit_tier IN ('primary','secondary','weak','no_clear_fit'))`;
    await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS confidence_vector JSONB`;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_15_assessment_fit') ON CONFLICT DO NOTHING`;
  }

  // Phase 16 — quality_check_results on reports.
  if (!applied.has("phase_16_quality_check")) {
    await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS quality_check_results JSONB`;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_16_quality_check') ON CONFLICT DO NOTHING`;
  }

  // Phase 17 — generation_attempts on assessments.
  if (!applied.has("phase_17_generation_attempts")) {
    await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS generation_attempts INTEGER NOT NULL DEFAULT 0`;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_17_generation_attempts') ON CONFLICT DO NOTHING`;
  }

  // Phase 18 — parent_instinct_fit_tier on reports.
  if (!applied.has("phase_18_parent_instinct_reports")) {
    await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS parent_instinct_fit_tier TEXT CHECK (parent_instinct_fit_tier IN ('primary','secondary','weak','no_clear_fit'))`;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_18_parent_instinct_reports') ON CONFLICT DO NOTHING`;
  }

  // Phase 19 — admin promote tracking on reports.
  if (!applied.has("phase_19_admin_promote")) {
    await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS promoted_at TIMESTAMPTZ`;
    await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS promoted_by TEXT`;
    await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN NOT NULL DEFAULT false`;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_19_admin_promote') ON CONFLICT DO NOTHING`;
  }

  // Phase 20 — auto-generation pipeline settings in app_settings.
  if (!applied.has("phase_20_auto_generate")) {
    await sql`
      INSERT INTO app_settings (key, value)
      VALUES ('auto_generate_enabled', 'false')
      ON CONFLICT (key) DO NOTHING
    `;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_20_auto_generate') ON CONFLICT DO NOTHING`;
  }

  // Phase 21 — funnel_events: canonical final constraint matching the API ALLOWED set.
  // Not in the production backfill list — production constraint is stale and missing 11 event types,
  // causing silent data loss. This re-run fixes it.
  // Also creates idx_funnel_scroll_dedup here because phase_07_08_funnel is backfilled as applied
  // but that index was never created on production.
  if (!applied.has("phase_21_funnel_constraint")) {
    await sql`ALTER TABLE funnel_events DROP CONSTRAINT IF EXISTS funnel_events_event_type_check`;
    await sql`
      ALTER TABLE funnel_events ADD CONSTRAINT funnel_events_event_type_check CHECK (event_type IN (
        'assessment_started',
        'assessment_question_complete',
        'assessment_dimension_complete',
        'assessment_complete',
        'report_gate_view',
        'generating_page_view',
        'generate_lead',
        'report_view',
        'view_item',
        'pricing_section_viewed',
        'begin_checkout',
        'checkout_modal_opened',
        'checkout_modal_dismissed',
        'purchase',
        'lms_day_complete',
        'lms_reflection_submitted',
        'scroll_milestone',
        'exit_intent_shown',
        'landing_step_age',
        'landing_step_concern',
        'landing_step_followup',
        'pricing_variant_assigned',
        'phone_capture_shown',
        'teaser_shown',
        'paywall_shown'
      ))
    `;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_funnel_scroll_dedup ON funnel_events(session_id, (metadata->>'page'), (metadata->>'depth')) WHERE event_type = 'scroll_milestone'`;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_21_funnel_constraint') ON CONFLICT DO NOTHING`;
  }

  // Phase 22 — pricing_variant on assessments.
  // NULL for sessions created before this migration (treated as control in the UI).
  if (!applied.has("phase_22_pricing_variant")) {
    await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS pricing_variant TEXT CHECK (pricing_variant IN ('control', 'gated'))`;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_22_pricing_variant') ON CONFLICT DO NOTHING`;
  }

  // Phase 23 — worry_followup on assessments.
  if (!applied.has("phase_23_worry_followup")) {
    await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS worry_followup TEXT`;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_23_worry_followup') ON CONFLICT DO NOTHING`;
  }

  // Phase 24 — variant on purchases.
  if (!applied.has("phase_24_purchases_variant")) {
    await sql`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS variant TEXT CHECK (variant IN ('control', 'gated'))`;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_24_purchases_variant') ON CONFLICT DO NOTHING`;
  }

  // Phase 25 — widen pricing_variant and purchases.variant to include 'simplified'.
  if (!applied.has("phase_25_variant_widen")) {
    await sql`
      ALTER TABLE assessments
        DROP CONSTRAINT IF EXISTS assessments_pricing_variant_check,
        ADD CONSTRAINT assessments_pricing_variant_check
          CHECK (pricing_variant IN ('control', 'gated', 'simplified'))
    `;
    await sql`
      ALTER TABLE purchases
        DROP CONSTRAINT IF EXISTS purchases_variant_check,
        ADD CONSTRAINT purchases_variant_check
          CHECK (variant IN ('control', 'gated', 'simplified'))
    `;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_25_variant_widen') ON CONFLICT DO NOTHING`;
  }

  // Phase 26 — lms_surveys: in-course survey responses.
  // Previously created directly in dev console; codified here to ensure production parity.
  // BIGSERIAL auto-creates lms_surveys_id_seq owned by lms_surveys.id (matches dev sequence).
  // The named _not_null CHECK constraints that exist in dev are redundant with the NOT NULL
  // column declarations and are not recreated here — the table is functionally identical.
  if (!applied.has("phase_26_lms_surveys")) {
    await sql`
      CREATE TABLE IF NOT EXISTS lms_surveys (
        id                  BIGSERIAL PRIMARY KEY,
        user_id             TEXT NOT NULL,
        survey_type         TEXT NOT NULL
                              CHECK (survey_type IN ('week3_pulse', 'week6_comprehensive')),
        submitted_at        TIMESTAMPTZ,
        dismissed_at        TIMESTAMPTZ,
        rating              SMALLINT,
        open_text           TEXT,
        nps_score           SMALLINT,
        behavior_change     TEXT,
        worked_best         TEXT,
        hardest             TEXT,
        advocate_selections TEXT[],
        UNIQUE(user_id, survey_type)
      )
    `;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_26_lms_surveys') ON CONFLICT DO NOTHING`;
  }

  // Phase 27 — otp_codes: phone-based OTP verification codes.
  // Previously created directly in dev console; codified here for production parity.
  if (!applied.has("phase_27_otp_codes")) {
    await sql`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone      TEXT NOT NULL,
        code       TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at    TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone)`;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_27_otp_codes') ON CONFLICT DO NOTHING`;
  }

  // Phase 28 — onboarding_completed_at on users.
  // Added directly in dev console; never codified. Onboarding-complete route crashes on production
  // without it. Nullable — historical users correctly stay NULL.
  if (!applied.has("phase_28_onboarding_completed_at")) {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ`;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_28_onboarding_completed_at') ON CONFLICT DO NOTHING`;
  }

  // Phase 29 — variant on handbook_leads.
  // Added directly in dev console; never codified. handbook_leads table was created outside
  // migrate.ts (directly in Neon console) and exists in both environments.
  // dev: TEXT NOT NULL DEFAULT 'production' — all existing rows receive the default on ALTER.
  if (!applied.has("phase_29_handbook_leads_variant")) {
    await sql`ALTER TABLE handbook_leads ADD COLUMN IF NOT EXISTS variant TEXT NOT NULL DEFAULT 'production'`;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_29_handbook_leads_variant') ON CONFLICT DO NOTHING`;
  }

  // Phase 31 — whatsapp_send_claimed_at: separate claim column so the send timestamp
  // (whatsapp_report_sent_at) is set only after a confirmed successful send.
  // The claim column acts as an atomic concurrency guard that can be released on failure,
  // enabling retry by re-submitting the claim form. Nullable — existing rows stay NULL.
  if (!applied.has("phase_31_wa_claim_column")) {
    await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS whatsapp_send_claimed_at TIMESTAMPTZ`;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_31_wa_claim_column') ON CONFLICT DO NOTHING`;
  }

  // Phase 32 — whatsapp_send_attempts: counts total claim cycles for bounded retry.
  // Incremented each time the claim is atomically acquired (claim route + cron retries).
  // Sessions with attempts >= MAX and sent_at NULL are recoverable via admin panel.
  if (!applied.has("phase_32_wa_send_attempts")) {
    await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS whatsapp_send_attempts INT NOT NULL DEFAULT 0`;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_32_wa_send_attempts') ON CONFLICT DO NOTHING`;
  }

  // Phase 33 — add simplified_report_view to the funnel_events event_type CHECK constraint.
  // Fires in /preview/simplified-v1 when a real published report renders for a gated parent.
  // Without this, the simplified variant emits no report-view signal at all.
  if (!applied.has("phase_33_simplified_report_view_event")) {
    await sql`ALTER TABLE funnel_events DROP CONSTRAINT IF EXISTS funnel_events_event_type_check`;
    await sql`
      ALTER TABLE funnel_events ADD CONSTRAINT funnel_events_event_type_check CHECK (event_type IN (
        'assessment_started',
        'assessment_question_complete',
        'assessment_dimension_complete',
        'assessment_complete',
        'report_gate_view',
        'generating_page_view',
        'generate_lead',
        'report_view',
        'view_item',
        'pricing_section_viewed',
        'begin_checkout',
        'checkout_modal_opened',
        'checkout_modal_dismissed',
        'purchase',
        'lms_day_complete',
        'lms_reflection_submitted',
        'scroll_milestone',
        'exit_intent_shown',
        'landing_step_age',
        'landing_step_concern',
        'landing_step_followup',
        'pricing_variant_assigned',
        'phone_capture_shown',
        'teaser_shown',
        'paywall_shown',
        'simplified_report_view'
      ))
    `;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_33_simplified_report_view_event') ON CONFLICT DO NOTHING`;
  }

  // Phase 34 — add thankyou_screen_view to the funnel_events event_type CHECK constraint.
  // Fires once when the thank-you screen renders after a successful simplified gate submit.
  // Fills the gap between generate_lead and simplified_report_view so drop-off at the
  // thank-you screen is visible separately from parents who never open their WhatsApp link.
  if (!applied.has("phase_34_thankyou_screen_view_event")) {
    await sql`ALTER TABLE funnel_events DROP CONSTRAINT IF EXISTS funnel_events_event_type_check`;
    await sql`
      ALTER TABLE funnel_events ADD CONSTRAINT funnel_events_event_type_check CHECK (event_type IN (
        'assessment_started',
        'assessment_question_complete',
        'assessment_dimension_complete',
        'assessment_complete',
        'report_gate_view',
        'generating_page_view',
        'generate_lead',
        'report_view',
        'view_item',
        'pricing_section_viewed',
        'begin_checkout',
        'checkout_modal_opened',
        'checkout_modal_dismissed',
        'purchase',
        'lms_day_complete',
        'lms_reflection_submitted',
        'scroll_milestone',
        'exit_intent_shown',
        'landing_step_age',
        'landing_step_concern',
        'landing_step_followup',
        'pricing_variant_assigned',
        'phone_capture_shown',
        'teaser_shown',
        'paywall_shown',
        'simplified_report_view',
        'thankyou_screen_view'
      ))
    `;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_34_thankyou_screen_view_event') ON CONFLICT DO NOTHING`;
  }

  // Phase 35 — add founder_call_requested to the funnel_events event_type CHECK constraint.
  // Fires when a parent taps "Book your free call →" on the roadmap.
  // Must be added here AND in the ALLOWED set in /api/funnel/event/route.ts — both, always.
  if (!applied.has("phase_35_founder_call_requested_event")) {
    await sql`ALTER TABLE funnel_events DROP CONSTRAINT IF EXISTS funnel_events_event_type_check`;
    await sql`
      ALTER TABLE funnel_events ADD CONSTRAINT funnel_events_event_type_check CHECK (event_type IN (
        'assessment_started',
        'assessment_question_complete',
        'assessment_dimension_complete',
        'assessment_complete',
        'report_gate_view',
        'generating_page_view',
        'generate_lead',
        'report_view',
        'view_item',
        'pricing_section_viewed',
        'begin_checkout',
        'checkout_modal_opened',
        'checkout_modal_dismissed',
        'purchase',
        'lms_day_complete',
        'lms_reflection_submitted',
        'scroll_milestone',
        'exit_intent_shown',
        'landing_step_age',
        'landing_step_concern',
        'landing_step_followup',
        'pricing_variant_assigned',
        'phone_capture_shown',
        'teaser_shown',
        'paywall_shown',
        'simplified_report_view',
        'thankyou_screen_view',
        'founder_call_requested'
      ))
    `;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_35_founder_call_requested_event') ON CONFLICT DO NOTHING`;
  }

  // Phase 30 — purchases.tier: extend CHECK to include tier1 and tier2 for roadmap pricing.
  // tier1 = Roadmap only (₹2,999). tier2 = Roadmap + Founder Call (₹4,999).
  // module1 / full / topup kept for backward-compat with existing paid records.
  if (!applied.has("phase_30_purchases_tier_tiers")) {
    await sql`
      ALTER TABLE purchases
        DROP CONSTRAINT IF EXISTS purchases_tier_check,
        ADD CONSTRAINT purchases_tier_check
          CHECK (tier IN ('module1','full','topup','tier1','tier2'))
    `;
    await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_30_purchases_tier_tiers') ON CONFLICT DO NOTHING`;
  }

  console.log("Migrations complete.");
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
