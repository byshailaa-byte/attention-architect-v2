import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { sendOutboxRow, whatsappProvider } from "@/lib/whatsapp/outbox";

// Resend ONE WhatsApp outbox row by id (admin "Resend" — e.g. a report that Meta accepted but did
// not deliver). Re-queues just that row (status→queued, claim/attempts reset) and sends it via the
// active provider — NO drain, so no other queued row is touched. Auth: the /api/admin/* Basic-Auth
// middleware. Returns the Meta message id on success, or the full error.
export async function POST(req: NextRequest) {
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  if (whatsappProvider() === "none") {
    return NextResponse.json({ error: "provider is none; nothing sent" }, { status: 409 });
  }
  const sql = getSql();
  const rows = (await sql`
    UPDATE whatsapp_outbox
    SET status='queued', attempts=0, first_attempt_at=NULL, claimed_at=NULL,
        wa_message_id=NULL, last_error=NULL, updated_at=now()
    WHERE id = ${id}::uuid
    RETURNING id
  `) as unknown as { id: string }[];
  if (rows.length === 0) return NextResponse.json({ error: "no such row" }, { status: 404 });

  const res = await sendOutboxRow(id);
  return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
