import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";
import { ENTITY } from "@/lib/entity";
import { isSafetyMessage, safetyReply } from "@/lib/lms/coach/safety";
import { coachTrialEnabled } from "@/lib/coach-trial/flags";
import { resolvePreviewAccess } from "@/lib/coach-trial/access";
import { TRIAL_DAILY_LIMIT, trialOverDailyLimit } from "@/lib/coach-trial/limits";
import { assembleCoachContext } from "@/lib/coach/context";
import { buildTrialSubject, getOrCreateOpener, streamCoachTurn } from "@/lib/coach/runtime";
import { finalCheck } from "@/lib/coach/final-check";
import { readTrackedNumbers } from "@/lib/coach/numbers";

assertBootGuards();
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Preview Coach — admin-authed (/api/admin/* Basic Auth upstream), resolves a sandbox trial by id,
// takes a simulated `day` from the admin day switcher, and NEVER fires analytics. Same engine, same
// safety gate, same caps as the live trial route.
async function previewParentCountToday(sql: ReturnType<typeof getSql>, trialId: string): Promise<number> {
  const rows = (await sql`
    SELECT COUNT(*)::int AS c FROM coach_messages
    WHERE trial_id = ${trialId}::uuid AND role = 'parent'
      AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date
  `) as unknown as { c: number }[];
  return rows[0]?.c ?? 0;
}

const clampDay = (v: unknown) => Math.min(Math.max(parseInt(String(v ?? "1"), 10) || 1, 1), 4);

export async function GET(req: NextRequest) {
  if (!coachTrialEnabled()) return NextResponse.json({ error: "disabled" }, { status: 404 });
  const trialId = req.nextUrl.searchParams.get("trialId") ?? "";
  const day = clampDay(req.nextUrl.searchParams.get("day"));
  if (!trialId) return NextResponse.json({ error: "trialId required" }, { status: 400 });
  const access = await resolvePreviewAccess(trialId);
  if (access.role !== "trial") return NextResponse.json({ error: "no_preview" }, { status: 404 });
  const subject = await buildTrialSubject(access.trial, access.userCtx, day);
  const opener = await getOrCreateOpener(subject, { kind: "trial", userId: access.trial.user_id ?? "", trialId: access.trial.id, day });
  return NextResponse.json({ reply: opener.text, messageId: opener.messageId, day });
}

export async function POST(req: NextRequest) {
  if (!coachTrialEnabled()) return NextResponse.json({ error: "disabled" }, { status: 404 });
  try {
    const body = await req.json().catch(() => ({}));
    const trialId = typeof body.trialId === "string" ? body.trialId : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const day = clampDay(body.day);
    if (!trialId) return NextResponse.json({ error: "trialId required" }, { status: 400 });
    if (!message) return NextResponse.json({ error: "empty" }, { status: 400 });
    if (message.length > 1000) return NextResponse.json({ error: "too_long" }, { status: 400 });

    const access = await resolvePreviewAccess(trialId);
    if (access.role !== "trial") return NextResponse.json({ error: "no_preview" }, { status: 404 });
    const { trial, userCtx } = access;
    const sql = getSql();

    const usedToday = await previewParentCountToday(sql, trial.id);
    if (trialOverDailyLimit(usedToday)) return NextResponse.json({ error: "daily_limit", messagesLeft: 0 }, { status: 429 });

    if (isSafetyMessage(message)) {
      await sql`INSERT INTO coach_messages (user_id, trial_id, role, content, source, origin, day, safety_flag)
                VALUES (${trial.user_id}, ${trial.id}::uuid, 'parent', ${message}, 'coach', 'script', ${day}, true)`;
      const reply = safetyReply(userCtx.childName, ENTITY.supportEmail);
      await sql`INSERT INTO coach_messages (user_id, trial_id, role, content, source, origin, day, safety_flag)
                VALUES (${trial.user_id}, ${trial.id}::uuid, 'safety', ${reply}, 'coach', 'script', ${day}, true)`;
      return NextResponse.json({ reply, role: "safety", safety: true, messagesLeft: Math.max(0, TRIAL_DAILY_LIMIT - (usedToday + 1)) });
    }

    const subject = await buildTrialSubject(trial, userCtx, day);
    const ctx = await assembleCoachContext(subject, message);
    return streamCoachTurn({
      ctx, subject, userMessage: message, key: { kind: "trial", userId: trial.user_id ?? "", trialId: trial.id, day },
      onDone: async ({ text, toolNames }) => {
        const nums = await readTrackedNumbers("trial", trial.id).catch(() => []);
        const fc = finalCheck(text, { language: ctx.language, recordedNumbers: nums.flatMap((n) => [n.min, n.max]) });
        if (!fc.ok) console.warn(`[coach-preview] final-check ${fc.issues.join(",")} (preview ${trial.id.slice(0, 8)}) tools=${toolNames.join(",") || "none"} — ${fc.detail.join("; ")}`);
      },
    });
  } catch (e) {
    console.error("[api/admin/coach-preview/message]", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
