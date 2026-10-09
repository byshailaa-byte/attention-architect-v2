// Admin-side trial view: the numbers the /admin/calls card shows during a trial.
import { getSql } from "@/lib/db/client";
import { currentTrialDay, isTrialLocked, type CoachTrial } from "./trial";

export type TrialAdminView = {
  day: number;             // current content day 1..4
  locked: boolean;
  status: string;
  endsAt: string;
  extendedDays: number;
  parentMessages: number;  // typed questions the parent sent
  costInr: number;         // total Coach cost for this trial, in ₹
  lastActiveAt: string | null;
  stepsEngaged: number;    // distinct trial days the parent engaged (proxy for "steps done")
  flagged: boolean;
};

export async function getTrialAdminView(trial: CoachTrial, now: Date = new Date()): Promise<TrialAdminView> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      COUNT(*) FILTER (WHERE role = 'parent')::int                              AS parent_messages,
      COALESCE(SUM(cost_paise), 0)::int                                         AS cost_paise,
      MAX(created_at)                                                           AS last_active,
      COUNT(DISTINCT (day)) FILTER (WHERE role = 'parent')::int                 AS steps_engaged
    FROM coach_messages WHERE trial_id = ${trial.id}::uuid
  `) as unknown as { parent_messages: number; cost_paise: number; last_active: string | null; steps_engaged: number }[];
  const r = rows[0] ?? { parent_messages: 0, cost_paise: 0, last_active: null, steps_engaged: 0 };
  return {
    day: currentTrialDay(new Date(trial.started_at), now),
    locked: isTrialLocked(trial, now),
    status: trial.status,
    endsAt: trial.ends_at,
    extendedDays: trial.extended_days,
    parentMessages: r.parent_messages,
    costInr: Math.round((r.cost_paise / 100) * 100) / 100,
    lastActiveAt: r.last_active,
    stepsEngaged: r.steps_engaged,
    flagged: !!trial.flagged_at,
  };
}
