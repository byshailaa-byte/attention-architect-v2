import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

const [checkouts, purchases, payments] = await Promise.all([
  sql`
    SELECT session_id, created_at::text AS ts, metadata->>'tier' AS tier
    FROM funnel_events WHERE event_type = 'begin_checkout'
    ORDER BY created_at ASC
  ` as unknown as { session_id: string; ts: string; tier: string | null }[],

  sql`
    SELECT session_id, created_at::text AS ts
    FROM funnel_events WHERE event_type = 'purchase'
    ORDER BY created_at ASC
  ` as unknown as { session_id: string; ts: string }[],

  // Check payments table if it exists
  sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('payments', 'orders', 'razorpay_events')
  ` as unknown as { table_name: string }[],
]);

// The fix was deployed in dpl_6buQLbpn3P1C88jy5Fyff2Hrwp2P
// Based on context: pushed during the session on 2026-08-04 evening (~14:25 IST first publish)
// The FinalInvitationSection fix was in the same deploy window.
// Let's print all events with timestamps to find the split.

console.log("=== begin_checkout events ===");
for (const e of checkouts) {
  console.log(`  ${e.ts}  session=${e.session_id.slice(0,8)}  tier=${e.tier ?? "?"}`);
}

console.log(`\n=== purchase events (funnel_events) ===`);
if (purchases.length === 0) {
  console.log("  (none in funnel_events)");
} else {
  for (const p of purchases) console.log(`  ${p.ts}  session=${p.session_id.slice(0,8)}`);
}

console.log(`\n=== payment-related tables ===`);
if (payments.length === 0) {
  console.log("  (none found)");
} else {
  for (const t of payments) console.log(`  ${t.table_name}`);
}

// Fetch payments from actual payments table if exists
const paymentRows = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ORDER BY table_name
` as unknown as { table_name: string }[];
console.log("\n=== all tables ===");
for (const t of paymentRows) console.log(`  ${t.table_name}`);
