import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
const rows = await sql`SELECT id, session_id FROM reports WHERE status = 'published' LIMIT 3` as any[];
rows.forEach(r => console.log(JSON.stringify(r)));
