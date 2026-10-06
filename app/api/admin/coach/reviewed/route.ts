import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";

// Mark a thread reviewed: stamps reviewed_at on its unreviewed safety/👎 messages (clears the
// "Needs a look" state + the sidebar badge). Auth: middleware Basic Auth on /api/admin/*.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body.userId ?? "");
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
    const sql = getSql();
    await sql`
      UPDATE coach_messages SET reviewed_at = now()
      WHERE user_id = ${userId} AND reviewed_at IS NULL AND (safety_flag = true OR feedback = -1)
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/admin/coach/reviewed]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
