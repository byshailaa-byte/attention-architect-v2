import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";
import { coachTrialEnabled } from "@/lib/coach-trial/flags";
import { parentKey } from "@/lib/coach-trial/parent-key";
import { createPreviewTrial } from "@/lib/coach-trial/trial";
import { readTrialCard4 } from "@/lib/coach-trial/content";
import { canonicalConcern } from "@/lib/report-v2/goal-mapping";
import { upsertUserByEmail } from "@/lib/auth/password";

assertBootGuards();

// Fixed synthetic owner for ALL preview trials — keeps user_id FK satisfied without ever attaching
// a sandbox trial to a real parent account. Previews are resolved by trial id, not by this user.
const PREVIEW_OWNER_EMAIL = "coach-preview@internal.attentionarchitect.local";

// Create a SANDBOX Preview Coach trial for a parent's assessment. Admin-only (/api/admin/* Basic
// Auth). Never emails, never queues a call, never fires analytics. Sends NOTHING to the parent.
// is_preview=true → excluded from the one-real-trial-per-parent rule and from all metrics.
export async function POST(req: NextRequest) {
  if (!coachTrialEnabled()) return NextResponse.json({ error: "disabled" }, { status: 404 });
  try {
    const body = (await req.json().catch(() => ({}))) as { sessionId?: string; focusConcern?: string };
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    const focusConcern = typeof body.focusConcern === "string" && body.focusConcern.trim()
      ? body.focusConcern.trim().slice(0, 200) : null;

    const sql = getSql();
    const rows = (await sql`
      SELECT id, phone, email, age_band, archetype, concerns
      FROM assessments WHERE session_id = ${sessionId}::uuid LIMIT 1
    `) as unknown as {
      id: string; phone: string | null; email: string | null;
      age_band: string | null; archetype: string | null; concerns: string[] | null;
    }[];
    const a = rows[0];
    if (!a) return NextResponse.json({ error: "assessment not found" }, { status: 404 });

    // Day 1 is the parent's report card-4 — a preview needs it too (same gate as a real grant).
    const card4 = await readTrialCard4(sql, sessionId);
    if (!card4) return NextResponse.json({ error: "no_report" }, { status: 409 });

    const pkey = parentKey(a.phone, a.email) ?? `preview:${sessionId}`;
    const ownerId = await upsertUserByEmail(PREVIEW_OWNER_EMAIL);

    // One live preview per parent: clear any prior sandbox previews (+ their messages) first.
    const prior = (await sql`SELECT id FROM coach_trials WHERE parent_key = ${pkey} AND is_preview = true`) as unknown as { id: string }[];
    for (const p of prior) {
      await sql`DELETE FROM coach_messages WHERE trial_id = ${p.id}::uuid`;
      await sql`DELETE FROM coach_trials  WHERE id = ${p.id}::uuid`;
    }

    const worry = canonicalConcern(a.concerns?.[0]);
    const trial = await createPreviewTrial({
      userId: ownerId, parentKey: pkey, sessionId, worry,
      archetype: a.archetype, ageBand: a.age_band, ownerAdmin: "admin", focusConcern,
    });
    if (!trial) return NextResponse.json({ error: "failed" }, { status: 500 });

    return NextResponse.json({ ok: true, trialId: trial.id, previewUrl: `/admin/coach-preview/${trial.id}` });
  } catch (e) {
    console.error("[api/admin/coach-preview/create]", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
