import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
const rows = await sql`
  SELECT constraint_name, check_clause
  FROM information_schema.check_constraints
  WHERE constraint_schema = 'public'
    AND constraint_name LIKE '%age_band%'
` as { constraint_name: string; check_clause: string }[];
for (const r of rows) console.log(r.constraint_name, "\n", r.check_clause, "\n");
