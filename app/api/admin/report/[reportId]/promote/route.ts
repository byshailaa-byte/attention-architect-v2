// POST /api/admin/report/[reportId]/promote
// Protected by middleware HTTP Basic Auth on /api/admin/*.
//
// Moves a report from draft/preview → published.
// Atomically supersedes any prior published report for the same assessment.
// Records promoted_at and promoted_by (always "admin" — Basic Auth has no identity beyond the password).
//
// Safety:
//   - Idempotent: promoting an already-published report is a no-op (returns 200 with already_published: true).
//   - Does NOT publish reports that failed quality checks — returns 409 if quality_check_results.passed is false.
//   - Does NOT publish reports that have been superseded — returns 409.

import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";

type Params = Promise<{ reportId: string }>;

export async function POST(_req: NextRequest, { params }: { params: Params }) {
  const { reportId } = await params;

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(reportId)) {
    return NextResponse.json({ error: "Invalid reportId" }, { status: 400 });
  }

  const sql = getSql();

  const rows = (await sql`
    SELECT id, assessment_id, status, superseded_by,
           (quality_check_results->>'passed')::boolean AS quality_passed
    FROM reports
    WHERE id = ${reportId}::uuid
    LIMIT 1
  `) as unknown as {
    id: string;
    assessment_id: string;
    status: string;
    superseded_by: string | null;
    quality_passed: boolean | null;
  }[];

  if (rows.length === 0) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const report = rows[0];

  if (report.status === "published") {
    return NextResponse.json({ reportId, already_published: true });
  }

  if (report.superseded_by !== null) {
    return NextResponse.json(
      { error: "Cannot promote a superseded report — promote the latest report for this assessment instead" },
      { status: 409 },
    );
  }

  // Block promotion of quality-failed reports.
  // quality_passed is NULL for very old reports (pre-Quality Engine); allow those through.
  if (report.quality_passed === false) {
    return NextResponse.json(
      { error: "Cannot promote a report that failed quality checks — regenerate first" },
      { status: 409 },
    );
  }

  // Promote the target report and supersede any prior published report atomically.
  await sql`
    UPDATE reports
    SET superseded_by = ${reportId}::uuid
    WHERE assessment_id = ${report.assessment_id}::uuid
      AND status = 'published'
      AND superseded_by IS NULL
      AND id != ${reportId}::uuid
  `;

  await sql`
    UPDATE reports
    SET status      = 'published',
        promoted_at = now(),
        promoted_by = 'admin'
    WHERE id = ${reportId}::uuid
  `;

  return NextResponse.json({ reportId, promoted: true });
}
