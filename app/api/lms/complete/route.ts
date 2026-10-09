import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";
import { blockIfAdminView } from "@/lib/lms/admin-view-guard";
import { markDayComplete, getActiveAssessmentId } from "@/lib/lms/progress";
import { checkUnlocked } from "@/lib/lms/unlock-gate";
import { getSql } from "@/lib/db/client";
import { trackServer } from "@/lib/analytics/track.server";
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
    const day = Number(body.day);

    if (!Number.isInteger(week) || !Number.isInteger(day)) {
      return NextResponse.json({ error: "week and day must be integers" }, { status: 400 });
    }

    const { unlocked } = await checkUnlocked(userId, week, day);
    if (!unlocked) {
      return NextResponse.json({ error: "Not unlocked yet" }, { status: 403 });
    }

    const assessmentId = await getActiveAssessmentId(userId);
    await markDayComplete(userId, assessmentId, week, day);

    // Fire lms_day_complete funnel event using assessment session_id if available
    if (assessmentId) {
      const sql = getSql();
      sql`
        SELECT session_id::text FROM assessments WHERE id = ${assessmentId}::uuid LIMIT 1
      `.then((rows) => {
        const row = (rows as unknown as { session_id: string }[])[0];
        if (!row?.session_id) return;
        return trackServer("lms_day_complete", { week, day }, { sessionId: row.session_id });
      }).catch((e: unknown) => console.warn("[funnel] lms_day_complete:", (e as Error).message));
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/lms/complete]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
