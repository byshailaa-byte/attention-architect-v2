import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

// Check columns in reports table
const repCols = await sql`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'reports'
  ORDER BY ordinal_position
`;
console.log("reports columns:", repCols.map(r => `${r.column_name}:${r.data_type}`).join(", "));

// Check columns in assessments table
const assCols = await sql`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'assessments'
  ORDER BY ordinal_position
`;
console.log("assessments columns:", assCols.map(r => `${r.column_name}:${r.data_type}`).join(", "));

// Check what moment_ids exist
const ids = await sql`
  SELECT DISTINCT m.value->>'moment_id' AS moment_id, count(*) as cnt
  FROM reports r
  CROSS JOIN LATERAL jsonb_array_elements(r.narrative_moments) AS m(value)
  WHERE r.status = 'promoted'
  GROUP BY 1
  ORDER BY cnt DESC
  LIMIT 20
`;
console.log("moment_ids:", JSON.stringify(ids, null, 2));
