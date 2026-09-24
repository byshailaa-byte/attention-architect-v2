import { neon } from "@neondatabase/serverless";
const sql = neon("postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require");
const rows = await sql`
  SELECT COUNT(DISTINCT assessment_id)::int AS blocking_count
  FROM (
    SELECT assessment_id FROM reports
    WHERE superseded_by IS NULL AND status = 'published'
    GROUP BY assessment_id
    HAVING COUNT(*) > 1
  ) sub
` as unknown as { blocking_count: number }[];
console.log(rows[0].blocking_count);
