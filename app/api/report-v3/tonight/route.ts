// Card 5 "Try this tonight" tap. Stores Worked / Partly / Didn't work (enum worked/mixed/didnt_land).
// DB-only — never forwarded to GA/Meta, and no child data is stored (only the session + the outcome).
// The plan hasn't started, so this pre-generates nothing; the client just shows the reply line.
import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";

assertBootGuards();
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID = ["worked", "mixed", "didnt_land"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const outcome = typeof body.outcome === "string" ? body.outcome : "";
    if (!UUID_RE.test(sessionId)) return NextResponse.json({ error: "bad session" }, { status: 400 });
    if (!VALID.includes(outcome)) return NextResponse.json({ error: "bad outcome" }, { status: 400 });
    await getSql()`INSERT INTO report_tonight_tap (session_id, outcome) VALUES (${sessionId}::uuid, ${outcome})`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/report-v3/tonight]", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
