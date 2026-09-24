import { neon } from "@neondatabase/serverless";
const PROD = "postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(PROD);

// ── Definitive internal set (excludes ambiguous emails) ──────────────────────
// Signal A: phone ends 0676, EXCLUDING ambiguous emails
// Signal B: known internal emails (shashank033, byshailaa, pgp09shashanka, @test.com, @example.com, email+tag)
// Signal C: test child names
// Signal D: phone ends 9293 AND known-internal email (shashank033/pgp09shashanka only; shashiravi/teambhavalay are ambiguous)

const AMBIGUOUS_EMAILS = [
  "curiouscube12@gmail.com",
  "priya@gmail.com",
  "sa@gmail.com",
  "shashiravi033@gmail.com",
  "teambhavalay@gmail.com",
];

const rows = await sql`
  WITH sessions AS (
    SELECT
      a.session_id,
      a.child_name,
      a.email,
      a.phone,
      a.created_at,
      EXISTS(
        SELECT 1 FROM reports r
        WHERE r.assessment_id = a.id AND r.status = 'published'
      ) AS has_published,

      -- Signal flags (mutually non-exclusive — a session may match multiple)
      (a.phone LIKE '%0676'
        AND COALESCE(a.email,'') NOT IN (
          'curiouscube12@gmail.com','priya@gmail.com','sa@gmail.com',
          'shashiravi033@gmail.com','teambhavalay@gmail.com'
        )
      ) AS sig_phone_0676,

      (a.email IS NOT NULL AND (
        LOWER(a.email) LIKE '%shashank033%'
        OR LOWER(a.email) LIKE '%byshailaa%'
        OR LOWER(a.email) LIKE '%pgp09shashanka%'
        OR LOWER(a.email) LIKE '%@test.com'
        OR LOWER(a.email) LIKE '%@example.com'
        OR a.email LIKE '%+%'
      )) AS sig_internal_email,

      (LOWER(COALESCE(a.child_name,'')) LIKE ANY(ARRAY['%test%','%smoke%','%verify%','%debug%','%gate%'])
        OR a.child_name IN ('SmokeKid','ProdTest','VerifyChild','AryanTest')
      ) AS sig_test_name,

      (a.phone LIKE '%9293'
        AND a.email IS NOT NULL
        AND (
          LOWER(a.email) LIKE '%pgp09shashanka%'
          OR LOWER(a.email) LIKE '%shashank033%'
        )
      ) AS sig_phone_9293_internal

    FROM assessments a
  )
  SELECT *
  FROM sessions
  WHERE sig_phone_0676 OR sig_internal_email OR sig_test_name OR sig_phone_9293_internal
  ORDER BY
    -- Sort: test-name-only last (most ambiguous of the clear set), then by date
    (sig_internal_email OR sig_phone_0676 OR sig_phone_9293_internal) DESC,
    sig_test_name DESC,
    created_at
` as unknown as {
  session_id: string;
  child_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: Date;
  has_published: boolean;
  sig_phone_0676: boolean;
  sig_internal_email: boolean;
  sig_test_name: boolean;
  sig_phone_9293_internal: boolean;
}[];

console.log(`\nDEFINITIVE INTERNAL SET: ${rows.length} sessions\n`);
console.log(
  "session_id".padEnd(38) +
  "child_name".padEnd(18) +
  "email".padEnd(34) +
  "phone(last4)".padEnd(14) +
  "created_at".padEnd(12) +
  "pub".padEnd(5) +
  "signal(s)"
);
console.log("─".repeat(155));

for (const r of rows) {
  const signals: string[] = [];
  if (r.sig_phone_0676)         signals.push("phone-0676");
  if (r.sig_internal_email)     signals.push("internal-email");
  if (r.sig_test_name)          signals.push("test-name");
  if (r.sig_phone_9293_internal) signals.push("phone-9293");

  const phone4 = r.phone ? "..." + r.phone.slice(-4) : "null";
  const dateStr = String(r.created_at).substring(0, 10);
  const email = (r.email ?? "null").substring(0, 32);
  const name = (r.child_name ?? "null").substring(0, 16);

  console.log(
    r.session_id.padEnd(38) +
    name.padEnd(18) +
    email.padEnd(34) +
    phone4.padEnd(14) +
    dateStr.padEnd(12) +
    (r.has_published ? "y" : "n").padEnd(5) +
    signals.join(", ")
  );
}

// ── Ambiguous set ─────────────────────────────────────────────────────────────
const ambig = await sql`
  SELECT
    a.session_id,
    a.child_name,
    a.email,
    a.phone,
    a.created_at,
    EXISTS(
      SELECT 1 FROM reports r
      WHERE r.assessment_id = a.id AND r.status = 'published'
    ) AS has_published,
    CASE
      WHEN a.email IN ('curiouscube12@gmail.com','priya@gmail.com','sa@gmail.com')
        THEN 'phone-0676 (email not obviously internal)'
      WHEN a.email IN ('shashiravi033@gmail.com','teambhavalay@gmail.com')
        THEN 'phone-9293 (email not obviously internal)'
      ELSE 'other'
    END AS ambig_reason
  FROM assessments a
  WHERE a.email IN (
    'curiouscube12@gmail.com','priya@gmail.com','sa@gmail.com',
    'shashiravi033@gmail.com','teambhavalay@gmail.com'
  )
  ORDER BY a.email, a.created_at
` as unknown as {
  session_id: string;
  child_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: Date;
  has_published: boolean;
  ambig_reason: string;
}[];

console.log(`\n\nAMBIGUOUS SET (needs your decision): ${ambig.length} sessions\n`);
console.log(
  "session_id".padEnd(38) +
  "child_name".padEnd(18) +
  "email".padEnd(34) +
  "phone(last4)".padEnd(14) +
  "created_at".padEnd(12) +
  "pub".padEnd(5) +
  "reason"
);
console.log("─".repeat(155));

for (const r of ambig) {
  const phone4 = r.phone ? "..." + r.phone.slice(-4) : "null";
  const dateStr = String(r.created_at).substring(0, 10);
  const email = (r.email ?? "null").substring(0, 32);
  const name = (r.child_name ?? "null").substring(0, 16);

  console.log(
    r.session_id.padEnd(38) +
    name.padEnd(18) +
    email.padEnd(34) +
    phone4.padEnd(14) +
    dateStr.padEnd(12) +
    (r.has_published ? "y" : "n").padEnd(5) +
    r.ambig_reason
  );
}

// ── Counts ────────────────────────────────────────────────────────────────────
const published_def = rows.filter(r => r.has_published).length;
const published_ambig = ambig.filter(r => r.has_published).length;

console.log(`\nSUMMARY`);
console.log(`Definitive internal: ${rows.length} sessions, ${published_def} with published report`);
console.log(`Ambiguous (review):  ${ambig.length} sessions, ${published_ambig} with published report`);
console.log(`\nSession IDs for backfill (definitive only):`);
console.log(rows.map(r => `'${r.session_id}'`).join(",\n"));
