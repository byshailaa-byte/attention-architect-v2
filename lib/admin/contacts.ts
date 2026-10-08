// SERVER-ONLY. "All contacts" view for the admin Calling dashboard — one row per PERSON across
// every assessment (complete or not), deduped by normalised phone (E.164), email as fallback.
// Separate from the A–E call queue (lib/admin/call-queue.ts); the queue is unchanged. Internal/
// test traffic is excluded with the same rule the queue uses.
import "server-only";
import { getSql } from "@/lib/db/client";
import { worryLabel } from "@/lib/admin/crm/logic";

export type ContactStageKind = "started" | "report" | "checkout" | "paid" | "in_lms" | "v1";

export type ContactRow = {
  assessmentId: string;        // latest assessment — row link target (A2)
  parentName: string;
  childName: string;
  ageBand: string;
  typeName: string;            // attention style (archetype, "The " stripped)
  worry: string;
  stage: string;               // display
  stageKind: ContactStageKind;
  plan: string | null;         // plan label when paid/checkout
  lastActivity: string;        // display date
  lastActivityAt: string;      // ISO, sort key
  lastCall: string;            // "outcome · date" or "—"
  nextFollowUp: string;        // date or "—"
  assessmentCount: number;     // how many assessments this person has
};

export type ContactsQuery = {
  q?: string;                  // search: name / phone / child
  stage?: string;              // stageKind filter
  paid?: string;               // "paid" | "unpaid"
  plan?: string;               // tier
  flag?: string;               // "never_called" | "checkout_started"
  from?: string; to?: string;  // last-activity date range (YYYY-MM-DD)
  sort?: string;               // "activity" (default)
  page?: number;
  pageSize?: number;
};

