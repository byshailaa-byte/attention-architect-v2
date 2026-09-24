import { neon } from "@neondatabase/serverless";
const PROD = "postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(PROD);

// ── 10: Schema — raw column types from assessments + reports ─────────────────
console.log("\n=== 10: SCHEMA ===\n");
const aCols = await sql`
  SELECT column_name, data_type, character_maximum_length
  FROM information_schema.columns
  WHERE table_name = 'assessments'
  ORDER BY ordinal_position
` as unknown as {column_name:string;data_type:string;character_maximum_length:number}[];
console.log("assessments:");
aCols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}${c.character_maximum_length ? `(${c.character_maximum_length})` : ''}`));

const rCols = await sql`
  SELECT column_name, data_type, character_maximum_length
  FROM information_schema.columns
  WHERE table_name = 'reports'
  ORDER BY ordinal_position
` as unknown as {column_name:string;data_type:string;character_maximum_length:number}[];
console.log("reports:");
rCols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}${c.character_maximum_length ? `(${c.character_maximum_length})` : ''}`));

// Also check funnel_events and lms_progress tables if they exist
const tables = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name
` as unknown as {table_name:string}[];
console.log("\nAll tables:", tables.map(t=>t.table_name).join(', '));

// ── 11: Counts by archetype, instinct, age band ──────────────────────────────
console.log("\n=== 11: COUNTS ===\n");

// First: identify test rows by known test child names / emails
const testRows = await sql`
  SELECT DISTINCT a.session_id, a.child_name, a.email
  FROM assessments a
  JOIN reports r ON r.assessment_id = a.id
  WHERE r.status = 'published'
    AND (
      LOWER(a.child_name) LIKE '%test%'
      OR LOWER(a.child_name) LIKE '%smoke%'
      OR LOWER(a.email) LIKE '%test%'
      OR LOWER(a.email) LIKE '%shailaa%'
      OR a.child_name = 'SmokeKid'
    )
` as unknown as {session_id:string;child_name:string;email:string}[];
console.log("Identified test rows:", testRows.length);
testRows.forEach(r => console.log(`  session=${r.session_id.substring(0,8)} child=${r.child_name} email=${r.email}`));

const testSessionIds = testRows.map(r => r.session_id);

// Total published excluding test
const total = await sql`
  SELECT COUNT(*) AS n
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  WHERE r.status = 'published'
    AND a.session_id != ALL(${testSessionIds}::uuid[])
` as unknown as {n:string}[];
console.log(`\nTotal published (excl test): ${total[0].n}`);

// By archetype
const byArch = await sql`
  SELECT r.archetype, COUNT(*) AS n
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  WHERE r.status = 'published'
    AND a.session_id != ALL(${testSessionIds}::uuid[])
  GROUP BY r.archetype
  ORDER BY n DESC
` as unknown as {archetype:string;n:string}[];
console.log("\nBy archetype:");
byArch.forEach(r => console.log(`  ${r.archetype}: ${r.n}`));

// By instinct
const byInst = await sql`
  SELECT a.parent_pattern, COUNT(*) AS n
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  WHERE r.status = 'published'
    AND a.session_id != ALL(${testSessionIds}::uuid[])
  GROUP BY a.parent_pattern
  ORDER BY n DESC
` as unknown as {parent_pattern:string;n:string}[];
console.log("\nBy instinct:");
byInst.forEach(r => console.log(`  ${r.parent_pattern}: ${r.n}`));

// By age band
const byAge = await sql`
  SELECT a.age_band, COUNT(*) AS n
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  WHERE r.status = 'published'
    AND a.session_id != ALL(${testSessionIds}::uuid[])
  GROUP BY a.age_band
  ORDER BY a.age_band
` as unknown as {age_band:string;n:string}[];
console.log("\nBy age band:");
byAge.forEach(r => console.log(`  ${r.age_band}: ${r.n}`));

// ── 12: Repeat assessments ────────────────────────────────────────────────────
console.log("\n=== 12: REPEAT ASSESSMENTS ===\n");

// Same child name + same parent email → likely same family
// Since phone and email are optional, use child_name + parent_details to detect repeats
const repeats = await sql`
  SELECT
    a.child_name,
    a.email,
    COUNT(*) AS assessment_count,
    MIN(a.created_at) AS first,
    MAX(a.created_at) AS last,
    EXTRACT(EPOCH FROM (MAX(a.created_at) - MIN(a.created_at)))/86400 AS days_gap,
    array_agg(r.archetype ORDER BY a.created_at) AS archetypes,
    array_agg(a.session_id::text ORDER BY a.created_at) AS session_ids
  FROM assessments a
  JOIN reports r ON r.assessment_id = a.id
  WHERE r.status = 'published'
    AND a.session_id != ALL(${testSessionIds}::uuid[])
    AND a.email IS NOT NULL
    AND a.email != ''
  GROUP BY a.child_name, a.email
  HAVING COUNT(*) > 1
  ORDER BY COUNT(*) DESC
` as unknown as {
  child_name:string;
  email:string;
  assessment_count:string;
  first:string;
  last:string;
  days_gap:number;
  archetypes:string[];
  session_ids:string[];
}[];

console.log(`Repeats by (child_name, email): ${repeats.length}`);
repeats.forEach(r => {
  console.log(`  child=${r.child_name} email=${r.email.substring(0,20)}... count=${r.assessment_count} gap=${Math.round(r.days_gap)}d`);
  console.log(`    archetypes=${JSON.stringify(r.archetypes)}`);
  console.log(`    sessions=${r.session_ids.map(s=>s.substring(0,8)).join(', ')}`);
});

// Also check phone-based repeats (phone may be set post-assessment)
const phoneRepeats = await sql`
  SELECT
    a.child_name,
    a.phone,
    COUNT(*) AS n,
    MIN(a.created_at) AS first,
    MAX(a.created_at) AS last,
    EXTRACT(EPOCH FROM (MAX(a.created_at) - MIN(a.created_at)))/86400 AS days_gap,
    array_agg(r.archetype ORDER BY a.created_at) AS archetypes,
    array_agg(a.session_id::text ORDER BY a.created_at) AS session_ids
  FROM assessments a
  JOIN reports r ON r.assessment_id = a.id
  WHERE r.status = 'published'
    AND a.session_id != ALL(${testSessionIds}::uuid[])
    AND a.phone IS NOT NULL
    AND a.phone != ''
  GROUP BY a.child_name, a.phone
  HAVING COUNT(*) > 1
  ORDER BY n DESC
` as unknown as {
  child_name:string;
  phone:string;
  n:string;
  first:string;
  last:string;
  days_gap:number;
  archetypes:string[];
  session_ids:string[];
}[];

console.log(`\nRepeats by (child_name, phone): ${phoneRepeats.length}`);
phoneRepeats.forEach(r => {
  console.log(`  child=${r.child_name} phone=...${r.phone.slice(-4)} count=${r.n} gap=${Math.round(r.days_gap)}d archetypes=${JSON.stringify(r.archetypes)}`);
});

console.log("\nDone.");
