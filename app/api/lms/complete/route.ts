import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";
import {
  getUserProgress,
  isDayUnlocked,
  markDayComplete,
  getActiveAssessmentId,
} from "@/lib/lms/progress";
import { getSql } from "@/lib/db/client";
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

    // Fire lms_day_complete funnel event using assessment session_id if available
    if (assessmentId) {
      const sql = getSql();
      sql`
        SELECT session_id::text FROM assessments WHERE id = ${assessmentId}::uuid LIMIT 1
      `.then((rows) => {
        const row = (rows as unknown as { session_id: string }[])[0];
        if (!row?.session_id) return;
        return sql`
          INSERT INTO funnel_events (event_type, session_id, metadata)
          VALUES ('lms_day_complete', ${row.session_id}::uuid, ${JSON.stringify({ week, day })}::jsonb)
        `;
      }).catch((e: unknown) => console.warn("[funnel] lms_day_complete:", (e as Error).message));
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/lms/complete]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
