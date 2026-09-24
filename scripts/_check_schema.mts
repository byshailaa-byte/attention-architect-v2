import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
const rows = await sql`
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'assessments'
  ORDER BY ordinal_position
` as { column_name: string; data_type: string; is_nullable: string }[];
for (const r of rows) {
  console.log(`${r.column_name.padEnd(35)} ${r.data_type.padEnd(25)} ${r.is_nullable}`);
}
