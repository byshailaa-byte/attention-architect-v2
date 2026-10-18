import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";
import { coachTrialEnabled } from "@/lib/coach-trial/flags";
import { getTrialById } from "@/lib/coach-trial/trial";

assertBootGuards();

// Reset a preview: wipe its transcript + onboarding (baseline/commit) so it replays from Day 0.
// Optionally change the focus concern in the same call ("Regenerate with new focus"). Admin-only,
// preview trials only.
export async function POST(req: NextRequest) {
  if (!coachTrialEnabled()) return NextResponse.json({ error: "disabled" }, { status: 404 });
  try {
    const body = (await req.json().catch(() => ({}))) as { trialId?: string; focusConcern?: string };
    const trialId = typeof body.trialId === "string" ? body.trialId : "";
    if (!trialId) return NextResponse.json({ error: "trialId required" }, { status: 400 });
    const trial = await getTrialById(trialId);
    if (!trial || !trial.is_preview) return NextResponse.json({ error: "no_preview" }, { status: 404 });

    const sql = getSql();
    await sql`DELETE FROM coach_messages WHERE trial_id = ${trialId}::uuid`;
    // Also wipe the conversational-Coach state so the preview truly replays from Day 0.
    await sql`DELETE FROM coach_trial_day_outcome WHERE trial_id = ${trialId}::uuid`;
    await sql`DELETE FROM coach_tracked_number WHERE kind = 'trial' AND subject_id = ${trialId}`;
    await sql`DELETE FROM parent_memory WHERE kind = 'trial' AND subject_id = ${trialId}`;
    await sql`DELETE FROM coach_call_request WHERE kind = 'trial' AND subject_id = ${trialId}`;
    await sql`DELETE FROM coach_checkin_number WHERE kind = 'trial' AND subject_id = ${trialId}`;
    // focusConcern present (even empty string) → update it; absent → leave as-is.
    if (typeof body.focusConcern === "string") {
      const focus = body.focusConcern.trim().slice(0, 200) || null;
      await sql`UPDATE coach_trials SET baseline_value = NULL, commit_slot = NULL, focus_concern = ${focus} WHERE id = ${trialId}::uuid`;
    } else {
      await sql`UPDATE coach_trials SET baseline_value = NULL, commit_slot = NULL WHERE id = ${trialId}::uuid`;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/admin/coach-preview/reset]", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
