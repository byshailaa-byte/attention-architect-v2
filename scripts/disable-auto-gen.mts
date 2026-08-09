import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
const r = await sql`UPDATE app_settings SET value='false', updated_at=now() WHERE key='auto_generate_enabled' RETURNING key,value` as any[];
console.log(r.length ? `SET: ${r[0].key} = ${r[0].value}` : "ERROR: row not found");
