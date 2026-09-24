import { neon } from "@neondatabase/serverless";
const PROD = "postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(PROD);

const rows = await sql`
  SELECT a.session_id, a.child_name, a.email
  FROM assessments a
  JOIN reports r ON r.assessment_id = a.id AND r.status = 'published'
  WHERE a.phone NOT LIKE '%0676'
    AND (a.email IS NULL OR (
      LOWER(a.email) NOT LIKE '%shashank033%'
      AND LOWER(a.email) NOT LIKE '%byshailaa%'
      AND LOWER(a.email) NOT LIKE '%pgp09shashanka%'
      AND LOWER(a.email) NOT LIKE '%@test.com%'
      AND LOWER(a.email) NOT LIKE '%@example.com%'
      AND a.email NOT LIKE '%+%'
    ))
    AND LOWER(COALESCE(a.child_name,'')) NOT LIKE ANY(ARRAY['%test%','%smoke%','%verify%','%debug%','%gate%'])
  ORDER BY a.created_at DESC
  LIMIT 1
` as unknown as { session_id: string; child_name: string; email: string }[];

console.log(JSON.stringify(rows[0]));
