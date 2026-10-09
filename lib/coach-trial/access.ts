// Coach access resolution. Paid LMS access is unchanged and always wins; a trial is only
// consulted when there's no paid purchase. Built from coach_trials + the assessment (via
// session_id), paralleling loadLmsUserContextById — never touches purchases.
import { getSql } from "@/lib/db/client";
import { loadLmsUserContextById, type LmsUserContext } from "@/lib/lms/user-context";
import { displayChildName, type Gender } from "@/lib/report/pronouns";
import type { AgeBand } from "@/content/types";
import { getTrialByUser, currentTrialDay, isTrialLocked, type CoachTrial } from "./trial";

function normalizeGender(raw: string | null): Gender {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v === "boy" || v === "m" || v === "male") return "boy";
  if (v === "girl" || v === "f" || v === "female") return "girl";
  if (v === "non-binary") return "non-binary";
  if (v === "prefer-not-to-say") return "prefer-not-to-say";
  return null;
}

export type CoachAccess =
  | { role: "paid"; userCtx: LmsUserContext }
  | { role: "trial"; trial: CoachTrial; userCtx: LmsUserContext; locked: boolean; day: number }
  | { role: "none" };

// Build an LmsUserContext for a trial from its assessment (via session_id).
async function trialUserContext(trial: CoachTrial): Promise<LmsUserContext | null> {
  if (!trial.user_id || !trial.session_id) return null;
  const sql = getSql();
  const rows = (await sql`
    SELECT id, child_name, child_gender, age_band, archetype, parent_pattern, weakest_two
    FROM assessments WHERE session_id = ${trial.session_id}::uuid LIMIT 1
  `) as unknown as {
    id: string; child_name: string | null; child_gender: string | null; age_band: AgeBand;
    archetype: string; parent_pattern: string; weakest_two: string[] | null;
  }[];
  const a = rows[0];
  if (!a) return null;
  return {
    userId: trial.user_id,
    assessmentId: a.id,
    childName: displayChildName(a.child_name ?? ""),
    childGender: normalizeGender(a.child_gender),
    ageBand: (trial.age_band as AgeBand) ?? a.age_band,
    archetype: trial.archetype ?? a.archetype,
    parentPattern: a.parent_pattern,
    weakestTwo: a.weakest_two ?? [],
    onboardingCompleted: !!trial.baseline_value, // trial onboarding done once a baseline is saved
  };
}

export async function resolveCoachAccess(userId: string, now: Date = new Date()): Promise<CoachAccess> {
  // Paid always wins.
  const paid = await loadLmsUserContextById(userId);
  if (paid) return { role: "paid", userCtx: paid };

  const trial = await getTrialByUser(userId);
  if (!trial) return { role: "none" };
  const userCtx = await trialUserContext(trial);
  if (!userCtx) return { role: "none" };

  return {
    role: "trial",
    trial,
    userCtx,
    locked: isTrialLocked(trial, now),
    day: currentTrialDay(new Date(trial.started_at), now),
  };
}
