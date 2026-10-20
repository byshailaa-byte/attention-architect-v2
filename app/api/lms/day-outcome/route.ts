import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";
import { blockIfAdminView } from "@/lib/lms/admin-view-guard";
import { getUserProgress } from "@/lib/lms/progress";
import { assertBootGuards } from "@/lib/boot-guard";
import { normalizeOutcome, recordPaidOutcome, isOutcome } from "@/lib/lms/coach/outcomes";

assertBootGuards();

// Accept the canonical 5 values AND the legacy 3 (back-compat with any older client), mapping both
// through normalizeOutcome so only the canonical vocabulary is ever stored.
const ACCEPTED = new Set(["tried_worked", "tried_partly", "tried_didnt_work", "missed", "unclear", "worked", "sort_of", "didnt_work"]);

// POST /api/lms/day-outcome { week, day, outcome, note? } — tap buttons. Only for a completed day.
export async function POST(req: NextRequest) {
  try {
    const roBlock = blockIfAdminView(req); if (roBlock) return roBlock; // admin view: read-only
    const userId = verifySessionToken(req.cookies.get(COOKIE_NAME)?.value ?? "");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const week = Number(body.week);
    const day = Number(body.day);
    const raw = String(body.outcome ?? "");
    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 160) : null;
    if (!Number.isInteger(week) || !Number.isInteger(day) || day < 1 || day > 5) {
      return NextResponse.json({ error: "week and day must be valid integers" }, { status: 400 });
    }
    if (!ACCEPTED.has(raw)) return NextResponse.json({ error: "invalid outcome" }, { status: 400 });
    const outcome = normalizeOutcome(raw);
    if (!isOutcome(outcome)) return NextResponse.json({ error: "invalid outcome" }, { status: 400 });

    // Only for days the user has actually completed (which implies the day was unlocked).
    const progress = await getUserProgress(userId, week);
    if (!progress.completedDays.has(day)) {
      return NextResponse.json({ error: "Not unlocked yet" }, { status: 403 });
    }

    await recordPaidOutcome(userId, week, day, outcome, note, "tap");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/lms/day-outcome]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
