import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";

// Admin edits the Coach's memory facts for a user. Auth: middleware Basic Auth on /api/admin/*.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body.userId ?? "");
    const facts = Array.isArray(body.facts) ? body.facts.filter((f: unknown) => typeof f === "string" && f.trim()).slice(0, 20) : [];
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
    const sql = getSql();
    await sql`
      INSERT INTO coach_memory (user_id, facts, summary, updated_at)
      VALUES (${userId}, ${JSON.stringify(facts)}::jsonb, COALESCE((SELECT summary FROM coach_memory WHERE user_id=${userId}), ''), now())
      ON CONFLICT (user_id) DO UPDATE SET facts = EXCLUDED.facts, updated_at = now()
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/admin/coach/memory]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
