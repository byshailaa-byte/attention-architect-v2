import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS worry_followup_other TEXT NULL`;
const rows = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name='assessments' AND column_name='worry_followup_other'
` as { column_name: string }[];
console.log("worry_followup_other column exists:", rows.length > 0);
