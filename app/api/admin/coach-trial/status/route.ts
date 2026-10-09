import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";
import { coachTrialEnabled } from "@/lib/coach-trial/flags";
import { parentKey } from "@/lib/coach-trial/parent-key";
import { getTrialByParentKey } from "@/lib/coach-trial/trial";
import { getTrialAdminView } from "@/lib/coach-trial/admin";
import { readTrialCard4 } from "@/lib/coach-trial/content";
import { trialLinkFor } from "@/lib/coach-trial/link";

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
    const view = trial ? await getTrialAdminView(trial) : null;
    const reportReady = !!(await readTrialCard4(sql, sessionId).catch(() => null));
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? req.nextUrl.origin;
    // Copy-link is offered only while the trial is active (the token is bound to the live ends_at).
    const trialLink = trial && trial.status === "active" ? trialLinkFor(base, trial.id, trial.ends_at) : null;

    return NextResponse.json({
      enabled: coachTrialEnabled(),
      paid,
      reportReady,
      alreadyTrialed: !!trial,
      trialId: trial?.id ?? null,
      trialLink,
      view,
    });
  } catch (e) {
    console.error("[api/admin/coach-trial/status]", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
