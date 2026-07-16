import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
const rows = await sql`SELECT session_id, concerns FROM assessments WHERE session_id = '575cf34f-7095-44f2-b7e4-ad05b039db31'`;
for (const r of rows as any[]) console.log('concerns:', JSON.stringify(r.concerns));
