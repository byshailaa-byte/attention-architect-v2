import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

const SESSION = "69f78013-847f-4213-a764-3c7aee287d3c";

// Check the event fired
const events = await sql`
  SELECT event_type, metadata, created_at
  FROM funnel_events
  WHERE session_id = ${SESSION}::uuid
    AND event_type = 'simplified_report_view'
  ORDER BY created_at DESC
  LIMIT 3
` as unknown as { event_type: string; metadata: Record<string, string>; created_at: string }[];

console.log("simplified_report_view events:", JSON.stringify(events, null, 2));

// Also verify the negative cases — confirm generating + stillbuilding paths don't fire it
// (structural: the event is placed after the narrative_moments guard, so it can't reach
//  that line via generating/stillbuilding. No runtime check needed.)

// Baseline: generate_lead vs simplified_report_view since ship (2026-08-29)
const SHIP = "2026-08-29T00:00:00Z";
const baseline = await sql`
  SELECT event_type, COUNT(*)::int AS count
  FROM funnel_events
  WHERE event_type IN ('generate_lead', 'simplified_report_view')
    AND created_at >= ${SHIP}::timestamptz
    AND (metadata->>'variant' = 'simplified' OR event_type = 'simplified_report_view')
  GROUP BY event_type
` as unknown as { event_type: string; count: number }[];

console.log("\nBaseline since ship:", JSON.stringify(baseline, null, 2));

// Days since ship for rate calculation
const daysSince = (Date.now() - new Date(SHIP).getTime()) / 86400000;
console.log("Days since ship:", daysSince.toFixed(1));
