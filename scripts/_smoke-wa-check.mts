import { neon } from "@neondatabase/serverless";
import { writeFileSync } from "fs";
const sql = neon(process.env.DATABASE_URL!);
// Poll until claim is released or 300s elapsed
const start = Date.now();
while (Date.now() - start < 300_000) {
  const rows = await sql`
    SELECT 
      whatsapp_send_claimed_at::text,
      whatsapp_report_sent_at::text,
      EXTRACT(EPOCH FROM (NOW() - created_at))::int AS age_seconds
    FROM assessments
    WHERE session_id = ${process.env.TEST_SESSION!}::uuid
  ` as unknown as {whatsapp_send_claimed_at: string|null; whatsapp_report_sent_at: string|null; age_seconds: number}[];
  const row = rows[0] ?? {};
  const elapsed = Math.round((Date.now() - start) / 1000);
  console.log(`[${elapsed}s] claimed=${row.whatsapp_send_claimed_at ?? "null"} sent=${row.whatsapp_report_sent_at ?? "null"}`);
  writeFileSync("/tmp/aa-smoke-wa.json", JSON.stringify({ elapsed, ...row }, null, 2));
  // Stop once claim has been set (then we can check later for release)
  // Or stop if sent_at is set (unexpected success)
  // Or wait until claim is released (claimed goes back to null after being set)
  if (row.whatsapp_send_claimed_at !== null || row.whatsapp_report_sent_at !== null) {
    // Continue polling until claim is released or sent_at set
    if (row.whatsapp_send_claimed_at === null || row.whatsapp_report_sent_at !== null) break;
  }
  await new Promise(r => setTimeout(r, 10_000));
}
