import { neon } from "@neondatabase/serverless";
const dev = neon("postgresql://neondb_owner:npg_thoI2TR9gHFj@ep-wild-paper-aqlx0vrm.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require");
const rows = await dev`
  SELECT cc.constraint_name, cc.check_clause
  FROM information_schema.check_constraints cc
  JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
  WHERE ccu.table_name = 'purchases'
` as unknown as { constraint_name: string; check_clause: string }[];
rows.forEach(r => console.log(r.check_clause));
