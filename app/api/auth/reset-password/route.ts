import { NextRequest, NextResponse } from "next/server";
import {
  verifyResetToken,
  consumeResetToken,
  setUserPassword,
} from "@/lib/auth/password";
import { createSessionToken, COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/auth/session";
import { assertBootGuards } from "@/lib/boot-guard";

assertBootGuards();

export async function POST(req: NextRequest) {
  try {
    const { token, password } = (await req.json()) as {
      token?: string;
      password?: string;
    };

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const result = await verifyResetToken(token);
    if (!result) {
      return NextResponse.json(
        { error: "This reset link has expired or already been used." },
        { status: 400 }
      );
    }

    const { userId, tokenId } = result;
    await setUserPassword(userId, password);
    await consumeResetToken(tokenId);

    // Log the user in after successful reset
    const sessionToken = createSessionToken(userId);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, sessionToken, COOKIE_OPTIONS);
    return res;
  } catch (e) {
    console.error("[api/auth/reset-password]", e);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
