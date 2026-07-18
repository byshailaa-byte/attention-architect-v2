import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";

assertBootGuards();

export async function POST(req: NextRequest) {
  try {
    const { sessionId, parentName, email, gender, tried, better } = (await req.json()) as {
      sessionId: string;
      parentName: string;
      email: string;
      gender?: string | null;
      tried?: string[];
      better?: string[];
    };

    if (!sessionId || !parentName?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sql = getSql();
    const result = (await sql`
      UPDATE assessments
      SET
        parent_name       = ${parentName.trim()},
        email             = ${email.trim()},
        child_gender      = ${gender ?? null},
        tried             = ${tried ?? []},
        better            = ${better ?? []},
        parent_details_at = now()
      WHERE session_id = ${sessionId}::uuid
      RETURNING id
    `) as unknown as unknown[];

    if (result.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[report/claim]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
