import { neon } from "@neondatabase/serverless";
const PROD = "postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(PROD);

const IS_INTERNAL = `(a.phone LIKE '%0676'
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
)`;

// ── COMPLETION RATE: assessment_started → assessment_complete ─────────────────
console.log("\n=== B2: COMPLETION RATE via funnel_events ===\n");

// Show event pairing counts
const pairedAll = await sql`
  SELECT
    COUNT(DISTINCT fe_s.session_id) AS started,
    COUNT(DISTINCT fe_c.session_id) AS completed,
    COUNT(DISTINCT fe_s.session_id) - COUNT(DISTINCT fe_c.session_id) AS dropped
  FROM funnel_events fe_s
  LEFT JOIN funnel_events fe_c
    ON fe_c.session_id = fe_s.session_id
    AND fe_c.event_type = 'assessment_complete'
    AND fe_c.created_at <= fe_s.created_at + INTERVAL '30 days'
  WHERE fe_s.event_type = 'assessment_started'
` as unknown as {started:string;completed:string;dropped:string}[];

const pairedExcl = await sql`
  SELECT
    COUNT(DISTINCT fe_s.session_id) AS started,
    COUNT(DISTINCT fe_c.session_id) AS completed,
    COUNT(DISTINCT fe_s.session_id) - COUNT(DISTINCT fe_c.session_id) AS dropped
  FROM funnel_events fe_s
  LEFT JOIN funnel_events fe_c
    ON fe_c.session_id = fe_s.session_id
    AND fe_c.event_type = 'assessment_complete'
    AND fe_c.created_at <= fe_s.created_at + INTERVAL '30 days'
  LEFT JOIN assessments a ON a.session_id = fe_s.session_id
  WHERE fe_s.event_type = 'assessment_started'
    AND NOT (${sql.unsafe(IS_INTERNAL)})
` as unknown as {started:string;completed:string;dropped:string}[];

const pAll = pairedAll[0];
const pExcl = pairedExcl[0];
const rateAll = pAll ? (100 * Number(pAll.completed) / Number(pAll.started)).toFixed(1) : 'n/a';
const rateExcl = pExcl ? (100 * Number(pExcl.completed) / Number(pExcl.started)).toFixed(1) : 'n/a';

console.log(`ALL:           started=${pAll?.started}  completed=${pAll?.completed}  dropped=${pAll?.dropped}  rate=${rateAll}%`);
console.log(`EXCL_INTERNAL: started=${pExcl?.started}  completed=${pExcl?.completed}  dropped=${pExcl?.dropped}  rate=${rateExcl}%`);

// Also check assessment_started count vs assessment_complete — these may differ from assessments table
const eventTotals = await sql`
  SELECT event_type, COUNT(DISTINCT session_id) AS unique_sessions, COUNT(*) AS events
  FROM funnel_events
  WHERE event_type IN ('assessment_started', 'assessment_complete')
  GROUP BY event_type
` as unknown as {event_type:string;unique_sessions:string;events:string}[];
console.log("\nfunnel_events counts:");
eventTotals.forEach(r => console.log(`  ${r.event_type}: unique_sessions=${r.unique_sessions}  events=${r.events}`));

// Check: how many assessment_complete sessions have no assessment_started event?
const completeNoStart = await sql`
  SELECT COUNT(DISTINCT fe_c.session_id) AS n
  FROM funnel_events fe_c
  WHERE fe_c.event_type = 'assessment_complete'
    AND NOT EXISTS (
      SELECT 1 FROM funnel_events fe_s
      WHERE fe_s.session_id = fe_c.session_id
        AND fe_s.event_type = 'assessment_started'
    )
` as unknown as {n:string}[];
console.log(`\nassessment_complete with no assessment_started: ${completeNoStart[0].n}`);

// Breakdown: started sessions without completion
const startedInternalExcl = await sql`
  SELECT
    COUNT(DISTINCT fe_s.session_id) AS started,
    COUNT(DISTINCT fe_c.session_id) AS completed
  FROM funnel_events fe_s
  LEFT JOIN assessments a ON a.session_id = fe_s.session_id
  LEFT JOIN funnel_events fe_c
    ON fe_c.session_id = fe_s.session_id
    AND fe_c.event_type = 'assessment_complete'
  WHERE fe_s.event_type = 'assessment_started'
    AND (${sql.unsafe(IS_INTERNAL)})
` as unknown as {started:string;completed:string}[];
console.log(`\nInternal sessions: started=${startedInternalExcl[0].started}  completed=${startedInternalExcl[0].completed}`);

// ── B7: SESSION DURATION from assessment_started → assessment_complete ────────
console.log("\n=== B7: SESSION DURATION ===\n");

