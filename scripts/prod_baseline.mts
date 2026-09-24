import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

// Determine the ship date for the deferred flow.
// From context: fixes deployed in dpl_37vR2gWUXH2wFCUVPcFahbu1D9jn.
// Approximate ship date: 2026-08-29 (the exposed session was created that day, 
// and the user confirmed the deploy was ready before this session started).
// Using 2026-08-29 00:00 UTC as the cutoff.
const SHIP_DATE = "2026-08-29T00:00:00Z";

const rows = await sql`
  SELECT
    period,
    variant,
    event_type,
    COUNT(*)::int AS count
  FROM (
    SELECT
      CASE WHEN created_at < ${SHIP_DATE}::timestamptz THEN 'before' ELSE 'after' END AS period,
      COALESCE(metadata->>'variant', 'unknown') AS variant,
      event_type
    FROM funnel_events
    WHERE event_type IN ('generate_lead', 'report_view')
      AND created_at >= NOW() - INTERVAL '60 days'
  ) sub
  GROUP BY period, variant, event_type
  ORDER BY period DESC, variant, event_type
` as unknown as { period: string; variant: string; event_type: string; count: number }[];

console.log(JSON.stringify(rows, null, 2));

// Also get daily totals for the 30 days since ship
const daily = await sql`
  SELECT
    DATE(created_at) AS day,
    event_type,
    COALESCE(metadata->>'variant', 'unknown') AS variant,
    COUNT(*)::int AS count
  FROM funnel_events
  WHERE event_type IN ('generate_lead', 'report_view')
    AND created_at >= ${SHIP_DATE}::timestamptz
  GROUP BY day, event_type, variant
  ORDER BY day, event_type
` as unknown as { day: string; event_type: string; variant: string; count: number }[];

console.log("Daily since ship:", JSON.stringify(daily, null, 2));
