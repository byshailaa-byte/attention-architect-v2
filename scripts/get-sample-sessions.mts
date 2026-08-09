import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
const rows = await sql`
  SELECT a.session_id, a.child_name, a.parent_name, r.archetype
  FROM reports r JOIN assessments a ON a.id = r.assessment_id
  WHERE r.status = 'published' AND r.superseded_by IS NULL
    AND r.narrative_moments IS NOT NULL
    AND jsonb_array_length(r.narrative_moments) > 0
  ORDER BY r.promoted_at DESC LIMIT 5
` as unknown as { session_id: string; child_name: string | null; parent_name: string; archetype: string }[];
for (const r of rows) console.log(`${r.session_id} | ${r.child_name ?? "?"} / ${r.parent_name} | ${r.archetype}`);
