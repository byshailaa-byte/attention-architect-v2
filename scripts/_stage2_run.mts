import { neon } from "@neondatabase/serverless";
const PROD = "postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(PROD);

// ── STEP 2: phase_36_is_internal migration ───────────────────────────────────
console.log("=== STEP 2: phase_36_is_internal migration ===");
await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false`;
await sql`CREATE INDEX IF NOT EXISTS idx_assessments_is_internal ON assessments (is_internal)`;
await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_36_is_internal') ON CONFLICT DO NOTHING`;
console.log("Column added, index created, schema_migrations row inserted.");

// ── STEP 3: backfill ─────────────────────────────────────────────────────────
console.log("\n=== STEP 3: backfill (67 session_ids) ===");
const updated = await sql`
  UPDATE assessments
  SET is_internal = true
  WHERE session_id IN (
    '00000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '44444444-4444-4444-4444-444444444444',
    '40111006-130e-4a5f-a7e0-77bc15d2700b',
    'c71697f2-d673-434a-862c-23432a7ecf32',
    'bb434bd4-9c6c-414b-ac14-4bc71b6912f7',
    '167d4d6e-00be-4cd9-a738-7ee1663e5bae',
    '9d230eb8-bf3a-4d50-879c-9b8c11e9e623',
    '9212ee7e-a0be-4fd4-ba74-8411ed30b198',
    '0091dac0-9ac5-4023-8eec-cd2c95c85ed8',
    '4dce903e-dc17-44d6-9765-9fc713b851f8',
    'f8f896dc-2211-4648-ad36-0d07c6759315',
    '3322fa7d-6f34-4baa-ba78-206bc303fd1f',
    '263a6c2c-7b54-491e-b8b2-791b7466389f',
    '1aa4c676-faad-47d8-9c21-76447f666646',
    '8944a926-5484-40b3-9a2a-0c3b79b72e8f',
    'a7afe921-80a3-4544-8f9c-c47ef6622ce8',
    '9a3dfca7-181d-4945-b5b7-03e1349de2c7',
    'fdc29b5c-9321-4332-ad7c-f255a093457e',
    '70942566-0150-4cae-96d0-12cbd7e44aba',
    '179e9f09-21bc-43b7-ae2c-094c6739c99d',
    'b371b8bd-c9f6-40cc-be1b-f64a4ea3d017',
    'feb39ba4-f86e-4a08-8bee-6eaa965f6151',
    'a8fbd532-3cfe-4356-9210-10dcbbea3adb',
    'a805778e-0d4f-453c-84bb-ea5cc1e698d9',
    '45d9d57b-71c2-423a-9961-7f00c997f112',
    '1e84eb42-625e-4ef4-b17f-39c0dfb894db',
    '2bcbab8a-c904-4721-995e-7d2813c8223f',
    'bbfe9b5b-c59d-4fee-98cb-480a7dfb6c7d',
    '4e33c63e-1092-4db6-8d43-5f1cf4837a7e',
    'a1062c20-a16c-4c1d-a943-362255953e68',
    '5df32311-32f0-412b-9d11-d611377c1da8',
    '96cb5ade-1509-44e6-8dcf-7e6eb74941b5',
    '3e18fbd9-e081-496f-b8c2-7c558859260f',
    '68726518-31db-4c70-ab2b-091a5a3bd86d',
    '4c243ecd-0c71-43e1-b080-0035205fe4c9',
    '13dfe8dd-b353-4ce9-bbef-a2e7852fde51',
    '6a827ff3-5b76-4b36-af63-8b5f24aee2bd',
    '481783d1-6520-42f5-b707-331b003a32a7',
    '722f53a9-e8eb-422d-9426-64f84bf7deec',
    '75178044-9a49-4e08-809d-b12179b82102',
    '579e7106-0308-4106-aa20-d98b07c83511',
    'cf6bfc3c-b1ed-4d51-9903-06f80dcb18eb',
    'e1fb36fa-e44e-4736-a851-babf5da10136',
    'c46f225c-2815-4e6c-9ca7-dd7492b36e88',
    '69fcf3dc-6659-43d0-8660-c65214aad050',
    '0ece705a-f0cd-42ca-b704-46989e4618f8',
    'a43cf568-cc7a-4ad3-961f-74a08499b338',
    'a9215710-1bb3-4105-9c71-560d85242f9d',
    '69f78013-847f-4213-a764-3c7aee287d3c',
    '84796138-5d77-43e3-8f25-fd77b4cf9f60',
    '6280e9eb-a811-478b-aef2-850875ed9562',
    'a0173f0c-f4cf-412f-8014-e91cd807cb14',
    'df788bfc-ac2d-49e0-96a7-175b13b1d9da',
    'f667a671-ef39-45a3-b5ba-64bd32c37ba4',
    'e46fbb11-8313-42a8-b3d8-ecc41c6062db',
    '375d0aed-069e-4a58-a563-f8ab939d3413',
    '7764cee7-f8fa-48e4-80c7-aff2b9968f4d',
    '40b8c3e2-9145-43ae-83bc-7064b1e80d8d',
    '09deabba-0657-4923-b458-c6745d87a72b',
    'a9169661-8cd0-4cd3-8383-7c757a0ea390',
    'e20c3100-e9ef-4397-bae7-2e73e9c1c470',
    'ace95e9b-6c7a-48df-bb35-b4450750ccc7',
    '2bdbe0d0-ba4f-4e7b-8581-9b41450fcc1d',
    '01481d3b-270a-40be-b660-71620e9db0a6',
    'd1dc6285-3a51-462c-8a14-6c2a15aaac1d',
    '1826f92d-0793-4bc5-a5b9-e33d08af74a1'
  )
` as unknown as { count: number };
console.log(`UPDATE affected rows: ${(updated as unknown as {rowCount?: number}).rowCount ?? '(no rowCount)'}`);

