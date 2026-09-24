import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

// Ship date: 2026-08-29 00:00 UTC (first simplified generate_lead in prod)
// 30 days before: 2026-07-30 to 2026-08-28
const SHIP   = "2026-08-29T00:00:00Z";
const BEFORE = "2026-07-30T00:00:00Z";

const rows = await sql`
  SELECT
    period,
    event_type,
    COUNT(*)::int AS count
  FROM (
    SELECT
      CASE
        WHEN created_at >= ${SHIP}::timestamptz THEN 'after_ship'
        WHEN created_at >= ${BEFORE}::timestamptz THEN 'before_ship_30d'
      END AS period,
      event_type
    FROM funnel_events
    WHERE event_type IN ('generate_lead', 'report_view')
      AND created_at >= ${BEFORE}::timestamptz
  ) sub
  WHERE period IS NOT NULL
  GROUP BY period, event_type
  ORDER BY period, event_type
` as unknown as { period: string; event_type: string; count: number }[];

console.log("Counts:", JSON.stringify(rows, null, 2));

// Days in each period for rate normalisation
const afterDays = (new Date().getTime() - new Date(SHIP).getTime()) / 86400000;
console.log("Days after ship so far:", afterDays.toFixed(1));
