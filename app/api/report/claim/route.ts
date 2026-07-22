import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";
import { sendWhatsAppReport } from "@/lib/whatsapp";

assertBootGuards();

export async function POST(req: NextRequest) {
  try {
    const { sessionId, parentName, email, phone, gender, tried, better } = (await req.json()) as {
      sessionId: string;
      parentName: string;
      email: string;
      phone: string;
      gender?: string | null;
      tried?: string[];
      better?: string[];
    };

    if (!sessionId || !parentName?.trim() || !email?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sql = getSql();
    const result = (await sql`
      UPDATE assessments
      SET
        parent_name  = ${parentName.trim()},
        email        = ${email.trim()},
        phone        = ${phone.trim()},
        child_gender = ${gender ?? null},
        tried        = ${tried ?? []},
        better       = ${better ?? []}
      WHERE session_id = ${sessionId}::uuid
      RETURNING id
    `) as unknown as unknown[];

    // best-effort timestamp — column added in Phase 7a migration; silently skipped if missing
    sql`UPDATE assessments SET parent_details_at = now() WHERE session_id = ${sessionId}::uuid`
      .catch((e: unknown) => console.warn("[claim] parent_details_at:", (e as Error).message));

    if (result.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Fire generate_lead event (fire-and-forget)
    sql`
      INSERT INTO funnel_events (event_type, session_id, metadata)
      VALUES ('generate_lead', ${sessionId}::uuid, '{}'::jsonb)
    `.catch((e: unknown) => console.warn("[funnel] generate_lead:", (e as Error).message));

    // Atomic dedup: first caller to claim whatsapp_report_sent_at wins the send.
    // If both gates fire near-simultaneously, only one UPDATE returns a row.
    // Phase 13 column — silently skipped if migration hasn't run yet.
    sql`
      UPDATE assessments
      SET whatsapp_report_sent_at = NOW()
      WHERE session_id = ${sessionId}::uuid
        AND whatsapp_report_sent_at IS NULL
      RETURNING child_name, parent_name, phone
    `.then((rows: unknown) => {
      const claimed = rows as { child_name: string | null; parent_name: string | null; phone: string | null }[];
      if (claimed.length > 0) {
        const row = claimed[0];
        sendWhatsAppReport({
          parentName:  row.parent_name  ?? parentName.trim(),
          childName:   row.child_name   ?? "your child",
          sessionId,
          rawPhone:    row.phone        ?? phone.trim(),
        });
      }
    }).catch((e: unknown) => console.warn("[whatsapp] dedup update:", (e as Error).message));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[report/claim]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
