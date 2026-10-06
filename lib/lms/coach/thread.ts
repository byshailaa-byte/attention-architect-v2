// Server helper for the Coach page: ensures the (template, non-LLM) opening message exists, then
// loads the display thread + messages-left for today.
import { getSql } from "@/lib/db/client";
import type { LmsUserContext } from "@/lib/lms/user-context";
import { currentImpersonation } from "@/lib/lms/impersonation";
import { buildCoachContext } from "./context";
import { coachPronoun } from "./prompt";
import { COACH_DAILY_LIMIT } from "./limits";

export type CoachDisplayMessage = { id: string; role: "parent" | "coach" | "safety"; content: string; feedback: number | null };
export type CoachPageData = {
  messages: CoachDisplayMessage[];
  messagesLeft: number;
  week: number; day: number;
  child: string; parent: string; pronoun: string;
};

export async function loadCoachPageData(ctx: LmsUserContext): Promise<CoachPageData> {
  const sql = getSql();
  const coachCtx = await buildCoachContext(ctx, "coach");

  const cntRows = (await sql`SELECT COUNT(*)::int AS c FROM coach_messages WHERE user_id = ${ctx.userId}`) as unknown as { c: number }[];
  // In admin view-as-user (impersonation) we never write — the operator just reads the thread.
  if ((cntRows[0]?.c ?? 0) === 0 && !currentImpersonation()) {
    const isDay1 = coachCtx.week === 1 && coachCtx.day === 1;
    const step = coachCtx.tonightStep.replace(/[.\s]+$/, "");
    const opening = `Hi ${coachCtx.parent}. Tonight's step is ${step}. ${isDay1 ? "Ask me anything before you try it." : "How did yesterday go?"}`;
    await sql`INSERT INTO coach_messages (user_id, role, content, source, week, day)
              VALUES (${ctx.userId}, 'coach', ${opening}, 'coach', ${coachCtx.week}, ${coachCtx.day})`;
  }

  const messages = (await sql`
    SELECT id, role, content, feedback FROM coach_messages
    WHERE user_id = ${ctx.userId} ORDER BY created_at ASC LIMIT 100
  `) as unknown as CoachDisplayMessage[];

  const used = (await sql`
    SELECT COUNT(*)::int AS c FROM coach_messages
    WHERE user_id = ${ctx.userId} AND role = 'parent'
      AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date
  `) as unknown as { c: number }[];

  return {
    messages,
    messagesLeft: Math.max(0, COACH_DAILY_LIMIT - (used[0]?.c ?? 0)),
    week: coachCtx.week, day: coachCtx.day,
    child: ctx.childName, parent: coachCtx.parent, pronoun: coachPronoun(ctx.childGender),
  };
}
