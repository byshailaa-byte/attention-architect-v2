import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";
import { blockIfAdminView } from "@/lib/lms/admin-view-guard";
import { loadLmsUserContextById } from "@/lib/lms/user-context";
import { getSql } from "@/lib/db/client";
import { isSafetyMessage, safetyReply } from "@/lib/lms/coach/safety";
import { readOutcomes, needsCall } from "@/lib/lms/coach/outcomes";
import { COACH_DAILY_LIMIT, overDailyLimit } from "@/lib/lms/coach/limits";
import { sendCoachSafetyAlert } from "@/lib/auth/email";
import { ENTITY } from "@/lib/entity";
import { assertBootGuards } from "@/lib/boot-guard";
import { assembleCoachContext } from "@/lib/coach/context";
import { buildPaidSubject, getOrCreateOpener, jsonCoachTurn } from "@/lib/coach/runtime";
import { finalCheck } from "@/lib/coach/final-check";
import { readTrackedNumbers } from "@/lib/coach/numbers";
import { requestCall } from "@/lib/coach/tools";

assertBootGuards();
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function parentCountToday(sql: ReturnType<typeof getSql>, userId: string): Promise<number> {
  const rows = (await sql`
    SELECT COUNT(*)::int AS c FROM coach_messages
    WHERE user_id = ${userId} AND trial_id IS NULL AND role = 'parent'
      AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date
  `) as unknown as { c: number }[];
  return rows[0]?.c ?? 0;
}

export async function GET(req: NextRequest) {
  const userId = verifySessionToken(req.cookies.get(COOKIE_NAME)?.value ?? "");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ctx = await loadLmsUserContextById(userId);
  if (!ctx) return NextResponse.json({ error: "not_paid" }, { status: 403 });
  try {
    const subject = await buildPaidSubject(ctx, "");
    const opener = await getOrCreateOpener(subject, { kind: "paid", userId, trialId: null, day: subject.day });
    return NextResponse.json({ reply: opener.text, messageId: opener.messageId, day: subject.day, week: subject.week });
  } catch (e) {
    console.error("[coach] opener failed:", (e as Error).message);
    return NextResponse.json({ reply: `Hi! I'm your Attention Coach. How did the last step go with ${ctx.childName}?`, messageId: null, degraded: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    const roBlock = blockIfAdminView(req); if (roBlock) return roBlock; // admin view: read-only
    const userId = verifySessionToken(req.cookies.get(COOKIE_NAME)?.value ?? "");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) return NextResponse.json({ error: "Empty message" }, { status: 400 });
    if (message.length > 1000) return NextResponse.json({ error: "Please keep it under 1000 characters." }, { status: 400 });

    const ctx = await loadLmsUserContextById(userId);
    if (!ctx) return NextResponse.json({ error: "not_paid" }, { status: 403 });

    const sql = getSql();
    const usedToday = await parentCountToday(sql, userId);
    if (overDailyLimit(usedToday)) return NextResponse.json({ error: "daily_limit" }, { status: 429 });

    const subject = await buildPaidSubject(ctx, message);
    const week = subject.week, day = subject.day;

    // ── SAFETY FIRST — no model call ──
    if (isSafetyMessage(message)) {
      await sql`INSERT INTO coach_messages (user_id, role, content, source, week, day, safety_flag)
                VALUES (${userId}, 'parent', ${message}, 'coach', ${week}, ${day}, true)`;
      const reply = safetyReply(ctx.childName, ENTITY.supportEmail);
      await sql`INSERT INTO coach_messages (user_id, role, content, source, week, day, safety_flag)
                VALUES (${userId}, 'safety', ${reply}, 'coach', ${week}, ${day}, true)`;
      const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://attentionparents.thehumandecision.in";
      await sendCoachSafetyAlert(subject.parentFirst, `${base}/admin/coach?u=${userId}`).catch(() => {});
      return NextResponse.json({ reply, role: "safety", safety: true, messagesLeft: Math.max(0, COACH_DAILY_LIMIT - (usedToday + 1)) });
    }

    const assembled = await assembleCoachContext(subject, message);
    const out = await jsonCoachTurn({
      ctx: assembled, subject, userMessage: message, key: { kind: "paid", userId, trialId: null, day },
      onDone: async ({ text, toolNames }) => {
        const nums = await readTrackedNumbers("paid", userId).catch(() => []);
        const fc = finalCheck(text, { language: assembled.language, recordedNumbers: nums.flatMap((n) => [n.min, n.max]) });
        if (!fc.ok) console.warn(`[coach] final-check ${fc.issues.join(",")} (user ${userId.slice(0, 8)}) tools=${toolNames.join(",") || "none"}`);
        // "Needs a call": two 'unclear' or two 'missed' in a row → queue a normal call (deduped).
        const rows = await readOutcomes("paid", userId).catch(() => []);
        const nc = needsCall(rows);
        if (nc.flag) await requestCall("paid", userId, ctx.assessmentId ?? null, "normal", `Needs a call: ${nc.reason}`, "needs_a_call").catch(() => {});
      },
    });
    return NextResponse.json({
      reply: out.reply, role: "coach", messageId: out.messageId, costPaise: out.costPaise,
      messagesLeft: Math.max(0, COACH_DAILY_LIMIT - (usedToday + 1)),
    });
  } catch (e) {
    console.error("[api/lms/coach]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
