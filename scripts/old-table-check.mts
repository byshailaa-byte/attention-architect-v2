import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

// Check if the capital-A old tables have data, and also check
// the admin panel funnel query to understand where "275" and "70→2" come from.
const [oldAsm, oldReport, funnel] = await Promise.all([
  sql`SELECT COUNT(*) AS n FROM "Assessment"` as unknown as { n: string }[],
  sql`SELECT COUNT(*) AS n FROM "Report"` as unknown as { n: string }[],
  // What does the funnel view in the admin show?
  sql`
    SELECT event_type, COUNT(*) AS n, MIN(created_at)::text AS first, MAX(created_at)::text AS last
    FROM funnel_events
    GROUP BY event_type
    ORDER BY MIN(created_at) ASC
  ` as unknown as { event_type: string; n: string; first: string; last: string }[],
]);

console.log(`Old "Assessment" table rows: ${oldAsm[0].n}`);
console.log(`Old "Report" table rows: ${oldReport[0].n}`);

console.log("\nfunnel_events by type (with date range):");
for (const r of funnel) {
  console.log(`  ${r.event_type.padEnd(32)} n=${r.n.padStart(4)}  ${r.first?.slice(0,10)} → ${r.last?.slice(0,10)}`);
}

// Also check admin funnel endpoint source
const purchases = await sql`
  SELECT tier, COUNT(*) AS n, SUM(amount_paise)/100 AS total_inr, MIN(created_at)::text AS first
  FROM purchases
  GROUP BY tier
` as unknown as { tier: string; n: string; total_inr: string; first: string }[];
console.log("\npurchases table:");
for (const p of purchases) console.log(`  tier=${p.tier} n=${p.n} ₹${p.total_inr} first=${p.first}`);
