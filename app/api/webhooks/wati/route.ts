// POST /api/webhooks/wati?secret=<WATI_WEBHOOK_SECRET>
// WATI does not sign webhooks or send a secret header (per docs.wati.io), so we authenticate
// with a secret token in the URL query string. Inbound WhatsApp messages only — this route
// sends NOTHING and never stores message text.
import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { processWatiEvent } from "@/lib/leads/wati-ingest";
import { sendOpsAlert, opsAlertBody } from "@/lib/alerts/notify";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  // Auth: secret token in the URL query string.
  const secret = process.env.WATI_WEBHOOK_SECRET ?? "";
  const provided = req.nextUrl.searchParams.get("secret") ?? "";
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

  // Process (fast: a few upserts). Errors are logged, alerted, and swallowed — we always 200
  // once auth passes so WATI does not retry-storm.
  try {
    await processWatiEvent(getSql(), body);
  } catch (e) {
    console.error("[wati-webhook] processing error:", (e as Error).message);
    try {
      await sendOpsAlert(
        "WATI webhook processing failed",
        opsAlertBody({ sessionId: null, stage: "wati-webhook", error: (e as Error).message, attempts: null }),
      );
    } catch { /* never let the alert throw */ }
  }

  return NextResponse.json({ ok: true });
}
