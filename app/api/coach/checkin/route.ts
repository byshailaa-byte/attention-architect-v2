import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";
import { assertBootGuards } from "@/lib/boot-guard";
import { coachTrialEnabled } from "@/lib/coach-trial/flags";
import { resolveCoachAccess } from "@/lib/coach-trial/access";
import { recordCheckin } from "@/lib/lms/coach/checkin";
import { baselineQuestion } from "@/lib/coach-trial/onboarding";

assertBootGuards();

// Trial Day-4 "where are you now?" capture — the SAME options as the Day-0 baseline. Optional; the
// results screen shows a direct number only if it improved vs the baseline. period = 4 (Day 4).
export async function POST(req: NextRequest) {
  if (!coachTrialEnabled()) return NextResponse.json({ error: "disabled" }, { status: 404 });
  try {
    const userId = verifySessionToken(req.cookies.get(COOKIE_NAME)?.value ?? "");
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const access = await resolveCoachAccess(userId);
    if (access.role !== "trial") return NextResponse.json({ error: "no_trial" }, { status: 403 });

    const body = (await req.json().catch(() => ({}))) as { value?: string };
    const value = typeof body.value === "string" ? body.value : "";
    const worry = access.trial.worry ?? "other";
    const allowed = new Set(baselineQuestion(worry).chips.map((c) => c.value));
    if (!allowed.has(value)) return NextResponse.json({ error: "invalid value" }, { status: 400 });

    await recordCheckin("trial", access.trial.id, 4, worry, value);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/coach/checkin]", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
