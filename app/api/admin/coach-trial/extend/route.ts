import { NextRequest, NextResponse } from "next/server";
import { assertBootGuards } from "@/lib/boot-guard";
import { coachTrialEnabled } from "@/lib/coach-trial/flags";
import { extendTrial } from "@/lib/coach-trial/trial";

assertBootGuards();

// Extend a trial by 2 days. Auth: middleware Basic Auth on /api/admin/*.
export async function POST(req: NextRequest) {
  if (!coachTrialEnabled()) return NextResponse.json({ error: "disabled" }, { status: 404 });
  try {
    const { trialId } = (await req.json()) as { trialId?: string };
    if (!trialId) return NextResponse.json({ error: "trialId required" }, { status: 400 });
    const trial = await extendTrial(trialId, 2);
    if (!trial) return NextResponse.json({ error: "not_active" }, { status: 409 });
    return NextResponse.json({ ok: true, endsAt: trial.ends_at, extendedDays: trial.extended_days });
  } catch (e) {
    console.error("[api/admin/coach-trial/extend]", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
