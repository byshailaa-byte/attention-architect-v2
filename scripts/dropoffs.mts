import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

// Investigate the "Filled Details" stage — does the underlying data show hidden drop-off?
// The funnel likely measures:
//   view_report (or similar)  →  generate_lead (claim submitted)
// "Filled Details" = post-assessment form. 100% in the summary seems suspicious.
// Let's count raw events at each funnel stage.

const stages = [
  "page_view",
  "begin_assessment",
  "assessment_complete",
  "generate_lead",
  "view_item",
  "begin_checkout",
  "purchase",
] as const;

const counts = await sql`
  SELECT event_type, COUNT(*) AS n
  FROM funnel_events
  GROUP BY event_type
  ORDER BY n DESC
` as unknown as { event_type: string; n: string }[];

console.log("=== ALL FUNNEL EVENT COUNTS ===");
for (const row of counts) {
  console.log(`  ${row.event_type.padEnd(30)} ${row.n}`);
}

// Look specifically at sessions that reached assessment_complete but not generate_lead
const [completed, claimed] = await Promise.all([
  sql`
    SELECT DISTINCT session_id FROM funnel_events WHERE event_type = 'assessment_complete'
  ` as unknown as { session_id: string }[],
  sql`
    SELECT DISTINCT session_id FROM funnel_events WHERE event_type = 'generate_lead'
  ` as unknown as { session_id: string }[],
]);

const claimedSet = new Set(claimed.map(r => r.session_id));
const droppedAfterComplete = completed.filter(r => !claimedSet.has(r.session_id));
console.log(`\n=== FILLED DETAILS DROP-OFF ===`);
console.log(`Sessions that hit assessment_complete: ${completed.length}`);
console.log(`Sessions that then hit generate_lead: ${claimed.length}`);
console.log(`Dropped after assessment_complete (never claimed): ${droppedAfterComplete.length}`);

// What does the assessment look like for those who dropped?
// Do they have a record in assessments table?
if (droppedAfterComplete.length > 0) {
  const sample = droppedAfterComplete.slice(0, 5).map(r => r.session_id);
  const asmRows = await sql`
    SELECT session_id, child_name, parent_name, email, created_at
    FROM assessments
    WHERE session_id = ANY(${sample}::uuid[])
  ` as unknown as { session_id: string; child_name: string | null; parent_name: string | null; email: string | null; created_at: string }[];
  console.log(`\nSample dropped sessions (n=${droppedAfterComplete.length}):`);
  for (const r of asmRows) {
    console.log(`  ${r.session_id} child=${r.child_name ?? "?"} parent=${r.parent_name ?? "null"} email=${r.email ?? "null"}`);
  }
}

// Also check: do people who reach the post-assessment form sometimes abandon without submitting?
// The post-assessment form is the same page as the assessment (assessment/page.tsx).
// The "Filled Details" event would be... what? There's no specific "form_started" event?
// Let's see if there's a "view_post_assessment" or similar event
const postAssessEvents = await sql`
  SELECT event_type, COUNT(*) AS n FROM funnel_events
  WHERE event_type LIKE '%post%' OR event_type LIKE '%detail%' OR event_type LIKE '%form%'
  GROUP BY event_type
` as unknown as { event_type: string; n: string }[];
console.log(`\n=== POST-ASSESSMENT SPECIFIC EVENTS ===`);
if (postAssessEvents.length === 0) {
  console.log("  (none — no post_assessment_view or similar events tracked)");
} else {
  for (const r of postAssessEvents) console.log(`  ${r.event_type}: ${r.n}`);
}
