// Resolver + cache + coach override. One row per (user, week, day, origin) in plan_adjustments.
// Read precedence: a Coach override ALWAYS beats an auto-adjust. The LMS day screen calls
// resolveForDay(); the Coach tool calls writeCoachOverride(). Generation is cached, so a day is
// generated once and the model isn't hit again on later renders.
import "server-only";
import { getSql } from "@/lib/db/client";
import { fillTokens, type Gender } from "@/lib/report/pronouns";
import { STRENGTH, PULL, ARCHETYPE_KEYS, type ArchetypeKey } from "@/lib/report-v3/copy";
import { planTomorrow, didntLandStreak } from "./tomorrow";
import { generateAdjustedStep, type ModelCall } from "./generate";
import { validateStep } from "./validate";
import type { AdjustedStep, AdjustOrigin, AdjustSource, PlanOutcome, ResolvedStep } from "./types";
import { toPlanOutcome } from "./types";

// The next plan day a parent will reach after (week, day): the next day in the week, else Day 1 of the
// next week. null at Week 6 Day 5 (end of plan). Days are 1–5 (the weekend review isn't adjusted).
export function nextPlanDay(week: number, day: number): { week: number; day: number } | null {
  if (day < 5) return { week, day: day + 1 };
  if (week < 6) return { week: week + 1, day: 1 };
  return null;
}

// The child's pattern in plain, NAME-FREE words (strength + pull), filled for gender. Never a label.
export function patternPlain(archetype: string, gender: Gender): string {
  const key = (ARCHETYPE_KEYS as string[]).includes(archetype) ? (archetype as ArchetypeKey) : "storm";
  const fill = fillTokens("", gender);
  return `${fill(STRENGTH[key])}. Pulled toward: ${fill(PULL[key])}.`;
}

type Row = {
  origin: AdjustOrigin; source: AdjustSource; step: AdjustedStep; reason: string | null;
  prior_outcome: string | null; show_coach_line: boolean; validator_ok: boolean; retry_used: boolean;
};

// A Coach override ALWAYS beats an auto-adjust (pure — unit-tested). Among same-origin rows the SQL
// returns newest first, so index 0 of each origin is the current one.
export function preferCoachRow<T extends { origin: AdjustOrigin }>(rows: T[]): T | null {
  return rows.find((r) => r.origin === "coach") ?? rows[0] ?? null;
}

// Prefer the coach override; else the auto row; else none.
async function readCached(userId: string, week: number, day: number): Promise<Row | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT origin, source, step, reason, prior_outcome, show_coach_line, validator_ok, retry_used
    FROM plan_adjustments
    WHERE user_id = ${userId} AND week = ${week} AND day = ${day}
    ORDER BY (origin = 'coach') DESC, updated_at DESC
  `) as unknown as Row[];
  return preferCoachRow(rows);
}

function rowToResolved(r: Row): ResolvedStep {
  return {
    step: r.step, origin: r.origin, source: r.source, reason: r.reason,
    priorOutcome: toPlanOutcome(r.prior_outcome), showCoachLine: r.show_coach_line,
    validatorOk: r.validator_ok, retryUsed: r.retry_used,
  };
}

async function writeAuto(
  o: { userId: string; assessmentId: string | null; week: number; day: number; prior: PlanOutcome; streak: number;
       step: AdjustedStep; source: AdjustSource; validatorOk: boolean; retryUsed: boolean; showCoachLine: boolean;
       model: string; inputTokens: number; outputTokens: number; costPaise: number },
): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO plan_adjustments
      (user_id, assessment_id, week, day, origin, prior_outcome, streak, step, source,
       validator_ok, retry_used, show_coach_line, model, input_tokens, output_tokens, cost_paise)
    VALUES
      (${o.userId}, ${o.assessmentId}, ${o.week}, ${o.day}, 'auto', ${o.prior}, ${o.streak},
       ${JSON.stringify(o.step)}::json, ${o.source}, ${o.validatorOk}, ${o.retryUsed}, ${o.showCoachLine},
       ${o.model}, ${o.inputTokens}, ${o.outputTokens}, ${o.costPaise})
    ON CONFLICT (user_id, week, day, origin) DO UPDATE SET
      step = EXCLUDED.step, source = EXCLUDED.source, prior_outcome = EXCLUDED.prior_outcome,
      streak = EXCLUDED.streak, validator_ok = EXCLUDED.validator_ok, retry_used = EXCLUDED.retry_used,
      show_coach_line = EXCLUDED.show_coach_line, model = EXCLUDED.model,
      input_tokens = EXCLUDED.input_tokens, output_tokens = EXCLUDED.output_tokens,
      cost_paise = EXCLUDED.cost_paise, updated_at = now()
  `;
}

