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

  console.log("Migrations complete.");
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
