import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";

function normalizePhone(raw: string): string {
  const s = raw.replace(/[\s\-.()+]/g, "");
  return s;
}

export async function POST(req: NextRequest) {
  const { sessionId, phone } = (await req.json()) as { sessionId?: string; phone?: string };

  if (!sessionId || !phone) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });
  }

  const normalized = normalizePhone(phone);
  if (!/^[6-9]\d{9}$/.test(normalized)) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  const sql = getSql();

  // Update phone and reset WA send state so the next claim attempt uses the new number.
  // whatsapp_send_claimed_at: reset so the in-flight after() or a new claim can win the race.
  // whatsapp_send_attempts:   reset to 0 so the retry ceiling applies fresh.
  // whatsapp_report_sent_at:  reset so we actually attempt the resend.
  await sql`
    UPDATE assessments
    SET phone                    = ${normalized},
        whatsapp_send_claimed_at = NULL,
        whatsapp_report_sent_at  = NULL,
        whatsapp_send_attempts   = 0
    WHERE session_id = ${sessionId}::uuid
      AND parent_name IS NOT NULL
  `;

  return NextResponse.json({ ok: true });
}
