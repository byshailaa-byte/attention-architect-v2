// Report v2 goal override. The parent picking another goal inside the v2 cards writes it
// here, to assessments.report_v2_goal (NOT the legacy goal fields). Read back by the v2
// generator and the Plan v2 header. Keeps the default v1 report untouched.
import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { CONCERN_GOAL, CONCERN_ALIAS } from "@/lib/report-v2/goal-mapping";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const sessionId: unknown = body?.sessionId;
  const goal: unknown = body?.goal;        // the rendered goal text (already name/pronoun-filled)
  const goalKey: unknown = body?.goalKey;  // the canonical concern key chosen

  if (typeof sessionId !== "string" || !UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });
  }
  if (typeof goal !== "string" || !goal.trim() || goal.length > 200) {
    return NextResponse.json({ error: "Invalid goal" }, { status: 400 });
  }
  // goalKey, when present, must be a known concern (canonical or a legacy alias).
  if (goalKey !== undefined && (typeof goalKey !== "string" || !(goalKey in CONCERN_GOAL || goalKey in CONCERN_ALIAS))) {
    return NextResponse.json({ error: "Invalid goalKey" }, { status: 400 });
  }

  const sql = getSql();
  try {
    const rows = (await sql`
      UPDATE assessments SET report_v2_goal = ${goal.trim()}
      WHERE session_id = ${sessionId}::uuid
      RETURNING session_id
    `) as unknown as { session_id: string }[];
    if (rows.length === 0) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    // Regenerating cached content isn't needed — the Plan header reads the goal live, and the
    // cards already hold the chosen goal client-side. Fire-and-forget the funnel event here too.
    await sql`
      INSERT INTO funnel_events (event_type, session_id, metadata)
      VALUES ('goal_changed', ${sessionId}::uuid, ${JSON.stringify({ goalKey: goalKey ?? null })}::jsonb)
    `.catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[report/goal-v2]", (e as Error).message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
