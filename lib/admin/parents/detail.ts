import "server-only";
import { getSql } from "@/lib/db/client";
import { ALL_QUESTIONS } from "@/lib/engine/questions";
import type { PanelCall, PanelReport, PanelAnswers, AnswerSection } from "./types";

// Friendly section headings per question dimension (fallback: prettified dimension).
const DIM_LABEL: Record<string, string> = {
  attention_shape: "How they focus",
  attention_competition: "What pulls them away",
  parent_instinct: "Your instinct",
  reward_driver: "What motivates them",
  friction_response: "When it gets hard",
  recovery_response: "Getting back on track",
  recharge_type: "How they recharge",
};
const prettify = (d: string) => d.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

// Map a stored answers object ({qid: value}) → sectioned, human-readable Q&A in assessment order.
function buildAnswerSections(raw: Record<string, unknown>, childName: string): AnswerSection[] {
  const name = childName && childName !== "—" ? childName : "your child";
  const sections: AnswerSection[] = [];
  const idx = new Map<string, number>();
  for (const q of ALL_QUESTIONS) {
    if (!(q.id in raw)) continue;
    const val = raw[q.id];
    const opt = q.options.find((o) => o.value === val);
    const a = opt ? opt.label : val == null ? "—" : String(val);
    const qtext = q.text.replace(/\{name\}/g, name);
    const secLabel = DIM_LABEL[q.dimension] ?? prettify(q.dimension);
    let si = idx.get(secLabel);
    if (si === undefined) { si = sections.length; idx.set(secLabel, si); sections.push({ section: secLabel, items: [] }); }
    sections[si].items.push({ q: qtext, a });
  }
  return sections;
}

// Detail for one parent's side panel: each child's report talking-points + the full call history.
// All inputs are IDs the list already holds (assessment + session ids for this parent's children);
// we never re-group here. Read-only except logParentCall. Admin-only (behind Basic Auth middleware).

const ALLOWED_OUTCOMES = [
  "interested", "callback", "not_interested", "purchased", "no_answer", "busy",
  "wrong_number", "do_not_call", "trial_offered", "trial_in_progress", "other_course",
] as const;
export type ParentCallOutcome = (typeof ALLOWED_OUTCOMES)[number];
// interested/callback promise a next contact — a follow-up date is mandatory (mirrors the Calls rule).
const REQUIRES_FOLLOWUP = new Set<ParentCallOutcome>(["interested", "callback"]);

// Ride out transient Neon "fetch failed" blips (same rationale as data.ts).
async function withRetry<T>(fn: () => Promise<T>, tries = 6): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) { last = e; await new Promise((r) => setTimeout(r, 300 * (i + 1))); }
  }
  throw last;
}

export async function getParentDetail(
  assessmentIds: string[],
  sessionIds: string[],
): Promise<{ calls: PanelCall[]; reports: Record<string, PanelReport>; answers: PanelAnswers }> {
  const sql = getSql();
  const aids = assessmentIds.filter((s) => /^[0-9a-f-]{36}$/i.test(s));
  const sids = sessionIds.filter((s) => /^[0-9a-f-]{36}$/i.test(s));

  const calls = aids.length
    ? ((await withRetry(() => sql`
        SELECT id::text, assessment_id::text, outcome, status, objection, notes, next_steps,
               follow_up_at, duration_sec, called_by, created_at
        FROM call_log WHERE assessment_id = ANY(${aids}::uuid[]) ORDER BY created_at DESC
      `)) as unknown as PanelCall[])
    : [];

  const reports: Record<string, PanelReport> = {};
  if (sids.length) {
    const rows = (await withRetry(() => sql`
      SELECT session_id::text, content FROM report_v2_content WHERE session_id = ANY(${sids}::uuid[])
    `)) as unknown as { session_id: string; content: Record<string, unknown> }[];
    for (const r of rows) {
      const c = r.content ?? {};
      const str = (k: string) => (typeof c[k] === "string" ? (c[k] as string) : "");
      const tonight = Array.isArray(c.tonight) ? (c.tonight as string[]) : [];
      reports[r.session_id] = {
        worry: str("headline") || str("seenIt"),
        hardPart: str("hardPart"),
        tonightStep: tonight[0] ?? "",
        goal: str("goal"),
      };
    }
  }

  // Assessment answers per child → full question text + plain-word answer, sectioned, for the Answers tab.
  const answers: PanelAnswers = {};
  if (aids.length) {
    const rows = (await withRetry(() => sql`
      SELECT id::text, child_name, answers FROM assessments WHERE id = ANY(${aids}::uuid[])
    `)) as unknown as { id: string; child_name: string | null; answers: Record<string, unknown> | null }[];
    for (const r of rows) {
      answers[r.id] = buildAnswerSections(r.answers ?? {}, r.child_name ?? "");
    }
  }
  return { calls, reports, answers };
}

export async function logParentCall(input: {
  assessmentId: string;
  outcome: string;
  note?: string | null;
  followUpAt?: string | null;
  nextSteps?: string | null;
  status?: string | null;
  objection?: string | null;
  durationSec?: number | null;
  calledBy: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(input.assessmentId)) return { ok: false, reason: "bad_assessment" };
  if (!ALLOWED_OUTCOMES.includes(input.outcome as ParentCallOutcome)) return { ok: false, reason: "bad_outcome" };
  if (REQUIRES_FOLLOWUP.has(input.outcome as ParentCallOutcome) && !input.followUpAt) {
    return { ok: false, reason: "followup_required" };
  }
  const sql = getSql();
  try {
    await sql`
      INSERT INTO call_log (assessment_id, segment, outcome, status, objection, notes, next_steps, follow_up_at, duration_sec, called_by)
      VALUES (${input.assessmentId}::uuid, 'parents', ${input.outcome},
              ${input.status ?? null}, ${input.objection ?? null}, ${input.note ?? null},
              ${input.nextSteps ?? null}, ${input.followUpAt ? input.followUpAt : null}::timestamptz,
              ${input.durationSec ?? null}, ${input.calledBy})
    `;
    return { ok: true };
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    if (/call_log|does not exist|undefined table/i.test(msg)) return { ok: false, reason: "not_enabled" };
    if (/call_log_outcome_check/i.test(msg)) return { ok: false, reason: "bad_outcome" };
    throw e;
  }
}
