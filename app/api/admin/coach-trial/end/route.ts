import { NextRequest, NextResponse } from "next/server";
import { assertBootGuards } from "@/lib/boot-guard";
import { coachTrialEnabled } from "@/lib/coach-trial/flags";
import { endTrial } from "@/lib/coach-trial/trial";

assertBootGuards();

// End a trial now. Auth: middleware Basic Auth on /api/admin/*.
export async function POST(req: NextRequest) {
  if (!coachTrialEnabled()) return NextResponse.json({ error: "disabled" }, { status: 404 });
  try {
    const { trialId } = (await req.json()) as { trialId?: string };
    if (!trialId) return NextResponse.json({ error: "trialId required" }, { status: 400 });
    const trial = await endTrial(trialId);
    if (!trial) return NextResponse.json({ error: "not_active" }, { status: 409 });
    return NextResponse.json({ ok: true, status: trial.status });
  } catch (e) {
    console.error("[api/admin/coach-trial/end]", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
