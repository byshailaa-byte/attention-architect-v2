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

  const [eventRows, assessmentRows] = await Promise.all([
    sql`
      SELECT event_type, created_at, metadata
      FROM funnel_events
      WHERE session_id = ${sessionId}::uuid
      ORDER BY created_at ASC
    `,
    sql`
      SELECT whatsapp_report_sent_at
      FROM assessments
      WHERE session_id = ${sessionId}::uuid
      LIMIT 1
    `,
  ]);

  type EventRow = { event_type: string; created_at: unknown; metadata: Record<string, unknown> };

  const waRow = (assessmentRows as unknown as { whatsapp_report_sent_at: unknown }[])[0];
  const waTs = waRow?.whatsapp_report_sent_at;

  const toISO = (v: unknown) => v instanceof Date ? v.toISOString() : String(v);

  const rows: { event_type: string; created_at: string; metadata: Record<string, unknown> }[] = (eventRows as EventRow[]).map(r => ({
    event_type: r.event_type,
    created_at: toISO(r.created_at),
    metadata: r.metadata,
  }));

  if (waTs) {
    rows.push({ event_type: "whatsapp_sent", created_at: toISO(waTs), metadata: {} });
    rows.sort((a, b) => a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0);
  }

  return NextResponse.json(rows);
}