// ── STEP 4: verify count ─────────────────────────────────────────────────────
console.log("\n=== STEP 4: verify is_internal count ===");
const countRow = await sql`SELECT COUNT(*) AS n FROM assessments WHERE is_internal = true` as unknown as { n: string }[];
console.log(`is_internal = true: ${countRow[0].n}  (expected 67)`);

// ── STEP 5: confirm schema_migrations ────────────────────────────────────────
console.log("\n=== STEP 5: schema_migrations ===");
const smRow = await sql`SELECT phase, applied_at FROM schema_migrations WHERE phase = 'phase_36_is_internal'` as unknown as { phase: string; applied_at: Date }[];
if (smRow.length === 1) {
  console.log(`phase_36_is_internal present, applied_at=${String(smRow[0].applied_at).substring(0,25)}`);
} else {
  console.log(`WARNING: phase_36_is_internal NOT found in schema_migrations`);
}

// ── STEP 6: published reports count discrepancy ───────────────────────────────
console.log("\n=== STEP 6: published reports count discrepancy ===");

const totalPublished = await sql`
  SELECT COUNT(*) AS total_reports,
         COUNT(DISTINCT assessment_id) AS distinct_assessments
  FROM reports
  WHERE status = 'published'
` as unknown as { total_reports: string; distinct_assessments: string }[];
console.log(`Total published reports: ${totalPublished[0].total_reports}`);
console.log(`Distinct assessment_ids with published report: ${totalPublished[0].distinct_assessments}`);

const multiples = await sql`
  SELECT
    COUNT(*) AS assessments_with_multiple,
    MAX(n) AS max_per_assessment
  FROM (
    SELECT assessment_id, COUNT(*) AS n
    FROM reports
    WHERE status = 'published'
    GROUP BY assessment_id
    HAVING COUNT(*) > 1
  ) sub
` as unknown as { assessments_with_multiple: string; max_per_assessment: string }[];
console.log(`Assessments with >1 published report: ${multiples[0].assessments_with_multiple}`);
console.log(`Max published reports per assessment: ${multiples[0].max_per_assessment}`);

// Are the multiples internal sessions?
const multiplesInternal = await sql`
  SELECT
    r.assessment_id,
    COUNT(*) AS n,
    a.is_internal,
    a.child_name,
    a.email
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  WHERE r.status = 'published'
  GROUP BY r.assessment_id, a.is_internal, a.child_name, a.email
  HAVING COUNT(*) > 1
  ORDER BY COUNT(*) DESC
  LIMIT 20
` as unknown as { assessment_id: string; n: string; is_internal: boolean; child_name: string | null; email: string | null }[];
console.log(`\nAssessments with >1 published report (showing up to 20):`);
multiplesInternal.forEach(r => console.log(`  assessment_id=${r.assessment_id.substring(0,8)}…  n=${r.n}  is_internal=${r.is_internal}  name=${r.child_name ?? 'null'}  email=${r.email ?? 'null'}`));

