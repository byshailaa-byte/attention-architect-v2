import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
const rows = await sql`SELECT session_id, child_name, archetype, parent_pattern, parent_name, email FROM assessments ORDER BY created_at DESC LIMIT 6`;
for (const r of rows as any[]) {
  const claimed = r.parent_name && r.email ? 'CLAIMED' : 'GATED';
  console.log(claimed, '|', r.session_id, '|', r.child_name, '|', r.archetype, '|', r.parent_pattern);
}
