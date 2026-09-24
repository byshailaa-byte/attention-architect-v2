import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

// Sessions that could have hit prototype content:
// - simplified variant, gate submitted (parent_name set), archetype set (assessment complete)
// - but no published report exists
// These parents received a WhatsApp link (if sent) pointing at prototype content.

const [totals] = await sql`
  SELECT
    COUNT(*)::int                                                             AS total_exposed,
    MIN(a.created_at)::text                                                  AS earliest,
    MAX(a.created_at)::text                                                  AS latest,
    COUNT(*) FILTER (WHERE a.whatsapp_report_sent_at IS NOT NULL)::int       AS received_wa_link,
    COUNT(*) FILTER (WHERE a.created_at > NOW() - INTERVAL '30 days')::int  AS within_30d,
    COUNT(*) FILTER (WHERE a.created_at > NOW() - INTERVAL '7 days')::int   AS within_7d
  FROM assessments a
  WHERE a.pricing_variant = 'simplified'
    AND a.parent_name IS NOT NULL
    AND a.archetype IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM reports r
      WHERE r.assessment_id = a.id
        AND r.status = 'published'
        AND r.superseded_by IS NULL
    )
` as unknown as {
  total_exposed: number;
  earliest: string | null;
  latest: string | null;
  received_wa_link: number;
  within_30d: number;
  within_7d: number;
}[];

console.log(JSON.stringify(totals, null, 2));
