import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

// Sessions from the past 24h
const rows = await sql`
  SELECT
    a.session_id::text,
    a.pricing_variant,
    a.archetype IS NOT NULL AS assessment_complete,
    a.parent_name IS NOT NULL AS gate_submitted,
    a.child_name,
    a.created_at::text,
    EXISTS (
      SELECT 1 FROM reports r
      WHERE r.assessment_id = a.id AND r.status = 'published' AND r.superseded_by IS NULL
    ) AS has_published_report,
    a.whatsapp_report_sent_at IS NOT NULL AS wa_sent
  FROM assessments a
  WHERE a.created_at > NOW() - INTERVAL '24 hours'
  ORDER BY a.created_at DESC
` as unknown as any[];

console.log("Last 24h sessions:", rows.length);
for (const r of rows) {
  console.log(JSON.stringify({
    ts: String(r.created_at).slice(0, 19),
    variant: r.pricing_variant,
    complete: r.assessment_complete,
    gate: r.gate_submitted,
    child: r.child_name,
    report: r.has_published_report,
    wa_sent: r.wa_sent,
  }));
}
