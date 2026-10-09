// Coach free-trial feature flag. OFF on prod, ON on dev (set COACH_TRIAL_ENABLED=1 in the dev env).
// When off: the admin "Free 4-day Quick Start" card is hidden and /coach returns 404 for role=trial.
export function coachTrialEnabled(): boolean {
  return process.env.COACH_TRIAL_ENABLED === "1" || process.env.COACH_TRIAL_ENABLED === "true";
}
