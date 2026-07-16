import { NextRequest, NextResponse } from "next/server";
import { issueOtp } from "@/lib/auth/otp";
import { assertBootGuards } from "@/lib/boot-guard";

assertBootGuards();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cleaned = String(body.phone ?? "")
      .trim()
      .replace(/\D/g, "");

    if (cleaned.length < 10) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    await issueOtp(cleaned);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/auth/otp/send]", e);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
