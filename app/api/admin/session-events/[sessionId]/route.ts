import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";

assertBootGuards();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  if (!UUID_RE.test(sessionId ?? "")) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const sql = getSql();
  const rows = await sql`
    SELECT event_type, created_at, metadata
    FROM funnel_events
    WHERE session_id = ${sessionId}::uuid
    ORDER BY created_at ASC
  `;

  return NextResponse.json(rows);
}
