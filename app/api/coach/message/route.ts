import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";
import { assertBootGuards } from "@/lib/boot-guard";
import { ENTITY } from "@/lib/entity";
import { isSafetyMessage, safetyReply } from "@/lib/lms/coach/safety";
import { sendCoachSafetyAlert } from "@/lib/auth/email";
import { coachTrialEnabled } from "@/lib/coach-trial/flags";
import { resolveCoachAccess } from "@/lib/coach-trial/access";
import { TRIAL_DAILY_LIMIT, trialOverDailyLimit } from "@/lib/coach-trial/limits";
import { flagTrial } from "@/lib/coach-trial/trial";
import { getSql } from "@/lib/db/client";
import { assembleCoachContext } from "@/lib/coach/context";
import { buildTrialSubject, getOrCreateOpener, streamCoachTurn } from "@/lib/coach/runtime";
import { finalCheck } from "@/lib/coach/final-check";
import { readTrackedNumbers } from "@/lib/coach/numbers";
import { trackServer } from "@/lib/analytics/track.server";

assertBootGuards();
export const dynamic = "force-dynamic";
// Streamed turns carry an internal budget (generation 55s + post-gen 12s + guard) that guarantees a
// terminal {done}; maxDuration must sit comfortably above it so the function is never killed mid-turn.
export const maxDuration = 120;

async function trialParentCountToday(sql: ReturnType<typeof getSql>, trialId: string): Promise<number> {
  const rows = (await sql`
    SELECT COUNT(*)::int AS c FROM coach_messages
    WHERE trial_id = ${trialId}::uuid AND role = 'parent'
      AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date
  `) as unknown as { c: number }[];
  return rows[0]?.c ?? 0;
}

// GET → the cached speak-first opener for today (generated once per parent per day).
export async function GET(req: NextRequest) {
  if (!coachTrialEnabled()) return NextResponse.json({ error: "disabled" }, { status: 404 });
  const userId = verifySessionToken(req.cookies.get(COOKIE_NAME)?.value ?? "");
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const access = await resolveCoachAccess(userId);
  if (access.role !== "trial") return NextResponse.json({ error: "no_trial" }, { status: 403 });
  if (access.locked) return NextResponse.json({ error: "trial_ended" }, { status: 403 });
  const { trial, userCtx, day } = access;
  try {
    const subject = await buildTrialSubject(trial, userCtx, day);
    const opener = await getOrCreateOpener(subject, { kind: "trial", userId, trialId: trial.id, day });
    return NextResponse.json({ reply: opener.text, messageId: opener.messageId, day });
  } catch (e) {
    console.error("[coach-trial] opener failed:", (e as Error).message);
    return NextResponse.json({ reply: `Hi! I'm your Attention Coach. Tell me — what usually happens at homework time with ${userCtx.childName}?`, messageId: null, day, degraded: true });
  }
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

    // ── SAFETY FIRST — no model call, no streaming ──
    if (isSafetyMessage(message)) {
      await sql`INSERT INTO coach_messages (user_id, trial_id, role, content, source, origin, day, safety_flag)
                VALUES (${userId}, ${trial.id}::uuid, 'parent', ${message}, 'coach', 'script', ${day}, true)`;
      const reply = safetyReply(userCtx.childName, ENTITY.supportEmail);
      await sql`INSERT INTO coach_messages (user_id, trial_id, role, content, source, origin, day, safety_flag)
                VALUES (${userId}, ${trial.id}::uuid, 'safety', ${reply}, 'coach', 'script', ${day}, true)`;
      await flagTrial(trial.id);
      const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://attentionparents.thehumandecision.in";
      const parentFirst = (userCtx.childName || "Parent").split(" ")[0];
      await sendCoachSafetyAlert(parentFirst, `${base}/admin/coach?u=${userId}`).catch(() => {});
      return NextResponse.json({ reply, role: "safety", safety: true, messagesLeft: Math.max(0, TRIAL_DAILY_LIMIT - (usedToday + 1)) });
    }

    const subject = await buildTrialSubject(trial, userCtx, day);
    const ctx = await assembleCoachContext(subject, message);
    return streamCoachTurn({
      ctx, subject, userMessage: message, key: { kind: "trial", userId, trialId: trial.id, day },
      onDone: async ({ text, toolNames }) => {
        const nums = await readTrackedNumbers("trial", trial.id).catch(() => []);
        const fc = finalCheck(text, { language: ctx.language, recordedNumbers: nums.flatMap((n) => [n.min, n.max]) });
        if (!fc.ok) console.warn(`[coach-trial] final-check ${fc.issues.join(",")} (trial ${trial.id.slice(0, 8)}) — ${fc.detail.join("; ")}`);
        await trackServer("coach_message_sent", { source: "llm", tools: toolNames.join(",") || "none" }, { sessionId: trial.session_id }).catch(() => {});
      },
    });
  } catch (e) {
    console.error("[api/coach/message]", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