// Are superseded_by rows also published?
const supersededPublished = await sql`
  SELECT COUNT(*) AS n
  FROM reports
  WHERE status = 'published'
    AND superseded_by IS NOT NULL
` as unknown as { n: string }[];
console.log(`\nPublished rows with superseded_by IS NOT NULL: ${supersededPublished[0].n}`);

const supersededBreakdown = await sql`
  SELECT superseded_by IS NULL AS is_current, COUNT(*) AS n
  FROM reports
  WHERE status = 'published'
  GROUP BY superseded_by IS NULL
` as unknown as { is_current: boolean; n: string }[];
supersededBreakdown.forEach(r => console.log(`  ${r.is_current ? 'current (superseded_by IS NULL)' : 'superseded (superseded_by IS NOT NULL)'}: ${r.n}`));

// ── STEP 7: recompute metrics excluding is_internal ───────────────────────────
console.log("\n=== STEP 7: metrics excluding is_internal ===");

const totals = await sql`
  SELECT
    COUNT(r.id)                              AS total_published_reports,
    COUNT(DISTINCT r.assessment_id)          AS distinct_assessments_with_published,
    COUNT(DISTINCT a.child_name)
      FILTER (WHERE a.child_name IS NOT NULL) AS distinct_child_names
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  WHERE r.status = 'published'
    AND a.is_internal = false
` as unknown as { total_published_reports: string; distinct_assessments_with_published: string; distinct_child_names: string }[];

console.log(`Total published reports (excl internal): ${totals[0].total_published_reports}`);
console.log(`Distinct assessments with published report (excl internal): ${totals[0].distinct_assessments_with_published}`);
console.log(`Distinct non-null child names among those assessments: ${totals[0].distinct_child_names}`);

// Archetype distribution — per report
const archetypes = await sql`
  SELECT r.archetype, COUNT(*) AS n_reports, COUNT(DISTINCT r.assessment_id) AS n_assessments
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  WHERE r.status = 'published'
    AND a.is_internal = false
    AND r.archetype IS NOT NULL
  GROUP BY r.archetype
  ORDER BY COUNT(*) DESC
` as unknown as { archetype: string; n_reports: string; n_assessments: string }[];
console.log(`\nArchetype distribution (excl internal):`);
archetypes.forEach(r => console.log(`  ${r.archetype.padEnd(22)}: ${r.n_reports.padStart(4)} reports  ${r.n_assessments.padStart(4)} assessments`));

// Parent instinct distribution — per report
const instincts = await sql`
  SELECT r.parent_instinct, COUNT(*) AS n_reports, COUNT(DISTINCT r.assessment_id) AS n_assessments
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  WHERE r.status = 'published'
    AND a.is_internal = false
    AND r.parent_instinct IS NOT NULL
  GROUP BY r.parent_instinct
  ORDER BY COUNT(*) DESC
` as unknown as { parent_instinct: string; n_reports: string; n_assessments: string }[];
console.log(`\nParent instinct distribution (excl internal):`);
instincts.forEach(r => console.log(`  ${r.parent_instinct.padEnd(16)}: ${r.n_reports.padStart(4)} reports  ${r.n_assessments.padStart(4)} assessments`));

// Age band distribution — per assessment (age is on assessment, not report)
const ages = await sql`
  SELECT a.age_band, COUNT(DISTINCT r.assessment_id) AS n_assessments, COUNT(r.id) AS n_reports
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  WHERE r.status = 'published'
    AND a.is_internal = false
    AND a.age_band IS NOT NULL
  GROUP BY a.age_band
  ORDER BY a.age_band
` as unknown as { age_band: string; n_assessments: string; n_reports: string }[];
console.log(`\nAge band distribution (excl internal):`);
ages.forEach(r => console.log(`  ${r.age_band.padEnd(8)}: ${r.n_assessments.padStart(4)} assessments  ${r.n_reports.padStart(4)} reports`));

// ── STEP 8: funnel gap — 713 started vs 402 assessment rows ──────────────────
console.log("\n=== STEP 8: funnel gap investigation ===");

const funnelStarted = await sql`
  SELECT COUNT(DISTINCT session_id) AS n FROM funnel_events WHERE event_type = 'assessment_started'
` as unknown as { n: string }[];
const assessmentRows = await sql`
  SELECT COUNT(*) AS n FROM assessments
` as unknown as { n: string }[];
console.log(`assessment_started events (distinct session_id): ${funnelStarted[0].n}`);
console.log(`assessments table rows: ${assessmentRows[0].n}`);

