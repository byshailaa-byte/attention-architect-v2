import { neon } from "@neondatabase/serverless";
const PROD = "postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(PROD);

// ── A: BUILD INTERNAL/TEST SET ────────────────────────────────────────────────

console.log("\n=== A1: PHONE SIGNALS — phones with high session counts ===\n");

const phoneCounts = await sql`
  SELECT
    phone,
    COUNT(*) AS sessions,
    COUNT(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM reports r WHERE r.assessment_id = a.id AND r.status = 'published'
    )) AS published,
    array_agg(DISTINCT a.child_name ORDER BY a.child_name) AS child_names,
    array_agg(DISTINCT a.email ORDER BY a.email) AS emails,
    MIN(a.created_at)::date AS first_date,
    MAX(a.created_at)::date AS last_date
  FROM assessments a
  WHERE a.phone IS NOT NULL AND a.phone != ''
  GROUP BY a.phone
  HAVING COUNT(*) > 3
  ORDER BY COUNT(*) DESC
` as unknown as {phone:string;sessions:string;published:string;child_names:string[];emails:string[];first_date:string;last_date:string}[];

console.log(`Phones with >3 sessions: ${phoneCounts.length}`);
phoneCounts.forEach(r => {
  console.log(`  phone=...${r.phone.slice(-4)}  sessions=${r.sessions}  published=${r.published}  dates=${r.first_date}→${r.last_date}`);
  console.log(`    children=${JSON.stringify(r.child_names.slice(0,8))}`);
  console.log(`    emails=${JSON.stringify(r.emails.slice(0,5))}`);
});

console.log("\n=== A2: EMAIL SIGNALS ===\n");

const emailSignals = await sql`
  SELECT
    a.email,
    COUNT(*) AS sessions,
    COUNT(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM reports r WHERE r.assessment_id = a.id AND r.status = 'published'
    )) AS published,
    array_agg(DISTINCT a.child_name ORDER BY a.child_name) AS child_names
  FROM assessments a
  WHERE
    a.email IS NOT NULL AND a.email != ''
    AND (
      LOWER(a.email) LIKE '%shashank033%'
      OR LOWER(a.email) LIKE '%byshailaa%'
      OR LOWER(a.email) LIKE '%pgp09shashanka%'
      OR LOWER(a.email) LIKE '%@test.com%'
      OR LOWER(a.email) LIKE '%@example.com%'
      OR a.email LIKE '%+%'
    )
  GROUP BY a.email
  ORDER BY COUNT(*) DESC
` as unknown as {email:string;sessions:string;published:string;child_names:string[]}[];

console.log(`Internal emails found: ${emailSignals.length}`);
emailSignals.forEach(r => {
  console.log(`  email=${r.email}  sessions=${r.sessions}  published=${r.published}`);
  console.log(`    children=${JSON.stringify(r.child_names.slice(0,8))}`);
});

console.log("\n=== A3: CHILD_NAME SIGNALS — obvious test names ===\n");

const childNameSignals = await sql`
  SELECT
    a.child_name,
    a.email,
    a.phone,
    COUNT(*) AS sessions,
    COUNT(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM reports r WHERE r.assessment_id = a.id AND r.status = 'published'
    )) AS published
  FROM assessments a
  WHERE
    LOWER(COALESCE(a.child_name,'')) LIKE ANY(ARRAY['%test%','%smoke%','%verify%','%aryan%test%'])
    OR a.child_name IN ('SmokeKid','ProdTest','VerifyChild','AryanTest')
  GROUP BY a.child_name, a.email, a.phone
  ORDER BY COUNT(*) DESC
` as unknown as {child_name:string;email:string;phone:string;sessions:string;published:string}[];

console.log(`Test child names: ${childNameSignals.length} groups`);
childNameSignals.forEach(r => {
  console.log(`  child=${r.child_name}  email=${r.email}  phone=${r.phone ? '...'+r.phone.slice(-4) : 'null'}  sessions=${r.sessions}  published=${r.published}`);
});

console.log("\n=== A4: DEVICE FINGERPRINT SIGNALS ===\n");

// Check device jsonb — look at high-frequency fingerprints
const deviceCounts = await sql`
  SELECT
    a.device->>'fingerprint' AS fp,
    a.device->>'ua' AS ua,
    COUNT(*) AS sessions,
    COUNT(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM reports r WHERE r.assessment_id = a.id AND r.status = 'published'
    )) AS published,
    array_agg(DISTINCT a.email ORDER BY a.email) AS emails,
    array_agg(DISTINCT a.phone ORDER BY a.phone) AS phones,
    MIN(a.created_at)::date AS first_date,
    MAX(a.created_at)::date AS last_date
  FROM assessments a
  WHERE a.device IS NOT NULL AND a.device->>'fingerprint' IS NOT NULL
  GROUP BY a.device->>'fingerprint', a.device->>'ua'
  HAVING COUNT(*) > 5
  ORDER BY COUNT(*) DESC
  LIMIT 20
` as unknown as {fp:string;ua:string;sessions:string;published:string;emails:string[];phones:string[];first_date:string;last_date:string}[];

console.log(`Device fingerprints with >5 sessions: ${deviceCounts.length}`);
deviceCounts.forEach(r => {
  console.log(`  fp=${r.fp?.substring(0,16)}...  sessions=${r.sessions}  published=${r.published}  dates=${r.first_date}→${r.last_date}`);
  console.log(`    emails=${JSON.stringify(r.emails.slice(0,5))}`);
  console.log(`    phones=${JSON.stringify(r.phones.slice(0,3))}`);
  // Truncate UA
  console.log(`    ua=${(r.ua||'').substring(0,80)}`);
});

