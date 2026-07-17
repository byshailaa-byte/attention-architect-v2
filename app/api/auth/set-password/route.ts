import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import {
  getUserByEmail,
  upsertUserByEmail,
  setUserPassword,
} from "@/lib/auth/password";
import { createSessionToken, COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/auth/session";
import { assertBootGuards } from "@/lib/boot-guard";

assertBootGuards();

export async function POST(req: NextRequest) {
  try {
    const { sessionId, password } = (await req.json()) as {
      sessionId?: string;
      password?: string;
    };

    if (!sessionId || !password) {
      return NextResponse.json(
        { error: "sessionId and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const sql = getSql();

    // Get email from the assessment (set during the report gate)
    const rows = (await sql`
      SELECT email FROM assessments
      WHERE session_id = ${sessionId}::uuid AND email IS NOT NULL
      LIMIT 1
    `) as unknown as { email: string }[];

    if (rows.length === 0 || !rows[0].email) {
      return NextResponse.json(
        { error: "No account email found for this session. Please contact support." },
        { status: 404 }
      );
    }

    const email = rows[0].email.trim().toLowerCase();

    const existing = await getUserByEmail(email);
    if (existing?.password_hash) {
      return NextResponse.json(
        { error: "An account already exists for this email. Please log in instead.", alreadyExists: true },
        { status: 409 }
      );
    }

    const userId = await upsertUserByEmail(email);
    await setUserPassword(userId, password);

    const token = createSessionToken(userId);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
    return res;
  } catch (e) {
    console.error("[api/auth/set-password]", e);
    return NextResponse.json({ error: "Failed to set password" }, { status: 500 });
  }
}
