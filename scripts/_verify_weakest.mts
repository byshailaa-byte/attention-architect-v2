import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

// Find sessions WITH weakest_two populated, different archetypes + instincts
const rows = await sql`
  SELECT
    a.session_id,
    r.archetype,
    r.parent_instinct,
    a.weakest_two,
    m_fit.value->>'moment_id' AS fit_moment_id,
    m_fit.value->>'content' AS fit_content,
    a.dimensions
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  LEFT JOIN LATERAL (
    SELECT value FROM jsonb_array_elements(r.narrative_moments)
    WHERE value->>'moment_id' IN ('m_03','m_instinct_interaction_fallback')
    LIMIT 1
  ) AS m_fit(value) ON true
  WHERE r.status = 'published'
    AND a.weakest_two IS NOT NULL
    AND array_length(a.weakest_two, 1) > 0
  ORDER BY r.created_at DESC
  LIMIT 20
`;

for (const row of rows) {
  const wt = row.weakest_two as string[];
  const path = row.fit_moment_id === 'm_03' ? 'loop' : 'fallback';
  console.log(`${(row.session_id as string).slice(0,8)} | ${row.archetype} × ${row.parent_instinct} | weakest=[${wt.join(",")}] | ${path}`);
}
