import { neon } from "@neondatabase/serverless";
const dev = neon("postgresql://neondb_owner:npg_thoI2TR9gHFj@ep-wild-paper-aqlx0vrm.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require");
const rows = await dev`
  SELECT column_name, data_type, column_default, is_nullable
  FROM information_schema.columns WHERE table_name = 'purchases' ORDER BY ordinal_position
` as unknown as { column_name: string; data_type: string; column_default: string | null; is_nullable: string }[];
rows.forEach(r => console.log(`${r.column_name} ${r.data_type} default=${r.column_default} null=${r.is_nullable}`));
