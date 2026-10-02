import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import {
  getUserByEmail,
  upsertUserByEmail,
  setUserPassword,
} from "@/lib/auth/password";
import { createSessionToken, COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/auth/session";
import { LMS_VER_COOKIE, LMS_VER_COOKIE_OPTIONS } from "@/lib/auth/lms-version-cookie";
import { getLmsVersion } from "@/lib/lms/lms-version";
import { assertBootGuards } from "@/lib/boot-guard";

// Issues the session + lms_ver hint cookie and returns lms_version so the client
// lands on the right experience. A freshly-set-password user has no paid-purchase
// backfill applied to them unless they're an existing customer, so they default v2.
function sessionResponse(userId: string, lmsVersion: "v1" | "v2") {
  const token = createSessionToken(userId);
  const res = NextResponse.json({ ok: true, lms_version: lmsVersion });
  res.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
  res.cookies.set(LMS_VER_COOKIE, lmsVersion, LMS_VER_COOKIE_OPTIONS);
  return res;
}

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

    // Prefer email-based account (control arm and gated arm users who provided email).
    const emailRows = (await sql`
      SELECT email FROM assessments
      WHERE session_id = ${sessionId}::uuid AND email IS NOT NULL
      LIMIT 1
    `) as unknown as { email: string }[];

    if (emailRows.length > 0 && emailRows[0].email) {
      const email = emailRows[0].email.trim().toLowerCase();
      const existing = await getUserByEmail(email);
      if (existing?.password_hash) {
        return NextResponse.json(
          { error: "An account already exists for this email. Please log in instead.", alreadyExists: true },
          { status: 409 }
        );
      }
      const userId = await upsertUserByEmail(email);
      await setUserPassword(userId, password);
      return sessionResponse(userId, await getLmsVersion(sql, userId));
    }

    // Phone-only path: gated arm users captured without email.
    // checkout/order already created a users row keyed by phone — find it via the purchase.
    const phoneRows = (await sql`
      SELECT u.id, u.password_hash
      FROM assessments a
      JOIN purchases p ON p.assessment_id = a.id
      JOIN users u ON u.id = p.user_id
      WHERE a.session_id = ${sessionId}::uuid
        AND p.status = 'paid'
      ORDER BY p.created_at DESC
      LIMIT 1
    `) as unknown as { id: string; password_hash: string | null }[];

    if (phoneRows.length === 0) {
      return NextResponse.json(
        { error: "No account found for this session. Please contact support." },
        { status: 404 }
      );
    }

    const { id: userId, password_hash } = phoneRows[0];
    if (password_hash) {
      return NextResponse.json(
        { error: "An account already exists for this session. Please log in instead.", alreadyExists: true },
        { status: 409 }
      );
    }

    await setUserPassword(userId, password);
    return sessionResponse(userId, await getLmsVersion(sql, userId));
  } catch (e) {
    console.error("[api/auth/set-password]", e);
    return NextResponse.json({ error: "Failed to set password" }, { status: 500 });
  }
}
