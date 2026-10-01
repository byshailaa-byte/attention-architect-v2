// POST /api/admin/handbook/send-queued — one-time backfill of queued handbook
// leads over WATI. Admin-only: protected by the same middleware HTTP Basic Auth
// as every other /api/admin/* route (see middleware.ts). No inline auth needed.
//
// Delegates to backfillQueuedHandbooks (lib/leads/handbook-backfill.ts) and uses
// the same sendWatiHandbook the form route uses. Response carries counts only —
// no phone numbers.

import { NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";
import { sendWatiHandbook } from "@/lib/whatsapp";
import { backfillQueuedHandbooks } from "@/lib/leads/handbook-backfill";

assertBootGuards();

export const maxDuration = 300;

export async function POST() {
  try {
    const sql = getSql();
    const result = await backfillQueuedHandbooks(sql, sendWatiHandbook);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[handbook/send-queued]", (e as Error).message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
