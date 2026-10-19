import { NextRequest, NextResponse } from "next/server";
import { assertBootGuards } from "@/lib/boot-guard";
import { resolveCall, approveGold, rejectGold, draftBetterReply } from "@/lib/admin/coach-review";
import { getSql } from "@/lib/db/client";

assertBootGuards();
export const dynamic = "force-dynamic";

// Actions for the weekly Coach review. Admin-authed upstream (/api/admin/* Basic Auth). All writes
// are small and reversible; "admin" is the single-password operator identity.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const by = "admin";
    switch (action) {
      case "resolve_call": {
        const status = body.status === "dismissed" ? "dismissed" : "done";
        await resolveCall(String(body.id), status, by);
        return NextResponse.json({ ok: true });
      }
      case "approve_gold":
        await approveGold(String(body.id), by);
        return NextResponse.json({ ok: true });
      case "reject_gold":
        await rejectGold(String(body.id));
        return NextResponse.json({ ok: true });
      case "better_reply": {
        const sourceMessageId = String(body.sourceMessageId ?? "");
        const betterReply = String(body.betterReply ?? "").trim();
        if (!sourceMessageId || !betterReply) return NextResponse.json({ error: "missing" }, { status: 400 });
        // Pull the parent message that preceded this coach reply (same subject, prior turn).
        const sql = getSql();
        const rows = (await sql`
          SELECT content, trial_id, user_id, created_at FROM coach_messages WHERE id=${sourceMessageId}::uuid LIMIT 1
        `) as unknown as { content: string; trial_id: string | null; user_id: string; created_at: string }[];
        const m = rows[0];
        const prior = m
          ? ((await sql`
              SELECT content FROM coach_messages
              WHERE role='parent' AND created_at < ${m.created_at}
                AND (${m.trial_id}::uuid IS NULL AND user_id=${m.user_id} AND trial_id IS NULL OR trial_id=${m.trial_id}::uuid)
              ORDER BY created_at DESC LIMIT 1
            `) as unknown as { content: string }[])[0]?.content ?? ""
          : "";
        // Resolve this family's names so they can be scrubbed out of the (shared) gold example.
        let childName: string | null = null, parentName: string | null = null;
        if (m) {
          const a = m.trial_id
            ? (await sql`SELECT a.child_name, a.parent_name FROM coach_trials t JOIN assessments a ON a.session_id = t.session_id WHERE t.id = ${m.trial_id}::uuid LIMIT 1`)
            : (await sql`SELECT a.child_name, a.parent_name FROM purchases p JOIN assessments a ON a.id = p.assessment_id WHERE p.user_id = ${m.user_id} AND p.status='paid' ORDER BY p.created_at DESC LIMIT 1`);
          const row = (a as unknown as { child_name: string | null; parent_name: string | null }[])[0];
          childName = row?.child_name ?? null; parentName = row?.parent_name ?? null;
        }
        await draftBetterReply({
          sourceMessageId, parentMessage: prior, betterReply,
          situation: String(body.situation ?? "operator-improved reply"),
          tags: Array.isArray(body.tags) ? body.tags.map(String) : [], createdBy: by,
          childName, parentName,
        });
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }
  } catch (e) {
    console.error("[api/admin/coach-review]", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
