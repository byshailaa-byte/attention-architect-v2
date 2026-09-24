import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
const r = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='reports' ORDER BY ordinal_position`;
console.log(r.map((x: Record<string,unknown>) => x.column_name).join(", "));
