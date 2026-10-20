// End-number "where are you now?" capture for the results screens. Uses the SAME question + options
// as the Day-0 baseline (lib/coach-trial/onboarding.ts). The results screen shows a direct number
// ONLY if it improved vs the baseline — computed from the ordered chip scale per worry, NEVER
// estimated/rounded/inferred from chat.
import { getSql } from "@/lib/db/client";
import { baselineQuestion, type Worry } from "@/lib/coach-trial/onboarding";

export type CheckinKind = "paid" | "trial";

// "Improved" direction per worry: for most worries fewer/lower is better; for "finish" (how much of
// homework gets done: none→half→most→all) MORE is better. Everything else: lower chip index = better.
const HIGHER_IS_BETTER = new Set<Worry>(["finish"]);

function scale(worry: string): string[] {
  // The ordered chip VALUES for this worry, lowest→highest, straight from the baseline question.
  return baselineQuestion(worry).chips.map((c) => c.value);
}

// Did `now` improve on `baseline` for this worry? Both must be real chip values on the same scale;
// if either isn't found we return false (never guess). Improvement = moved ≥1 step in the better
// direction (lower index for count/time worries; higher index for "finish").
export function isImproved(worry: string, baseline: string | null, now: string | null): boolean {
  if (!baseline || !now) return false;
  const s = scale(worry);
  const rb = s.indexOf(baseline);
  const rn = s.indexOf(now);
  if (rb < 0 || rn < 0) return false;
  return HIGHER_IS_BETTER.has(worry as Worry) ? rn >= rb + 1 : rn <= rb - 1;
}

// ── DB (one capture per period; re-answer replaces) ──
export async function recordCheckin(kind: CheckinKind, subjectId: string, period: number, worry: string | null, value: string): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO coach_checkin_number (kind, subject_id, period, worry, value)
    VALUES (${kind}, ${subjectId}, ${period}, ${worry}, ${value})
    ON CONFLICT (kind, subject_id, period) DO UPDATE SET value = EXCLUDED.value, worry = EXCLUDED.worry, created_at = now()
  `;
}
export async function getCheckin(kind: CheckinKind, subjectId: string, period: number): Promise<string | null> {
  const sql = getSql();
  const rows = (await sql`SELECT value FROM coach_checkin_number WHERE kind = ${kind} AND subject_id = ${subjectId} AND period = ${period} LIMIT 1`) as unknown as { value: string }[];
  return rows[0]?.value ?? null;
}
// Paid baseline = the EARLIEST weekly capture (week 1's number), used to judge later weeks.
export async function getEarliestCheckin(kind: CheckinKind, subjectId: string): Promise<string | null> {
  const sql = getSql();
  const rows = (await sql`SELECT value FROM coach_checkin_number WHERE kind = ${kind} AND subject_id = ${subjectId} ORDER BY period ASC LIMIT 1`) as unknown as { value: string }[];
  return rows[0]?.value ?? null;
}
