// SERVER-ONLY. The live backend for the admin Calling dashboard (A1 queue, A2 call screen).
// Imported only by the calling server components (app/admin/calls/*, the layout nav badge) —
// never by a client component, so the DB client never ships to the browser.
//
// It implements the calling half of CrmSource (getStats/getQueue/getLead/logCall) against the
// real Neon tables, and DELEGATES the WhatsApp-inbox half (A3/A4: getConversations, getThread,
// getTemplates, getDrip, getSpend, sendMessage, setDrip) to the fixtures — those screens stay on
// preview data untouched. isPreview is false, so the calling pages drop the "Preview data" banner.
import "server-only";
import { getSql } from "@/lib/db/client";
import { FixtureSource } from "./fixtures";
import type { CrmSource } from "./source";
import type {
  Lead, Stats, QueueTab, LogCallInput, ReportSummary, TimelineEvent, CallLog, LeadStage,
} from "./types";
import {
  buildQueue, classifyContact, segmentCounts, buildScheduled, groupByPerson, personKey,
  type QueueContact, type QueueCall, type CallLogOutcome, type Segment, type QueueItem, type PersonInput,
} from "@/lib/admin/call-queue";

// ── Row shapes from the master candidate query ──────────────────────────────────
type CandidateRow = {
  id: string;
  session_id: string;
  parent_name: string | null;
  child_name: string | null;
  email: string | null;
  phone: string | null;
  age_band: string;
  archetype: string | null;
  parent_pattern: string | null;
  concerns: string[] | null;
  report_v2_goal: string | null;
  created_at: string;
  report_sent_at: string | null;
  tier: string | null;
  amount_paise: number | null;
  purchased_at: string | null;
  lms_last_at: string | null;
  lms_max_week: number | null;
};

type CallRow = {
  assessment_id: string;
  outcome: CallLogOutcome;
  follow_up_at: string | null;
  created_at: string;
  notes: string | null;
  segment: string;
};

