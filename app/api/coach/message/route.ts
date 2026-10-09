import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";
import { assertBootGuards } from "@/lib/boot-guard";
import { ENTITY } from "@/lib/entity";
import { fillTokens } from "@/lib/report/pronouns";
import { readCachedReportV2 } from "@/lib/report-v2/service";
import { callCoach, type CoachResult } from "@/lib/lms/coach/llm";
import { isSafetyMessage, safetyReply } from "@/lib/lms/coach/safety";
import { enforceReplyQuality, primarySayThis, decideLanguage } from "@/lib/lms/coach/guards";
import { sendCoachSafetyAlert } from "@/lib/auth/email";
import { coachTrialEnabled } from "@/lib/coach-trial/flags";
import { resolveCoachAccess } from "@/lib/coach-trial/access";
import { TRIAL_DAILY_LIMIT, trialOverDailyLimit } from "@/lib/coach-trial/limits";
import { resolveTrialDays } from "@/lib/coach-trial/content";
import { buildTrialSystemPrompt, loadTrialHistory } from "@/lib/coach-trial/prompt";
import { worryGoalLine } from "@/lib/coach-trial/onboarding";
import { flagTrial } from "@/lib/coach-trial/trial";
import { trackServer } from "@/lib/analytics/track.server";
import type { AgeBand } from "@/content/types";

assertBootGuards();

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function trialParentCountToday(sql: ReturnType<typeof getSql>, trialId: string): Promise<number> {
  const rows = (await sql`
    SELECT COUNT(*)::int AS c FROM coach_messages
    WHERE trial_id = ${trialId}::uuid AND role = 'parent'
      AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date
  `) as unknown as { c: number }[];
  return rows[0]?.c ?? 0;
}

export async function POST(req: NextRequest) {
  if (!coachTrialEnabled()) return NextResponse.json({ error: "disabled" }, { status: 404 });
  try {
    const userId = verifySessionToken(req.cookies.get(COOKIE_NAME)?.value ?? "");
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const access = await resolveCoachAccess(userId);
    if (access.role !== "trial") return NextResponse.json({ error: "no_trial" }, { status: 403 });
    if (access.locked) return NextResponse.json({ error: "trial_ended" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) return NextResponse.json({ error: "empty" }, { status: 400 });
    if (message.length > 1000) return NextResponse.json({ error: "too_long" }, { status: 400 });

    const { trial, userCtx, day } = access;
    const sql = getSql();

    const usedToday = await trialParentCountToday(sql, trial.id);
    if (trialOverDailyLimit(usedToday)) return NextResponse.json({ error: "daily_limit", messagesLeft: 0 }, { status: 429 });

    // ── SAFETY FIRST — no model call ──
    if (isSafetyMessage(message)) {
      await sql`INSERT INTO coach_messages (user_id, trial_id, role, content, source, origin, day, safety_flag)
                VALUES (${userId}, ${trial.id}::uuid, 'parent', ${message}, 'coach', 'script', ${day}, true)`;
      const reply = safetyReply(userCtx.childName, ENTITY.supportEmail);
      const rows = (await sql`INSERT INTO coach_messages (user_id, trial_id, role, content, source, origin, day, safety_flag)
                VALUES (${userId}, ${trial.id}::uuid, 'safety', ${reply}, 'coach', 'script', ${day}, true) RETURNING id`) as unknown as { id: string }[];
      await flagTrial(trial.id);
      const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://attentionparents.thehumandecision.in";
      const parentFirst = (userCtx.childName || "Parent").split(" ")[0];
      await sendCoachSafetyAlert(parentFirst, `${base}/admin/coach?u=${userId}`).catch(() => {});
      await trackServer("coach_message_sent", { source: "script" }, { sessionId: trial.session_id });
      return NextResponse.json({
        reply, role: "safety", messageId: rows[0]?.id, safety: true,
        messagesLeft: Math.max(0, TRIAL_DAILY_LIMIT - (usedToday + 1)),
      });
    }

    // ── Normal coaching turn ──
    const report = await readCachedReportV2(sql, trial.session_id ?? "").catch(() => null);
    const cards = await resolveTrialDays({
      sessionId: trial.session_id ?? "", archetype: userCtx.archetype,
      ageBand: userCtx.ageBand as AgeBand, childName: userCtx.childName, gender: userCtx.childGender,
    });
    const today = cards[Math.min(Math.max(day, 1), 4) - 1];
    const stepBody = today?.source === "report"
      ? [today.say, ...(today.steps ?? [])].filter(Boolean).join(" ")
      : (today?.body ?? "");
    const fill = fillTokens(userCtx.childName, userCtx.childGender);
    const language = decideLanguage(message);

    const system = buildTrialSystemPrompt({
      parent: "there", child: userCtx.childName, ageBand: userCtx.ageBand, archetype: userCtx.archetype,
      gender: userCtx.childGender, worryGoal: fill(worryGoalLine(trial.worry ?? "other")),
      baseline: trial.baseline_value, dayNumber: day, stepTitle: today?.title ?? "Tonight's step",
      stepBody, hardPart: report?.hardPart ?? "", supportEmail: ENTITY.supportEmail, language,
    });
    const history = await loadTrialHistory(trial.id);

    let result: CoachResult;
    try {
      result = await callCoach(system, [...history, { role: "user", content: message }]);
    } catch (e) {
      console.error("[coach-trial] model call failed:", (e as Error).message);
      return NextResponse.json({ error: "model_failed", reply: "The Coach couldn't answer just now. Try again in a minute." }, { status: 502 });
    }

    const priorQuotes = history.filter((h) => h.role === "assistant").map((h) => primarySayThis(h.content)).filter((q): q is string => !!q);
    await enforceReplyQuality(
      result.text,
      async (correction) => {
        try {
          const r = await callCoach(system, [...history, { role: "user", content: message }, { role: "assistant", content: result.text }, { role: "user", content: correction }]);
          if (r.text) result = r;
          return result.text;
        } catch { return ""; }
      },
      (m) => console.warn(`${m} (trial ${trial.id.slice(0, 8)})`),
      priorQuotes, message, language,
    );

    await sql`INSERT INTO coach_messages (user_id, trial_id, role, content, source, origin, day)
              VALUES (${userId}, ${trial.id}::uuid, 'parent', ${message}, 'coach', 'llm', ${day})`;
    const coachRows = (await sql`
      INSERT INTO coach_messages (user_id, trial_id, role, content, source, origin, day, model, input_tokens, output_tokens, cost_paise)
      VALUES (${userId}, ${trial.id}::uuid, 'coach', ${result.text}, 'coach', 'llm', ${day}, ${result.model}, ${result.inputTokens}, ${result.outputTokens}, ${result.costPaise})
      RETURNING id`) as unknown as { id: string }[];

    await trackServer("coach_message_sent", { source: "llm" }, { sessionId: trial.session_id });

    return NextResponse.json({
      reply: result.text, role: "coach", messageId: coachRows[0]?.id,
      messagesLeft: Math.max(0, TRIAL_DAILY_LIMIT - (usedToday + 1)),
      costPaise: result.costPaise,
    });
  } catch (e) {
    console.error("[api/coach/message]", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