const IST_OFFSET_MS = 5.5 * 3600_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const firstName = (n: string | null) => (n ?? "").trim().split(/\s+/)[0] || "Parent";
const stripThe = (a: string | null) => (a ?? "").replace(/^The\s+/i, "") || "—";
const planLabel = (t: string | null) => t === "tier2" ? "₹4,999" : t === "tier1" ? "₹2,999" : t === "full" ? "₹999" : t === "module1" ? "₹499" : t ? t : "";
function iso(v: unknown): string | null { return v == null ? null : (v instanceof Date ? v.toISOString() : String(v)); }
function dayLabel(isoStr: string | null): string {
  if (!isoStr) return "—";
  const d = new Date(new Date(isoStr).getTime() + IST_OFFSET_MS);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

const OUTCOME_UI: Record<string, string> = {
  interested: "Interested", callback: "Callback", not_interested: "Not interested", purchased: "Bought",
  no_answer: "No answer", busy: "Busy", wrong_number: "Wrong number", do_not_call: "Do not call",
};

type Raw = {
  id: string; phone_digits: string | null; parent_name: string | null; child_name: string | null; age_band: string;
  archetype: string | null; concerns: string[] | null; created_at: unknown; report_sent_at: unknown;
  person_count: number; paid_tier: string | null; paid_amt: number | null; pend_tier: string | null;
  lms_version: string | null; max_week: number | null; max_day: number | null; lms_last: unknown;
  last_call_outcome: string | null; last_call_at: unknown; last_follow_up: unknown; last_activity_at: unknown;
};

// Normalised-phone expression reused in SQL (10→91+, 12 starting 91 as-is, else NULL).
const NORM = `CASE
  WHEN length(regexp_replace(a.phone,'\\D','','g'))=10 THEN '91'||regexp_replace(a.phone,'\\D','','g')
  WHEN length(regexp_replace(a.phone,'\\D','','g'))=12 AND left(regexp_replace(a.phone,'\\D','','g'),2)='91' THEN regexp_replace(a.phone,'\\D','','g')
  ELSE NULL END`;

// Builds the per-person CTE (keyed → latest → people). Filtering, sorting, COUNT and pagination
// all happen in SQL against the `people` CTE (see getAllContacts), so no contact is ever dropped
// by an in-memory bound regardless of how many people exist.
function peopleCTE(withCalls: boolean): string {
  const callSel = withCalls
    ? `lc.outcome AS last_call_outcome, lc.created_at AS last_call_at, lc.follow_up_at AS last_follow_up,`
    : `NULL::text AS last_call_outcome, NULL::timestamptz AS last_call_at, NULL::timestamptz AS last_follow_up,`;
  const callJoin = withCalls
    ? `LEFT JOIN LATERAL (SELECT outcome, created_at, follow_up_at FROM call_log WHERE assessment_id=l.id ORDER BY created_at DESC LIMIT 1) lc ON true`
    : ``;
  return `
    WITH keyed AS (
      SELECT a.*, COALESCE(${NORM}, 'email:'||lower(a.email)) AS person_key
      FROM assessments a
      WHERE NOT a.is_internal
        AND (a.child_name IS NULL OR (a.child_name NOT ILIKE 'Test%' AND a.child_name NOT ILIKE 'Smoke%'))
        AND (a.phone IS NOT NULL OR a.email IS NOT NULL)
    ),
    with_key AS (SELECT * FROM keyed WHERE person_key IS NOT NULL),
    latest AS (
      SELECT DISTINCT ON (person_key) *,
        (SELECT COUNT(*) FROM with_key k2 WHERE k2.person_key = with_key.person_key)::int AS person_count
      FROM with_key ORDER BY person_key, created_at DESC
    ),
    people AS (
    SELECT l.id::text AS id, regexp_replace(COALESCE(l.phone,''),'\\D','','g') AS phone_digits,
      l.parent_name, l.child_name, l.age_band, l.archetype, l.concerns,
      l.created_at, l.whatsapp_report_sent_at AS report_sent_at, l.person_count,
      p.tier AS paid_tier, p.amount_paise AS paid_amt, pend.tier AS pend_tier,
      u.lms_version, lp.max_week, lp.max_day, lp.last_at AS lms_last,
      ${callSel}
      GREATEST(l.created_at, COALESCE(l.whatsapp_report_sent_at,'epoch'::timestamptz),
        COALESCE(p.created_at,'epoch'::timestamptz), COALESCE(lp.last_at,'epoch'::timestamptz)
        ${withCalls ? `, COALESCE(lc.created_at,'epoch'::timestamptz)` : ``}) AS last_activity_at,
      (p.tier IS NOT NULL) AS paid_flag,
      COALESCE(p.tier, pend.tier) AS plan_tier,
      CASE WHEN p.tier IS NOT NULL AND u.lms_version='v1' THEN 'v1'
           WHEN p.tier IS NOT NULL AND lp.last_at IS NOT NULL THEN 'in_lms'
           WHEN p.tier IS NOT NULL THEN 'paid'
           WHEN pend.tier IS NOT NULL THEN 'checkout'
           WHEN l.whatsapp_report_sent_at IS NOT NULL THEN 'report'
           ELSE 'started' END AS stage_kind
    FROM latest l
    LEFT JOIN LATERAL (SELECT tier, amount_paise, created_at, user_id FROM purchases WHERE assessment_id=l.id AND status='paid' ORDER BY created_at DESC LIMIT 1) p ON true
    LEFT JOIN LATERAL (SELECT tier FROM purchases WHERE assessment_id=l.id AND status='pending' ORDER BY created_at DESC LIMIT 1) pend ON true
    LEFT JOIN LATERAL (SELECT MAX(week) max_week, MAX(day) max_day, MAX(completed_at) last_at FROM lms_progress WHERE assessment_id=l.id) lp ON true
    LEFT JOIN users u ON u.id = p.user_id
    ${callJoin}
    )`;
}

function toRow(r: Raw): ContactRow {
  const paid = r.paid_tier != null;
  const lmsActive = r.lms_last != null;
  let stage: string, stageKind: ContactStageKind;
  if (paid) {
    if (r.lms_version === "v1") { stageKind = "v1"; stage = lmsActive ? `v1 customer · W${r.max_week ?? 1} D${r.max_day ?? 0}` : "v1 customer"; }
    else if (lmsActive) { stageKind = "in_lms"; stage = `In LMS · W${r.max_week ?? 1} D${r.max_day ?? 0}`; }
    else { stageKind = "paid"; stage = `Paid (${planLabel(r.paid_tier)})`; }
  } else if (r.pend_tier != null) {
    stageKind = "checkout"; stage = `Checkout started (${planLabel(r.pend_tier)})`;
  } else if (r.report_sent_at != null) {
    stageKind = "report"; stage = "Got report";
  } else {
    stageKind = "started"; stage = "Started assessment";
  }
  const lastCall = r.last_call_outcome
    ? `${OUTCOME_UI[r.last_call_outcome] ?? r.last_call_outcome} · ${dayLabel(iso(r.last_call_at))}`
    : "—";
  return {
    assessmentId: r.id,
    parentName: firstName(r.parent_name),
    childName: firstName(r.child_name),
    ageBand: r.age_band,
    typeName: stripThe(r.archetype),
    worry: r.concerns && r.concerns[0] ? worryLabel(r.concerns[0]) : "—",
    stage, stageKind,
    plan: paid ? planLabel(r.paid_tier) : r.pend_tier ? planLabel(r.pend_tier) : null,
    lastActivity: dayLabel(iso(r.last_activity_at)),
    lastActivityAt: iso(r.last_activity_at) ?? "",
    lastCall,
    nextFollowUp: r.last_follow_up ? dayLabel(iso(r.last_follow_up)) : "—",
    assessmentCount: r.person_count,
  };
}

export type ContactsPage = { rows: ContactRow[]; total: number; totalAll: number; page: number; pageSize: number; callsEnabled: boolean };

export async function getAllContacts(opts: ContactsQuery): Promise<ContactsPage> {
  const sql = getSql();
  const pageSize = Math.min(Math.max(opts.pageSize ?? 50, 10), 200);
  const page = Math.max(opts.page ?? 1, 1);

  const run = async (withCalls: boolean) => {
    const cte = peopleCTE(withCalls);
    const conds: string[] = [];
    const params: unknown[] = [];
    const add = (v: unknown) => { params.push(v); return `$${params.length}`; };

    const q = (opts.q ?? "").trim();
    if (q) {
      const like = add(`%${q}%`);
      const qd = q.replace(/\D/g, "");
      if (qd.length >= 4) conds.push(`(p.parent_name ILIKE ${like} OR p.child_name ILIKE ${like} OR p.phone_digits LIKE ${add(`%${qd}%`)})`);
      else conds.push(`(p.parent_name ILIKE ${like} OR p.child_name ILIKE ${like})`);
    }
    if (opts.stage) conds.push(`p.stage_kind = ${add(opts.stage)}`);
    if (opts.paid === "paid") conds.push(`p.paid_flag`);
    if (opts.paid === "unpaid") conds.push(`NOT p.paid_flag`);
    if (opts.plan) conds.push(`p.plan_tier = ${add(opts.plan)}`);
    if (opts.flag === "never_called") conds.push(`p.last_call_outcome IS NULL`);
    if (opts.flag === "checkout_started") conds.push(`p.stage_kind = 'checkout'`);
    if (opts.from) conds.push(`(p.last_activity_at AT TIME ZONE 'Asia/Kolkata')::date >= ${add(opts.from)}::date`);
    if (opts.to) conds.push(`(p.last_activity_at AT TIME ZONE 'Asia/Kolkata')::date <= ${add(opts.to)}::date`);
    const where = conds.length ? "WHERE " + conds.join(" AND ") : "";

    const lim = add(pageSize);
    const off = add((page - 1) * pageSize);
    // Page + a window COUNT of the filtered set (so pagination can't silently drop a match).
    const pageRows = (await sql.query(
      `${cte} SELECT p.*, COUNT(*) OVER()::int AS total_count FROM people p ${where} ORDER BY p.last_activity_at DESC NULLS LAST LIMIT ${lim} OFFSET ${off}`,
      params,
    )) as unknown as (Raw & { total_count: number })[];
    const allRows = (await sql.query(`${cte} SELECT COUNT(*)::int AS n FROM people`)) as unknown as { n: number }[];
    return { pageRows, totalAll: allRows[0]?.n ?? 0 };
  };

  let res: Awaited<ReturnType<typeof run>>;
  let callsEnabled = true;
  try { res = await run(true); }
  catch { callsEnabled = false; res = await run(false); } // call_log not migrated here

  const total = res.pageRows[0]?.total_count ?? 0;
  return { rows: res.pageRows.map(toRow), total, totalAll: res.totalAll, page, pageSize, callsEnabled };
}
