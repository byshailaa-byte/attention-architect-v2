import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

// Find the 2026-08-29 session with parent_name set and no published report
const rows = await sql`
  SELECT
    a.session_id::text,
    a.child_name,
    a.archetype,
    a.generation_attempts,
    a.whatsapp_report_sent_at,
    a.whatsapp_send_attempts,
    a.whatsapp_send_claimed_at,
    a.created_at,
    a.pricing_variant
  FROM assessments a
  WHERE a.pricing_variant = 'simplified'
    AND a.parent_name IS NOT NULL
    AND a.archetype IS NOT NULL
    AND a.created_at BETWEEN '2026-08-29 15:30:00+00' AND '2026-08-29 16:00:00+00'
    AND NOT EXISTS (
      SELECT 1 FROM reports r
      WHERE r.assessment_id = a.id
        AND r.status = 'published'
        AND r.superseded_by IS NULL
    )
` as unknown as any[];

console.log("Affected session:", JSON.stringify(rows, null, 2));

// Also check if any draft/failed reports exist for it
if (rows.length > 0) {
  const sessionId = rows[0].session_id;
  const reports = await sql`
    SELECT r.id, r.status, r.created_at, r.superseded_by, r.auto_generated
    FROM reports r
    JOIN assessments a ON r.assessment_id = a.id
    WHERE a.session_id = ${sessionId}::uuid
  ` as unknown as any[];
  console.log("All reports for session:", JSON.stringify(reports, null, 2));
}
