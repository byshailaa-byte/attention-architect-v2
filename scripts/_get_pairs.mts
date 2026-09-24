import { neon } from "@neondatabase/serverless";
const sql = neon("postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require");

const rows = await sql`
  SELECT
    assessment_id,
    array_agg(id           ORDER BY generated_at ASC)  AS ids,
    array_agg(generated_at ORDER BY generated_at ASC)  AS generated_ats,
    array_agg(promoted_by  ORDER BY generated_at ASC)  AS promoted_bys
  FROM reports
  WHERE status = 'published'
  GROUP BY assessment_id
  HAVING COUNT(*) > 1
  ORDER BY assessment_id
` as unknown as {
  assessment_id: string;
  ids: string[];
  generated_ats: Date[];
  promoted_bys: (string | null)[];
}[];

console.log(JSON.stringify(rows, null, 2));
