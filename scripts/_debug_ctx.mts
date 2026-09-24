import { neon } from "@neondatabase/serverless";
const sql = neon("postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require");
const userId = "66cbb0d0-5082-43bb-b743-51016b80bf1b";

// Exact query from getLmsUserContext
const rows = await sql`
  SELECT a.id, a.child_name, a.child_gender, a.age_band, a.archetype, a.parent_pattern, a.weakest_two
  FROM assessments a
  JOIN purchases p ON p.assessment_id = a.id
  WHERE p.user_id = ${userId} AND p.status = 'paid'
  ORDER BY p.created_at DESC LIMIT 1
` as unknown as { id: string; child_name: string; archetype: string }[];
console.log("getLmsUserContext query result:", JSON.stringify(rows));

// Also check purchases directly
const pRows = await sql`
  SELECT id, user_id, assessment_id, status FROM purchases WHERE user_id = ${userId} LIMIT 5
` as unknown as { id: string; user_id: string; assessment_id: string; status: string }[];
console.log("Purchases:", JSON.stringify(pRows));
