import { config } from 'dotenv';
config({ path: '.env.local' });
const { getSql } = await import('../lib/db/client');
const sql = getSql();
const rows = await sql`SELECT session_id, archetype, child_name FROM assessments WHERE archetype != 'The All-In Kid' ORDER BY created_at DESC LIMIT 10`;
for (const r of rows as {session_id: string; archetype: string; child_name: string}[]) {
  console.log(r.archetype.padEnd(24), r.child_name?.padEnd(12) ?? 'null        ', r.session_id);
}
