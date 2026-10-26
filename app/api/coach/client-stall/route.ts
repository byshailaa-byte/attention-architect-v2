import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";
import { assertBootGuards } from "@/lib/boot-guard";
import { getSql } from "@/lib/db/client";

assertBootGuards();
export const dynamic = "force-dynamic";
export const maxDuration = 10;

const int = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : null; };

// Diagnostic beacon. The chat UI POSTs here when its 20s stall watchdog fires or a stream closes with
// no terminal {done}. METRICS ONLY — never any message text. Logged at error level (this project
// retains error logs) and stored in coach_client_stall for /admin/coach-review. Always returns 200 so
// a telemetry hiccup never surfaces to the parent.
export async function POST(req: NextRequest) {
  try {
    const b = await req.json().catch(() => ({}) as Record<string, unknown>);
    const userId = verifySessionToken(req.cookies.get(COOKIE_NAME)?.value ?? "") || null;
    const trialId = typeof b.trialId === "string" && b.trialId ? b.trialId : null;
    const kind = trialId ? "trial-or-preview" : (userId ? "paid-or-trial" : null);
    const subjectId = trialId ?? userId;
    const turnId = String(b.turnId ?? "").slice(0, 64);
    const ms = int(b.ms), bytes = int(b.bytes), deltas = int(b.deltas);
    const done = b.done === true;
    const lastEvent = String(b.lastEvent ?? "").slice(0, 24);
    const reason = String(b.reason ?? "").slice(0, 32);
    const ua = (req.headers.get("user-agent") ?? "").slice(0, 200);
    console.error(`[coach/client-stall] turn=${turnId} kind=${kind} subject=${subjectId ?? "-"} ms=${ms} bytes=${bytes} deltas=${deltas} done=${done} last=${lastEvent} reason=${reason} ua=${ua.slice(0, 70)}`);
    await getSql()`
      INSERT INTO coach_client_stall (kind, subject_id, user_id, turn_id, ms, bytes, deltas, done, last_event, reason, user_agent)
      VALUES (${kind}, ${subjectId}, ${userId}, ${turnId}, ${ms}, ${bytes}, ${deltas}, ${done}, ${lastEvent}, ${reason}, ${ua})
    `.catch((e: unknown) => console.error("[coach/client-stall] insert failed:", (e as Error).message));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
