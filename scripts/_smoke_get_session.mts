import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_PROD!);
const rows = await sql`
  SELECT a.session_id
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  WHERE r.status = 'published'
    AND r.superseded_by IS NULL
    AND a.is_internal = false
  ORDER BY r.generated_at DESC
  LIMIT 1
` as { session_id: string }[];
console.log(rows[0]?.session_id ?? "none");
process.exit(0);
