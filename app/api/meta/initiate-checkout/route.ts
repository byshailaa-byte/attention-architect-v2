import { after, NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { trackServer } from "@/lib/analytics/track.server";
import { metaMatchFromRequest, isInternalRequest } from "@/lib/meta/match";
import { assertBootGuards } from "@/lib/boot-guard";

assertBootGuards();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIER_VALUE: Record<string, number> = { tier1: 2999, tier2: 4999, module1: 499, full: 999, topup: 500 };

export async function POST(req: NextRequest) {
  let sessionId: string, tier: string, eventId: string;
  try {
    ({ sessionId, tier, eventId } = await req.json() as {
      sessionId: string;
      tier: string;
      eventId: string;
    });
  } catch {
    return NextResponse.json({ ok: true });
  }

  if (!sessionId || !UUID_RE.test(sessionId) || !eventId) {
    return NextResponse.json({ ok: true });
  }

  const internal = isInternalRequest(req);
  const match = metaMatchFromRequest(req);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://attentionparents.thehumandecision.in";

  // Internal traffic: never reaches Meta.
  if (internal) return NextResponse.json({ ok: true });

  after(async () => {
    try {
      const sql = getSql();
      const rows = await sql`
        SELECT email, phone, is_internal, utm->>'fbclid' AS fbclid
        FROM assessments WHERE session_id = ${sessionId}::uuid LIMIT 1
      ` as unknown as { email: string | null; phone: string | null; is_internal: boolean | null; fbclid: string | null }[];

      const row = rows[0];
      // CAPI InitiateCheckout only (the client already wrote the DB row + fired the Pixel event).
      // event_id matches the client Pixel (checkout:${sessionId}) for dedup.
      await trackServer("begin_checkout", {
        tier,
        value: TIER_VALUE[tier] ?? 999,
        currency: "INR",
        content_name: tier,
      }, {
        sessionId,
        internal: row?.is_internal === true,
        dbInsert: false,
        eventId,
        eventSourceUrl: `${baseUrl}/report/${sessionId}`,
        capiUserData: {
          email: row?.email,
          phone: row?.phone,
          externalId: sessionId,
          fbp: match.fbp,
          fbc: match.fbc ?? (row?.fbclid ? `fb.1.${Date.now()}.${row.fbclid}` : undefined),
          clientIp: match.clientIp,
          clientUserAgent: match.clientUserAgent,
        },
      });
    } catch (e: unknown) {
      console.warn("[capi/initiate-checkout]", (e as Error).message);
    }
  });

  // Respond immediately — CAPI call runs post-response and does not block checkout UI
  return NextResponse.json({ ok: true });
}
