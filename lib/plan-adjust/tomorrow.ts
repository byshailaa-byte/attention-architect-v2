// A1 — outcome → tomorrow. One rule set, applied to EVERY day of every week (it reads the base day
// card for the target day plus how the PRIOR day went). Deterministic; no model involved. Returns the
// generation directive the step generator must honour, plus flags the page/coach use.
import type { PlanOutcome } from "./types";

export type TomorrowPlan = {
  kind: "worked" | "partly" | "didnt_land" | "base";
  directive: string;        // appended to the generator prompt; shapes the adjusted step
  showCoachLine: boolean;   // two didnt_land in a row → "Talk it through with your Coach" at the top
  // short, outcome-matched wording for the "Adjusted for you: …" line on the LMS day screen
  adjustedForYou: string;
};

// `streak` = number of didnt_land in a row ENDING at the prior day (so 2 means yesterday AND the day
// before both didn't land).
export function planTomorrow(prior: PlanOutcome | null, streak: number): TomorrowPlan {
  if (prior === "worked") {
    return {
      kind: "worked",
      directive:
        "Yesterday's step WORKED. Keep the SAME everyday moment and the SAME skill, and take it ONE small step further — a little more independence, a little longer, or one less prompt from the parent. Do not jump to a new skill or a harder week. Still ≤5 minutes.",
      showCoachLine: false,
      adjustedForYou: "building on what worked yesterday",
    };
  }
  if (prior === "partly") {
    return {
      kind: "partly",
      directive:
        "Yesterday's step PARTLY worked. Keep the base step for this day almost exactly, but make ONE concrete tweak that removes the bit that got in the way (change the wording, the timing, or who starts it). Same skill, same kind of moment. Still ≤5 minutes.",
      showCoachLine: false,
      adjustedForYou: "a small tweak from yesterday",
    };
  }
  if (prior === "didnt_land") {
    const coach = streak >= 2;
    return {
      kind: "didnt_land",
      directive:
        "Yesterday's step DID NOT land. Give a SMALLER version of the same skill — easier, shorter, lower-stakes — OR move it to a calmer, better moment in the day. Make the ask clearly gentler than yesterday. Same skill, same week. Still ≤5 minutes." +
        (coach
          ? " This is the SECOND day in a row that didn't land: in the opening, gently acknowledge that two hard days is normal and the step is now very small — but do NOT mention the Coach in the opening (a separate banner already offers that, so mentioning it here would repeat it)."
          : ""),
      showCoachLine: coach,
      // The pill never mentions the Coach — the banner (showCoachLine) carries that once, so there's
      // no duplicate. The pill is just the shape of the change.
      adjustedForYou: "a smaller version, for a better moment",
    };
  }
  // No prior outcome (first day, or nothing tapped yet) → the base step, unadjusted.
  return { kind: "base", directive: "", showCoachLine: false, adjustedForYou: "" };
}

// Consecutive didnt_land ending at the given day (inclusive). `outcomeFor(d)` returns the plan outcome
// recorded for day d, or null. Walks backwards from `endDay` while it keeps being didnt_land.
export function didntLandStreak(endDay: number, outcomeFor: (day: number) => PlanOutcome | null): number {
  let n = 0;
  for (let d = endDay; d >= 1; d--) {
    if (outcomeFor(d) === "didnt_land") n++;
    else break;
  }
  return n;
}
