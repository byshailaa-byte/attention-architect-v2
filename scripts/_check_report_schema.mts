import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_PROD!);
const cols = await sql`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'reports'
  ORDER BY ordinal_position
` as { column_name: string; data_type: string }[];
cols.forEach(c => console.log(`${c.column_name}  (${c.data_type})`));
process.exit(0);
