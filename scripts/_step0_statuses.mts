import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

const statuses = await sql`
  SELECT status, count(*) as cnt,
    count(CASE WHEN narrative_moments IS NOT NULL AND jsonb_array_length(narrative_moments) > 0 THEN 1 END) as with_moments
  FROM reports
  GROUP BY status
  ORDER BY cnt DESC
`;
console.log("statuses:", JSON.stringify(statuses, null, 2));

// Also check total rows
const total = await sql`SELECT count(*) FROM reports`;
console.log("total reports:", total[0].count);
