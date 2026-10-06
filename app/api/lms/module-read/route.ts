// POST /api/lms/module-read — records that a v2 reading module was opened.
// Body: { week, module }. Idempotent: UNIQUE(user_id, week, module) + ON CONFLICT
// DO NOTHING, so a re-open never double-counts. Auth via the LMS session cookie.
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";
import { blockIfAdminView } from "@/lib/lms/admin-view-guard";
import { checkUnlocked } from "@/lib/lms/unlock-gate";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";

assertBootGuards();

export async function POST(req: NextRequest) {
  try {
    const roBlock = blockIfAdminView(req); if (roBlock) return roBlock; // admin view: read-only
    const userId = verifySessionToken(req.cookies.get(COOKIE_NAME)?.value ?? "");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const week = Number(body.week);
    const moduleNum = Number(body.module);
    if (!Number.isInteger(week) || week < 1 || week > 6 || !Number.isInteger(moduleNum) || moduleNum < 1 || moduleNum > 4) {
      return NextResponse.json({ error: "Invalid week or module" }, { status: 400 });
    }

    const { unlocked } = await checkUnlocked(userId, week, null);
    if (!unlocked) {
      return NextResponse.json({ error: "Not unlocked yet" }, { status: 403 });
    }

    const sql = getSql();
    await sql`
      INSERT INTO lms_module_reads (user_id, week, module)
      VALUES (${userId}, ${week}, ${moduleNum})
      ON CONFLICT (user_id, week, module) DO NOTHING
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/lms/module-read]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
