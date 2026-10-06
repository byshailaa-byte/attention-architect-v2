import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";
import { blockIfAdminView } from "@/lib/lms/admin-view-guard";
import { loadLmsUserContextById } from "@/lib/lms/user-context";
import { getSql } from "@/lib/db/client";
import { isSafetyMessage, safetyReply } from "@/lib/lms/coach/safety";
import { buildCoachContext } from "@/lib/lms/coach/context";
import { callCoach } from "@/lib/lms/coach/llm";
import { updateCoachMemory } from "@/lib/lms/coach/memory";
import { COACH_DAILY_LIMIT, overDailyLimit } from "@/lib/lms/coach/limits";
import { sendCoachSafetyAlert } from "@/lib/auth/email";
import { ENTITY } from "@/lib/entity";
import { assertBootGuards } from "@/lib/boot-guard";

assertBootGuards();

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VALID_SOURCES = new Set(["coach", "home", "day_card", "after_done", "chip", "module"]);

async function parentCountToday(sql: ReturnType<typeof getSql>, userId: string): Promise<number> {
  const rows = (await sql`
    SELECT COUNT(*)::int AS c FROM coach_messages
    WHERE user_id = ${userId} AND role = 'parent'
      AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date
  `) as unknown as { c: number }[];
  return rows[0]?.c ?? 0;
}

export async function POST(req: NextRequest) {
  try {
    const roBlock = blockIfAdminView(req); if (roBlock) return roBlock; // admin view: read-only
    const userId = verifySessionToken(req.cookies.get(COOKIE_NAME)?.value ?? "");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const source = VALID_SOURCES.has(body.source) ? (body.source as string) : "coach";
    const outcome = typeof body.outcome === "string" ? body.outcome : undefined;

    if (!message) return NextResponse.json({ error: "Empty message" }, { status: 400 });
    if (message.length > 1000) {
      return NextResponse.json({ error: "Please keep it under 1000 characters." }, { status: 400 });
    }

    const ctx = await loadLmsUserContextById(userId);
    if (!ctx) return NextResponse.json({ error: "not_paid" }, { status: 403 });

    const sql = getSql();
    const usedToday = await parentCountToday(sql, userId);
    if (overDailyLimit(usedToday)) {
      return NextResponse.json({ error: "daily_limit" }, { status: 429 });
    }

    // Need current week/day for storage even on the safety path.
    const coachCtx = await buildCoachContext(ctx, source, outcome);
    const week = coachCtx.week, day = coachCtx.day;

    // ── SAFETY FIRST — no model call ──
    if (isSafetyMessage(message)) {
      await sql`INSERT INTO coach_messages (user_id, role, content, source, week, day, safety_flag)
                VALUES (${userId}, 'parent', ${message}, ${source}, ${week}, ${day}, true)`;
      const reply = safetyReply(ctx.childName, ENTITY.supportEmail);
      const rows = (await sql`INSERT INTO coach_messages (user_id, role, content, source, week, day, safety_flag)
                VALUES (${userId}, 'safety', ${reply}, ${source}, ${week}, ${day}, true) RETURNING id`) as unknown as { id: string }[];
      // Alert an operator — first name + deep link only, never message content.
      const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://attentionparents.thehumandecision.in";
      const alert = await sendCoachSafetyAlert(coachCtx.parent, `${base}/admin/coach?u=${userId}`);
      return NextResponse.json({
        reply, role: "safety", messageId: rows[0]?.id,
        messagesLeft: Math.max(0, COACH_DAILY_LIMIT - (usedToday + 1)),
        safety: true, alert,
      });
    }

    // ── Normal coaching turn ──
    let result;
    try {
      result = await callCoach(coachCtx.system, [...coachCtx.history, { role: "user", content: message }]);
    } catch (e) {
      // Failed model call: store nothing (so it doesn't count toward the daily limit) and let the UI retry.
      console.error("[coach] model call failed:", (e as Error).message);
      return NextResponse.json({ error: "model_failed", reply: "The Coach couldn't answer just now. Try again in a minute." }, { status: 502 });
    }

    await sql`INSERT INTO coach_messages (user_id, role, content, source, week, day)
              VALUES (${userId}, 'parent', ${message}, ${source}, ${week}, ${day})`;
    const coachRows = (await sql`
      INSERT INTO coach_messages (user_id, role, content, source, week, day, model, input_tokens, output_tokens, cost_paise)
      VALUES (${userId}, 'coach', ${result.text}, ${source}, ${week}, ${day}, ${result.model}, ${result.inputTokens}, ${result.outputTokens}, ${result.costPaise})
      RETURNING id
    `) as unknown as { id: string }[];

    const nowCount = usedToday + 1;
    // Memory: after every 6th parent message, and after any after_done conversation.
    if (nowCount % 6 === 0 || source === "after_done") {
      await updateCoachMemory(userId).catch((e) => console.error("[coach] memory update failed:", (e as Error).message));
    }

    return NextResponse.json({
      reply: result.text, role: "coach", messageId: coachRows[0]?.id,
      messagesLeft: Math.max(0, COACH_DAILY_LIMIT - nowCount),
      model: result.model, costPaise: result.costPaise,
      inputTokens: result.inputTokens, outputTokens: result.outputTokens,
    });
  } catch (e) {
    console.error("[api/lms/coach]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
