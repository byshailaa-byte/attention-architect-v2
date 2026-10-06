// Server-side unlock enforcement shared by the LMS mutation APIs. Closes the gap where
// reflect/skip/module-read/survey let a user write to a day/week that isn't open yet.
//   v2 (users.lms_version='v2'): BOTH the week lock AND the day drip must be satisfied.
//   v1: the day drip only (v1 keeps its original no-week-gate access).
import { getSql } from "@/lib/db/client";
import { getLmsVersion } from "@/lib/lms/lms-version";
import {
  getUserProgress, isDayUnlocked, isWeekUnlocked, type LmsProgress,
} from "@/lib/lms/progress";

export type UnlockCheck = {
  unlocked: boolean;
  version: "v1" | "v2";
  progress: LmsProgress;
  prevWeekProgress: LmsProgress | null;
};

// day === null → week-level check only (module/survey). Otherwise week (v2) + day are checked.
export async function checkUnlocked(
  userId: string, week: number, day: number | null, now: Date = new Date(),
): Promise<UnlockCheck> {
  const sql = getSql();
  const version = await getLmsVersion(sql, userId);
  const [progress, prevWeekProgress] = await Promise.all([
    getUserProgress(userId, week),
    week > 1 ? getUserProgress(userId, week - 1) : Promise.resolve(null),
  ]);
  const weekOk = version === "v2" ? isWeekUnlocked(week, prevWeekProgress, now) : true;
  const dayOk = day == null ? true : isDayUnlocked(day, week, progress, prevWeekProgress, now);
  return { unlocked: weekOk && dayOk, version, progress, prevWeekProgress };
}

// Highest day (1–5) currently open in the week; 0 if the week itself is locked (v2). Used to cap
// /api/lms/skip so it can never mark days beyond what the drip has opened.
export function maxUnlockedDay(
  week: number, progress: LmsProgress, prevWeekProgress: LmsProgress | null,
  version: "v1" | "v2", now: Date = new Date(),
): number {
  if (version === "v2" && !isWeekUnlocked(week, prevWeekProgress, now)) return 0;
  let max = 0;
  for (let d = 1; d <= 5; d++) {
    if (isDayUnlocked(d, week, progress, prevWeekProgress, now)) max = d; else break;
  }
  return max;
}
