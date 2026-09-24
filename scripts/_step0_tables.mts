import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
const r = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;
console.log(r.map((x: Record<string,unknown>) => x.table_name).join(", "));
