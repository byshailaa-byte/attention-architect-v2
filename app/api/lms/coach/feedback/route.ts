import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";
import { blockIfAdminView } from "@/lib/lms/admin-view-guard";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";

assertBootGuards();

// POST /api/lms/coach/feedback { messageId, value: 1 | -1, reason? } — own coach messages only.
export async function POST(req: NextRequest) {
  try {
    const roBlock = blockIfAdminView(req); if (roBlock) return roBlock; // admin view: read-only
    const userId = verifySessionToken(req.cookies.get(COOKIE_NAME)?.value ?? "");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const messageId = typeof body.messageId === "string" ? body.messageId : "";
    const value = Number(body.value);
    const reason = typeof body.reason === "string" ? body.reason.slice(0, 200) : null;
    if (!messageId) return NextResponse.json({ error: "messageId required" }, { status: 400 });
    if (value !== 1 && value !== -1) return NextResponse.json({ error: "value must be 1 or -1" }, { status: 400 });

    const sql = getSql();
    const rows = (await sql`
      UPDATE coach_messages SET feedback = ${value}, feedback_reason = ${reason}
      WHERE id = ${messageId}::uuid AND user_id = ${userId} AND role = 'coach'
      RETURNING id
    `) as unknown as { id: string }[];
    if (rows.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/lms/coach/feedback]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
