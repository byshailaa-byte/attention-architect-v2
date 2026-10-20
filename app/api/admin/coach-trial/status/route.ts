import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";
import { coachTrialEnabled } from "@/lib/coach-trial/flags";
import { parentKey } from "@/lib/coach-trial/parent-key";
import { getTrialByParentKey, getPreviewByParentKey } from "@/lib/coach-trial/trial";
import { getTrialAdminView } from "@/lib/coach-trial/admin";
import { readTrialCard4 } from "@/lib/coach-trial/content";
import { trialLinkFor } from "@/lib/coach-trial/link";
import { readOutcomes, needsCall } from "@/lib/lms/coach/outcomes";

assertBootGuards();

// Trial status for the admin card. Auth: middleware Basic Auth on /api/admin/*.
// GET ?sessionId=<uuid> → { enabled, paid, alreadyTrialed, view? }
export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId");
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    const sql = getSql();
    const rows = (await sql`
      SELECT id, email, phone FROM assessments WHERE session_id = ${sessionId}::uuid LIMIT 1
    `) as unknown as { id: string; email: string | null; phone: string | null }[];
    const a = rows[0];
    if (!a) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const paid = ((await sql`SELECT 1 FROM purchases WHERE assessment_id = ${a.id} AND status = 'paid' LIMIT 1`) as unknown as unknown[]).length > 0;
    const pkey = parentKey(a.phone, a.email);
    const trial = pkey ? await getTrialByParentKey(pkey) : null;
    const preview = pkey ? await getPreviewByParentKey(pkey) : null;
    const view = trial ? await getTrialAdminView(trial) : null;
    const reportReady = !!(await readTrialCard4(sql, sessionId).catch(() => null));
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? req.nextUrl.origin;
    // Copy-link is offered only while the trial is active (the token is bound to the live ends_at).
    const trialLink = trial && trial.status === "active" ? trialLinkFor(base, trial.id, trial.ends_at) : null;

    // Per-parent chip state: Approved & offered (real trial stamped) > Trial Day X (active real trial)
    // > Previewed (sandbox exists) > Not previewed.
    const chip = trial?.approved_at ? "approved"
      : trial && view ? "trial"
      : preview ? "previewed"
      : "not_previewed";

    // Day-by-day outcome strip (from what the parent logged only) + the needs-a-call flag.
    const outcomes = trial ? await readOutcomes("trial", trial.id) : [];
    const outcomeStrip = outcomes.map((o) => ({ day: o.day, outcome: o.outcome, note: o.note }));
    const call = needsCall(outcomes);

    return NextResponse.json({
      enabled: coachTrialEnabled(),
      paid,
      reportReady,
      alreadyTrialed: !!trial,
      trialId: trial?.id ?? null,
      trialLink,
      view,
      previewId: preview?.id ?? null,
      previewUrl: preview ? `/admin/coach-preview/${preview.id}` : null,
      approved: !!trial?.approved_at,
      chip,
      outcomeStrip,
      needsCall: call.flag,
      needsCallReason: call.reason,
    });
  } catch (e) {
    console.error("[api/admin/coach-trial/status]", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
