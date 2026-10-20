// Daily step-outcome tracking — ONE vocabulary everywhere. The 5 canonical outcomes; a mapper for
// the legacy paid values; heuristic extraction from the parent's own words; write + read helpers
// (paid → lms_day_outcome, trial → coach_trial_day_outcome, both surfaced via coach_day_outcome_v);
// and the "needs a call" rule. Child data (the note = parent's words) stays in the DB only — never
// logged, never sent to analytics/ad platforms.
import { getSql } from "@/lib/db/client";

// 'not_tried' = the step wasn't attempted yet (no time / "what if" asked before trying). Distinct
// from 'tried_didnt_work' (tried, didn't help) and 'missed' (had the chance, it slipped).
export const OUTCOMES = ["tried_worked", "tried_partly", "tried_didnt_work", "missed", "not_tried", "unclear"] as const;
export type Outcome = (typeof OUTCOMES)[number];

// Why a child stopped — attached to an outcome when the parent gives it (nullable everywhere else).
export const TRIGGERS = ["hard", "boring", "didnt_know", "upset", "unknown"] as const;
export type Trigger = (typeof TRIGGERS)[number];

export const OUTCOME_LABEL: Record<Outcome, string> = {
  tried_worked: "Tried · worked",
  tried_partly: "Tried · partly",
  tried_didnt_work: "Tried · didn't work",
  missed: "Missed",
  not_tried: "Not tried yet",
  unclear: "Unclear",
};
// Compact one-letter chips for the admin day-by-day strip.
export const OUTCOME_CHIP: Record<Outcome, { t: string; bg: string; fg: string }> = {
  tried_worked: { t: "✓", bg: "#E7F6EC", fg: "#1F7A46" },
  tried_partly: { t: "~", bg: "#FFF8EC", fg: "#8A6D1F" },
  tried_didnt_work: { t: "✗", bg: "#FDECEC", fg: "#A23A2E" },
  missed: { t: "–", bg: "#EFECE4", fg: "#6B6456" },
  not_tried: { t: "·", bg: "#EFECE4", fg: "#6B6456" },
  unclear: { t: "?", bg: "#EAF0FA", fg: "#1E3A5F" },
};

// Map the legacy paid 3-value vocabulary to the canonical 5. ALL reads go through this so there is
// never a second vocabulary in the app (the DB view does the same mapping for SQL-side reads).
export function normalizeOutcome(raw: string): Outcome {
  switch (raw) {
    case "worked": return "tried_worked";
    case "sort_of": return "tried_partly";
    case "didnt_work": return "tried_didnt_work";
    default: return (OUTCOMES as readonly string[]).includes(raw) ? (raw as Outcome) : "unclear";
  }
}
export function isOutcome(raw: string): raw is Outcome {
  return (OUTCOMES as readonly string[]).includes(raw);
}

// Heuristic classifier of the parent's own message into an outcome (source='chat'). Returns null when
// the message isn't a day-outcome report (a question, small talk, etc.) so we only record real
// signals. Order matters: missed / unclear (engagement + comprehension) win over tried-* .
const RE = {
  // NOT TRIED: not attempted yet / no time / a "what if" asked before trying. Checked FIRST so these
  // never become 'tried_didnt_work' or 'missed'.
  notTried: /\b(haven'?t tried|not tried (it )?yet|didn'?t try (it )?yet|didn'?t get (a )?chance|didn'?t get (the )?time|couldn'?t get to it|no time|didn'?t have time|time nahi mila|abhi tak nahi kiya|kal nahi kiya|what if|agar .* to kya)\b/i,
  missed: /\b(missed|forgot|skipped|bhool gay|slipped)\b/i,
  unclear: /\b(don'?t (get|understand)|didn'?t (really )?(get|understand)|not sure what (you|i)|what (do|does) (you|that|this) mean|unclear|confus|unable to comprehend|makes no sense|samajh nahi)\b/i,
  worked: /\b(it worked|that worked|has worked|it'?s working|working (now|well|really well)|worked (two|three|for|really|very|so|great)|(two|three) days running|went (really )?well|much better|started on (her|his|their) own|did it (herself|himself|themselves)|success|way better|big improvement)\b/i,
  partly: /\b(sort of|kind of|a (little )?bit|partly|somewhat|half( way)?|started but|began but|better but|some progress|a bit better)\b/i,
  didntWork: /\b(didn'?t work|did not work|no change|nothing changed|still (wouldn'?t|won'?t|didn'?t|refuses?|refused)|same as (before|always)|no (luck|difference)|made no difference|ignored( me| it)?|not at all|wouldn'?t listen|didn'?t listen|took no notice|paid no attention)\b/i,
};
export function extractOutcome(message: string): { outcome: Outcome; note: string } | null {
  const m = message || "";
  const note = m.trim().slice(0, 160);
  // An explicit "missed"/"forgot"/"skipped" wins over the softer not-tried phrases; otherwise
  // "no time"/"haven't tried yet"/"what if" → not_tried.
  if (RE.missed.test(m)) return { outcome: "missed", note };
  if (RE.notTried.test(m)) return { outcome: "not_tried", note };
  if (RE.unclear.test(m)) return { outcome: "unclear", note };
  if (RE.didntWork.test(m)) return { outcome: "tried_didnt_work", note };
  if (RE.partly.test(m)) return { outcome: "tried_partly", note };
  if (RE.worked.test(m)) return { outcome: "tried_worked", note };
  return null;
}

