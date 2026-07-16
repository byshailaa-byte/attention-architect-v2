// Server-side gate for the hidden top-up offer.
// The +₹500 upgrade must be UNREACHABLE — not merely hidden — for:
//   (a) users without a paid module1 purchase for this session
//   (b) users who have not yet completed Week 1
//
// Phase 6 LMS calls this before rendering the upgrade prompt.
// Returns { eligible: boolean }.

import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";

assertBootGuards();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone")?.trim() ?? "";
    const sessionId = searchParams.get("session")?.trim() ?? "";

    if (!phone || !sessionId) {
      return NextResponse.json({ eligible: false });
    }

    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(sessionId)) {
      return NextResponse.json({ eligible: false });
    }

    const sql = getSql();

    // Check 1: paid module1 purchase for this session
    const purchases = (await sql`
      SELECT p.id FROM purchases p
      JOIN users u ON u.id = p.user_id
      JOIN assessments a ON a.id = p.assessment_id
      WHERE u.phone = ${phone}
        AND a.session_id = ${sessionId}::uuid
        AND p.tier = 'module1'
        AND p.status = 'paid'
      LIMIT 1
    `) as unknown as { id: string }[];

    if (purchases.length === 0) {
      return NextResponse.json({ eligible: false });
    }

    // Check 2: Week 1 completion — user must have completed all 5 days + weekend review.
    // lms_progress is created in Phase 6; until then, no one is eligible.
    // We check for a week=1 completion marker with completed_at set.
    const weekComplete = (await sql`
      SELECT id FROM lms_progress
      WHERE user_id = (SELECT id FROM users WHERE phone = ${phone} LIMIT 1)
        AND week = 1
        AND day  = 0           -- day 0 = weekend review / week-level completion marker
        AND completed_at IS NOT NULL
      LIMIT 1
    `) as unknown as { id: string }[];

    return NextResponse.json({ eligible: weekComplete.length > 0 });
  } catch (e) {
    console.error("[checkout/topup/eligible]", e);
    // Fail closed — if we can't verify, don't offer the upgrade
    return NextResponse.json({ eligible: false });
  }
}
