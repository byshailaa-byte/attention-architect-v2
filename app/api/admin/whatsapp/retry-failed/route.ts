import { NextResponse } from "next/server";
import { assertBootGuards } from "@/lib/boot-guard";
import { retryFailed, outboxCounts } from "@/lib/whatsapp/outbox";

assertBootGuards();

// Admin "Retry failed" — put all failed rows back in the queue with a fresh 24h retry window.
// Protected by the /api/admin/* Basic-Auth middleware. The drainer/cron then sends them.
export async function POST() {
  const r = await retryFailed();
  const counts = await outboxCounts();
  return NextResponse.json({ ...r, ...counts });
}
