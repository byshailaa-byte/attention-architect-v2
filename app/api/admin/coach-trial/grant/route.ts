import { NextRequest, NextResponse } from "next/server";
import { assertBootGuards } from "@/lib/boot-guard";
import { coachTrialEnabled } from "@/lib/coach-trial/flags";
import { grantRealTrial } from "@/lib/coach-trial/grant";

assertBootGuards();

// Grant a free 4-day Quick Start from the admin call screen. Auth: middleware Basic Auth on
// /api/admin/*. Delegates to the shared grantRealTrial (creates the trial + users row, emails the
// login link, queues the Day-4 "Trial ends" call, fires trial_started) so this and the Preview
// "Approve & offer" flow never drift.
export async function POST(req: NextRequest) {
  if (!coachTrialEnabled()) return NextResponse.json({ error: "disabled" }, { status: 404 });
  try {
    const { sessionId } = (await req.json()) as { sessionId?: string };
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

    const r = await grantRealTrial({ sessionId, sendInvite: true });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json({ ok: true, trialId: r.trialId, emailed: r.emailed });
  } catch (e) {
    console.error("[api/admin/coach-trial/grant]", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
