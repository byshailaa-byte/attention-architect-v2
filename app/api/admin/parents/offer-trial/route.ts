// POST /api/admin/parents/offer-trial — "Offer trial" from the Parents panel. Reuses the EXISTING
// trial system (grantRealTrial): grants/activates the real 4-day trial, stamps approved_by=admin,
// auto-logs a call_log entry with outcome 'trial_offered', and returns the sign-in link + the
// copyable WhatsApp message the admin sends by hand. Admin-only (middleware Basic Auth on /api/admin/*).
import { NextRequest, NextResponse } from "next/server";
import { coachTrialEnabled } from "@/lib/coach-trial/flags";
import { grantRealTrial } from "@/lib/coach-trial/grant";
import { getTrialByParentKey } from "@/lib/coach-trial/trial";
import { parentKey } from "@/lib/coach-trial/parent-key";
import { trialLinkFor } from "@/lib/coach-trial/link";
import { displayChildName } from "@/lib/report/pronouns";
import { getSql } from "@/lib/db/client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Same message the old Approve & offer sends (kept identical so the parent experience is unchanged).
function waMessage(childName: string, link: string): string {
  const kid = (childName || "").trim().split(/\s+/)[0] || "your child";
  return `Hi! Here's your free 4-day Attention Coach for ${kid} — one small step a day, about 5 minutes. `
    + `Open it here (the link signs you straight in): ${link}\n\n`
    + `It runs for 4 days. If you get stuck, just reply here.`;
}

function callerFromAuth(req: NextRequest): string {
  const auth = req.headers.get("authorization") ?? "";
  try { const d = atob(auth.replace(/^Basic\s+/i, "")); const u = d.slice(0, d.indexOf(":")); return u.trim() || "admin"; }
  catch { return "admin"; }
}

export async function POST(req: NextRequest) {
  if (!coachTrialEnabled()) return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });
  try {
    const body = (await req.json().catch(() => ({}))) as { sessionId?: string; assessmentId?: string };
    const sessionId = (body.sessionId ?? "").trim();
    const assessmentId = (body.assessmentId ?? "").trim();
    if (!UUID_RE.test(sessionId)) return NextResponse.json({ ok: false, error: "bad_session" }, { status: 400 });

    const sql = getSql();
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? req.nextUrl.origin;

    const r = await grantRealTrial({ sessionId, approvedBy: "admin", sendInvite: false });

    if (r.ok) {
      // Auto-log the offer as a call (outcome trial_offered); the live trial then buckets the parent
      // as "Trial in progress" via coach_trials.status='active'.
      if (UUID_RE.test(assessmentId)) {
        await sql`
          INSERT INTO call_log (assessment_id, segment, outcome, notes, called_by)
          VALUES (${assessmentId}::uuid, 'parents', 'trial_offered', 'Offered the 4-day Coach trial.', ${callerFromAuth(req)})
        `.catch(() => {});
      }
      return NextResponse.json({ ok: true, trialId: r.trialId, trialLink: r.trialLink, waMessage: waMessage(displayChildName(r.childName), r.trialLink) });
    }

    // Already has a live trial → re-offer the existing link (don't create a duplicate, don't re-log).
    if (r.error === "already_trialed") {
      const arow = (await sql`SELECT phone, email, child_name FROM assessments WHERE session_id = ${sessionId}::uuid LIMIT 1`) as unknown as { phone: string | null; email: string | null; child_name: string | null }[];
      const a = arow[0];
      const pkey = a ? parentKey(a.phone, a.email) : null;
      const trial = pkey ? await getTrialByParentKey(pkey) : null;
      if (trial && trial.status === "active") {
        const link = trialLinkFor(base, trial.id, trial.ends_at);
        return NextResponse.json({ ok: true, alreadyActive: true, trialId: trial.id, trialLink: link, waMessage: waMessage(displayChildName(a?.child_name ?? ""), link) });
      }
    }
    return NextResponse.json({ ok: false, error: r.error }, { status: r.status ?? 400 });
  } catch (e) {
    console.error("[api/admin/parents/offer-trial]", e);
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
}
