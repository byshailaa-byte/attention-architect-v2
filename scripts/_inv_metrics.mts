import { neon } from "@neondatabase/serverless";
const PROD = "postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(PROD);

// Internal set filter (for exclusion)
// Three signals: phone ends 0676, known internal emails, test child names
const INTERNAL_PHONE_SUFFIX = '0676';
const INTERNAL_EMAIL_COND = `
  (a.email IS NOT NULL AND (
    LOWER(a.email) LIKE '%shashank033%'
    OR LOWER(a.email) LIKE '%byshailaa%'
    OR LOWER(a.email) LIKE '%pgp09shashanka%'
    OR LOWER(a.email) LIKE '%@test.com%'
    OR LOWER(a.email) LIKE '%@example.com%'
    OR a.email LIKE '%+%'
  ))
`;
const INTERNAL_CHILD_COND = `
  (LOWER(COALESCE(a.child_name,'')) LIKE ANY(ARRAY['%test%','%smoke%','%verify%'])
   OR a.child_name IN ('SmokeKid','ProdTest','VerifyChild','AryanTest'))
`;
const IS_INTERNAL = `(a.phone LIKE '%0676' OR ${INTERNAL_EMAIL_COND} OR ${INTERNAL_CHILD_COND})`;

// ── B2: COMPLETION RATE — 30-day session-paired ───────────────────────────────
console.log("\n=== B2: COMPLETION RATE — 30-day session-paired ===\n");
console.log("Definition: started = session in assessment_sessions (or assessments?) where a report was generated within 30 days.\n");

// First understand what assessment_sessions contains
const asCols = await sql`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'assessment_sessions'
  ORDER BY ordinal_position
` as unknown as {column_name:string;data_type:string}[];
console.log("assessment_sessions columns:", asCols.map(c=>`${c.column_name}:${c.data_type}`).join(', '));

const asSample = await sql`
  SELECT * FROM assessment_sessions LIMIT 3
` as unknown as Record<string,unknown>[];
console.log("assessment_sessions sample rows:");
asSample.forEach(r => console.log("  ", JSON.stringify(r)));

const asTotal = await sql`SELECT COUNT(*) AS n FROM assessment_sessions` as unknown as {n:string}[];
console.log(`\nassessment_sessions total rows: ${asTotal[0].n}`);

// The current reported baseline is 91/182 = 50%.
// Try to reconstruct: started = assessments created in last 30 days; completed = got published report
// Or: started = all assessments; completed = those with a published report.

// Actually, let's check how funnel_events tracks starts vs completions
const feCols = await sql`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'funnel_events'
  ORDER BY ordinal_position
` as unknown as {column_name:string;data_type:string}[];
console.log("\nfunnel_events columns:", feCols.map(c=>`${c.column_name}:${c.data_type}`).join(', '));

const feTypes = await sql`
  SELECT event_type, COUNT(*) AS n
  FROM funnel_events
  GROUP BY event_type
  ORDER BY n DESC
` as unknown as {event_type:string;n:string}[];
console.log("\nfunnel_events event_type distribution:");
feTypes.forEach(r => console.log(`  ${r.event_type}: ${r.n}`));

// Try to find the current completion rate computation
// The 91/182 = 50% baseline — let's see if there's a session_start event paired with assessment_complete
const completionBothWays = await sql`
  SELECT
    'all_sessions' AS scope,
    COUNT(DISTINCT fe_start.session_id) AS started,
    COUNT(DISTINCT fe_complete.session_id) AS completed,
    ROUND(100.0 * COUNT(DISTINCT fe_complete.session_id) / NULLIF(COUNT(DISTINCT fe_start.session_id),0),1) AS pct
  FROM funnel_events fe_start
  LEFT JOIN funnel_events fe_complete
    ON fe_complete.session_id = fe_start.session_id
    AND fe_complete.event_type = 'assessment_complete'
    AND fe_complete.created_at <= fe_start.created_at + INTERVAL '30 days'
  WHERE fe_start.event_type = 'session_start'
  UNION ALL
  SELECT
    'excl_internal' AS scope,
    COUNT(DISTINCT fe_start.session_id) AS started,
    COUNT(DISTINCT fe_complete.session_id) AS completed,
    ROUND(100.0 * COUNT(DISTINCT fe_complete.session_id) / NULLIF(COUNT(DISTINCT fe_start.session_id),0),1) AS pct
  FROM funnel_events fe_start
  JOIN assessments a ON a.session_id = fe_start.session_id
  LEFT JOIN funnel_events fe_complete
    ON fe_complete.session_id = fe_start.session_id
    AND fe_complete.event_type = 'assessment_complete'
    AND fe_complete.created_at <= fe_start.created_at + INTERVAL '30 days'
  WHERE fe_start.event_type = 'session_start'
    AND NOT (${sql.unsafe(IS_INTERNAL)})
` as unknown as {scope:string;started:string;completed:string;pct:string}[];

