// Honest number handling for the conversational Coach. Numbers are NEVER rounded or invented. A
// range the parent said ("4 or 5") is kept as [min,max] with their exact words; progress is judged
// on the range, not a made-up midpoint. Used by record_baseline / record_number and the results
// screen.
import { getSql } from "@/lib/db/client";

export type NumberKind = "paid" | "trial";
export type TrackedPhase = "baseline" | "checkin";
export type Verdict = "improved" | "same" | "worse" | "unknown";

export type TrackedNumber = {
  metric: string;
  min: number;
  max: number;
  unit: string | null;
  parentWords: string | null;
  phase: TrackedPhase;
  day: number;
};

// Compare a later range to the baseline range HONESTLY. lowerIsBetter (default) — fewer is better
// (arguments, reminders, minutes-to-start). Only call it "improved" when the ranges don't overlap in
// the better direction; overlapping ranges are "about the same", never spun as progress.
export function rangeVerdict(
  base: { min: number; max: number } | null,
  now: { min: number; max: number } | null,
  lowerIsBetter = true,
): Verdict {
  if (!base || !now) return "unknown";
  if (lowerIsBetter) {
    if (now.max < base.min) return "improved";
    if (now.min > base.max) return "worse";
    return "same";
  }
  if (now.min > base.max) return "improved";
  if (now.max < base.min) return "worse";
  return "same";
}

// Human, honest phrasing of a change — only ever repeats numbers the parent actually gave.
export function describeChange(base: TrackedNumber | null, now: TrackedNumber | null): string {
  if (!base || !now) return "";
  const b = fmtRange(base.min, base.max);
  const n = fmtRange(now.min, now.max);
  const v = rangeVerdict(base, now);
  if (v === "improved") return `From ${b} down to ${n}.`;
  if (v === "worse") return `From ${b} up to ${n}.`;
  if (v === "same") return `Around ${n}, about the same as ${b}.`;
  return "";
}

export function fmtRange(min: number, max: number): string {
  return min === max ? `${min}` : `${min}–${max}`;
}

// ── DB (one row per metric×phase×day; re-answer replaces via upsert) ──
export async function recordTrackedNumber(kind: NumberKind, subjectId: string, n: TrackedNumber): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO coach_tracked_number (kind, subject_id, metric, min_val, max_val, unit, parent_words, phase, day)
    VALUES (${kind}, ${subjectId}, ${n.metric}, ${n.min}, ${n.max}, ${n.unit}, ${n.parentWords}, ${n.phase}, ${n.day})
    ON CONFLICT (kind, subject_id, metric, phase, day)
    DO UPDATE SET min_val = EXCLUDED.min_val, max_val = EXCLUDED.max_val, unit = EXCLUDED.unit,
                  parent_words = EXCLUDED.parent_words, created_at = now()
  `;
}

export async function readTrackedNumbers(kind: NumberKind, subjectId: string, metric?: string): Promise<TrackedNumber[]> {
  const sql = getSql();
  const rows = metric
    ? (await sql`SELECT metric, min_val, max_val, unit, parent_words, phase, day FROM coach_tracked_number WHERE kind=${kind} AND subject_id=${subjectId} AND metric=${metric} ORDER BY phase, day`)
    : (await sql`SELECT metric, min_val, max_val, unit, parent_words, phase, day FROM coach_tracked_number WHERE kind=${kind} AND subject_id=${subjectId} ORDER BY metric, phase, day`);
  return (rows as unknown as { metric: string; min_val: string; max_val: string; unit: string | null; parent_words: string | null; phase: TrackedPhase; day: number }[])
    .map((r) => ({ metric: r.metric, min: Number(r.min_val), max: Number(r.max_val), unit: r.unit, parentWords: r.parent_words, phase: r.phase, day: r.day }));
}

export function getBaseline(nums: TrackedNumber[], metric: string): TrackedNumber | null {
  return nums.find((n) => n.metric === metric && n.phase === "baseline") ?? null;
}
