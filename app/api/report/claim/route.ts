import { after, NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";
import { sendWhatsAppReport } from "@/lib/whatsapp";
import { sendCapiEvents } from "@/lib/meta/capi";

assertBootGuards();

// Generation takes ~48s avg; WhatsApp + CAPI add ~3s. 300s gives ~6× headroom.
// Must be declared here — no global maxDuration is set for this project.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { sessionId, parentName, email, phone, gender, tried, better, variant } = (await req.json()) as {
      sessionId: string;
      parentName: string;
      email: string;
      phone: string;
      gender?: string | null;
      tried?: string[];
      better?: string[];
      variant?: string;
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
        child_gender = COALESCE(${gender ?? null}, child_gender),
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

    // Awaited — fire-and-forget caused event loss, same pattern as assessment_complete bug
    const leadMetadata = JSON.stringify(variant ? { variant } : {});
    await sql`
      INSERT INTO funnel_events (event_type, session_id, metadata)
      VALUES ('generate_lead', ${sessionId}::uuid, ${leadMetadata}::jsonb)
    `.catch((e: unknown) => console.warn("[funnel] generate_lead:", (e as Error).message));

    // Single after() block: generate report first, then send WhatsApp once it's ready.
    // Previously two concurrent after() calls caused a race — WhatsApp fired ~1s after claim
    // while generation takes ~48s, so parents clicked into the old static report.
    const autoGenUrl = new URL("/api/internal/report/auto-generate", req.nextUrl.origin).toString();
    const internalSecret = process.env.INTERNAL_API_SECRET ?? "";
    after(async () => {
      // Step 1: wait for narrative generation to complete (~48s avg).
      // Race against a 240s hard cap so WhatsApp always sends even on a slow generation —
      // parent gets the link and sees the static fallback at worst, not silence.
      try {
        const genTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("generation timeout after 240s")), 240_000),
        );
        await Promise.race([
          fetch(autoGenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Internal-Secret": internalSecret },
            body: JSON.stringify({ sessionId }),
          }),
          genTimeout,
        ]);
      } catch (e: unknown) {
        console.warn("[auto-generate] trigger failed or timed out:", (e as Error).message);
        // Fall through — WhatsApp still sends with the report link.
        // If generation didn't finish, parent lands on static view; if it did, they see the narrative.
      }

      // Step 2: send WhatsApp — always fires, even if generation above failed/timed out
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