console.log("\nCompletion rate (session_start → assessment_complete, 30-day window):");
completionBothWays.forEach(r => console.log(`  ${r.scope}: ${r.completed}/${r.started} = ${r.pct}%`));

// Also try with just assessments (no funnel_events dependency)
const completionAlt = await sql`
  SELECT
    'all' AS scope,
    COUNT(DISTINCT a.session_id) AS assessments_created,
    COUNT(DISTINCT r.assessment_id) FILTER (WHERE r.status = 'published') AS got_published,
    ROUND(100.0 * COUNT(DISTINCT r.assessment_id) FILTER (WHERE r.status = 'published') / NULLIF(COUNT(DISTINCT a.session_id),0),1) AS pct
  FROM assessments a
  LEFT JOIN reports r ON r.assessment_id = a.id AND r.status = 'published'
  UNION ALL
  SELECT
    'excl_internal' AS scope,
    COUNT(DISTINCT a.session_id) AS assessments_created,
    COUNT(DISTINCT r.assessment_id) FILTER (WHERE r.status = 'published') AS got_published,
    ROUND(100.0 * COUNT(DISTINCT r.assessment_id) FILTER (WHERE r.status = 'published') / NULLIF(COUNT(DISTINCT a.session_id),0),1) AS pct
  FROM assessments a
  LEFT JOIN reports r ON r.assessment_id = a.id AND r.status = 'published'
  WHERE NOT (${sql.unsafe(IS_INTERNAL)})
` as unknown as {scope:string;assessments_created:string;got_published:string;pct:string}[];

console.log("\nCompletion rate (assessments_created → published report):");
completionAlt.forEach(r => console.log(`  ${r.scope}: ${r.got_published}/${r.assessments_created} = ${r.pct}%`));

// ── B3–B6: DISTRIBUTIONS BOTH WAYS ───────────────────────────────────────────
console.log("\n=== B3–B6: DISTRIBUTIONS ===\n");

const distros = await sql`
  SELECT
    r.archetype,
    r.parent_instinct,
    a.age_band,
    COUNT(*) FILTER (WHERE TRUE) AS all_n,
    COUNT(*) FILTER (WHERE NOT (${sql.unsafe(IS_INTERNAL)})) AS excl_internal_n
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  WHERE r.status = 'published'
  GROUP BY r.archetype, r.parent_instinct, a.age_band
  ORDER BY r.archetype, r.parent_instinct, a.age_band
` as unknown as {archetype:string;parent_instinct:string;age_band:string;all_n:string;excl_internal_n:string}[];

// Aggregate for each dimension
const archetypeAll: Record<string,number> = {};
const archetypeExcl: Record<string,number> = {};
const instinctAll: Record<string,number> = {};
const instinctExcl: Record<string,number> = {};
const ageAll: Record<string,number> = {};
const ageExcl: Record<string,number> = {};
let totalAll = 0, totalExcl = 0;

for (const r of distros) {
  archetypeAll[r.archetype] = (archetypeAll[r.archetype]||0) + Number(r.all_n);
  archetypeExcl[r.archetype] = (archetypeExcl[r.archetype]||0) + Number(r.excl_internal_n);
  instinctAll[r.parent_instinct] = (instinctAll[r.parent_instinct]||0) + Number(r.all_n);
  instinctExcl[r.parent_instinct] = (instinctExcl[r.parent_instinct]||0) + Number(r.excl_internal_n);
  ageAll[r.age_band] = (ageAll[r.age_band]||0) + Number(r.all_n);
  ageExcl[r.age_band] = (ageExcl[r.age_band]||0) + Number(r.excl_internal_n);
  totalAll += Number(r.all_n);
  totalExcl += Number(r.excl_internal_n);
}

console.log(`B6: Total published reports — ALL: ${totalAll}  EXCL_INTERNAL: ${totalExcl}  (internal contribution: ${totalAll - totalExcl})`);

console.log("\nB3: Archetype distribution:");
for (const [arch, n] of Object.entries(archetypeAll).sort((a,b) => b[1]-a[1])) {
  console.log(`  ${arch}: all=${n}  excl=${archetypeExcl[arch]??0}  diff=${n-(archetypeExcl[arch]??0)}`);
}

console.log("\nB4: Parent instinct distribution:");
for (const [inst, n] of Object.entries(instinctAll).sort((a,b) => b[1]-a[1])) {
  console.log(`  ${inst}: all=${n}  excl=${instinctExcl[inst]??0}  diff=${n-(instinctExcl[inst]??0)}`);
}

console.log("\nB5: Age band distribution:");
for (const [band, n] of Object.entries(ageAll).sort()) {
  console.log(`  ${band}: all=${n}  excl=${ageExcl[band]??0}  diff=${n-(ageExcl[band]??0)}`);
}

// ── B7: SESSION DURATION ──────────────────────────────────────────────────────
console.log("\n=== B7: SESSION DURATION ===\n");

