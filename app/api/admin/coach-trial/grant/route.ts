import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";
import { coachTrialEnabled } from "@/lib/coach-trial/flags";
import { parentKey } from "@/lib/coach-trial/parent-key";
import { createTrial, dayUnlockAt } from "@/lib/coach-trial/trial";
import { readTrialCard4 } from "@/lib/coach-trial/content";
import { canonicalConcern } from "@/lib/report-v2/goal-mapping";
import { upsertUserByEmail, createResetToken } from "@/lib/auth/password";
import { sendCoachTrialInvite } from "@/lib/auth/email";
import { trackServer } from "@/lib/analytics/track.server";

assertBootGuards();

// Grant a free 4-day Quick Start from the admin call screen. Auth: middleware Basic Auth on
// /api/admin/*. Creates the trial, a users row (if none), emails the login link, queues the
// Day-4 "Trial ends" call, and fires trial_started.
export async function POST(req: NextRequest) {
  if (!coachTrialEnabled()) return NextResponse.json({ error: "disabled" }, { status: 404 });
  try {
    const { sessionId } = (await req.json()) as { sessionId?: string };
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

    const sql = getSql();
    const rows = (await sql`
      SELECT id, child_name, email, phone, age_band, archetype, goal_key, concerns
      FROM assessments WHERE session_id = ${sessionId}::uuid LIMIT 1
    `) as unknown as {
      id: string; child_name: string | null; email: string | null; phone: string | null;
      age_band: string | null; archetype: string | null; goal_key: string | null; concerns: string[] | null;
    }[];
    const a = rows[0];
    if (!a) return NextResponse.json({ error: "assessment not found" }, { status: 404 });

    // Already paid? Not eligible.
    const paid = (await sql`SELECT 1 FROM purchases WHERE assessment_id = ${a.id} AND status = 'paid' LIMIT 1`) as unknown as unknown[];
    if (paid.length > 0) return NextResponse.json({ error: "already_paid" }, { status: 409 });

    const pkey = parentKey(a.phone, a.email);
    if (!pkey) return NextResponse.json({ error: "no_contact" }, { status: 400 });

    // Day 1 is the parent's report card-4 — block the grant if the report has no usable card-4.
    const card4 = await readTrialCard4(sql, sessionId);
    if (!card4) return NextResponse.json({ error: "no_report" }, { status: 409 });

    // Already had a trial? (unique parent_key). Report cleanly without creating a second.
    const existing = (await sql`SELECT id FROM coach_trials WHERE parent_key = ${pkey} LIMIT 1`) as unknown as { id: string }[];
    if (existing.length > 0) return NextResponse.json({ error: "already_trialed" }, { status: 409 });

    // User row (prefer email). Phone-only leads get a users row keyed by phone.
    let userId: string;
    if (a.email && a.email.trim()) {
      userId = await upsertUserByEmail(a.email.trim());
    } else {
      const u = (await sql`
        INSERT INTO users (phone) VALUES (${a.phone}) RETURNING id
      `) as unknown as { id: string }[];
      userId = u[0].id;
    }

    const worry = canonicalConcern(a.goal_key ?? a.concerns?.[0] ?? "other");
    const started = new Date();
    const trial = await createTrial({
      userId, parentKey: pkey, sessionId, worry, archetype: a.archetype, ageBand: a.age_band,
      grantedBy: "admin", startedAt: started,
    });
    if (!trial) return NextResponse.json({ error: "already_trialed" }, { status: 409 });

    // Email the login link (reuse the set-password/reset flow → lands in /coach for trial users).
    let emailed = false;
    if (a.email && a.email.trim()) {
      try {
        const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://attentionparents.thehumandecision.in";
        const raw = await createResetToken(userId);
        await sendCoachTrialInvite(a.email.trim().toLowerCase(), a.child_name ?? "", `${base}/lms/reset-password?token=${raw}`);
        emailed = true;
      } catch (e) { console.warn("[coach-trial/grant] email failed:", (e as Error).message); }
    }

    // Queue the Day-4 "Trial ends" call.
    await sql`
      INSERT INTO call_log (assessment_id, segment, notes, follow_up_at)
      VALUES (${a.id}, 'trial', 'Trial ends', ${dayUnlockAt(started, 4).toISOString()})
    `.catch((e: unknown) => console.warn("[coach-trial/grant] call_log:", (e as Error).message));

    await trackServer("trial_started", { worry }, { sessionId });

    return NextResponse.json({ ok: true, trialId: trial.id, emailed });
  } catch (e) {
    console.error("[api/admin/coach-trial/grant]", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
