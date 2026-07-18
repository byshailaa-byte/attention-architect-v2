import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";

// One-time migration endpoint — runs pending schema changes against the production DB.
// Protected: caller must pass the ADMIN_PASSWORD as Bearer token.
// Remove this file once migrations are confirmed applied.
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token || token !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getSql();
  const results: string[] = [];

  try {
    await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS parent_details_at TIMESTAMPTZ`;
    results.push("assessments.parent_details_at: ok");
  } catch (e) {
    results.push("assessments.parent_details_at: " + (e as Error).message);
  }

  try {
    await sql`ALTER TABLE funnel_events ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'`;
    results.push("funnel_events.metadata: ok");
  } catch (e) {
    results.push("funnel_events.metadata: " + (e as Error).message);
  }

  try {
    await sql`ALTER TABLE funnel_events DROP CONSTRAINT IF EXISTS funnel_events_session_id_event_type_key`;
    results.push("drop old unique constraint: ok");
  } catch (e) {
    results.push("drop old unique constraint: " + (e as Error).message);
  }

  try {
    await sql`ALTER TABLE funnel_events DROP CONSTRAINT IF EXISTS funnel_events_event_type_check`;
    results.push("drop old check constraint: ok");
  } catch (e) {
    results.push("drop old check constraint: " + (e as Error).message);
  }

  try {
    await sql`UPDATE funnel_events SET event_type = 'report_view' WHERE event_type = 'report_viewed'`;
    results.push("rename report_viewed: ok");
  } catch (e) {
    results.push("rename report_viewed: " + (e as Error).message);
  }

  try {
    await sql`
      ALTER TABLE funnel_events ADD CONSTRAINT funnel_events_event_type_check CHECK (event_type IN (
        'assessment_started','assessment_dimension_complete','assessment_complete',
        'report_gate_view','generate_lead','report_view','view_item','begin_checkout',
        'purchase','lms_day_complete','lms_reflection_submitted','scroll_milestone'
      ))
    `;
    results.push("new event_type check constraint: ok");
  } catch (e) {
    results.push("new event_type check constraint: " + (e as Error).message);
  }

  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_funnel_events_session ON funnel_events(session_id, created_at)`;
    results.push("funnel_events session index: ok");
  } catch (e) {
    results.push("funnel_events session index: " + (e as Error).message);
  }

  try {
    await sql`UPDATE assessments SET archetype = 'The Storm' WHERE archetype = 'storm'`;
    results.push("archetype casing fix: ok");
  } catch (e) {
    results.push("archetype casing fix: " + (e as Error).message);
  }

  // Confirm final state
  const cols = (await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'parent_details_at'
  `) as unknown as unknown[];
  results.push("parent_details_at confirmed: " + (cols.length > 0 ? "EXISTS" : "STILL MISSING"));

  return NextResponse.json({ ok: true, results });
}
