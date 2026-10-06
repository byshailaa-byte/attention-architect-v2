// Coach rate limit: 30 parent messages per user per IST day. (The IST-day boundary itself is
// applied in SQL; this is the pure threshold check.)
export const COACH_DAILY_LIMIT = 30;

export function overDailyLimit(parentCountToday: number, limit = COACH_DAILY_LIMIT): boolean {
  return parentCountToday >= limit;
}
