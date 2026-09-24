import { neon } from "@neondatabase/serverless";
const PROD = "postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(PROD);
const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'reports' ORDER BY ordinal_position` as unknown as {column_name:string}[];
console.log("reports:", cols.map(c=>c.column_name).join(', '));
const acols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'assessments' ORDER BY ordinal_position` as unknown as {column_name:string}[];
console.log("assessments:", acols.map(c=>c.column_name).join(', '));
