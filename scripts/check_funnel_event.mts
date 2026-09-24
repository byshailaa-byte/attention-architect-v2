import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

const rows = await sql`
  SELECT event_type, session_id::text, metadata, created_at
  FROM funnel_events
  WHERE session_id = 'c7b99c53-1178-4161-8efe-c23bcd886a66'::uuid
    AND event_type = 'simplified_report_view'
  ORDER BY created_at DESC
  LIMIT 3
` as unknown as any[];
console.log(JSON.stringify(rows, null, 2));