// Check what duration data exists
const durationCols = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'funnel_events'
  ORDER BY ordinal_position
` as unknown as {column_name:string}[];
console.log("funnel_events columns:", durationCols.map(c=>c.column_name).join(', '));

// Check if duration stored in funnel_events
const feSample2 = await sql`
  SELECT * FROM funnel_events ORDER BY created_at DESC LIMIT 3
` as unknown as Record<string,unknown>[];
console.log("\nfunnel_events sample:");
feSample2.forEach(r => console.log("  ", JSON.stringify(r)));

// Try duration from assessment_complete event (may have duration_ms or similar)
const durationCheck = await sql`
  SELECT
    event_type,
    jsonb_object_keys(CASE WHEN jsonb_typeof(metadata) = 'object' THEN metadata ELSE '{}'::jsonb END) AS key
  FROM funnel_events
  WHERE metadata IS NOT NULL AND jsonb_typeof(metadata) = 'object'
  GROUP BY event_type, key
  ORDER BY event_type, key
  LIMIT 40
` as unknown as {event_type:string;key:string}[];
console.log("\nfunnel_events metadata keys by event_type:");
durationCheck.forEach(r => console.log(`  ${r.event_type}: ${r.key}`));

// Compute duration from session_start to assessment_complete timestamps
const durationBothWays = await sql`
  WITH paired AS (
    SELECT
      fe_s.session_id,
      EXTRACT(EPOCH FROM (fe_c.created_at - fe_s.created_at)) AS duration_s
    FROM funnel_events fe_s
    JOIN funnel_events fe_c
      ON fe_c.session_id = fe_s.session_id
      AND fe_c.event_type = 'assessment_complete'
    WHERE fe_s.event_type = 'session_start'
      AND fe_c.created_at > fe_s.created_at
      AND fe_c.created_at <= fe_s.created_at + INTERVAL '2 hours'  -- cap outliers
  )
  SELECT
    'all' AS scope,
    COUNT(*) AS n,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_s)) AS median_s,
    ROUND(AVG(duration_s)) AS mean_s,
    ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY duration_s)) AS p25_s,
    ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY duration_s)) AS p75_s,
    ROUND(MIN(duration_s)) AS min_s,
    ROUND(MAX(duration_s)) AS max_s
  FROM paired
  UNION ALL
  SELECT
    'excl_internal' AS scope,
    COUNT(*) AS n,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_s)) AS median_s,
    ROUND(AVG(duration_s)) AS mean_s,
    ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY duration_s)) AS p25_s,
    ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY duration_s)) AS p75_s,
    ROUND(MIN(duration_s)) AS min_s,
    ROUND(MAX(duration_s)) AS max_s
  FROM paired p
  JOIN assessments a ON a.session_id = p.session_id
  WHERE NOT (${sql.unsafe(IS_INTERNAL)})
` as unknown as {scope:string;n:string;median_s:string;mean_s:string;p25_s:string;p75_s:string;min_s:string;max_s:string}[];

console.log("\nSession duration (session_start → assessment_complete, capped at 2h):");
durationBothWays.forEach(r => {
  console.log(`  ${r.scope}: n=${r.n}  median=${r.median_s}s  mean=${r.mean_s}s  p25=${r.p25_s}s  p75=${r.p75_s}s  min=${r.min_s}s  max=${r.max_s}s`);
});

// Also check if duration stored in metadata
const durationFromMeta = await sql`
  SELECT
    'all' AS scope,
    COUNT(*) AS n,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (metadata->>'duration_ms')::float / 1000)) AS median_s,
    ROUND(AVG((metadata->>'duration_ms')::float / 1000)) AS mean_s
  FROM funnel_events
  WHERE event_type = 'assessment_complete'
    AND metadata->>'duration_ms' IS NOT NULL
  UNION ALL
  SELECT
    'excl_internal' AS scope,
    COUNT(*) AS n,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (fe.metadata->>'duration_ms')::float / 1000)) AS median_s,
    ROUND(AVG((fe.metadata->>'duration_ms')::float / 1000)) AS mean_s
  FROM funnel_events fe
  JOIN assessments a ON a.session_id = fe.session_id
  WHERE fe.event_type = 'assessment_complete'
    AND fe.metadata->>'duration_ms' IS NOT NULL
    AND NOT (${sql.unsafe(IS_INTERNAL)})
` as unknown as {scope:string;n:string;median_s:string;mean_s:string}[];

if (durationFromMeta[0]?.n && durationFromMeta[0].n !== '0') {
  console.log("\nSession duration from metadata.duration_ms:");
  durationFromMeta.forEach(r => console.log(`  ${r.scope}: n=${r.n}  median=${r.median_s}s  mean=${r.mean_s}s`));
} else {
  console.log("\nduration_ms not in metadata (or no rows matched).");
}

console.log("\nDone with B.");
