import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";
import {
  getUserProgress,
  isDayUnlocked,
  markDayComplete,
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
    const day = Number(body.day);

    if (!Number.isInteger(week) || !Number.isInteger(day)) {
      return NextResponse.json({ error: "week and day must be integers" }, { status: 400 });
    }

    const progress = await getUserProgress(userId, week);
    if (!isDayUnlocked(day, progress)) {
      return NextResponse.json({ error: "Day not yet unlocked" }, { status: 403 });
    }

    const assessmentId = await getActiveAssessmentId(userId);
    await markDayComplete(userId, assessmentId, week, day);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/lms/complete]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
