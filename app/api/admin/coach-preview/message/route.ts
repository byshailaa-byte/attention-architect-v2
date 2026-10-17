import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";
import { ENTITY } from "@/lib/entity";
import { fillTokens } from "@/lib/report/pronouns";
import { readCachedReportV2 } from "@/lib/report-v2/service";
import { callCoach, type CoachResult } from "@/lib/lms/coach/llm";
import { isSafetyMessage, safetyReply } from "@/lib/lms/coach/safety";
import { enforceReplyQuality, primarySayThis, decideLanguage, looksLikeStepRequest, isCheckinTrigger, isLanguageComplaint, REPLY_MAX_WORDS, STEP_DELIVERY_MAX_WORDS } from "@/lib/lms/coach/guards";
import { coachTrialEnabled } from "@/lib/coach-trial/flags";
import { resolvePreviewAccess } from "@/lib/coach-trial/access";
import { TRIAL_DAILY_LIMIT, trialOverDailyLimit } from "@/lib/coach-trial/limits";
import { resolveTrialDays } from "@/lib/coach-trial/content";
import { buildTrialSystemPrompt, loadTrialHistory } from "@/lib/coach-trial/prompt";
import { worryGoalLine } from "@/lib/coach-trial/onboarding";
import { extractOutcome, recordTrialOutcome, readOutcomes, hasOutcomeAnswer } from "@/lib/lms/coach/outcomes";
import type { AgeBand } from "@/content/types";

