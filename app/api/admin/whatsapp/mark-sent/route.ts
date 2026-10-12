import { NextRequest, NextResponse } from "next/server";
import { markSentManual } from "@/lib/whatsapp/outbox";

// Mark a queued WhatsApp outbox row as sent by hand (provider='manual'), so the drain never
// re-sends it. Auth: the /api/admin/* Basic-Auth middleware.
export async function POST(req: NextRequest) {
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const res = await markSentManual(id);
  if (!res.ok) return NextResponse.json({ error: "not a queued row" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
