import { after, NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";
import { sendWhatsAppReport } from "@/lib/whatsapp";
import { sendCapiEvents } from "@/lib/meta/capi";

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

    // after() keeps the serverless function alive until scheduled work completes.
    after(async () => {
      // WhatsApp: atomic dedup via whatsapp_report_sent_at — only first caller sends
      try {
        const rows = await sql`
          UPDATE assessments
          SET whatsapp_report_sent_at = NOW()
          WHERE session_id = ${sessionId}::uuid
            AND whatsapp_report_sent_at IS NULL
          RETURNING child_name, parent_name, phone
        ` as unknown as { child_name: string | null; parent_name: string | null; phone: string | null }[];
        if (rows.length > 0) {
          const row = rows[0];
          await sendWhatsAppReport({
            parentName: row.parent_name  ?? parentName.trim(),
            childName:  row.child_name   ?? "your child",
            sessionId,
            rawPhone:   row.phone        ?? phone.trim(),
          });
        }
      } catch (e: unknown) {
        console.warn("[whatsapp] dedup update:", (e as Error).message);
      }

      // CAPI Lead — event_id matches client-side fbq call: `lead:${sessionId}`
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://attentionparents.thehumandecision.in";
      try {
        await sendCapiEvents([{
          event_name: "Lead",
          event_time: Math.floor(Date.now() / 1000),
          event_id: `lead:${sessionId}`,
          event_source_url: `${baseUrl}/report/${sessionId}`,
          action_source: "website",
          userData: {
            email: email.trim(),
            phone: phone.trim(),
          },
        }]);
      } catch (e: unknown) {
        console.warn("[capi] lead:", (e as Error).message);
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[report/claim]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
