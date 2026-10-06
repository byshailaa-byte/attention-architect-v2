import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";
import { blockIfAdminView } from "@/lib/lms/admin-view-guard";
import { skipToDay, getActiveAssessmentId } from "@/lib/lms/progress";
import { checkUnlocked, maxUnlockedDay } from "@/lib/lms/unlock-gate";
import { assertBootGuards } from "@/lib/boot-guard";

assertBootGuards();

export async function POST(req: NextRequest) {
  try {
    const roBlock = blockIfAdminView(req); if (roBlock) return roBlock; // admin view: read-only
    const token = req.cookies.get(COOKIE_NAME)?.value ?? "";
    const userId = verifySessionToken(token);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const week = Number(body.week);
    const targetDay = Number(body.targetDay);

    if (!Number.isInteger(week) || !Number.isInteger(targetDay)) {
      return NextResponse.json({ error: "week and targetDay must be integers" }, { status: 400 });
    }
    if (targetDay < 1 || targetDay > 5) {
      return NextResponse.json({ error: "targetDay must be between 1 and 5" }, { status: 400 });
    }

    const chk = await checkUnlocked(userId, week, null);
    if (!chk.unlocked) {
      return NextResponse.json({ error: "Not unlocked yet" }, { status: 403 });
    }
    // Skip may only mark up to the currently-unlocked day — never past the drip.
    const cap = maxUnlockedDay(week, chk.progress, chk.prevWeekProgress, chk.version);
    const effectiveTarget = Math.min(targetDay, cap);
    const assessmentId = await getActiveAssessmentId(userId);
    if (effectiveTarget >= 1) {
      await skipToDay(userId, assessmentId, week, effectiveTarget, chk.progress);
    }
    return NextResponse.json({ ok: true, skippedTo: effectiveTarget });
  } catch (e) {
    console.error("[api/lms/skip]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
