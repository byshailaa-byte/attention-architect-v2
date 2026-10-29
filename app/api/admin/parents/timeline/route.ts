// GET /api/admin/parents/timeline?sids=<sessionId,...> — the merged parent timeline.
// Admin-only (middleware Basic Auth). Derives phone + child names server-side from the assessments.
import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { getParentTimeline, type TimelineInput } from "@/lib/admin/parents/timeline";

export const dynamic = "force-dynamic";

async function withRetry<T>(fn: () => Promise<T>, tries = 6): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) { try { return await fn(); } catch (e) { last = e; await new Promise((r) => setTimeout(r, 300 * (i + 1))); } }
  throw last;
}

export async function GET(req: NextRequest) {
  try {
    const sids = (req.nextUrl.searchParams.get("sids") ?? "").split(",").map((s) => s.trim()).filter((s) => /^[0-9a-f-]{36}$/i.test(s));
    if (!sids.length) return NextResponse.json({ error: "no sids" }, { status: 400 });
    const sql = getSql();
    const rows = (await withRetry(() => sql`
      SELECT id::text, session_id::text, child_name, phone, created_at
      FROM assessments WHERE session_id = ANY(${sids}::uuid[]) AND is_internal = false
    `)) as unknown as { id: string; session_id: string; child_name: string | null; phone: string | null; created_at: string }[];
    if (!rows.length) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const input: TimelineInput = {
      assessments: rows.map((r) => ({ id: r.id, sessionId: r.session_id, childName: r.child_name || "—", createdAt: r.created_at })),
      phone: rows.find((r) => r.phone)?.phone ?? null,
      multiChild: new Set(rows.map((r) => r.child_name)).size > 1,
    };
    const t0 = Date.now();
    const data = await withRetry(() => getParentTimeline(input));
    return NextResponse.json({ ...data, ms: Date.now() - t0 });
  } catch (e) {
    console.error("[admin/parents/timeline]", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
