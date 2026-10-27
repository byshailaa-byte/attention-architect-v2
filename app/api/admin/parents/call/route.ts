// POST /api/admin/parents/call — log a call from the Parents side panel.
// Admin-only (middleware HTTP Basic Auth on /api/admin/*). The Basic Auth username (before the
// colon) is stored as call_log.called_by; the middleware only checks the password.
// Body: { assessmentId (uuid), outcome, note?, followUpAt? (ISO|null), nextSteps?, status?, objection?, durationSec? }.
import { NextRequest, NextResponse } from "next/server";
import { logParentCall } from "@/lib/admin/parents/detail";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

type Body = {
  assessmentId?: string; outcome?: string; note?: string; followUpAt?: string | null;
  nextSteps?: string; status?: string; objection?: string; durationSec?: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const assessmentId = (body.assessmentId ?? "").trim();
    const outcome = (body.outcome ?? "").trim();
    if (!UUID_RE.test(assessmentId)) return NextResponse.json({ error: "Invalid assessmentId" }, { status: 400 });

    let followUpAt: string | null = null;
    if (body.followUpAt) {
      const t = new Date(body.followUpAt);
      if (Number.isNaN(t.getTime())) return NextResponse.json({ error: "Invalid followUpAt" }, { status: 400 });
      followUpAt = t.toISOString();
    }

    const clip = (s: unknown, n: number) => (typeof s === "string" && s.trim() ? s.trim().slice(0, n) : null);
    const result = await logParentCall({
      assessmentId, outcome,
      note: clip(body.note, 4000),
      nextSteps: clip(body.nextSteps, 2000),
      status: clip(body.status, 40),
      objection: clip(body.objection, 40),
      durationSec: typeof body.durationSec === "number" && body.durationSec >= 0 ? Math.round(body.durationSec) : null,
      followUpAt,
      calledBy: callerFromAuth(req),
    });

    if (!result.ok) {
      const code = result.reason === "not_enabled" ? 200 : 400;
      return NextResponse.json({ ok: false, reason: result.reason }, { status: code });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/parents/call]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