const durationAll = await sql`
  WITH paired AS (
    SELECT
      fe_s.session_id,
      MIN(fe_s.created_at) AS t_start,
      MIN(fe_c.created_at) AS t_end,
      EXTRACT(EPOCH FROM (MIN(fe_c.created_at) - MIN(fe_s.created_at))) AS duration_s
    FROM funnel_events fe_s
    JOIN funnel_events fe_c
      ON fe_c.session_id = fe_s.session_id
      AND fe_c.event_type = 'assessment_complete'
    WHERE fe_s.event_type = 'assessment_started'
      AND fe_c.created_at > fe_s.created_at
      AND fe_c.created_at <= fe_s.created_at + INTERVAL '2 hours'
    GROUP BY fe_s.session_id
  )
  SELECT
    COUNT(*) AS n,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_s)) AS median_s,
    ROUND(AVG(duration_s)) AS mean_s,
    ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY duration_s)) AS p25_s,
    ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY duration_s)) AS p75_s,
    ROUND(MIN(duration_s)) AS min_s,
    ROUND(MAX(duration_s)) AS max_s
  FROM paired
` as unknown as {n:string;median_s:string;mean_s:string;p25_s:string;p75_s:string;min_s:string;max_s:string}[];

const durationExcl = await sql`
  WITH paired AS (
    SELECT
      fe_s.session_id,
      MIN(fe_s.created_at) AS t_start,
      MIN(fe_c.created_at) AS t_end,
      EXTRACT(EPOCH FROM (MIN(fe_c.created_at) - MIN(fe_s.created_at))) AS duration_s
    FROM funnel_events fe_s
    JOIN funnel_events fe_c
      ON fe_c.session_id = fe_s.session_id
      AND fe_c.event_type = 'assessment_complete'
    LEFT JOIN assessments a ON a.session_id = fe_s.session_id
    WHERE fe_s.event_type = 'assessment_started'
      AND fe_c.created_at > fe_s.created_at
      AND fe_c.created_at <= fe_s.created_at + INTERVAL '2 hours'
      AND NOT (${sql.unsafe(IS_INTERNAL)})
    GROUP BY fe_s.session_id
  )
  SELECT
    COUNT(*) AS n,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_s)) AS median_s,
    ROUND(AVG(duration_s)) AS mean_s,
    ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY duration_s)) AS p25_s,
    ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY duration_s)) AS p75_s,
    ROUND(MIN(duration_s)) AS min_s,
    ROUND(MAX(duration_s)) AS max_s
  FROM paired
` as unknown as {n:string;median_s:string;mean_s:string;p25_s:string;p75_s:string;min_s:string;max_s:string}[];

const dAll = durationAll[0];
const dExcl = durationExcl[0];
console.log(`ALL:           n=${dAll.n}  median=${dAll.median_s}s  mean=${dAll.mean_s}s  p25=${dAll.p25_s}s  p75=${dAll.p75_s}s  min=${dAll.min_s}s  max=${dAll.max_s}s`);
console.log(`EXCL_INTERNAL: n=${dExcl.n}  median=${dExcl.median_s}s  mean=${dExcl.mean_s}s  p25=${dExcl.p25_s}s  p75=${dExcl.p75_s}s  min=${dExcl.min_s}s  max=${dExcl.max_s}s`);

// Show distribution of internal vs non-internal duration to understand skew
const durationInternalOnly = await sql`
  WITH paired AS (
    SELECT
      fe_s.session_id,
      EXTRACT(EPOCH FROM (MIN(fe_c.created_at) - MIN(fe_s.created_at))) AS duration_s
    FROM funnel_events fe_s
    JOIN funnel_events fe_c
      ON fe_c.session_id = fe_s.session_id
      AND fe_c.event_type = 'assessment_complete'
    LEFT JOIN assessments a ON a.session_id = fe_s.session_id
    WHERE fe_s.event_type = 'assessment_started'
      AND fe_c.created_at > fe_s.created_at
      AND fe_c.created_at <= fe_s.created_at + INTERVAL '2 hours'
      AND (${sql.unsafe(IS_INTERNAL)})
    GROUP BY fe_s.session_id
  )
  SELECT
    COUNT(*) AS n,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_s)) AS median_s,
    ROUND(AVG(duration_s)) AS mean_s
  FROM paired
` as unknown as {n:string;median_s:string;mean_s:string}[];

const dInt = durationInternalOnly[0];
console.log(`INTERNAL_ONLY: n=${dInt.n}  median=${dInt.median_s}s  mean=${dInt.mean_s}s`);

console.log("\nDone.");
