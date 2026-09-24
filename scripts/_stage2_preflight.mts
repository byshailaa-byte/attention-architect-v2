import { neon } from "@neondatabase/serverless";
const PROD = "postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(PROD);

// PRE-FLIGHT: find shashiravi033@gmail.com, phone ...9293, created 2026-08-10
const rows = await sql`
  SELECT session_id, child_name, email, phone, created_at
  FROM assessments
  WHERE email = 'shashiravi033@gmail.com'
    AND phone LIKE '%9293'
  ORDER BY created_at
` as unknown as { session_id: string; child_name: string | null; email: string; phone: string; created_at: Date }[];

console.log(`Rows matching shashiravi033@gmail.com + phone ...9293: ${rows.length}`);
rows.forEach(r => console.log(`  session_id=${r.session_id}  child=${r.child_name ?? 'null'}  phone=...${r.phone.slice(-4)}  created=${String(r.created_at).substring(0,10)}`));

// Also check if the malformed ID 01481d3b-270a40be-b660-71620e9db0a6 exists at all
const malformed = await sql`
  SELECT session_id FROM assessments WHERE session_id::text = '01481d3b-270a40be-b660-71620e9db0a6'
` as unknown as { session_id: string }[];
console.log(`\nMalformed ID query returned: ${malformed.length} rows (expected 0 — UUID validation should reject it)`);

// Also pull ALL shashiravi033 sessions regardless of phone
const allShashi = await sql`
  SELECT session_id, child_name, email, phone, created_at
  FROM assessments
  WHERE email = 'shashiravi033@gmail.com'
  ORDER BY created_at
` as unknown as { session_id: string; child_name: string | null; email: string; phone: string | null; created_at: Date }[];
console.log(`\nAll shashiravi033@gmail.com sessions: ${allShashi.length}`);
allShashi.forEach(r => console.log(`  session_id=${r.session_id}  phone=${r.phone ? '...'+r.phone.slice(-4) : 'null'}  created=${String(r.created_at).substring(0,10)}`));
