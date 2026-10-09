// Trial Coach typed-question limit: 20 parent messages per IST day (paid keeps COACH_DAILY_LIMIT=30).
export const TRIAL_DAILY_LIMIT = 20;

export function trialOverDailyLimit(parentCountToday: number, limit = TRIAL_DAILY_LIMIT): boolean {
  return parentCountToday >= limit;
}
