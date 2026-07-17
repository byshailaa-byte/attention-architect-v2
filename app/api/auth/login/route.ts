import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, verifyPassword } from "@/lib/auth/password";
import { createSessionToken, COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/auth/session";
import { assertBootGuards } from "@/lib/boot-guard";

assertBootGuards();

export async function POST(req: NextRequest) {
  try {
    const { email, password } = (await req.json()) as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(email);

    // Constant-time branch: always run bcrypt work even on miss to prevent timing attacks
    if (!user || !user.password_hash) {
      await verifyPassword("__no_match__", "$2b$12$invalidhashpaddingtomakeittaketime000000000000000000000");
      return NextResponse.json(
        { error: "Incorrect email or password" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: "Incorrect email or password" },
        { status: 401 }
      );
    }

    const token = createSessionToken(user.id);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
    return res;
  } catch (e) {
    console.error("[api/auth/login]", e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
