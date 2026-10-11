import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";
import { normalizePhone as toWaPhone } from "@/lib/whatsapp";
import { enqueueWhatsApp } from "@/lib/whatsapp/outbox";
import { normalizePhone } from "@/lib/phone";

assertBootGuards();

export async function POST(req: NextRequest) {
  try {
    const { name, phone, ageBand, variant } = (await req.json()) as {
      name?: string;
      phone?: string;
      ageBand?: string;
      variant?: string;
    };

    if (!name?.trim() || !phone?.trim() || !ageBand) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Validate the phone BEFORE saving: a number we can't normalize can never be
    // delivered on WhatsApp, so reject it and don't create a dead row.
    const normalized = normalizePhone(phone);
    if (!normalized) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit mobile number" },
        { status: 400 },
      );
    }

    const sql = getSql();

    await sql`
      CREATE TABLE IF NOT EXISTS handbook_leads (
        id         SERIAL PRIMARY KEY,
        name       TEXT        NOT NULL,
        phone      TEXT        NOT NULL,
        age_band   TEXT        NOT NULL,
        variant    TEXT        NOT NULL DEFAULT 'production',
        wa_sent    BOOLEAN     NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await sql`ALTER TABLE handbook_leads ADD COLUMN IF NOT EXISTS variant TEXT NOT NULL DEFAULT 'production'`;

    // Dedupe: if this normalized number already submitted in the last 10 minutes,
    // don't send again (avoid a double WhatsApp). Return success either way.
    const recent = (await sql`
      SELECT phone FROM handbook_leads
      WHERE created_at > now() - interval '10 minutes'
    `) as unknown as { phone: string }[];
    if (recent.some((r) => normalizePhone(r.phone) === normalized)) {
      return NextResponse.json({ saved: true, wa_sent: false, deduped: true });
    }

    const src = (variant ?? "production").trim() || "production";
    const [row] = (await sql`
      INSERT INTO handbook_leads (name, phone, age_band, variant)
      VALUES (${name.trim()}, ${phone.trim()}, ${ageBand}, ${src})
      RETURNING id
    `) as unknown as { id: number }[];

    // Outbox-first (WATI no longer called). Queued on provider=none; the OOB "Download the handbook"
    // button covers delivery. wa_sent flips true only on an actual cloud send.
    const firstName = name.trim().split(/\s+/)[0] ?? "";
    const toPhone = toWaPhone(phone.trim());
    const q = toPhone
      ? await enqueueWhatsApp({
          kind: "handbook", toPhone,
          template: process.env.HANDBOOK_WA_TEMPLATE || "handbook_send",
          params: { name: firstName || "there" },
          ref: `handbook_lead:${row.id}`,
        }).catch((e: unknown) => { console.error(`[handbook-lead] enqueue failed for lead ${row.id}:`, (e as Error).message); return null; })
      : null;
    const sent = q?.status === "sent";
    if (sent) await sql`UPDATE handbook_leads SET wa_sent = true WHERE id = ${row.id}`;

    return NextResponse.json({ saved: true, wa_sent: sent, queued: q?.status === "queued" });
  } catch (e) {
    console.error("[handbook-lead]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
