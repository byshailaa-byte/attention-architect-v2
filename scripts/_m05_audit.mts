import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

// Q1: published non-internal sessions — how many lack D3.2 AND D3.confirm in answers
console.log(`Q1 SQL:
  SELECT COUNT(*) AS total_published,
    COUNT(*) FILTER (WHERE NOT (a.answers ? 'D3.2') AND NOT (a.answers ? 'D3.confirm')) AS missing_both,
    COUNT(*) FILTER (WHERE a.answers ? 'D3.2') AS has_d32,
    COUNT(*) FILTER (WHERE a.answers ? 'D3.confirm') AS has_d3confirm
  FROM assessments a JOIN reports r ON r.assessment_id = a.id
  WHERE r.status = 'published' AND r.superseded_by IS NULL
    AND (a.email IS NULL OR a.email NOT LIKE '%internal%')
`);

const q1 = await sql`
  SELECT
    COUNT(*)                                                                          AS total_published,
    COUNT(*) FILTER (WHERE NOT (a.answers ? 'D3.2') AND NOT (a.answers ? 'D3.confirm')) AS missing_both,
    COUNT(*) FILTER (WHERE a.answers ? 'D3.2')                                        AS has_d32,
    COUNT(*) FILTER (WHERE a.answers ? 'D3.confirm')                                  AS has_d3confirm
  FROM assessments a
  JOIN reports r ON r.assessment_id = a.id
  WHERE r.status = 'published'
    AND r.superseded_by IS NULL
    AND (a.email IS NULL OR a.email NOT LIKE '%internal%')
`;
console.log("Q1 result:", JSON.stringify(q1[0], null, 2));

const missingBoth = Number((q1[0] as Record<string, unknown>).missing_both ?? 0);
console.log(`\nmissing_both = ${missingBoth}`);

// Q2: of sessions missing both, does m_05 have empty refs?
if (missingBoth > 0) {
  console.log(`\nQ2 SQL:
  SELECT a.session_id, m05 refs
  FROM assessments a JOIN reports r ... WHERE missing both D3.2 and D3.confirm
  LATERAL jsonb_array_elements on narrative_moments WHERE moment_id = 'm_05'
  `);
  const q2 = await sql`
    SELECT
      a.session_id::text,
      m05.moment_id,
      jsonb_array_length(m05.human_decision_refs) AS hdg_ref_count,
      jsonb_array_length(m05.behaviour_node_refs) AS bg_ref_count,
      m05.human_decision_refs,
      m05.behaviour_node_refs
    FROM assessments a
    JOIN reports r ON r.assessment_id = a.id
    JOIN LATERAL (
      SELECT
        elem->>'moment_id'           AS moment_id,
        COALESCE(elem->'human_decision_refs', '[]'::jsonb) AS human_decision_refs,
        COALESCE(elem->'behaviour_node_refs', '[]'::jsonb) AS behaviour_node_refs
      FROM jsonb_array_elements(r.narrative_moments) AS elem
      WHERE elem->>'moment_id' = 'm_05'
      LIMIT 1
    ) m05 ON TRUE
    WHERE r.status = 'published'
      AND r.superseded_by IS NULL
      AND NOT (a.answers ? 'D3.2')
      AND NOT (a.answers ? 'D3.confirm')
      AND (a.email IS NULL OR a.email NOT LIKE '%internal%')
  `;
  console.log(`Q2 rows (${q2.length}):`);
  for (const row of q2 as Record<string, unknown>[]) {
    console.log(JSON.stringify(row));
  }
} else {
  console.log("\nQ2: skipped — zero sessions missing both D3.2 and D3.confirm");
}

// Q3: sessions with generation_attempts > 1 among published reports
console.log(`\nQ3 SQL:
  SELECT session_id, generation_attempts, quality_check_results->>'passed', failure_count
  FROM assessments a JOIN reports r WHERE generation_attempts > 1 AND r.superseded_by IS NULL
`);
const q3 = await sql`
  SELECT
    a.session_id::text,
    a.generation_attempts,
    r.status,
    r.quality_check_results->>'passed'                              AS quality_passed,
    jsonb_array_length(
      COALESCE(r.quality_check_results->'failures', '[]'::jsonb)
    )                                                               AS failure_count,
    r.quality_check_results->'failures'                            AS failures
  FROM assessments a
  JOIN reports r ON r.assessment_id = a.id
  WHERE a.generation_attempts > 1
    AND r.superseded_by IS NULL
    AND (a.email IS NULL OR a.email NOT LIKE '%internal%')
  ORDER BY a.generation_attempts DESC
  LIMIT 20
`;
console.log(`Q3 rows (${q3.length}): sessions with generation_attempts > 1`);
for (const row of q3 as Record<string, unknown>[]) {
  console.log(JSON.stringify(row));
}