assertBootGuards();

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Preview Coach typed-question endpoint. Mirrors /api/coach/message EXACTLY (same safety gate, same
// system prompt, same reply-quality guards, same caps, same model) — the only differences: it's
// admin-authed (/api/admin/* Basic Auth), resolves the trial by id (sandbox, is_preview=true), takes
// a simulated `day` from the admin day switcher, and NEVER fires analytics. Cost is logged to
// coach_messages under the preview trial_id, so preview spend is naturally separate in cost logs.
async function previewParentCountToday(sql: ReturnType<typeof getSql>, trialId: string): Promise<number> {
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
    const body = await req.json().catch(() => ({}));
    const trialId = typeof body.trialId === "string" ? body.trialId : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const day = Math.min(Math.max(parseInt(String(body.day ?? "1"), 10) || 1, 1), 4);
    if (!trialId) return NextResponse.json({ error: "trialId required" }, { status: 400 });
    if (!message) return NextResponse.json({ error: "empty" }, { status: 400 });
    if (message.length > 1000) return NextResponse.json({ error: "too_long" }, { status: 400 });

    const access = await resolvePreviewAccess(trialId);
    if (access.role !== "trial") return NextResponse.json({ error: "no_preview" }, { status: 404 });
    const { trial, userCtx } = access;
    const sql = getSql();

    const usedToday = await previewParentCountToday(sql, trial.id);
    if (trialOverDailyLimit(usedToday)) return NextResponse.json({ error: "daily_limit", messagesLeft: 0 }, { status: 429 });

    // ── SAFETY FIRST — no model call (identical to the live route) ──
    if (isSafetyMessage(message)) {
      await sql`INSERT INTO coach_messages (user_id, trial_id, role, content, source, origin, day, safety_flag)
                VALUES (${trial.user_id}, ${trial.id}::uuid, 'parent', ${message}, 'coach', 'script', ${day}, true)`;
      const reply = safetyReply(userCtx.childName, ENTITY.supportEmail);
      const rows = (await sql`INSERT INTO coach_messages (user_id, trial_id, role, content, source, origin, day, safety_flag)
                VALUES (${trial.user_id}, ${trial.id}::uuid, 'safety', ${reply}, 'coach', 'script', ${day}, true) RETURNING id`) as unknown as { id: string }[];
      return NextResponse.json({
        reply, role: "safety", messageId: rows[0]?.id, safety: true,
        messagesLeft: Math.max(0, TRIAL_DAILY_LIMIT - (usedToday + 1)),
      });
    }

    // ── Normal coaching turn (identical building blocks to the live route) ──
    const report = await readCachedReportV2(sql, trial.session_id ?? "").catch(() => null);
    const cards = await resolveTrialDays({
      sessionId: trial.session_id ?? "", archetype: userCtx.archetype,
      ageBand: userCtx.ageBand as AgeBand, childName: userCtx.childName, gender: userCtx.childGender,
    });
    const today = cards[day - 1];
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
      focusConcern: trial.focus_concern,
    });
    const history = await loadTrialHistory(trial.id);

    let result: CoachResult;
    try {
      result = await callCoach(system, [...history, { role: "user", content: message }]);
    } catch (e) {
      console.error("[coach-preview] model call failed:", (e as Error).message);
      return NextResponse.json({ error: "model_failed", reply: "The Coach couldn't answer just now. Try again in a minute." }, { status: 502 });
    }

    const priorQuotes = history.filter((h) => h.role === "assistant").map((h) => primarySayThis(h.content)).filter((q): q is string => !!q);
    const prior = await readOutcomes("trial", trial.id);
    const requireCheckin = isCheckinTrigger(message) && !hasOutcomeAnswer(message) && !prior.some((o) => o.day === day);
    const thisConfusion = extractOutcome(message)?.outcome === "unclear";
    const requireOfferCall = thisConfusion && prior.filter((o) => o.day === day && o.outcome === "unclear").length >= 1;
    const coachMsgsToday = (await sql`
      SELECT content FROM coach_messages WHERE trial_id = ${trial.id}::uuid AND role = 'coach'
        AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date
    `) as unknown as { content: string }[];
    const mustAdvise = coachMsgsToday.filter((m) => m.content.trim().endsWith("?") && !primarySayThis(m.content)).length >= 2;
    await enforceReplyQuality(
      result.text,
      async (correction) => {
        try {
          const r = await callCoach(system, [...history, { role: "user", content: message }, { role: "assistant", content: result.text }, { role: "user", content: correction }]);
          if (r.text) result = r;
          return result.text;
        } catch { return ""; }
      },
      (m) => console.warn(`${m} (preview ${trial.id.slice(0, 8)})`),
      priorQuotes, message, language,
      {
        maxWords: (looksLikeStepRequest(message) || mustAdvise) ? STEP_DELIVERY_MAX_WORDS : REPLY_MAX_WORDS,
        requireCheckin, mustAdvise, requireHindiOffer: isLanguageComplaint(message),
        requireOfferCall, forbidReinterrogate: hasOutcomeAnswer(message),
      },
    );

    await sql`INSERT INTO coach_messages (user_id, trial_id, role, content, source, origin, day)
              VALUES (${trial.user_id}, ${trial.id}::uuid, 'parent', ${message}, 'coach', 'llm', ${day})`;
    const coachRows = (await sql`
      INSERT INTO coach_messages (user_id, trial_id, role, content, source, origin, day, model, input_tokens, output_tokens, cost_paise)
      VALUES (${trial.user_id}, ${trial.id}::uuid, 'coach', ${result.text}, 'coach', 'llm', ${day}, ${result.model}, ${result.inputTokens}, ${result.outputTokens}, ${result.costPaise})
      RETURNING id`) as unknown as { id: string }[];

    // Record a day outcome from the parent's own words (so the preview Results screen has content).
    const extracted = extractOutcome(message);
    if (extracted) await recordTrialOutcome(trial.id, day, extracted.outcome, extracted.note, "chat").catch(() => {});

    return NextResponse.json({
      reply: result.text, role: "coach", messageId: coachRows[0]?.id,
      messagesLeft: Math.max(0, TRIAL_DAILY_LIMIT - (usedToday + 1)),
      costPaise: result.costPaise,
    });
  } catch (e) {
    console.error("[api/admin/coach-preview/message]", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
