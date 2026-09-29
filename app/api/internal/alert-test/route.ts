// POST /api/internal/alert-test
// Admin-only: fires a single ops alert so delivery can be verified in production.
// Auth: Authorization: Bearer <ADMIN_API_KEY>. Sends no PII.

import { NextRequest, NextResponse } from "next/server";
import { sendOpsAlert, opsAlertBody } from "@/lib/alerts/notify";

export async function POST(req: NextRequest) {
  const adminKey = process.env.ADMIN_API_KEY;
  const authHeader = req.headers.get("authorization") ?? "";
  if (!adminKey || authHeader !== `Bearer ${adminKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await sendOpsAlert(
    "Test alert",
    opsAlertBody({ sessionId: "alert-test", stage: "alert-test", error: "manual verification", attempts: null }),
  );

  return NextResponse.json({ ok: true });
}
