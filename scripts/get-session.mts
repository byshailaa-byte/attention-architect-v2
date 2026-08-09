import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
const rows = await sql`
  SELECT a.session_id
  FROM assessments a
  JOIN reports r ON r.assessment_id = a.id
  WHERE r.status = 'published' AND r.superseded_by IS NULL
  ORDER BY r.generated_at DESC
  LIMIT 3
` as unknown as { session_id: string }[];
rows.forEach(r => console.log(r.session_id));
