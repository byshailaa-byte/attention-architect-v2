// Adaptive plan — shared types. The adjusted step is the SAME shape a parent already reads on an LMS
// day, but produced for THIS child from the base day + how yesterday actually went. Generated at
// unlock, validated deterministically, cached per (parent, week, day). Child words never leave the DB.

// What the parent taps at the end of a day. lms_reflections stores worked|mixed|didnt_land; the plan
// engine speaks in the approved copy words worked|partly|didnt_land (mixed ↔ partly).
export type PlanOutcome = "worked" | "partly" | "didnt_land";

// The structured step. Rendered as: title, "at <moment>", the exact words in quotes, what to notice,
// and a ≤5-minute promise. Nothing clinical, no price/selling, no invented numbers, no pattern names.
export type AdjustedStep = {
  opening: string;       // the short top paragraph shown above the step — generated WITH the step so
                         // the two never contradict (replaces the base day's nextDayOpening fork)
  title: string;         // short — the action, same skill as the base day
  moment: string;        // the everyday moment it slots into ("at screen-off", "when homework starts")
  exactWords: string[];  // 1–2 lines the parent says TO the child, verbatim — rendered in quotes
  notice: string;        // what to watch for afterwards
  minutes: number;       // 1–5
};

export type AdjustOrigin = "auto" | "coach";
export type AdjustSource = "llm" | "fallback" | "coach";

// A resolved step for a given day, ready to render. `null` from the resolver means "no adjustment —
// show the base day as-is" (e.g. the very first day, or no prior outcome recorded yet).
export type ResolvedStep = {
  step: AdjustedStep;
  origin: AdjustOrigin;      // 'coach' always wins over 'auto'
  source: AdjustSource;
  reason: string | null;     // coach's reason → "Updated by your Coach: <reason>"
  priorOutcome: PlanOutcome | null;
  showCoachLine: boolean;    // two didnt_land in a row → surface "Talk it through with your Coach"
  validatorOk: boolean;
  retryUsed: boolean;
};

// Map the stored reflection outcome to the plan vocabulary. "mixed" is the partial outcome.
export function toPlanOutcome(o: string | null | undefined): PlanOutcome | null {
  if (o === "worked") return "worked";
  if (o === "didnt_land") return "didnt_land";
  if (o === "mixed" || o === "partly") return "partly";
  return null;
}
