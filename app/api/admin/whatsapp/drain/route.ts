import { NextResponse } from "next/server";
import { assertBootGuards } from "@/lib/boot-guard";
import { drainQueued, outboxCounts, whatsappProvider } from "@/lib/whatsapp/outbox";

assertBootGuards();

// WATI is rate-limited to 1/sec, so a drain of N rows takes ~N seconds. Allow up to ~110 per click.
export const maxDuration = 120;

// Admin "Send queued" — drains the WhatsApp outbox via the active provider (oldest first; WATI is
// rate-limited to 1/sec). Protected by the /api/admin/* Basic-Auth middleware. No-op when provider=none.
export async function POST() {
  if (whatsappProvider() === "none") {
    return NextResponse.json({ error: "provider is none; nothing drained", ...(await outboxCounts()) }, { status: 409 });
  }
  const r = await drainQueued(110);
  const counts = await outboxCounts();
  return NextResponse.json({ ...r, ...counts });
}
