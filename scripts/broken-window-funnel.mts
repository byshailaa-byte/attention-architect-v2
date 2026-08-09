import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

// Sessions with a published narrative report and their earliest report publish time
const rows = await sql`
  SELECT
    a.session_id,
    a.parent_name,
    a.email,
    r.promoted_at  AS report_published_at,
    fe.event_type,
    fe.created_at  AS event_at,
    fe.metadata
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  -- Any funnel_events from those sessions within the broken window
  LEFT JOIN funnel_events fe
    ON fe.session_id = a.session_id
    AND fe.event_type IN ('begin_checkout', 'view_item')
    -- broken window: from when the report was first published until now
    AND fe.created_at >= r.promoted_at
  WHERE r.status = 'published'
    AND r.superseded_by IS NULL
    AND r.narrative_moments IS NOT NULL
    AND jsonb_array_length(r.narrative_moments) > 0
  ORDER BY r.promoted_at ASC, fe.created_at ASC
` as unknown as {
  session_id: string;
  parent_name: string;
  email: string;
  report_published_at: string;
  event_type: string | null;
  event_at: string | null;
  metadata: Record<string, unknown> | null;
}[];

const withEvents = rows.filter(r => r.event_type !== null);
const uniqueSessions = [...new Set(rows.map(r => r.session_id))];

console.log(`Narrative reports: ${uniqueSessions.length} sessions`);
console.log(`Funnel events (begin_checkout / view_item) during broken window: ${withEvents.length}`);

if (withEvents.length === 0) {
  console.log("No begin_checkout or view_item events fired during the broken window — consistent with broken <a> links (no JS, no event tracking).");
} else {
  for (const r of withEvents) {
    console.log(`\nsession: ${r.session_id}`);
    console.log(`  parent:  ${r.parent_name} <${r.email}>`);
    console.log(`  report published: ${r.report_published_at}`);
    console.log(`  event: ${r.event_type} at ${r.event_at}`);
    console.log(`  metadata: ${JSON.stringify(r.metadata)}`);
  }
}

// Also check report_view — how many people actually loaded a narrative report during the window
const viewRows = await sql`
  SELECT
    fe.session_id,
    a.parent_name,
    a.email,
    fe.created_at AS viewed_at
  FROM funnel_events fe
  JOIN assessments a ON a.session_id = fe.session_id
  JOIN reports r ON r.assessment_id = a.id
  WHERE fe.event_type = 'report_view'
    AND r.status = 'published'
    AND r.superseded_by IS NULL
    AND r.narrative_moments IS NOT NULL
    AND jsonb_array_length(r.narrative_moments) > 0
    AND fe.created_at >= r.promoted_at
  ORDER BY fe.created_at ASC
` as unknown as { session_id: string; parent_name: string; email: string; viewed_at: string }[];

console.log(`\nParents who viewed a narrative report page during the broken window: ${viewRows.length}`);
for (const v of viewRows) {
  console.log(`  ${v.parent_name} <${v.email}> — ${v.viewed_at}`);
}