// Also check what device fields exist
const deviceSample = await sql`
  SELECT device FROM assessments WHERE device IS NOT NULL LIMIT 3
` as unknown as {device:unknown}[];
console.log("\nDevice field sample (keys):");
deviceSample.forEach(r => console.log(`  keys=${Object.keys(r.device as Record<string,unknown>).join(', ')}`));

console.log("\n=== A5: CONSOLIDATE — FULL INTERNAL SESSION LIST ===\n");

// Build combined internal set:
// Signal 1: phone ...0676
// Signal 2: known internal emails
// Signal 3: test child names (already identified 11)
// Signal 4: high-frequency device fingerprints (if any)

const internalByPhone0676 = await sql`
  SELECT a.session_id, a.child_name, a.email, a.phone, a.created_at::date AS date
  FROM assessments a
  WHERE a.phone LIKE '%0676'
  ORDER BY a.created_at
` as unknown as {session_id:string;child_name:string;email:string;phone:string;date:string}[];

console.log(`Signal: phone ends 0676 → ${internalByPhone0676.length} sessions`);
internalByPhone0676.slice(0,10).forEach(r => {
  console.log(`  ${r.session_id.substring(0,8)}  child=${r.child_name}  email=${r.email}  date=${r.date}`);
});
if (internalByPhone0676.length > 10) console.log(`  ... and ${internalByPhone0676.length - 10} more`);

const internalByEmail = await sql`
  SELECT a.session_id, a.child_name, a.email, a.phone, a.created_at::date AS date
  FROM assessments a
  WHERE
    a.email IS NOT NULL AND a.email != ''
    AND (
      LOWER(a.email) LIKE '%shashank033%'
      OR LOWER(a.email) LIKE '%byshailaa%'
      OR LOWER(a.email) LIKE '%pgp09shashanka%'
      OR LOWER(a.email) LIKE '%@test.com%'
      OR LOWER(a.email) LIKE '%@example.com%'
      OR a.email LIKE '%+%'
    )
  ORDER BY a.created_at
` as unknown as {session_id:string;child_name:string;email:string;phone:string;date:string}[];

console.log(`\nSignal: known internal emails → ${internalByEmail.length} sessions`);
internalByEmail.forEach(r => {
  console.log(`  ${r.session_id.substring(0,8)}  child=${r.child_name}  email=${r.email}  date=${r.date}`);
});

const internalByChildName = await sql`
  SELECT a.session_id, a.child_name, a.email, a.phone, a.created_at::date AS date
  FROM assessments a
  WHERE
    LOWER(COALESCE(a.child_name,'')) LIKE ANY(ARRAY['%test%','%smoke%','%verify%','%debug%','%gate%'])
    OR a.child_name IN ('SmokeKid','ProdTest','VerifyChild','AryanTest')
  ORDER BY a.created_at
` as unknown as {session_id:string;child_name:string;email:string;phone:string;date:string}[];

console.log(`\nSignal: test child names → ${internalByChildName.length} sessions`);
internalByChildName.forEach(r => {
  console.log(`  ${r.session_id.substring(0,8)}  child=${r.child_name}  email=${r.email}  date=${r.date}`);
});

// Also check phone ...9293
const internalByPhone9293 = await sql`
  SELECT a.session_id, a.child_name, a.email, a.phone, a.created_at::date AS date
  FROM assessments a
  WHERE a.phone LIKE '%9293'
    AND (
      LOWER(COALESCE(a.email,'')) LIKE '%pgp09shashanka%'
      OR LOWER(COALESCE(a.email,'')) LIKE '%shashank%'
      OR LOWER(COALESCE(a.email,'')) LIKE '%teambhavalay%'
      OR LOWER(COALESCE(a.email,'')) LIKE '%shashiravi%'
    )
  ORDER BY a.created_at
` as unknown as {session_id:string;child_name:string;email:string;phone:string;date:string}[];
console.log(`\nSignal: phone ends 9293 AND internal-associated email → ${internalByPhone9293.length} sessions`);
internalByPhone9293.forEach(r => {
  console.log(`  ${r.session_id.substring(0,8)}  child=${r.child_name}  email=${r.email}  date=${r.date}`);
});

// Union all signals — count unique sessions per signal
const allInternalIds = new Set([
  ...internalByPhone0676.map(r => r.session_id),
  ...internalByEmail.map(r => r.session_id),
  ...internalByChildName.map(r => r.session_id),
  ...internalByPhone9293.map(r => r.session_id),
]);
console.log(`\nUNION (phone0676 + internal emails + test child names + phone9293-internal): ${allInternalIds.size} unique session_ids`);

// Sessions in the internal set that have a published report
const publishedInternal = await sql`
  SELECT COUNT(DISTINCT r.id) AS n
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  WHERE r.status = 'published'
    AND (
      a.phone LIKE '%0676'
      OR (a.email IS NOT NULL AND (
        LOWER(a.email) LIKE '%shashank033%'
        OR LOWER(a.email) LIKE '%byshailaa%'
        OR LOWER(a.email) LIKE '%pgp09shashanka%'
        OR LOWER(a.email) LIKE '%@test.com%'
        OR LOWER(a.email) LIKE '%@example.com%'
        OR a.email LIKE '%+%'
      ))
      OR LOWER(COALESCE(a.child_name,'')) LIKE ANY(ARRAY['%test%','%smoke%','%verify%','%debug%','%gate%'])
      OR a.child_name IN ('SmokeKid','ProdTest','VerifyChild','AryanTest')
    )
` as unknown as {n:string}[];
console.log(`Internal set sessions with published reports: ${publishedInternal[0].n}`);

console.log("\nDone with A.");
