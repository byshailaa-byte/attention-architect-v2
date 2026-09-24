import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

const rows = await sql`
  SELECT pg_get_constraintdef(c.oid) AS def
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'funnel_events'
    AND c.conname = 'funnel_events_event_type_check'
` as unknown as { def: string }[];

console.log(rows[0]?.def ?? "constraint not found");
