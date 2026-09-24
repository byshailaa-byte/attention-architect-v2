import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

const loop = await sql`
  SELECT a.session_id, r.archetype, r.parent_instinct
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  JOIN LATERAL jsonb_array_elements(r.narrative_moments) AS m(value) ON true
  WHERE m.value->>'moment_id' = 'm_03' AND r.status = 'published'
  ORDER BY r.created_at DESC LIMIT 1
`;
const fallback = await sql`
  SELECT a.session_id, r.archetype, r.parent_instinct
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  JOIN LATERAL jsonb_array_elements(r.narrative_moments) AS m(value) ON true
  WHERE m.value->>'moment_id' = 'm_instinct_interaction_fallback' AND r.status = 'published'
  ORDER BY r.created_at DESC LIMIT 1
`;
console.log("LOOP:", JSON.stringify(loop[0]));
console.log("FALLBACK:", JSON.stringify(fallback[0]));
