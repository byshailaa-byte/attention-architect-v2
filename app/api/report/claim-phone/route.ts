import { after, NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";
import { sendWhatsAppReport } from "@/lib/whatsapp";
import { sendCapiEvents } from "@/lib/meta/capi";
import { CHILD_NAME_FALLBACK_MID } from "@/lib/report/pronouns";

assertBootGuards();

export const maxDuration = 300;

function normalizePhone(raw: string): string {
  let s = raw.replace(/[\s\-.()+]/g, "");
  if (s.startsWith("91") && s.length === 12) s = s.slice(2);
  return s;
}

function isValidPhone(raw: string): boolean {
  const digits = normalizePhone(raw);
  return /^[6-9]\d{9}$/.test(digits);
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, phone } = (await req.json()) as {
      sessionId: string;
      phone: string;
    };

    if (!sessionId || !phone?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!isValidPhone(normalizedPhone)) {
      return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number." }, { status: 400 });
    }

    const sql = getSql();
    const result = (await sql`
      UPDATE assessments
      SET phone = ${normalizedPhone}
      WHERE session_id = ${sessionId}::uuid
      RETURNING id, child_name, parent_name
    `) as unknown as { id: string; child_name: string | null; parent_name: string | null }[];

    if (result.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const row = result[0];

    await sql`
      INSERT INTO funnel_events (event_type, session_id, metadata)
      VALUES ('generate_lead', ${sessionId}::uuid, '{"lead_capture_method":"phone_only"}'::jsonb)
    `.catch((e: unknown) => console.warn("[funnel] generate_lead (phone_only):", (e as Error).message));

    const autoGenUrl = new URL("/api/internal/report/auto-generate", req.nextUrl.origin).toString();
    const internalSecret = process.env.INTERNAL_API_SECRET ?? "";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://attentionparents.thehumandecision.in";

    after(async () => {
      // Trigger generation (no-op if already done from submit hook)
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
        console.warn("[auto-generate] claim-phone trigger:", (e as Error).message);
      }

      // WhatsApp — robust path, mirroring the control arm's claim route:
      // publish-check → claim whatsapp_send_claimed_at → send → set
      // whatsapp_report_sent_at ONLY on confirmed success → release the claim on
      // failure so the retry cron picks it up. (Previously this arm set sent_at
      // optimistically before sending and never released, so a failed send both
      // stranded the parent and hid the session from the cron.)
      const MAX_WA_ATTEMPTS = 5;
      try {
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
            const wa = waClaimRows[0];
            let sent = false;
            for (let attempt = 0; attempt <= 1 && !sent; attempt++) {
              if (attempt === 1) await new Promise((r) => setTimeout(r, 20_000));
              try {
                await sendWhatsAppReport({
                  parentName: wa.parent_name ?? row.parent_name ?? "Parent",
                  childName:  wa.child_name  ?? row.child_name  ?? CHILD_NAME_FALLBACK_MID,
                  sessionId,
                  rawPhone:   wa.phone       ?? normalizedPhone,
                });
                await sql`UPDATE assessments SET whatsapp_report_sent_at = NOW() WHERE session_id = ${sessionId}::uuid`;
                sent = true;
              } catch (e: unknown) {
                console.error(`[whatsapp] attempt ${attempt + 1} failed:`, (e as Error).message);
              }
            }
            if (!sent) {
              console.error("[whatsapp] in-process attempts exhausted — releasing for cron:", sessionId);
              await sql`
                UPDATE assessments SET whatsapp_send_claimed_at = NULL
                WHERE session_id = ${sessionId}::uuid
              `.catch((e: unknown) => console.error("[whatsapp] claim release failed:", (e as Error).message));
            }
          }
        }
      } catch (e: unknown) {
        console.warn("[whatsapp] claim-phone:", (e as Error).message);
      }

      // CAPI Lead — phone only, same event_id as control arm for dedup
      try {
        await sendCapiEvents([{
          event_name: "Lead",
          event_time: Math.floor(Date.now() / 1000),
          event_id: `lead:${sessionId}`,
          event_source_url: `${baseUrl}/report/${sessionId}`,
          action_source: "website",
          userData: {
            phone: normalizedPhone,
          },
        }]);
      } catch (e: unknown) {
        console.warn("[capi] lead (phone_only):", (e as Error).message);
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[report/claim-phone]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