// Read the prior day's outcome, the parent's note, and the didnt_land streak ending yesterday.
export async function readPrior(userId: string, week: number, day: number): Promise<{ prior: PlanOutcome | null; note: string | null; streak: number }> {
  if (day <= 1) return { prior: null, note: null, streak: 0 };
  const sql = getSql();
  const rows = (await sql`
    SELECT day, outcome, note FROM lms_reflections WHERE user_id = ${userId} AND week = ${week}
  `) as unknown as { day: number; outcome: string; note: string | null }[];
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const priorRow = byDay.get(day - 1);
  const prior = toPlanOutcome(priorRow?.outcome);
  const streak = didntLandStreak(day - 1, (d) => toPlanOutcome(byDay.get(d)?.outcome ?? null));
  return { prior, note: priorRow?.note ?? null, streak };
}

export type ResolveInput = {
  userId: string;
  assessmentId: string | null;
  archetype: string;
  ageBand: string;
  childName: string;
  gender: Gender;
  worryLabel: string;
  week: number;
  day: number;
  baseTitle: string;   // token-filled
  baseText: string;    // token-filled base day prose
};

// Resolve the step for a day. Returns null when there is no adjustment to show (no prior outcome yet).
export async function resolveForDay(input: ResolveInput, modelCall?: ModelCall): Promise<ResolvedStep | null> {
  const cached = await readCached(input.userId, input.week, input.day);
  if (cached) return rowToResolved(cached);

  const { prior, note, streak } = await readPrior(input.userId, input.week, input.day);
  if (!prior) return null; // first day / nothing tapped → show the base day as-is

  const tomorrow = planTomorrow(prior, streak);
  const gen = await generateAdjustedStep(
    {
      childName: input.childName, ageBand: input.ageBand, patternPlain: patternPlain(input.archetype, input.gender),
      worryLabel: input.worryLabel, week: input.week, day: input.day,
      baseTitle: input.baseTitle, baseText: input.baseText,
      priorOutcome: prior, priorNote: note, directive: tomorrow.directive,
    },
    modelCall,
  );

  await writeAuto({
    userId: input.userId, assessmentId: input.assessmentId, week: input.week, day: input.day,
    prior, streak, step: gen.step, source: gen.source, validatorOk: gen.validatorOk, retryUsed: gen.retryUsed,
    showCoachLine: tomorrow.showCoachLine, model: gen.model, inputTokens: gen.inputTokens,
    outputTokens: gen.outputTokens, costPaise: gen.costPaise,
  }).catch((e) => console.error("[plan-adjust] writeAuto failed:", (e as Error).message));

  return {
    step: gen.step, origin: "auto", source: gen.source, reason: null, priorOutcome: prior,
    showCoachLine: tomorrow.showCoachLine, validatorOk: gen.validatorOk, retryUsed: gen.retryUsed,
  };
}

// A4 — the Coach writes a validated override for the next unlocked day. Returns ok only after the DB
// write succeeds, so the Coach can truthfully say "I've updated your step". `patched` is the merged
// step (base merged with the coach's patch) — the caller validates; we re-validate defensively here.
export async function writeCoachOverride(o: {
  userId: string; assessmentId: string | null; week: number; day: number;
  step: AdjustedStep; reason: string; baseText: string;
}): Promise<{ ok: boolean; issue?: string }> {
  const v = validateStep(o.step, o.baseText, { week: o.week });
  if (!v.ok) return { ok: false, issue: v.issues.join("; ") };
  const sql = getSql();
  try {
    await sql`
      INSERT INTO plan_adjustments
        (user_id, assessment_id, week, day, origin, step, source, reason, validator_ok, retry_used, show_coach_line)
      VALUES
        (${o.userId}, ${o.assessmentId}, ${o.week}, ${o.day}, 'coach',
         ${JSON.stringify(o.step)}::json, 'coach', ${o.reason}, true, false, false)
      ON CONFLICT (user_id, week, day, origin) DO UPDATE SET
        step = EXCLUDED.step, reason = EXCLUDED.reason, assessment_id = EXCLUDED.assessment_id, updated_at = now()
    `;
    return { ok: true };
  } catch (e) {
    return { ok: false, issue: (e as Error).message };
  }
}
