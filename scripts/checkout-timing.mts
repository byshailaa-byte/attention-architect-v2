import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

// The FinalInvitationSection fix was in deployment dpl_6buQLbpn3P1C88jy5Fyff2Hrwp2P
// That was deployed earlier tonight. Let's find the actual deploy time from the
// first post-fix event, or use the known range from the previous session.
// The fix was pushed after 235 published reports existed — let's check when begin_checkout
// events started arriving and where the purchase events cluster.

const [checkouts, purchases, firstPublished] = await Promise.all([
  sql`
    SELECT 
      f.session_id,
      f.created_at,
      f.metadata->>'tier' AS tier,
      f.metadata->>'value' AS value
    FROM funnel_events f
    WHERE f.event_type = 'begin_checkout'
    ORDER BY f.created_at ASC
  ` as unknown as { session_id: string; created_at: string; tier: string | null; value: string | null }[],

  sql`
    SELECT
      f.session_id,
      f.created_at,
      f.metadata->>'tier' AS tier
    FROM funnel_events f
    WHERE f.event_type = 'purchase'
    ORDER BY f.created_at ASC
  ` as unknown as { session_id: string; created_at: string; tier: string | null }[],

  sql`
    SELECT MIN(r.promoted_at) AS first_publish
    FROM reports r
    WHERE r.status = 'published'
  ` as unknown as { first_publish: string }[],
]);

console.log("=== CHECKOUT TIMING ANALYSIS ===\n");
console.log(`Total begin_checkout events: ${checkouts.length}`);
console.log(`Total purchase events: ${purchases.length}`);
console.log(`First published report: ${firstPublished[0]?.first_publish ?? "unknown"}`);

// The Razorpay fix was applied — I need to find the cutoff.
// From context: the fix replaced broken <a href=/checkout> with PriceCards.
// The fix was deployed and visible in production. Let's look at the timeline
// of begin_checkout events by day to identify the pattern.

const byDay: Record<string, number> = {};
for (const e of checkouts) {
  const day = e.created_at.slice(0, 10);
  byDay[day] = (byDay[day] ?? 0) + 1;
}
console.log("\nbegin_checkout events by day:");
for (const [day, n] of Object.entries(byDay).sort()) {
  console.log(`  ${day}: ${n}`);
}

// When did the last narrative reports go out?
const lastCheckouts = checkouts.slice(-10);
console.log("\nLast 10 begin_checkout events:");
for (const e of lastCheckouts) {
  console.log(`  ${e.created_at}  tier=${e.tier ?? "?"}`);
}

// Purchase sessions
const purchaseSessions = new Set(purchases.map(p => p.session_id));
const checkoutSessions = new Set(checkouts.map(c => c.session_id));
console.log(`\nUnique sessions with begin_checkout: ${checkoutSessions.size}`);
console.log(`Unique sessions with purchase: ${purchaseSessions.size}`);

// For each checkout session, did they purchase?
let converted = 0;
for (const sid of checkoutSessions) {
  if (purchaseSessions.has(sid)) converted++;
}
console.log(`Converted (checkout → purchase): ${converted} / ${checkoutSessions.size}`);
