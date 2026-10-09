import { after, NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";
import { sendWhatsAppReport, sendReportWithRetry, upsertWatiContactAfterSend } from "@/lib/whatsapp";
import { metaMatchFromRequest, isInternalRequest } from "@/lib/meta/match";
import { trackServer } from "@/lib/analytics/track.server";
import { CHILD_NAME_FALLBACK_MID } from "@/lib/report/pronouns";

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

    if (!sessionId || !parentName?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sql = getSql();

    // v2 flow captures the WhatsApp number at step 4 (stored on flow_sessions), so step 7
    // omits it. Fall back to that number here. v1 always sends phone, so effPhone === phone.
    let effPhone = (phone ?? "").trim();
    if (!effPhone) {
      const fs = (await sql`
        SELECT phone FROM flow_sessions WHERE session_id = ${sessionId}::uuid
      `) as unknown as { phone: string | null }[];
      effPhone = (fs[0]?.phone ?? "").trim();
    }
    if (!effPhone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = (await sql`
      UPDATE assessments
      SET
        parent_name  = ${parentName.trim()},
        email        = ${email.trim()},
        phone        = ${effPhone},
        child_gender = COALESCE(${gender ?? null}, child_gender),
        tried        = ${tried ?? []},
        better       = ${better ?? []}
      WHERE session_id = ${sessionId}::uuid
      RETURNING id, is_internal, utm->>'fbclid' AS fbclid
    `) as unknown as { id: string; is_internal: boolean | null; fbclid: string | null }[];

    // Match keys + internal check must be read from the live request (not inside after()).
    const internal = isInternalRequest(req) || result[0]?.is_internal === true;
    const match = metaMatchFromRequest(req, { fbclid: result[0]?.fbclid });

    // best-effort timestamp — column added in Phase 7a migration; silently skipped if missing
    sql`UPDATE assessments SET parent_details_at = now() WHERE session_id = ${sessionId}::uuid`
      .catch((e: unknown) => console.warn("[claim] parent_details_at:", (e as Error).message));

    if (result.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // generate_lead DB row — deduped to at most one per session (CAPI fired separately in after()).
    await trackServer("generate_lead", variant ? { variant } : {}, {
      sessionId, dedup: "lead-session", sendCapi: false,
    });

    // Single after() block: generate report first, then send WhatsApp once it's ready.
    // Previously two concurrent after() calls caused a race — WhatsApp fired ~1s after claim
    // while generation takes ~48s, so parents clicked into the old static report.
    const autoGenUrl = new URL("/api/internal/report/auto-generate", req.nextUrl.origin).toString();
    const internalSecret = process.env.INTERNAL_API_SECRET ?? "";
    after(async () => {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://attentionparents.thehumandecision.in";

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
        // Up to 3 in-request attempts (backoff 2s, 8s) before releasing for the daily cron.
        await sendReportWithRetry({
          send: () => sendWhatsAppReport({
            parentName: row.parent_name ?? parentName.trim(),
            childName:  row.child_name  ?? CHILD_NAME_FALLBACK_MID,
            sessionId,
            rawPhone:   row.phone ?? effPhone,
          }),
          onSent: async () => {
            await sql`UPDATE assessments SET whatsapp_report_sent_at = NOW() WHERE session_id = ${sessionId}::uuid`;
            // Send succeeded → upsert the WATI contact with purchased=no + attributes.
            // Never throws; a failed upsert is logged loudly and does not undo the send.
            await upsertWatiContactAfterSend(sql, sessionId, row.phone ?? effPhone, row.parent_name ?? parentName.trim());
          },
          onFailed: async () => {
            // All in-process attempts exhausted — release claim for the daily cron safety net.
            console.error("[whatsapp] in-process attempts exhausted — releasing for cron:", sessionId);
            await sql`
              UPDATE assessments SET whatsapp_send_claimed_at = NULL
              WHERE session_id = ${sessionId}::uuid
            `.catch((e: unknown) => console.error("[whatsapp] claim release failed:", (e as Error).message));
          },
        });
      }
      } // end else (report published)

      // CAPI Lead — event_id matches the client Pixel call (lead:${sessionId}) for dedup.
      // trackServer skips the DB row here (already written above) and the send when internal.
      await trackServer("generate_lead", {}, {
        sessionId, internal, dbInsert: false,
        eventSourceUrl: `${baseUrl}/report/${sessionId}`,
        capiUserData: {
          email: email.trim(), phone: effPhone, externalId: sessionId,
          fbp: match.fbp, fbc: match.fbc, clientIp: match.clientIp, clientUserAgent: match.clientUserAgent,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[report/claim]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
