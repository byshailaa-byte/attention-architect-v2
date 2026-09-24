import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
const SESSION = "c7b99c53-1178-4161-8efe-c23bcd886a66";

const [a] = await sql`
  SELECT
    whatsapp_send_attempts,
    whatsapp_send_claimed_at,
    whatsapp_report_sent_at,
    generation_attempts,
    phone
  FROM assessments WHERE session_id = ${SESSION}::uuid
` as unknown as any[];

console.log("whatsapp_report_sent_at:", a.whatsapp_report_sent_at);
console.log("whatsapp_send_claimed_at:", a.whatsapp_send_claimed_at);
console.log("whatsapp_send_attempts:", a.whatsapp_send_attempts);
console.log("generation_attempts:", a.generation_attempts);
console.log("phone:", a.phone);
