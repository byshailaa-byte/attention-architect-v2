import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";
import { blockIfAdminView } from "@/lib/lms/admin-view-guard";
import { getUserProgress } from "@/lib/lms/progress";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";

assertBootGuards();

const OUTCOMES = new Set(["worked", "sort_of", "didnt_work"]);

// POST /api/lms/day-outcome { week, day, outcome } — only for a day the user has completed.
export async function POST(req: NextRequest) {
  try {
    const roBlock = blockIfAdminView(req); if (roBlock) return roBlock; // admin view: read-only
    const userId = verifySessionToken(req.cookies.get(COOKIE_NAME)?.value ?? "");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const week = Number(body.week);
    const day = Number(body.day);
    const outcome = String(body.outcome ?? "");
    if (!Number.isInteger(week) || !Number.isInteger(day) || day < 1 || day > 5) {
      return NextResponse.json({ error: "week and day must be valid integers" }, { status: 400 });
    }
    if (!OUTCOMES.has(outcome)) return NextResponse.json({ error: "invalid outcome" }, { status: 400 });

    // Only for days the user has actually completed (which implies the day was unlocked).
    const progress = await getUserProgress(userId, week);
    if (!progress.completedDays.has(day)) {
      return NextResponse.json({ error: "Not unlocked yet" }, { status: 403 });
    }

    const sql = getSql();
    await sql`INSERT INTO lms_day_outcome (user_id, week, day, outcome) VALUES (${userId}, ${week}, ${day}, ${outcome})`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/lms/day-outcome]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
