import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";
import { sendWhatsAppHandbook } from "@/lib/whatsapp";

assertBootGuards();

export async function POST(req: NextRequest) {
  try {
    const { name, phone, ageBand } = (await req.json()) as {
      name?: string;
      phone?: string;
      ageBand?: string;
    };

    if (!name?.trim() || !phone?.trim() || !ageBand) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const sql = getSql();

    await sql`
      CREATE TABLE IF NOT EXISTS handbook_leads (
        id         SERIAL PRIMARY KEY,
        name       TEXT        NOT NULL,
        phone      TEXT        NOT NULL,
        age_band   TEXT        NOT NULL,
        wa_sent    BOOLEAN     NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    const [row] = (await sql`
      INSERT INTO handbook_leads (name, phone, age_band)
      VALUES (${name.trim()}, ${phone.trim()}, ${ageBand})
      RETURNING id
    `) as unknown as { id: number }[];

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://attentionparents.thehumandecision.in";
    const handbookUrl = `${baseUrl}/handbook`;

    const waSent = await sendWhatsAppHandbook({
      name: name.trim(),
      rawPhone: phone.trim(),
      handbookUrl,
    });

    if (waSent) {
      await sql`UPDATE handbook_leads SET wa_sent = true WHERE id = ${row.id}`;
    }

    return NextResponse.json({ saved: true, wa_sent: waSent });
  } catch (e) {
    console.error("[handbook-lead]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
