import { NextResponse } from "next/server";
import { assertBootGuards } from "@/lib/boot-guard";
import { drainQueued, outboxCounts, whatsappProvider } from "@/lib/whatsapp/outbox";

assertBootGuards();

// Admin "Send queued" — drains the WhatsApp outbox via the Cloud API. Protected by the /api/admin/*
// Basic-Auth middleware. No-op unless WHATSAPP_PROVIDER=cloud.
export async function POST() {
  if (whatsappProvider() !== "cloud") {
    return NextResponse.json({ error: "provider is not cloud; nothing drained", ...(await outboxCounts()) }, { status: 409 });
  }
  const r = await drainQueued(100);
  const counts = await outboxCounts();
  return NextResponse.json({ ...r, ...counts });
}
