import { after, NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { sendCapiEvents } from "@/lib/meta/capi";
import { assertBootGuards } from "@/lib/boot-guard";

assertBootGuards();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIER_VALUE: Record<string, number> = { module1: 499, full: 999, topup: 500 };

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

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
  const ua = req.headers.get("user-agent") ?? undefined;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://attentionparents.thehumandecision.in";

  after(async () => {
    try {
      const sql = getSql();
      const rows = await sql`
        SELECT email, phone FROM assessments WHERE session_id = ${sessionId}::uuid LIMIT 1
      ` as unknown as { email: string | null; phone: string | null }[];

      const row = rows[0];
      await sendCapiEvents([{
        event_name: "InitiateCheckout",
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: `${baseUrl}/report/${sessionId}`,
        action_source: "website",
        userData: {
          email: row?.email,
          phone: row?.phone,
          clientIp: ip,
          clientUserAgent: ua,
        },
        custom_data: {
          value: TIER_VALUE[tier] ?? 999,
          currency: "INR",
          content_name: tier,
        },
      }]);
    } catch (e: unknown) {
      console.warn("[capi/initiate-checkout]", (e as Error).message);
    }
  });

  // Respond immediately — CAPI call runs post-response and does not block checkout UI
  return NextResponse.json({ ok: true });
}
