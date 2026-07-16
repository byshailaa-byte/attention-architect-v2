import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";
import {
  getUserProgress,
  skipToDay,
  getActiveAssessmentId,
} from "@/lib/lms/progress";
import { assertBootGuards } from "@/lib/boot-guard";

assertBootGuards();

export async function POST(req: NextRequest) {
  try {
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

    const [progress, assessmentId] = await Promise.all([
      getUserProgress(userId, week),
      getActiveAssessmentId(userId),
    ]);
    await skipToDay(userId, assessmentId, week, targetDay, progress);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/lms/skip]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
