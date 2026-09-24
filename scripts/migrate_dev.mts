import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS whatsapp_send_attempts INT NOT NULL DEFAULT 0`;
await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_32_wa_send_attempts') ON CONFLICT DO NOTHING`;
console.log("Dev DB: Phase 32 applied.");

// Also check for whatsapp_send_claimed_at and whatsapp_report_sent_at
const cols = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'assessments'
    AND column_name LIKE 'whatsapp%'
` as unknown as { column_name: string }[];
console.log("WhatsApp columns:", cols.map(c => c.column_name));
