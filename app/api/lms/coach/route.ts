import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";
import { blockIfAdminView } from "@/lib/lms/admin-view-guard";
import { loadLmsUserContextById } from "@/lib/lms/user-context";
import { getSql } from "@/lib/db/client";
import { isSafetyMessage, safetyReply } from "@/lib/lms/coach/safety";
import { buildCoachContext } from "@/lib/lms/coach/context";
import { callCoach, type CoachResult } from "@/lib/lms/coach/llm";
import { enforceReplyQuality, primarySayThis, looksLikeStepRequest, isCheckinTrigger, REPLY_MAX_WORDS, STEP_DELIVERY_MAX_WORDS } from "@/lib/lms/coach/guards";
import { updateCoachMemory } from "@/lib/lms/coach/memory";
import { extractOutcome, recordPaidOutcome, readOutcomes, needsCall, hasOutcomeAnswer } from "@/lib/lms/coach/outcomes";
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

    // Need current week/day for storage even on the safety path. The parent's message is passed so
    // the reply language is decided in code from it (not left to the model).
    const coachCtx = await buildCoachContext(ctx, source, outcome, message);
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
    let result: CoachResult;
    try {
      result = await callCoach(coachCtx.system, [...coachCtx.history, { role: "user", content: message }]);
    } catch (e) {
      // Failed model call: store nothing (so it doesn't count toward the daily limit) and let the UI retry.
      console.error("[coach] model call failed:", (e as Error).message);
      return NextResponse.json({ error: "model_failed", reply: "The Coach couldn't answer just now. Try again in a minute." }, { status: 502 });
    }

    // Reply-quality guards (each fires at most once): too long (>90 words), a quoted sentence AND a
    // trailing question, or a banned method-drift phrase. Each regenerates with a targeted fix.
    const priorQuotes = coachCtx.history.filter((h) => h.role === "assistant").map((h) => primarySayThis(h.content)).filter((q): q is string => !!q);
    // Check-in-first: ask "what happened?" ONLY when we don't yet know how it went — i.e. a new day /
    // check-in context where the parent's message is NOT itself an answer, and no outcome is recorded.
    // If the message states an outcome ("it didn't work"), that's the answer → no forced question.
    const checkinTriggered = isCheckinTrigger(message) || (usedToday === 0 && day > 1);
    let requireCheckin = false;
    if (checkinTriggered && !hasOutcomeAnswer(message)) {
      const prior = await readOutcomes("paid", userId);
      requireCheckin = !prior.some((o) => o.week === week && o.day === day);
    }
    // Must-advise: after 2 diagnostic questions on this step today, the Coach must GIVE the step.
    const coachMsgsToday = (await sql`
      SELECT content FROM coach_messages WHERE user_id = ${userId} AND role = 'coach'
        AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date
    `) as unknown as { content: string }[];
    const coachQuestionsToday = coachMsgsToday.filter((m) => m.content.trim().endsWith("?") && !primarySayThis(m.content)).length;
    const mustAdvise = coachQuestionsToday >= 2;
    const genStart = Date.now();
    const { fired } = await enforceReplyQuality(
      result.text,
      async (correction) => {
        try {
          const r = await callCoach(coachCtx.system, [
            ...coachCtx.history,
            { role: "user", content: message },
            { role: "assistant", content: result.text },
            { role: "user", content: correction },
          ]);
          if (r.text) result = r; // keep tokens/cost of the reply we actually send
          return result.text;
        } catch { return ""; }
      },
      (m) => console.warn(`${m} (user ${userId.slice(0, 8)})`),
      priorQuotes,
      message,
      coachCtx.language,
      looksLikeStepRequest(message) ? STEP_DELIVERY_MAX_WORDS : REPLY_MAX_WORDS,
      requireCheckin,
      mustAdvise,
    );
    const regenCount = Object.values(fired).reduce((a, b) => a + b, 0);
    console.log(`[coach] model=${result.model} latency=${Date.now() - genStart}ms regens=${regenCount} (user ${userId.slice(0, 8)})`);

    await sql`INSERT INTO coach_messages (user_id, role, content, source, week, day)
              VALUES (${userId}, 'parent', ${message}, ${source}, ${week}, ${day})`;
    const coachRows = (await sql`
      INSERT INTO coach_messages (user_id, role, content, source, week, day, model, input_tokens, output_tokens, cost_paise)
      VALUES (${userId}, 'coach', ${result.text}, ${source}, ${week}, ${day}, ${result.model}, ${result.inputTokens}, ${result.outputTokens}, ${result.costPaise})
      RETURNING id
    `) as unknown as { id: string }[];

    // Structured outcome from the parent's own words (source='chat'). Additive — never blocks the
    // reply. The note is the parent's words; it stays in the DB (never logged / sent to analytics).
    const extracted = extractOutcome(message);
    if (extracted && day >= 1) {
      await recordPaidOutcome(userId, week, day, extracted.outcome, extracted.note, "chat").catch((e) => console.error("[coach] outcome record failed:", (e as Error).message));
      await flagNeedsCallIfRun(userId).catch((e) => console.error("[coach] needs-call check failed:", (e as Error).message));
    }

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

// "Needs a call": two 'unclear' or two 'missed' outcomes in a row → queue a call for this parent in
// the calling list (one open 'coach' follow-up at a time; we don't stack duplicates). No PII logged.
async function flagNeedsCallIfRun(userId: string): Promise<void> {
  const rows = await readOutcomes("paid", userId);
  const { flag, reason } = needsCall(rows);
  if (!flag) return;
  const sql = getSql();
  const a = (await sql`
    SELECT a.id FROM assessments a JOIN purchases p ON p.assessment_id = a.id
    WHERE p.user_id = ${userId} AND p.status = 'paid' ORDER BY p.created_at DESC LIMIT 1
  `) as unknown as { id: string }[];
  const assessmentId = a[0]?.id;
  if (!assessmentId) return;
  // Don't stack: only add if there isn't already an open 'coach' needs-a-call row.
  const existing = (await sql`
    SELECT 1 FROM call_log WHERE assessment_id = ${assessmentId} AND segment = 'coach' AND notes ILIKE 'Needs a call%' LIMIT 1
  `) as unknown as unknown[];
  if (existing.length > 0) return;
  await sql`
    INSERT INTO call_log (assessment_id, segment, notes, follow_up_at)
    VALUES (${assessmentId}, 'coach', ${`Needs a call: ${reason}`}, now())
  `.catch((e: unknown) => console.error("[coach] needs-call insert failed:", (e as Error).message));
}
