import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

// Get 10 recent published sessions with their archetype/instinct/moment_id
const rows = await sql`
  SELECT
    a.session_id,
    r.archetype,
    r.parent_instinct,
    r.created_at,
    ARRAY_AGG(DISTINCT m.value->>'moment_id') AS moment_ids,
    m2.value->>'content' AS fit_content
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  CROSS JOIN LATERAL jsonb_array_elements(r.narrative_moments) AS m(value)
  LEFT JOIN LATERAL (
    SELECT value FROM jsonb_array_elements(r.narrative_moments)
    WHERE value->>'moment_id' IN ('m_03','m_instinct_interaction_fallback')
    LIMIT 1
  ) AS m2(value) ON true
  WHERE r.status = 'published'
  GROUP BY a.session_id, r.archetype, r.parent_instinct, r.created_at, m2.value
  ORDER BY r.created_at DESC
  LIMIT 20
`;

for (const row of rows) {
  const ids = row.moment_ids as string[];
  const path = ids.includes('m_03') ? 'loop' : 'fallback';
  console.log(`${(row.session_id as string).slice(0,8)} | ${row.archetype} × ${row.parent_instinct} | ${path}`);
}
