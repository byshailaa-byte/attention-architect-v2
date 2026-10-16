import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";
import { coachTrialEnabled } from "@/lib/coach-trial/flags";

assertBootGuards();

// Flag a single Coach reply during a preview for later review — stores the admin note + timestamp on
// the coach_messages row (only within preview trials). Admin-only. The message content stays in the
// row; we just attach admin_flag_note + admin_flagged_at.
export async function POST(req: NextRequest) {
  if (!coachTrialEnabled()) return NextResponse.json({ error: "disabled" }, { status: 404 });
  try {
    const body = (await req.json().catch(() => ({}))) as { messageId?: string; note?: string };
    const messageId = typeof body.messageId === "string" ? body.messageId : "";
    if (!/^[0-9a-f-]{36}$/i.test(messageId)) return NextResponse.json({ error: "messageId required" }, { status: 400 });
    const note = typeof body.note === "string" ? body.note.slice(0, 500) : null;

    const sql = getSql();
    const rows = (await sql`
      UPDATE coach_messages m
      SET admin_flagged_at = now(), admin_flag_note = ${note}
      FROM coach_trials t
      WHERE m.id = ${messageId}::uuid AND m.trial_id = t.id AND t.is_preview = true
      RETURNING m.id
    `) as unknown as { id: string }[];
    if (rows.length === 0) return NextResponse.json({ error: "not_a_preview_message" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/admin/coach-preview/flag]", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
