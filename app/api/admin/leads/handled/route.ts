// POST /api/admin/leads/handled  — mark a WhatsApp lead as handled by a human.
// Admin-only: protected by the same middleware HTTP Basic Auth as every other
// /api/admin/* route (see middleware.ts). No inline auth needed.
//
// Body: { phone }. Sets handled_at = now(), clears needs_human, and writes a
// 'handled' wa_event. Stored wa_contacts.phone is already normalized by the
// Wati webhook, so we match on the normalized form.

import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";
import { normalizePhone } from "@/lib/phone";

assertBootGuards();

type Body = { phone?: string };

export async function POST(req: NextRequest) {
  try {
    const { phone } = (await req.json().catch(() => ({}))) as Body;
    const normalized = normalizePhone(phone);
    if (!normalized) {
      return NextResponse.json({ error: "Invalid or missing phone" }, { status: 400 });
    }

    const sql = getSql();

    const updated = (await sql`
      UPDATE wa_contacts
      SET handled_at = now(), needs_human = false
      WHERE phone = ${normalized}
      RETURNING phone
    `) as unknown as { phone: string }[];

    if (updated.length === 0) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    await sql`
      INSERT INTO wa_events (phone, event_type)
      VALUES (${normalized}, 'handled')
    `;

    return NextResponse.json({ ok: true, phone: normalized });
  } catch (e) {
    console.error("[leads/handled]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
