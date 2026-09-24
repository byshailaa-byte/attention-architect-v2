import { neon } from "@neondatabase/serverless";
const sql = neon("postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require");
// Neel Nitin: archetype The Glue, furthest progress
const rows = await sql`
  SELECT DISTINCT u.id, u.email, a.child_name, a.archetype, lp.week, COUNT(lp.day) as days
  FROM users u
  JOIN purchases p ON p.user_id = u.id AND p.status = 'paid'
  JOIN assessments a ON a.id = p.assessment_id
  JOIN lms_progress lp ON lp.user_id = u.id
  WHERE a.archetype ILIKE '%glue%'
  GROUP BY u.id, u.email, a.child_name, a.archetype, lp.week
  ORDER BY u.id, lp.week
` as unknown as { id: string; email: string; child_name: string; archetype: string; week: number; days: number }[];
console.log(JSON.stringify(rows, null, 2));
