import { NextRequest, NextResponse } from "next/server";
import { verifyOtp, upsertUser } from "@/lib/auth/otp";
import { createSessionToken, COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/auth/session";
import { assertBootGuards } from "@/lib/boot-guard";

assertBootGuards();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cleaned = String(body.phone ?? "")
      .trim()
      .replace(/\D/g, "");
    const code = String(body.code ?? "").trim();

    if (!cleaned || !code) {
      return NextResponse.json({ error: "Phone and code are required" }, { status: 400 });
    }

    const valid = await verifyOtp(cleaned, code);
    if (!valid) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
    }

    const userId = await upsertUser(cleaned);
    const token = createSessionToken(userId);

    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
    return res;
  } catch (e) {
    console.error("[api/auth/otp/verify]", e);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
