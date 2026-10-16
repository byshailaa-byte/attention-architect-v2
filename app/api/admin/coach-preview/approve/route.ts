import { NextRequest, NextResponse } from "next/server";
import { assertBootGuards } from "@/lib/boot-guard";
import { coachTrialEnabled } from "@/lib/coach-trial/flags";
import { getTrialById } from "@/lib/coach-trial/trial";
import { grantRealTrial } from "@/lib/coach-trial/grant";
import { displayChildName } from "@/lib/report/pronouns";

assertBootGuards();

// Build the copyable WhatsApp message the admin sends BY HAND (WhatsApp auto-send is off). No
// outcome promises, no selling — just what it is + the sign-in link.
function waMessage(childName: string, link: string): string {
  const kid = (childName || "").trim().split(/\s+/)[0] || "your child";
  return `Hi! Here's your free 4-day Attention Coach for ${kid} — one small step a day, about 5 minutes. `
    + `Open it here (the link signs you straight in): ${link}\n\n`
    + `It runs for 4 days. If you get stuck, just reply here.`;
}

// Approve & offer: grant the REAL 4-day trial to the parent with the approved focus concern, stamp
// approved_by/approved_at, and return a copyable WhatsApp message with the trial link. Sends nothing
// automatically. Admin-only.
export async function POST(req: NextRequest) {
  if (!coachTrialEnabled()) return NextResponse.json({ error: "disabled" }, { status: 404 });
  try {
    const body = (await req.json().catch(() => ({}))) as { trialId?: string };
    const trialId = typeof body.trialId === "string" ? body.trialId : "";
    if (!trialId) return NextResponse.json({ error: "trialId required" }, { status: 400 });

    const preview = await getTrialById(trialId);
    if (!preview || !preview.is_preview) return NextResponse.json({ error: "no_preview" }, { status: 404 });
    if (!preview.session_id) return NextResponse.json({ error: "no_session" }, { status: 409 });

    const r = await grantRealTrial({
      sessionId: preview.session_id,
      focusConcern: preview.focus_concern,
      approvedBy: "admin",
      sendInvite: false, // admin sends the WhatsApp link by hand
    });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });

    return NextResponse.json({
      ok: true,
      trialId: r.trialId,
      trialLink: r.trialLink,
      waMessage: waMessage(displayChildName(r.childName), r.trialLink),
    });
  } catch (e) {
    console.error("[api/admin/coach-preview/approve]", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
