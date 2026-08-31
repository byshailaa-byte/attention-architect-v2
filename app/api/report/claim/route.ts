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
        // Generation may still be running in its own function invocation (maxDuration=300).
        // Do NOT fall through to send — check report readiness explicitly below.
      }

      // Step 2: verify the report is published before attempting the WhatsApp send.
      // Sending before the report exists means the link has nothing to point at.
      // If not ready: record an attempt (so cron knows to retry) then bail — cron will
      // send once the report is published.
      const MAX_WA_ATTEMPTS = 5;

      const reportReadyRows = await sql`
        SELECT r.id FROM reports r
        JOIN assessments a ON a.id = r.assessment_id
        WHERE a.session_id = ${sessionId}::uuid
          AND r.status = 'published'
          AND r.superseded_by IS NULL
        LIMIT 1
      ` as unknown as { id: string }[];

      if (reportReadyRows.length === 0) {
        console.error("[whatsapp] report not published after generation — recording attempt for cron pickup:", sessionId);
        await sql`
          UPDATE assessments
          SET whatsapp_send_attempts = whatsapp_send_attempts + 1
          WHERE session_id = ${sessionId}::uuid
            AND whatsapp_send_claimed_at IS NULL
            AND whatsapp_report_sent_at   IS NULL
            AND whatsapp_send_attempts    < ${MAX_WA_ATTEMPTS}
        `.catch((e: unknown) => console.error("[whatsapp] attempt increment failed:", (e as Error).message));
        // Fall through to CAPI Lead below; skip the WA send block entirely.
      } else {
      let waClaimRows: { child_name: string | null; parent_name: string | null; phone: string | null }[] = [];
      try {
        waClaimRows = await sql`
          UPDATE assessments
          SET whatsapp_send_claimed_at = NOW(),
              whatsapp_send_attempts   = whatsapp_send_attempts + 1
          WHERE session_id = ${sessionId}::uuid
            AND whatsapp_send_claimed_at IS NULL
            AND whatsapp_report_sent_at   IS NULL
            AND whatsapp_send_attempts    < ${MAX_WA_ATTEMPTS}
          RETURNING child_name, parent_name, phone
        ` as unknown as { child_name: string | null; parent_name: string | null; phone: string | null }[];
      } catch (e: unknown) {
        console.error("[whatsapp] claim failed:", (e as Error).message);
      }

      if (waClaimRows.length > 0) {
        const row = waClaimRows[0];
        let sent = false;

        for (let attempt = 0; attempt <= 1 && !sent; attempt++) {
          if (attempt === 1) {
            // One retry after 20s for transient failures (rate limit, network hiccup).
            // 20s is safe even in the worst case (240s generation + 20s retry < 300s maxDuration).
            await new Promise(r => setTimeout(r, 20_000));
          }
          try {
            await sendWhatsAppReport({
              parentName: row.parent_name ?? parentName.trim(),
              childName:  row.child_name  ?? "your child",
              sessionId,
              rawPhone:   row.phone       ?? phone.trim(),
            });
            await sql`UPDATE assessments SET whatsapp_report_sent_at = NOW() WHERE session_id = ${sessionId}::uuid`;
            sent = true;
          } catch (e: unknown) {
            console.error(`[whatsapp] attempt ${attempt + 1} failed:`, (e as Error).message);
          }
        }

        if (!sent) {
          // Both in-process attempts exhausted — release claim for hourly cron retry.
          console.error("[whatsapp] in-process attempts exhausted — releasing for cron:", sessionId);
          await sql`
            UPDATE assessments SET whatsapp_send_claimed_at = NULL
            WHERE session_id = ${sessionId}::uuid
          `.catch((e: unknown) => console.error("[whatsapp] claim release failed:", (e as Error).message));
        }
      }
      } // end else (report published)

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
