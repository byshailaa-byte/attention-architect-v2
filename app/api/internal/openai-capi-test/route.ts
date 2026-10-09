import { NextRequest, NextResponse } from "next/server";
import { assertBootGuards } from "@/lib/boot-guard";
import { sendOpenAiConversion } from "@/lib/analytics/openai-capi";

assertBootGuards();

// Internal diagnostic for the OpenAI Conversions API — lets us run the validate_only check on a
// preview deploy (where OPENAI_ADS_API_KEY is injected) WITHOUT completing a real lead or sending
// WhatsApp. Guarded by INTERNAL_API_SECRET. Returns the CAPI status/detail; never the bearer key.
export async function GET(req: NextRequest) {
  const secret = process.env.INTERNAL_API_SECRET ?? "___unset___";
  if ((req.headers.get("x-internal-secret") ?? "") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const r = await sendOpenAiConversion({
    eventId: `lead:diagnostic-${Date.now()}`,
    openaiEvent: "lead_created",
    sourceUrl: `${req.nextUrl.origin}/assessment`,
    timestampMs: Date.now(),
  });
  return NextResponse.json({
    validate_only: process.env.OPENAI_ADS_VALIDATE_ONLY === "true",
    pixel_id_set: !!process.env.NEXT_PUBLIC_OPENAI_PIXEL_ID,
    api_key_set: !!process.env.OPENAI_ADS_API_KEY,
    status: r.status,
    detail: r.detail,
  });
}