// Does this message itself ANSWER "what happened?" (so the Coach records it and moves on, rather than
// asking the check-in question again)? True whenever an outcome can be extracted from the words.
export function hasOutcomeAnswer(message: string): boolean {
  return extractOutcome(message) !== null;
}

// source: 'model' = the Coach called record_outcome; 'backstop' = server recorded from the parent's
// words when the model missed it; 'tap'/'chat' = legacy. Kept distinct so what-works stats can
// separate model-recorded from backstop-recorded signals.
export type OutcomeSource = "tap" | "chat" | "model" | "backstop";

// ── Writes (idempotent per day: a new report for the same day replaces the prior one) ──
export async function recordPaidOutcome(userId: string, week: number, day: number, outcome: Outcome, note: string | null, source: OutcomeSource, trigger: Trigger | null = null): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM lms_day_outcome WHERE user_id = ${userId} AND week = ${week} AND day = ${day}`;
  await sql`INSERT INTO lms_day_outcome (user_id, week, day, outcome, note, source, trigger) VALUES (${userId}, ${week}, ${day}, ${outcome}, ${note}, ${source}, ${trigger})`;
}
export async function recordTrialOutcome(trialId: string, day: number, outcome: Outcome, note: string | null, source: OutcomeSource, trigger: Trigger | null = null): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM coach_trial_day_outcome WHERE trial_id = ${trialId}::uuid AND day = ${day}`;
  await sql`INSERT INTO coach_trial_day_outcome (trial_id, day, outcome, note, source, trigger) VALUES (${trialId}::uuid, ${day}, ${outcome}, ${note}, ${source}, ${trigger})`;
}

// ── Reads (normalised via the view) ──
export type OutcomeRow = { week: number; day: number; outcome: Outcome; note: string | null; source: string | null; created_at: string };
export async function readOutcomes(kind: "paid" | "trial", subjectId: string): Promise<OutcomeRow[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT week, day, outcome, note, source, created_at
    FROM coach_day_outcome_v WHERE kind = ${kind} AND subject_id = ${subjectId}
    ORDER BY week, day
  `) as unknown as OutcomeRow[];
  return rows.map((r) => ({ ...r, outcome: normalizeOutcome(r.outcome) }));
}

// "Needs a call": the two most RECENT outcomes are both 'unclear' or both 'missed' (in a row).
export function needsCall(rows: OutcomeRow[]): { flag: boolean; reason: string | null } {
  const ordered = [...rows].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const last2 = ordered.slice(-2).map((r) => normalizeOutcome(r.outcome));
  if (last2.length === 2 && last2[0] === "unclear" && last2[1] === "unclear") return { flag: true, reason: "2× unclear in a row" };
  if (last2.length === 2 && last2[0] === "missed" && last2[1] === "missed") return { flag: true, reason: "2× missed in a row" };
  return { flag: false, reason: null };
}