// What fields exist on funnel_events for sessions that never created an assessment row?
const gapFields = await sql`
  SELECT
    COUNT(DISTINCT fe.session_id) AS gap_sessions,
    COUNT(DISTINCT fe.session_id) FILTER (WHERE fe.metadata->>'phone' IS NOT NULL)    AS has_phone_in_meta,
    COUNT(DISTINCT fe.session_id) FILTER (WHERE fe.metadata->>'email' IS NOT NULL)    AS has_email_in_meta,
    COUNT(DISTINCT fe.session_id) FILTER (WHERE fe.metadata->>'fingerprint' IS NOT NULL) AS has_fingerprint_in_meta
  FROM funnel_events fe
  WHERE fe.event_type = 'assessment_started'
    AND NOT EXISTS (
      SELECT 1 FROM assessments a WHERE a.session_id = fe.session_id
    )
` as unknown as { gap_sessions: string; has_phone_in_meta: string; has_email_in_meta: string; has_fingerprint_in_meta: string }[];
console.log(`\nGap sessions (started but no assessment row): ${gapFields[0].gap_sessions}`);
console.log(`  Has phone in metadata:       ${gapFields[0].has_phone_in_meta}`);
console.log(`  Has email in metadata:       ${gapFields[0].has_email_in_meta}`);
console.log(`  Has fingerprint in metadata: ${gapFields[0].has_fingerprint_in_meta}`);

// What metadata keys do these gap sessions have on their assessment_started event?
const gapMetaKeys = await sql`
  SELECT
    jsonb_object_keys(fe.metadata) AS key,
    COUNT(DISTINCT fe.session_id) AS n
  FROM funnel_events fe
  WHERE fe.event_type = 'assessment_started'
    AND NOT EXISTS (SELECT 1 FROM assessments a WHERE a.session_id = fe.session_id)
    AND fe.metadata != '{}'
  GROUP BY key
  ORDER BY COUNT(DISTINCT fe.session_id) DESC
` as unknown as { key: string; n: string }[];
console.log(`\nMetadata keys present on gap-session assessment_started events:`);
if (gapMetaKeys.length === 0) {
  console.log(`  (none — all metadata is empty {})`);
} else {
  gapMetaKeys.forEach(r => console.log(`  ${r.key.padEnd(20)}: ${r.n} sessions`));
}

// Check if any gap sessions have other event types that carry identity
const gapOtherEvents = await sql`
  SELECT
    fe2.event_type,
    COUNT(DISTINCT fe2.session_id) AS n,
    COUNT(DISTINCT fe2.session_id) FILTER (WHERE fe2.metadata != '{}') AS has_meta
  FROM funnel_events fe2
  WHERE EXISTS (
    SELECT 1 FROM funnel_events fe
    WHERE fe.event_type = 'assessment_started'
      AND fe.session_id = fe2.session_id
      AND NOT EXISTS (SELECT 1 FROM assessments a WHERE a.session_id = fe.session_id)
  )
  GROUP BY fe2.event_type
  ORDER BY COUNT(DISTINCT fe2.session_id) DESC
` as unknown as { event_type: string; n: string; has_meta: string }[];
console.log(`\nAll event types seen on gap sessions:`);
gapOtherEvents.forEach(r => console.log(`  ${r.event_type.padEnd(38)}: ${r.n} sessions  (${r.has_meta} have non-empty metadata)`));

// Sample a few gap sessions for inspection
const gapSample = await sql`
  SELECT DISTINCT fe.session_id
  FROM funnel_events fe
  WHERE fe.event_type = 'assessment_started'
    AND NOT EXISTS (SELECT 1 FROM assessments a WHERE a.session_id = fe.session_id)
  LIMIT 3
` as unknown as { session_id: string }[];
console.log(`\nSample gap session_ids (first 3):`);
for (const s of gapSample) {
  const evts = await sql`
    SELECT event_type, created_at, metadata
    FROM funnel_events
    WHERE session_id = ${s.session_id}
    ORDER BY created_at
  ` as unknown as { event_type: string; created_at: Date; metadata: Record<string, unknown> }[];
  console.log(`\n  session_id=${s.session_id}`);
  evts.forEach(e => console.log(`    ${String(e.created_at).substring(0,20)}  ${e.event_type.padEnd(38)}  meta=${JSON.stringify(e.metadata).substring(0,80)}`));
}

console.log("\nDone.");