const IST_OFFSET_MS = 5.5 * 3600_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function iso(v: unknown): string | null {
  if (v == null) return null;
  return v instanceof Date ? v.toISOString() : String(v);
}
function firstName(name: string | null): string {
  return (name ?? "").trim().split(/\s+/)[0] || "Parent";
}
function stripThe(archetype: string | null): string {
  return (archetype ?? "").replace(/^The\s+/i, "") || "—";
}
// "4 Oct" in IST.
function dayLabel(isoStr: string | null): string {
  if (!isoStr) return "—";
  const d = new Date(new Date(isoStr).getTime() + IST_OFFSET_MS);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
// "4 Oct 9:12 pm" in IST.
function stampLabel(isoStr: string | null): string {
  if (!isoStr) return "—";
  const d = new Date(new Date(isoStr).getTime() + IST_OFFSET_MS);
  let h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${h}:${String(m).padStart(2, "0")} ${ampm}`;
}
const planLabel = (tier: string | null): string =>
  tier === "tier2" ? "₹4,999 plan" : tier === "tier1" ? "₹2,999 plan" : tier ? "legacy plan" : "";

const OUTCOME_UI: Record<CallLogOutcome, string> = {
  interested: "Interested", callback: "Callback", not_interested: "Not interested",
  purchased: "Bought", no_answer: "No answer", busy: "Busy",
  wrong_number: "Wrong number", do_not_call: "Do not call",
};

function toContact(row: CandidateRow, calls: CallRow[]): QueueContact {
  return {
    assessmentId: row.id,
    reportSentAt: iso(row.report_sent_at),
    paid: row.tier != null,
    tier: row.tier,
    lmsLastActivityAt: iso(row.lms_last_at),
    lmsFinished: (row.lms_max_week ?? 0) >= 6,
    calls: calls.map((c): QueueCall => ({
      outcome: c.outcome, followUpAt: iso(c.follow_up_at), createdAt: iso(c.created_at)!,
    })),
  };
}

function stageOf(row: CandidateRow): LeadStage {
  if (row.tier != null) return "bought";
  if (row.report_sent_at != null) return "read_report";
  return "not_opened";
}

// Status column + follow-up fields, derived from the latest call and the lead state.
function deriveStatus(row: CandidateRow, calls: CallRow[], item: QueueItem | null, now: Date) {
  const sorted = [...calls].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const latest = sorted[0];
  const endToday = new Date(new Date(now.getTime() + IST_OFFSET_MS));
  endToday.setUTCHours(23, 59, 59, 999);
  const endTodayMs = endToday.getTime() - IST_OFFSET_MS;

  let status = row.tier != null ? "Bought" : "New";
  if (latest) {
    if (latest.outcome === "no_answer" || latest.outcome === "busy") {
      let streak = 0;
      for (const c of sorted) { if (c.outcome === "no_answer" || c.outcome === "busy") streak++; else break; }
      status = `No answer ×${streak}`;
    } else {
      status = OUTCOME_UI[latest.outcome];
    }
  }

  let followUpDue = "—";
  let followUpUrgent = false;
  const fu = latest?.follow_up_at ? new Date(latest.follow_up_at).getTime() : null;
  if (fu != null) {
    followUpUrgent = fu <= endTodayMs;
    followUpDue = followUpUrgent ? "Today" : dayLabel(latest!.follow_up_at);
  } else if (item?.segment === "A") {
    followUpUrgent = true; followUpDue = "Today";
  }
  const lastNote = latest?.notes?.trim() ? latest.notes.trim() : "—";
  return { status, followUpDue, followUpUrgent, lastNote };
}

const SELECT_CANDIDATES = (sql: ReturnType<typeof getSql>) => sql`
  SELECT
    a.id::text,
    a.session_id::text,
    a.parent_name,
    a.child_name,
    a.email,
    a.phone,
    a.age_band,
    a.archetype,
    a.parent_pattern,
    a.concerns,
    a.report_v2_goal,
    a.created_at,
    a.whatsapp_report_sent_at AS report_sent_at,
    p.tier,
    p.amount_paise,
    p.created_at AS purchased_at,
    lp.last_at   AS lms_last_at,
    lp.max_week  AS lms_max_week
  FROM assessments a
  LEFT JOIN LATERAL (
    SELECT tier, amount_paise, created_at
    FROM purchases WHERE assessment_id = a.id AND status = 'paid'
    ORDER BY created_at DESC LIMIT 1
  ) p ON true
  LEFT JOIN LATERAL (
    SELECT MAX(completed_at) AS last_at, MAX(week) AS max_week
    FROM lms_progress WHERE assessment_id = a.id
  ) lp ON true
  WHERE NOT a.is_internal
    AND a.phone IS NOT NULL
    AND a.archetype IS NOT NULL
    AND (a.child_name IS NULL OR (a.child_name NOT ILIKE 'Test%' AND a.child_name NOT ILIKE 'Smoke%'))
    AND (
      a.whatsapp_report_sent_at > now() - INTERVAL '15 days'
      OR p.tier IS NOT NULL
    )
  ORDER BY a.created_at DESC
  LIMIT 500
`;

// All callable assessments (no "report in 15d OR paid" filter — segment logic decides inclusion,
// per PERSON). Bounded at 5000 so one slow person can't unbound the query.
const SELECT_ALL_CALLABLE = (sql: ReturnType<typeof getSql>) => sql`
  SELECT
    a.id::text, a.session_id::text, a.parent_name, a.child_name, a.email, a.phone,
    a.age_band, a.archetype, a.parent_pattern, a.concerns, a.report_v2_goal, a.created_at,
    a.whatsapp_report_sent_at AS report_sent_at,
    p.tier, p.amount_paise, p.created_at AS purchased_at,
    lp.last_at AS lms_last_at, lp.max_week AS lms_max_week
  FROM assessments a
  LEFT JOIN LATERAL (SELECT tier, amount_paise, created_at FROM purchases WHERE assessment_id = a.id AND status = 'paid' ORDER BY created_at DESC LIMIT 1) p ON true
  LEFT JOIN LATERAL (SELECT MAX(completed_at) AS last_at, MAX(week) AS max_week FROM lms_progress WHERE assessment_id = a.id) lp ON true
  WHERE NOT a.is_internal AND a.phone IS NOT NULL AND a.archetype IS NOT NULL
    AND (a.child_name IS NULL OR (a.child_name NOT ILIKE 'Test%' AND a.child_name NOT ILIKE 'Smoke%'))
  ORDER BY a.created_at DESC
  LIMIT 5000
`;

// Fetch all call_log rows for the given assessment ids, grouped. Returns an empty map (and a
// `false` flag) if the table doesn't exist yet — the queue still renders, logging shows disabled.
async function fetchCalls(sql: ReturnType<typeof getSql>, ids: string[]): Promise<{ map: Map<string, CallRow[]>; enabled: boolean }> {
  const map = new Map<string, CallRow[]>();
  if (ids.length === 0) return { map, enabled: true };
  try {
    const rows = (await sql`
      SELECT assessment_id::text, outcome, follow_up_at, created_at, notes, segment
      FROM call_log WHERE assessment_id = ANY(${ids}::uuid[])
    `) as unknown as CallRow[];
    for (const r of rows) {
      const list = map.get(r.assessment_id) ?? [];
      list.push(r);
      map.set(r.assessment_id, list);
    }
    return { map, enabled: true };
  } catch {
    return { map, enabled: false }; // call_log not migrated here yet
  }
}

function rowToListLead(row: CandidateRow, calls: CallRow[], item: QueueItem | null, now: Date, opts?: { scheduledAt?: number }): Lead {
  const d = deriveStatus(row, calls, item, now);
  const { status, lastNote } = d;
  // Scheduled rows show the booked date + time (not "Today").
  const followUpDue = opts?.scheduledAt != null ? stampLabel(new Date(opts.scheduledAt).toISOString()) : d.followUpDue;
  const followUpUrgent = opts?.scheduledAt != null ? false : d.followUpUrgent;
  return {
    id: row.id,
    parentName: firstName(row.parent_name),
    parentRelation: "",                 // no reliable relation source — shown as name only
    childName: firstName(row.child_name),
    ageBand: row.age_band,
    phoneE164: row.phone ?? "",
    typeName: stripThe(row.archetype),
    worry: (row.concerns && row.concerns[0]) || "other",
    goal: "",
    stage: stageOf(row),
    status: item ? `${item.label}${status && status !== "New" ? " · " + status : ""}` : status,
    followUpDue, followUpUrgent, lastNote,
    leadAt: dayLabel(iso(row.created_at)),
    reportId: row.session_id,
    report: { worry: "", focusWhen: "", hardPart: "", tonightStep: "", parentInstinct: "", typeName: stripThe(row.archetype), ageBand: row.age_band, goal: "" },
    timeline: [],
    calls: [],
  };
}

export class RealCallingSource implements CrmSource {
  readonly isPreview = false;
  private fixtures = new FixtureSource();
  private now: Date;
  constructor(now: Date = new Date()) { this.now = now; }

  // Load the whole callable universe collapsed to ONE contact per PERSON (normalised phone, email
  // fallback). paid/report/LMS state and call history are aggregated across all of a person's
  // assessments, so the queue/cooldown/scheduled are per-person — see groupByPerson.
  private async loadPersonData(): Promise<{
    persons: QueueContact[];
    render: Map<string, { row: CandidateRow; calls: CallRow[] }>; // keyed by representative assessment id
    allCalls: CallRow[];
    enabled: boolean;
  }> {
    const sql = getSql();
    const rows = (await SELECT_ALL_CALLABLE(sql)) as unknown as CandidateRow[];
    const { map, enabled } = await fetchCalls(sql, rows.map((r) => r.id));
    const tierRank = (t: string | null) => (t === "tier2" ? 2 : t === "tier1" ? 1 : t ? 0.5 : 0);
    const inputs: PersonInput[] = rows.map((r) => ({
      ...toContact(r, map.get(r.id) ?? []),
      personKey: personKey(r.phone, r.email) ?? `a:${r.id}`,
      createdAt: iso(r.created_at)!,
      tierRank: tierRank(r.tier),
    }));
    const persons = groupByPerson(inputs);
    // Parallel grouping for rendering: representative row + the person's unioned CallRow[] (notes).
    const byKey = new Map<string, CandidateRow[]>();
    for (const r of rows) {
      const k = personKey(r.phone, r.email) ?? `a:${r.id}`;
      (byKey.get(k) ?? byKey.set(k, []).get(k)!).push(r);
    }
    const render = new Map<string, { row: CandidateRow; calls: CallRow[] }>();
    const allCalls: CallRow[] = [];
    for (const g of byKey.values()) {
      g.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const calls = g.flatMap((x) => map.get(x.id) ?? []);
      render.set(g[0].id, { row: g[0], calls });
      allCalls.push(...calls);
    }
    return { persons, render, allCalls, enabled };
  }

  // ── Calling half: real data ──────────────────────────────────────────────
  async getStats(): Promise<Stats> {
    const { persons, render, allCalls } = await this.loadPersonData();
    const items = buildQueue(persons, this.now);
    const seg = segmentCounts(items);
    const scheduled = buildScheduled(persons, this.now);

    const monthAgo = this.now.getTime() - 30 * 24 * 3600_000;
    const weekAgo = this.now.getTime() - 7 * 24 * 3600_000;
    let boughtThisMonth = 0;
    for (const { row } of render.values()) if (row.purchased_at && new Date(row.purchased_at).getTime() >= monthAgo) boughtThisMonth++;
    let calledThisMonth = 0, callbacksThisWeek = 0;
    for (const c of allCalls) {
      const t = new Date(c.created_at).getTime();
      if (t >= monthAgo) calledThisMonth++;
      if (c.outcome === "callback" && t >= weekAgo) callbacksThisWeek++;
    }
    const fixtureStats = await this.fixtures.getStats(); // needsReply is a WhatsApp/A3 metric — keep fixture
    return {
      dueToday: seg.A,
      reachedPlanNotBought: seg.B + seg.C,
      readReportOnly: seg.C,
      callbacksThisWeek,
      boughtThisMonth,
      calledThisMonth,
      callsDue: items.length,
      needsReply: fixtureStats.needsReply,
      segments: seg,
      scheduled: scheduled.length,
    };
  }

  async getQueue(tab: QueueTab): Promise<Lead[]> {
    const { persons, render } = await this.loadPersonData();

    if (tab === "scheduled") {
      // Future-dated follow-ups, soonest first (held out of A–E by the cooldown until due).
      return buildScheduled(persons, this.now)
        .map((s) => { const r = render.get(s.assessmentId); return r ? rowToListLead(r.row, r.calls, null, this.now, { scheduledAt: s.followUpAt }) : null; })
        .filter((l): l is Lead => l !== null);
    }

    const items = buildQueue(persons, this.now);
    const filtered = items.filter((it) => {
      switch (tab) {
        case "due_today": return true;                          // full priority queue
        case "callbacks":
        case "replied":   return it.segment === "A";            // follow-ups due
        case "read_report": return it.segment === "B" || it.segment === "C"; // report sent, not bought
        case "reached_plan": return it.segment === "D";         // plan calls (buyers)
        case "interested": {
          const calls = render.get(it.assessmentId)?.calls ?? [];
          const latest = [...calls].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          return latest?.outcome === "interested";
        }
        case "done": return false;                              // no "done" bucket in the live queue
        default: return true;
      }
    });

    return filtered
      .map((it) => { const r = render.get(it.assessmentId); return r ? rowToListLead(r.row, r.calls, it, this.now) : null; })
      .filter((l): l is Lead => l !== null);
  }

  async getLead(id: string): Promise<Lead | null> {
    const sql = getSql();
    const rows = (await sql`
      SELECT
        a.id::text, a.session_id::text, a.parent_name, a.child_name, a.email, a.phone,
        a.age_band, a.archetype, a.parent_pattern, a.concerns, a.report_v2_goal, a.created_at,
        a.whatsapp_report_sent_at AS report_sent_at,
        p.tier, p.amount_paise, p.created_at AS purchased_at,
        lp.last_at AS lms_last_at, lp.max_week AS lms_max_week
      FROM assessments a
      LEFT JOIN LATERAL (
        SELECT tier, amount_paise, created_at FROM purchases
        WHERE assessment_id = a.id AND status = 'paid' ORDER BY created_at DESC LIMIT 1
      ) p ON true
      LEFT JOIN LATERAL (
        SELECT MAX(completed_at) AS last_at, MAX(week) AS max_week
        FROM lms_progress WHERE assessment_id = a.id
      ) lp ON true
      WHERE a.id = ${id}::uuid
      LIMIT 1
    `) as unknown as CandidateRow[];
    const row = rows[0];
    if (!row) return null;

    // Per-PERSON call history: gather this person's assessments (same phone) + all their calls, so
    // the cooldown, timeline, and "last note" reflect the person — not just the clicked assessment.
    let personAssessments: { id: string; created_at: unknown; archetype: string | null }[] =
      [{ id: row.id, created_at: row.created_at, archetype: row.archetype }];
    if (row.phone) {
      try {
        personAssessments = (await sql`
          SELECT a.id::text, a.created_at, a.archetype FROM assessments a
          WHERE NOT a.is_internal
            AND length(regexp_replace(COALESCE(a.phone,''),'\\D','','g')) >= 10
            AND right(regexp_replace(COALESCE(a.phone,''),'\\D','','g'),10) = right(regexp_replace(${row.phone},'\\D','','g'),10)
          ORDER BY a.created_at DESC
        `) as unknown as { id: string; created_at: unknown; archetype: string | null }[];
      } catch { /* keep just this assessment */ }
    }
    const { map } = await fetchCalls(sql, personAssessments.map((p) => p.id));
    const calls = personAssessments.flatMap((p) => map.get(p.id) ?? []);
    const item = classifyContact(toContact(row, calls), this.now);
    const lead = rowToListLead(row, calls, item, this.now);

    // Talking points from the stored report v2 content (keyed by session_id), if present.
    let content: Record<string, unknown> | null = null;
    try {
      const cr = (await sql`SELECT content FROM report_v2_content WHERE session_id = ${row.session_id}::uuid LIMIT 1`) as unknown as { content: Record<string, unknown> }[];
      content = cr[0]?.content ?? null;
    } catch { content = null; }

    const str = (k: string) => (typeof content?.[k] === "string" ? (content![k] as string) : "");
    const tonight = Array.isArray(content?.tonight) ? (content!.tonight as string[]) : [];
    const goal = str("goal") || row.report_v2_goal || "";
    const report: ReportSummary = {
      worry: str("headline") || str("seenIt"),
      focusWhen: "",                              // no real source — hidden in the UI
      hardPart: str("hardPart"),
      tonightStep: tonight[0] ?? "",
      parentInstinct: row.parent_pattern ?? "",
      typeName: stripThe(row.archetype),
      ageBand: row.age_band,
      goal,
    };
    lead.report = report;
    lead.goal = goal;

    // Timeline: assembled from real milestones, oldest first.
    const events: { ts: number; ev: TimelineEvent }[] = [];
    const push = (isoStr: string | null, text: string) => {
      if (!isoStr) return;
      events.push({ ts: new Date(isoStr).getTime(), ev: { at: stampLabel(isoStr), text } });
    };
    push(iso(row.created_at), "Finished the assessment");
    push(iso(row.report_sent_at), "Report sent on WhatsApp");
    if (row.purchased_at) push(iso(row.purchased_at), `Bought the ${planLabel(row.tier)}`);
    if (row.lms_last_at) push(iso(row.lms_last_at), `Last LMS activity (week ${row.lms_max_week ?? 1})`);
    for (const c of calls) {
      const noteSuffix = c.notes?.trim() ? ` — “${c.notes.trim()}”` : "";
      push(iso(c.created_at), `You called · ${OUTCOME_UI[c.outcome].toLowerCase()}${noteSuffix}`);
    }
    events.sort((a, b) => a.ts - b.ts);
    lead.timeline = events.map((e) => e.ev);

    // Past calls for any A2 history use.
    lead.calls = [...calls]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((c): CallLog => ({ id: `${row.id}:${c.created_at}`, at: stampLabel(iso(c.created_at)), outcome: mapOutcomeToUi(c.outcome) }));

    // All assessments for this person (already fetched above) — listed on A2 when > 1.
    if (personAssessments.length > 1) {
      lead.personAssessments = personAssessments.map((o) => ({
        id: o.id, at: dayLabel(iso(o.created_at)), typeName: stripThe(o.archetype), current: o.id === row.id,
      }));
    }

    return lead;
  }

  // logCall is handled by the POST /api/admin/calls route (Basic-Auth protected); kept here to
  // satisfy the interface and usable server-side.
  async logCall(input: LogCallInput): Promise<void> {
    await logCallReal({ assessmentId: input.leadId, outcome: mapUiOutcome(input), notes: input.note ?? null, followUpAt: null, segment: "A", calledBy: "system" });
  }

  // ── WhatsApp half (A3/A4): delegate to fixtures, untouched ────────────────
  getConversations: CrmSource["getConversations"] = (f) => this.fixtures.getConversations(f);
  getThread: CrmSource["getThread"] = (id) => this.fixtures.getThread(id);
  getTemplates: CrmSource["getTemplates"] = () => this.fixtures.getTemplates();
  getDrip: CrmSource["getDrip"] = () => this.fixtures.getDrip();
  getSpend: CrmSource["getSpend"] = () => this.fixtures.getSpend();
  sendMessage: CrmSource["sendMessage"] = () => this.fixtures.sendMessage();
  setDrip: CrmSource["setDrip"] = () => this.fixtures.setDrip();
}

// The fixture CallOutcome union is a 4-value subset; map the 8 call_log outcomes down for the
// (display-only) Lead.calls history.
function mapOutcomeToUi(o: CallLogOutcome): CallLog["outcome"] {
  if (o === "interested" || o === "purchased" || o === "callback") return "call_back";
  if (o === "wrong_number" || o === "do_not_call") return "wrong_number";
  if (o === "no_answer") return "no_answer";
  if (o === "busy") return "no_answer";
  return "connected";
}
function mapUiOutcome(_input: LogCallInput): CallLogOutcome {
  // Not used by the live flow (the API route validates + writes the 8-value outcome directly).
  return "callback";
}

let _real: RealCallingSource | null = null;
export function getCallingSource(): CrmSource {
  if (!_real) _real = new RealCallingSource();
  return _real;
}

export const CALL_LOG_OUTCOMES: CallLogOutcome[] = [
  "interested", "callback", "not_interested", "purchased",
  "no_answer", "busy", "wrong_number", "do_not_call",
];

// Log a call for a lead: compute the lead's current segment, then insert. Used by the POST
// /api/admin/calls route. Returns { ok:false, reason:'not_enabled' } when call_log is missing.
export async function logCallForLead(input: {
  assessmentId: string;
  outcome: CallLogOutcome;
  notes: string | null;
  followUpAt: string | null;
  calledBy: string;
}): Promise<{ ok: true } | { ok: false; reason: "not_enabled" }> {
  const sql = getSql();
  let segment = "A";
  try {
    const rows = (await sql`
      SELECT
        a.id::text, a.session_id::text, a.parent_name, a.child_name, a.email, a.phone,
        a.age_band, a.archetype, a.parent_pattern, a.concerns, a.report_v2_goal, a.created_at,
        a.whatsapp_report_sent_at AS report_sent_at,
        p.tier, p.amount_paise, p.created_at AS purchased_at,
        lp.last_at AS lms_last_at, lp.max_week AS lms_max_week
      FROM assessments a
      LEFT JOIN LATERAL (
        SELECT tier, amount_paise, created_at FROM purchases
        WHERE assessment_id = a.id AND status = 'paid' ORDER BY created_at DESC LIMIT 1
      ) p ON true
      LEFT JOIN LATERAL (
        SELECT MAX(completed_at) AS last_at, MAX(week) AS max_week
        FROM lms_progress WHERE assessment_id = a.id
      ) lp ON true
      WHERE a.id = ${input.assessmentId}::uuid LIMIT 1
    `) as unknown as CandidateRow[];
    const row = rows[0];
    if (row) {
      const { map } = await fetchCalls(sql, [row.id]);
      const item = classifyContact(toContact(row, map.get(row.id) ?? []), new Date());
      if (item) segment = item.segment;
    }
  } catch { /* fall back to default segment */ }

  return logCallReal({
    assessmentId: input.assessmentId, segment, outcome: input.outcome,
    notes: input.notes, followUpAt: input.followUpAt, calledBy: input.calledBy,
  });
}

// Insert one call_log row. Shared by the API route. Throws a tagged error if the table is
// missing so the caller can surface "Call logging not enabled yet" without a 500.
export async function logCallReal(input: {
  assessmentId: string;
  outcome: CallLogOutcome;
  notes: string | null;
  followUpAt: string | null;
  segment: string;
  calledBy: string;
}): Promise<{ ok: true } | { ok: false; reason: "not_enabled" }> {
  const sql = getSql();
  try {
    await sql`
      INSERT INTO call_log (assessment_id, segment, outcome, notes, follow_up_at, called_by)
      VALUES (${input.assessmentId}::uuid, ${input.segment}, ${input.outcome},
              ${input.notes}, ${input.followUpAt ? input.followUpAt : null}::timestamptz, ${input.calledBy})
    `;
    return { ok: true };
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    if (/call_log|relation .* does not exist|undefined table/i.test(msg)) return { ok: false, reason: "not_enabled" };
    throw e;
  }
}
