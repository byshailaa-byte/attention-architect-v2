import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";

assertBootGuards();

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value ?? "";
    const userId = verifySessionToken(token);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sql = getSql();
    await sql`
      UPDATE users SET onboarding_completed_at = NOW()
      WHERE id = ${userId} AND onboarding_completed_at IS NULL
    `;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/lms/onboarding-complete]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
