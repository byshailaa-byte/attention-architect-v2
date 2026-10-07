// POST /api/admin/calls — log a call from the admin A2 call screen.
// Admin-only: protected by the same middleware HTTP Basic Auth as every other /api/admin/*
// route (see middleware.ts). The Basic Auth username (the part before ":") is stored as
// call_log.called_by; the middleware only checks the password, so the username is free-form.
//
// Body: { leadId (assessment uuid), outcome (one of 8), notes?, followUpAt? (ISO | null) }.
// The segment is computed server-side from the lead's current state. When call_log hasn't been
// migrated on this environment yet, responds 200 { ok:false, enabled:false } so the UI can show
// "Call logging not enabled yet" instead of a 500.
import { NextRequest, NextResponse } from "next/server";
import { logCallForLead, CALL_LOG_OUTCOMES } from "@/lib/admin/crm/real";
import type { CallLogOutcome } from "@/lib/admin/call-queue";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Body = { leadId?: string; outcome?: string; notes?: string; followUpAt?: string | null };

// The operator identity from Basic Auth (username before the colon). Never the password.
function callerFromAuth(req: NextRequest): string {
  const auth = req.headers.get("authorization") ?? "";
  try {
    const decoded = atob(auth.replace(/^Basic\s+/i, ""));
    const user = decoded.slice(0, decoded.indexOf(":"));
    return user.trim() || "admin";
  } catch {
    return "admin";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const leadId = (body.leadId ?? "").trim();
    const outcome = (body.outcome ?? "").trim();

    if (!UUID_RE.test(leadId)) {
      return NextResponse.json({ error: "Invalid or missing leadId" }, { status: 400 });
    }
    if (!CALL_LOG_OUTCOMES.includes(outcome as CallLogOutcome)) {
      return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
    }

    let followUpAt: string | null = null;
    if (body.followUpAt) {
      const t = new Date(body.followUpAt);
      if (Number.isNaN(t.getTime())) {
        return NextResponse.json({ error: "Invalid followUpAt" }, { status: 400 });
      }
      followUpAt = t.toISOString();
    }

    const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim().slice(0, 4000) : null;

    const result = await logCallForLead({
      assessmentId: leadId,
      outcome: outcome as CallLogOutcome,
      notes,
      followUpAt,
      calledBy: callerFromAuth(req),
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, enabled: false }, { status: 200 });
    }
    return NextResponse.json({ ok: true, enabled: true });
  } catch (e) {
    console.error("[admin/calls]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
