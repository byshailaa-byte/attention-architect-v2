// Shared real-trial grant. The live admin grant route and the Preview-Coach "Approve & offer" flow
// both go through here so eligibility + side-effects never drift. A grant: checks eligibility
// (not paid, has contact, report card-4 ready, not already REAL-trialed), creates/【re】uses the
// users row, creates the real coach_trials row (is_preview=false), optionally emails the login
// invite, queues the Day-4 "Trial ends" call, and fires trial_started.
import { getSql } from "@/lib/db/client";
import { parentKey } from "@/lib/coach-trial/parent-key";
import { createTrial, setTrialApproved, dayUnlockAt, trialLinkBase } from "@/lib/coach-trial/trial";
import { readTrialCard4 } from "@/lib/coach-trial/content";
import { canonicalConcern } from "@/lib/report-v2/goal-mapping";
import { upsertUserByEmail, createResetToken } from "@/lib/auth/password";
import { sendCoachTrialInvite } from "@/lib/auth/email";
import { trialLinkFor } from "@/lib/coach-trial/link";
import { trackServer } from "@/lib/analytics/track.server";

export type GrantOutcome =
  | { ok: true; trialId: string; emailed: boolean; trialLink: string; childName: string; endsAt: string }
  | { ok: false; error: string; status: number };

export async function grantRealTrial(opts: {
  sessionId: string;
  focusConcern?: string | null;   // approved focus (Preview flow); stored on the real trial, extra prompt context
  approvedBy?: string | null;     // "admin" when coming from Approve & offer; null for a plain grant
  sendInvite?: boolean;           // email the login link (true for plain grant; false when admin sends the link manually)
}): Promise<GrantOutcome> {
  const { sessionId, focusConcern = null, approvedBy = null, sendInvite = true } = opts;
  const sql = getSql();

  const rows = (await sql`
    SELECT id, child_name, email, phone, age_band, archetype, concerns
    FROM assessments WHERE session_id = ${sessionId}::uuid LIMIT 1
  `) as unknown as {
    id: string; child_name: string | null; email: string | null; phone: string | null;
    age_band: string | null; archetype: string | null; concerns: string[] | null;
  }[];
  const a = rows[0];
  if (!a) return { ok: false, error: "assessment not found", status: 404 };

  const paid = (await sql`SELECT 1 FROM purchases WHERE assessment_id = ${a.id} AND status = 'paid' LIMIT 1`) as unknown as unknown[];
  if (paid.length > 0) return { ok: false, error: "already_paid", status: 409 };

  const pkey = parentKey(a.phone, a.email);
  if (!pkey) return { ok: false, error: "no_contact", status: 400 };

  const card4 = await readTrialCard4(sql, sessionId);
  if (!card4) return { ok: false, error: "no_report", status: 409 };

  // Already had a REAL trial? (partial unique index covers is_preview=false; a preview never blocks.)
  const existing = (await sql`SELECT id FROM coach_trials WHERE parent_key = ${pkey} AND is_preview = false LIMIT 1`) as unknown as { id: string }[];
  if (existing.length > 0) return { ok: false, error: "already_trialed", status: 409 };

  let userId: string;
  if (a.email && a.email.trim()) {
    userId = await upsertUserByEmail(a.email.trim());
  } else {
    const u = (await sql`INSERT INTO users (phone) VALUES (${a.phone}) RETURNING id`) as unknown as { id: string }[];
    userId = u[0].id;
  }

  const worry = canonicalConcern(a.concerns?.[0]);
  const started = new Date();
  const trial = await createTrial({
    userId, parentKey: pkey, sessionId, worry, archetype: a.archetype, ageBand: a.age_band,
    grantedBy: "admin", startedAt: started,
  });
  if (!trial) return { ok: false, error: "already_trialed", status: 409 };

  // Store the approved focus + approval stamp on the real trial.
  if (focusConcern && focusConcern.trim()) {
    await sql`UPDATE coach_trials SET focus_concern = ${focusConcern.trim().slice(0, 200)} WHERE id = ${trial.id}::uuid`;
  }
  if (approvedBy) await setTrialApproved(trial.id, approvedBy);

  let emailed = false;
  if (sendInvite && a.email && a.email.trim()) {
    try {
      const base = trialLinkBase();
      const raw = await createResetToken(userId);
      await sendCoachTrialInvite(a.email.trim().toLowerCase(), a.child_name ?? "", `${base}/lms/reset-password?token=${raw}`);
      emailed = true;
    } catch (e) { console.warn("[coach-trial/grant] email failed:", (e as Error).message); }
  }

  await sql`
    INSERT INTO call_log (assessment_id, segment, notes, follow_up_at)
    VALUES (${a.id}, 'trial', 'Trial ends', ${dayUnlockAt(started, 4).toISOString()})
  `.catch((e: unknown) => console.warn("[coach-trial/grant] call_log:", (e as Error).message));

  await trackServer("trial_started", { worry }, { sessionId });

  const trialLink = trialLinkFor(trialLinkBase(), trial.id, trial.ends_at);
  return { ok: true, trialId: trial.id, emailed, trialLink, childName: a.child_name ?? "", endsAt: trial.ends_at };
}
