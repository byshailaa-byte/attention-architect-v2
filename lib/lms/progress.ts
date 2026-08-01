import { getSql } from "@/lib/db/client";
import type { ReflectionOutcome } from "@/content/types";

export type WeekTrend = "mostly_worked" | "mixed" | "mostly_didnt_land";

export type LmsProgress = {
  completedDays: Set<number>;    // day values that have a row in lms_progress (0 = weekend)
  completionTimes: Map<number, Date>; // day → when lms_progress row was created
  reflections: Map<number, ReflectionOutcome>; // day 2–5 → outcome
};

// Rolling 24-hour delay from actual completion — not from purchase date, not from midnight.
export const UNLOCK_DELAY_MS = 24 * 60 * 60 * 1000;

export async function getUserProgress(userId: string, week: number): Promise<LmsProgress> {
  const sql = getSql();

  const [progressRows, reflectionRows] = await Promise.all([
    sql`
      SELECT day, completed_at FROM lms_progress
      WHERE user_id = ${userId} AND week = ${week}
    ` as unknown as Promise<{ day: number; completed_at: Date }[]>,
    sql`
      SELECT day, outcome FROM lms_reflections
      WHERE user_id = ${userId} AND week = ${week}
    ` as unknown as Promise<{ day: number; outcome: ReflectionOutcome }[]>,
  ]);

  return {
    completedDays: new Set(progressRows.map((r) => r.day)),
    completionTimes: new Map(progressRows.map((r) => [r.day, new Date(r.completed_at)])),
    reflections: new Map(reflectionRows.map((r) => [r.day, r.outcome])),
  };
}

// Gate rule:
//   Week 1 Day 1 → always unlocked (program entry point).
//   Week N Day 1 (N > 1) → previous week's Day 5 complete AND 24h elapsed.
//   Day 0 (weekend) → all 5 days complete AND 24h since Day 5.
//   Day N (2–5) → Day N-1 complete AND 24h elapsed since Day N-1 completed_at.
//
// prevWeekProgress is required when week > 1 && day === 1; ignored otherwise.
// now is injectable for testing; defaults to Date.now().
export function isDayUnlocked(
  day: number,
  week: number,
  progress: LmsProgress,
  prevWeekProgress: LmsProgress | null = null,
  now: Date = new Date(),
): boolean {
  if (day === 1 && week === 1) return true;

  if (day === 1 && week > 1) {
    if (!prevWeekProgress) return false;
    const t = prevWeekProgress.completionTimes.get(5);
    return (
      prevWeekProgress.completedDays.has(5) &&
      !!t &&
      now.getTime() - t.getTime() >= UNLOCK_DELAY_MS
    );
  }

  if (day === 0) {
    const allDone = [1, 2, 3, 4, 5].every((d) => progress.completedDays.has(d));
    const t = progress.completionTimes.get(5);
    return allDone && !!t && now.getTime() - t.getTime() >= UNLOCK_DELAY_MS;
  }

  const t = progress.completionTimes.get(day - 1);
  return (
    progress.completedDays.has(day - 1) &&
    !!t &&
    now.getTime() - t.getTime() >= UNLOCK_DELAY_MS
  );
}

// Where the user should land next inside a given week.
// Returns 1 if nothing complete, 0 (weekend) if days 1–5 done, else max_complete + 1.
export function getNextDay(progress: LmsProgress): number {
  const { completedDays } = progress;
  if (completedDays.size === 0) return 1;
  const weekDaysDone = [1, 2, 3, 4, 5].filter((d) => completedDays.has(d));
  if (weekDaysDone.length === 5) return 0; // weekend
  return Math.min(Math.max(...weekDaysDone) + 1, 5);
}

// [CALIBRATE] 3+ "worked" → mostly_worked; 3+ "didnt_land" → mostly_didnt_land; else mixed.
// Counts missing taps as "mixed" (least presumptuous default).
export function computeWeekTrend(reflections: Map<number, ReflectionOutcome>): WeekTrend {
  const outcomes = [2, 3, 4, 5].map((d) => reflections.get(d) ?? "mixed");
  const worked = outcomes.filter((o) => o === "worked").length;
  const didntLand = outcomes.filter((o) => o === "didnt_land").length;
  if (worked >= 3) return "mostly_worked";
  if (didntLand >= 3) return "mostly_didnt_land";
  return "mixed";
}

export async function markDayComplete(
  userId: string,
  assessmentId: string | null,
  week: number,
  day: number,
): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO lms_progress (user_id, assessment_id, week, day)
    VALUES (${userId}, ${assessmentId}, ${week}, ${day})
    ON CONFLICT (user_id, week, day) DO NOTHING
  `;
}

export async function storeReflection(
  userId: string,
  week: number,
  day: number,
  outcome: ReflectionOutcome,
  note: string | null,
): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO lms_reflections (user_id, week, day, outcome, note)
    VALUES (${userId}, ${week}, ${day}, ${outcome}, ${note})
    ON CONFLICT (user_id, week, day) DO UPDATE
      SET outcome = EXCLUDED.outcome,
          note    = EXCLUDED.note
  `;
}

// Marks all days from 1 to targetDay as complete (skips already-complete days).
// Does NOT set reflections — skipped days default to "mixed" branch at render time.
export async function skipToDay(
  userId: string,
  assessmentId: string | null,
  week: number,
  targetDay: number,
  progress: LmsProgress,
): Promise<void> {
  for (let d = 1; d <= targetDay; d++) {
    if (!progress.completedDays.has(d)) {
      await markDayComplete(userId, assessmentId, week, d);
    }
  }
}

export async function getActiveAssessmentId(userId: string): Promise<string | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT a.id FROM assessments a
    JOIN purchases p ON p.assessment_id = a.id
    WHERE p.user_id = ${userId} AND p.status = 'paid'
    ORDER BY p.created_at DESC LIMIT 1
  `) as unknown as { id: string }[];
  return rows[0]?.id ?? null;
}
