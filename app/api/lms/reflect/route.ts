import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";
import { storeReflection } from "@/lib/lms/progress";
import type { ReflectionOutcome } from "@/content/types";
import { assertBootGuards } from "@/lib/boot-guard";

assertBootGuards();

const VALID_OUTCOMES: ReflectionOutcome[] = ["worked", "mixed", "didnt_land"];

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value ?? "";
    const userId = verifySessionToken(token);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const week = Number(body.week);
    const day = Number(body.day);
    const outcome = body.outcome as ReflectionOutcome;
    const note = typeof body.note === "string" ? body.note.slice(0, 1000) : null;

    if (!Number.isInteger(week) || !Number.isInteger(day)) {
      return NextResponse.json({ error: "week and day must be integers" }, { status: 400 });
    }
    if (day < 2 || day > 5) {
      return NextResponse.json({ error: "Reflections are for days 2–5 only" }, { status: 400 });
    }
    if (!VALID_OUTCOMES.includes(outcome)) {
      return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
    }

    await storeReflection(userId, week, day, outcome, note);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/lms/reflect]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
