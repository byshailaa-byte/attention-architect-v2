import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, createResetToken } from "@/lib/auth/password";
import { sendPasswordResetEmail } from "@/lib/auth/email";
import { assertBootGuards } from "@/lib/boot-guard";

assertBootGuards();

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Always return the same message regardless of whether the email exists
    // to prevent account enumeration.
    const user = await getUserByEmail(email);
    if (user?.password_hash) {
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3007";
      const raw = await createResetToken(user.id);
      const resetUrl = `${baseUrl}/lms/reset-password?token=${raw}`;
      await sendPasswordResetEmail(email.trim().toLowerCase(), resetUrl);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/auth/forgot-password]", e);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
