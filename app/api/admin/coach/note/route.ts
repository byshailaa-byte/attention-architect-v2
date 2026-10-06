import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";

// Admin team note (parent can never see it). Autosave. Auth: middleware Basic Auth on /api/admin/*.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body.userId ?? "");
    const note = typeof body.note === "string" ? body.note.slice(0, 2000) : "";
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
    const sql = getSql();
    await sql`
      INSERT INTO coach_team_notes (user_id, note, updated_at) VALUES (${userId}, ${note}, now())
      ON CONFLICT (user_id) DO UPDATE SET note = EXCLUDED.note, updated_at = now()
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/admin/coach/note]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
