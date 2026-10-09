import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";
import { assertBootGuards } from "@/lib/boot-guard";
import { coachTrialEnabled } from "@/lib/coach-trial/flags";
import { resolveCoachAccess } from "@/lib/coach-trial/access";

assertBootGuards();

// Save the onboarding baseline number and/or commit slot for the current trial. Either field may
// be sent on its own (baseline on step c, commit slot on step e).
export async function POST(req: NextRequest) {
  if (!coachTrialEnabled()) return NextResponse.json({ error: "disabled" }, { status: 404 });
  try {
    const userId = verifySessionToken(req.cookies.get(COOKIE_NAME)?.value ?? "");
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const access = await resolveCoachAccess(userId);
    if (access.role !== "trial") return NextResponse.json({ error: "no_trial" }, { status: 403 });

    const body = (await req.json()) as { baselineValue?: string; commitSlot?: string };
    const baselineValue = typeof body.baselineValue === "string" ? body.baselineValue.slice(0, 40) : null;
    const commitSlot = typeof body.commitSlot === "string" ? body.commitSlot.slice(0, 40) : null;

    const sql = getSql();
    await sql`
      UPDATE coach_trials
      SET baseline_value = COALESCE(${baselineValue}, baseline_value),
          commit_slot    = COALESCE(${commitSlot}, commit_slot)
      WHERE id = ${access.trial.id}::uuid
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/coach/onboarding]", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
