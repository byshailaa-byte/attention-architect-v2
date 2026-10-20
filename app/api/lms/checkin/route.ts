import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";
import { blockIfAdminView } from "@/lib/lms/admin-view-guard";
import { loadLmsUserContextById } from "@/lib/lms/user-context";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";
import { recordCheckin } from "@/lib/lms/coach/checkin";
import { baselineQuestion } from "@/lib/coach-trial/onboarding";
import { canonicalConcern } from "@/lib/report-v2/goal-mapping";

assertBootGuards();

// Paid weekly "where are you now?" capture — SAME options as the Day-0 baseline. Optional; the
// weekly results screen shows a direct number only if it improved vs the earliest (baseline) week.
export async function POST(req: NextRequest) {
  try {
    const roBlock = blockIfAdminView(req); if (roBlock) return roBlock;
    const userId = verifySessionToken(req.cookies.get(COOKIE_NAME)?.value ?? "");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ctx = await loadLmsUserContextById(userId);
    if (!ctx) return NextResponse.json({ error: "not_paid" }, { status: 403 });

    const body = (await req.json().catch(() => ({}))) as { week?: number; value?: string };
    const week = Number(body.week);
    const value = typeof body.value === "string" ? body.value : "";
    if (!Number.isInteger(week) || week < 1 || week > 6) return NextResponse.json({ error: "invalid week" }, { status: 400 });

    const sql = getSql();
    const rows = (await sql`
      SELECT a.concerns FROM assessments a JOIN purchases p ON p.assessment_id = a.id
      WHERE p.user_id = ${userId} AND p.status = 'paid' ORDER BY p.created_at DESC LIMIT 1
    `) as unknown as { concerns: string[] | null }[];
    const worry = canonicalConcern(rows[0]?.concerns?.[0]);
    const allowed = new Set(baselineQuestion(worry).chips.map((c) => c.value));
    if (!allowed.has(value)) return NextResponse.json({ error: "invalid value" }, { status: 400 });

    await recordCheckin("paid", userId, week, worry, value);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/lms/checkin]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
