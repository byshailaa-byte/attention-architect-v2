import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";
import { coachTrialEnabled } from "@/lib/coach-trial/flags";
import { getTrialById } from "@/lib/coach-trial/trial";

assertBootGuards();

// Save the preview onboarding baseline/commit (mirrors /api/coach/onboarding, but keyed by trialId
// and restricted to preview trials). Admin-only. No analytics.
export async function POST(req: NextRequest) {
  if (!coachTrialEnabled()) return NextResponse.json({ error: "disabled" }, { status: 404 });
  try {
    const body = (await req.json().catch(() => ({}))) as { trialId?: string; baselineValue?: string; commitSlot?: string };
    const trialId = typeof body.trialId === "string" ? body.trialId : "";
    if (!trialId) return NextResponse.json({ error: "trialId required" }, { status: 400 });
    const trial = await getTrialById(trialId);
    if (!trial || !trial.is_preview) return NextResponse.json({ error: "no_preview" }, { status: 404 });

    const baselineValue = typeof body.baselineValue === "string" ? body.baselineValue.slice(0, 40) : null;
    const commitSlot = typeof body.commitSlot === "string" ? body.commitSlot.slice(0, 40) : null;

    const sql = getSql();
    await sql`
      UPDATE coach_trials
      SET baseline_value = COALESCE(${baselineValue}, baseline_value),
          commit_slot    = COALESCE(${commitSlot}, commit_slot)
      WHERE id = ${trialId}::uuid
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/admin/coach-preview/onboarding]", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
