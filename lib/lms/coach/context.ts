// Builds the Coach's context entirely server-side (never from client input): who the parent/child
// are, where they are in the plan, tonight's step, recent outcomes, memory, and the recent
// conversation. Works for both v1 and v2 users (report_v2_content is used when present).
import { getSql } from "@/lib/db/client";
import { readCachedReportV2 } from "@/lib/report-v2/service";
import { archetypeDesc } from "@/content/report-v2/fallbacks";
import { getUserProgress, isWeekUnlocked } from "@/lib/lms/progress";
import { getLmsWeekContent, getDayCard } from "@/lib/lms/content";
import { fillLmsContent } from "@/lib/lms/render";
import { WEEK_TITLES } from "@/lib/report/skills";
import { CONCERN_CARD_LABELS } from "@/lib/concerns";
import { ENTITY } from "@/lib/entity";
import type { LmsUserContext } from "@/lib/lms/user-context";
import { buildSystemPrompt, coachPronoun, type PromptVars } from "./prompt";
import type { CoachTurn } from "./llm";

export type CoachContext = {
  system: string;
  history: CoachTurn[];
  child: string;
  parent: string;
  supportEmail: string;
  week: number;
  day: number;
  tonightStep: string;   // short, for the opening template
  hasCalls: boolean;     // tier2 (plan + calls)
};

// Current week/day: furthest week whose Day 1 is unlocked and which still has an unfinished day.
async function currentPosition(userId: string, archetype: string, ageBand: string, now: Date) {
  const progs = await Promise.all([1, 2, 3, 4, 5, 6].map((w) => getUserProgress(userId, w)));
  let week = 1, day = 1;
  for (let w = 1; w <= 6; w++) {
    const prog = progs[w - 1];
    const prev = w > 1 ? progs[w - 2] : null;
    const hasContent = getLmsWeekContent(archetype, w, ageBand as never) !== null;
    if (!hasContent || !isWeekUnlocked(w, prev, now)) break;
    const done = [1, 2, 3, 4, 5].filter((d) => prog.completedDays.has(d));
    week = w;
    if (done.length < 5) { day = done.length === 0 ? 1 : Math.min(Math.max(...done) + 1, 5); break; }
    day = prog.completedDays.has(0) ? 1 : 0; // 0 = weekend pending
  }
  return { week, day, prog: progs[week - 1] };
}

export async function buildCoachContext(
  ctx: LmsUserContext,
  source: string,
  outcome?: string,
): Promise<CoachContext> {
  const sql = getSql();
  const now = new Date();
  const pronoun = coachPronoun(ctx.childGender);
  const fill = (s: string) => fillLmsContent(s, ctx.childName, ctx.childGender);

  // parent first name, session id, plan tier
  const rows = (await sql`
    SELECT a.parent_name, a.session_id::text AS session_id, a.concerns, a.report_v2_goal, p.tier
    FROM assessments a JOIN purchases p ON p.assessment_id = a.id
    WHERE p.user_id = ${ctx.userId} AND p.status = 'paid'
    ORDER BY p.created_at DESC LIMIT 1
  `) as unknown as { parent_name: string | null; session_id: string; concerns: string[] | null; report_v2_goal: string | null; tier: string | null }[];
  const r = rows[0];
  const parent = (r?.parent_name ?? "").trim().split(/\s+/)[0] || "there";
  const hasCalls = r?.tier === "tier2";

  const report = r?.session_id ? await readCachedReportV2(sql, r.session_id).catch(() => null) : null;
  const concernKey = (r?.concerns ?? [])[0] ?? "";
  const worry = report?.worryLabel || CONCERN_CARD_LABELS[concernKey] || "staying focused";
  const goal = report?.goal || r?.report_v2_goal || "building focus without nagging";

  const { week, day, prog } = await currentPosition(ctx.userId, ctx.archetype, ctx.ageBand, now);
  const weekContent = getLmsWeekContent(ctx.archetype, week, ctx.ageBand);
  const dayCard = weekContent && day >= 1 ? getDayCard(weekContent, day) : null;
  const tonightStep = dayCard ? fill(dayCard.title).replace(/[*_]/g, "") : `Week ${week}`;
  const dayText = dayCard ? fill(dayCard.content[ctx.ageBand]).replace(/[*_]/g, "") : "";
  const doneDays = [1, 2, 3, 4, 5].filter((d) => prog.completedDays.has(d));

  // last 3 day outcomes + memory
  const outcomes = (await sql`SELECT week, day, outcome FROM lms_day_outcome WHERE user_id = ${ctx.userId} ORDER BY created_at DESC LIMIT 3`) as unknown as { week: number; day: number; outcome: string }[];
  const mem = (await sql`SELECT facts, summary FROM coach_memory WHERE user_id = ${ctx.userId}`) as unknown as { facts: string[]; summary: string }[];
  const facts: string[] = Array.isArray(mem[0]?.facts) ? mem[0].facts : [];
  const summary = mem[0]?.summary ?? "";

  // last 20 non-safety messages → LLM history (safety-flagged content is never sent to the model)
  const hist = (await sql`
    SELECT role, content FROM coach_messages
    WHERE user_id = ${ctx.userId} AND safety_flag = false AND role <> 'safety'
    ORDER BY created_at DESC LIMIT 20
  `) as unknown as { role: string; content: string }[];
  const history: CoachTurn[] = hist.reverse().map((m) => ({ role: m.role === "parent" ? "user" : "assistant", content: m.content }));

  const vars: PromptVars = {
    parent, child: ctx.childName, age_band: ctx.ageBand, archetype: ctx.archetype,
    week, pronoun, support_email: ENTITY.supportEmail,
  };

  // Facts the model should know — appended to the system prompt. Report fields are present only
  // when a v2 report exists; they are used silently (never named back to the parent).
  const lines: string[] = [
    `\n\n## What you know (use silently; never name these fields)`,
    `Child: ${ctx.childName} (${pronoun}), age ${ctx.ageBand}. Archetype: ${ctx.archetype} — ${archetypeDesc(ctx.archetype, ctx.childName, ctx.childGender)}`,
    `Parent instinct: ${ctx.parentPattern || "unknown"}.`,
    `The worry: ${worry}. The goal: ${goal}.`,
    `Plan: ${hasCalls ? "tier2 — the six-week plan + 3 calls with us" : "the six-week plan"}.`,
    `Right now: Week ${week} — "${WEEK_TITLES[week] ?? ""}", Day ${day === 0 ? "weekend" : day}. Days done this week: ${doneDays.join(", ") || "none"}.`,
    tonightStep ? `Tonight's step: ${tonightStep}.` : "",
    dayText ? `Today's step text: ${dayText}` : "",
    report?.hardPart ? `The hard part (from the report): ${fill(report.hardPart).replace(/[*_]/g, "")}` : "",
    report?.seenIt ? `What they saw: ${fill(report.seenIt).replace(/[*_]/g, "")}` : "",
    outcomes.length ? `Recent day outcomes: ${outcomes.map((o) => `W${o.week}D${o.day}=${o.outcome}`).join(", ")}.` : "",
    facts.length ? `Remembered facts: ${facts.join("; ")}.` : "",
    summary ? `Summary of past chats: ${summary}` : "",
    source === "after_done" && outcome ? `The parent just marked today "${outcome}". Respond to that first.` : "",
  ].filter(Boolean);

  return {
    system: buildSystemPrompt(vars) + lines.join("\n"),
    history,
    child: ctx.childName,
    parent,
    supportEmail: ENTITY.supportEmail,
    week, day, tonightStep, hasCalls,
  };
}
