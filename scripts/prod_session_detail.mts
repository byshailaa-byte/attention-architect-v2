import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
const SESSION = "f8f896dc-2211-4648-ad36-0d07c6759315";

const [a] = await sql`
  SELECT
    session_id::text, child_name, age_band, archetype, parent_pattern,
    parent_name, phone, generation_attempts, answers, dimensions,
    whatsapp_send_attempts, whatsapp_send_claimed_at, whatsapp_report_sent_at,
    created_at
  FROM assessments WHERE session_id = ${SESSION}::uuid
` as unknown as any[];

// Sanitise before printing — show phone last 4 only
const safe = { ...a, phone: a.phone ? '****' + String(a.phone).slice(-4) : null, parent_name: '[redacted]' };
console.log(JSON.stringify(safe, null, 2));
