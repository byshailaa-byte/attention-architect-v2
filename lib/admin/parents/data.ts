import "server-only";
import { getSql } from "@/lib/db/client";
import { personKey } from "@/lib/admin/call-queue";
import { maskPhone, telLink, waLink, worryLabel } from "@/lib/admin/crm/logic";
import { BUCKETS, type Bucket, type ParentRow } from "./types";

// ── Parents screen data layer ────────────────────────────────────────────────────────────────────
// ONE row per parent: group assessments by normalised phone (personKey), else email, else per-assessment.
// Each child (one assessment) is listed with its own worry + journey + report/roadmap links. Call log,
// status, follow-up and bucket are per-parent. Buckets: auto (Purchased / Trial in progress / New /
// No phone) from real data + call-outcome buckets from call_log. Read-only; no funnel/event writes.
// Client-safe types + BUCKET constants live in ./types (importable from the client view).

type ARow = {
  id: string; session_id: string; parent_name: string | null; child_name: string | null;
  email: string | null; phone: string | null; age_band: string | null; concerns: string[] | null;
  archetype: string | null; is_internal: boolean;
  created_at: string; report_sent_at: string | null; purchased: boolean; trial_active: boolean;
  lms_week: number | null; lms_day: number | null; plan_days: number; report_viewed: boolean;
  coach_flag: boolean;
};
type CRow = { assessment_id: string; outcome: string; status: string | null; notes: string | null; follow_up_at: string | null; created_at: string };

const istDate = (s: string) => new Date(s).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
const istDateTime = (s: string) => new Date(s).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

// call_log.outcome → the bucket it puts the parent in, and the pill label.
const OUTCOME_BUCKET: Record<string, { bucket: Bucket; label: string }> = {
  no_answer: { bucket: "no_pickup", label: "Did not pick up" }, busy: { bucket: "no_pickup", label: "Did not pick up" },
  callback: { bucket: "callback", label: "Callback" }, interested: { bucket: "interested", label: "Interested" },
  trial_offered: { bucket: "trial_offered", label: "Trial offered" },
  trial_in_progress: { bucket: "trial_in_progress", label: "Trial in progress" },
  other_course: { bucket: "other_course", label: "Other course" },
  not_interested: { bucket: "not_interested", label: "Not interested" }, do_not_call: { bucket: "not_interested", label: "Not interested" },
  wrong_number: { bucket: "no_phone", label: "Wrong number" }, purchased: { bucket: "purchased", label: "Purchased" },
};

// The Neon serverless (HTTP) driver can throw a transient "fetch failed" on a cold/flaky network
// hop. A single blip should not blank the whole desk — retry a few times with a short backoff.
async function withRetry<T>(fn: () => Promise<T>, tries = 6): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) { last = e; await new Promise((r) => setTimeout(r, 300 * (i + 1))); }
  }
  throw last;
}

function journeyLine(a: ARow): string {
  const parts: string[] = [];
  if (a.report_sent_at || a.report_viewed) parts.push(a.report_viewed ? "Report read" : "Report sent");
  else parts.push("Report not opened");
  if (a.plan_days > 0) parts.push(a.plan_days === 1 ? "plan opened" : `plan opened on ${a.plan_days} days`);
  if (a.trial_active) parts.push("Trial active");
  if (a.lms_week) parts.push(`Week ${a.lms_week}${a.lms_day ? ` Day ${a.lms_day}` : ""}`);
  return parts.join(" · ");
}

export async function getParents(opts: { includeInternal?: boolean } = {}): Promise<{ rows: ParentRow[]; counts: Record<Bucket, number> }> {
  const sql = getSql();
  // Real (non-internal) assessments by default; includeInternal adds test/ZZ accounts for smoke tests.
  const internalFilter = opts.includeInternal ? "" : "AND a.is_internal = false";
  const arows = (await withRetry(() => sql.query(`
    SELECT a.id::text, a.session_id::text, a.parent_name, a.child_name, a.email, a.phone, a.age_band,
           a.concerns, a.archetype, a.is_internal, a.created_at, a.whatsapp_report_sent_at AS report_sent_at,
           (EXISTS (SELECT 1 FROM purchases p WHERE p.assessment_id = a.id AND p.status='paid')) AS purchased,
           (EXISTS (SELECT 1 FROM coach_trials t WHERE t.session_id = a.session_id AND t.status='active')) AS trial_active,
           lp.max_week AS lms_week, lp.max_day AS lms_day,
           COALESCE(pv.c, 0) AS plan_days,
           (EXISTS (
             SELECT 1 FROM funnel_events fe
             LEFT JOIN flow_sessions fs ON fs.session_id = fe.session_id
             WHERE fe.session_id = a.session_id AND fe.event_type IN ('report_view','report_v2_view')
               AND COALESCE(fs.is_internal, false) = false
               AND NOT EXISTS (SELECT 1 FROM admin_view_log av WHERE av.session_id = fe.session_id AND av.kind = 'report')
           )) AS report_viewed,
           (EXISTS (SELECT 1 FROM coach_call_request r WHERE r.status='open' AND (r.assessment_id = a.id))) AS coach_flag
    FROM assessments a
    LEFT JOIN LATERAL (SELECT MAX(week) max_week, MAX(day) max_day FROM lms_progress WHERE assessment_id = a.id) lp ON true
    -- plan "opens" = DISTINCT calendar days (IST) a parent viewed their plan, excluding operator/admin
    -- views (internal sessions + anything logged to admin_view_log). Raw event counts were noise (×42).
    LEFT JOIN LATERAL (
      SELECT count(DISTINCT (fe.created_at AT TIME ZONE 'Asia/Kolkata')::date)::int c
      FROM funnel_events fe
      LEFT JOIN flow_sessions fs ON fs.session_id = fe.session_id
      WHERE fe.session_id = a.session_id AND fe.event_type = 'plan_v2_view'
        AND COALESCE(fs.is_internal, false) = false
        AND NOT EXISTS (SELECT 1 FROM admin_view_log av WHERE av.session_id = fe.session_id AND av.kind = 'plan')
    ) pv ON true
    WHERE a.archetype IS NOT NULL ${internalFilter}
    ORDER BY a.created_at DESC
  `))) as unknown as ARow[];

  const ids = arows.map((a) => a.id);
  const calls = new Map<string, CRow[]>();
  if (ids.length) {
    const crows = (await withRetry(() => sql`
      SELECT assessment_id::text, outcome, status, notes, follow_up_at, created_at
      FROM call_log WHERE assessment_id = ANY(${ids}::uuid[]) ORDER BY created_at DESC
    `)) as unknown as CRow[];
    for (const c of crows) { (calls.get(c.assessment_id) ?? calls.set(c.assessment_id, []).get(c.assessment_id)!).push(c); }
  }

  // Group assessments into one parent per person key (phone → email → per-assessment).
  const groups = new Map<string, ARow[]>();
  for (const a of arows) {
    const k = personKey(a.phone, a.email) ?? `a:${a.id}`;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(a);
  }

  const now = Date.now();
  const rows: ParentRow[] = [];
  for (const [key, group] of groups) {
    group.sort((x, y) => +new Date(y.created_at) - +new Date(x.created_at));
    const head = group[0];
    const phone = group.find((g) => g.phone)?.phone ?? null;
    const parentName = group.find((g) => g.parent_name)?.parent_name?.split(/\s+/)[0] || "—";
    const groupCalls = group.flatMap((g) => calls.get(g.id) ?? []).sort((x, y) => +new Date(y.created_at) - +new Date(x.created_at));
    const latest = groupCalls[0] ?? null;
    const purchased = group.some((g) => g.purchased);
    const trialActive = group.some((g) => g.trial_active);

    // Bucket priority: Purchased > Trial in progress > latest call outcome > New > No phone.
    let bucket: Bucket; let statusLabel: string;
    if (purchased) { bucket = "purchased"; statusLabel = "Purchased"; }
    else if (trialActive) { bucket = "trial_in_progress"; statusLabel = "Trial in progress"; }
    else if (latest) { const ob = OUTCOME_BUCKET[latest.outcome] ?? { bucket: "all" as Bucket, label: latest.outcome }; bucket = ob.bucket; statusLabel = ob.label; }
    else if (!phone) { bucket = "no_phone"; statusLabel = "No phone"; }
    else { bucket = "new"; statusLabel = "New"; }

    const fu = groupCalls.find((c) => c.follow_up_at)?.follow_up_at ?? null;
    rows.push({
      key, parentName,
      phoneMasked: phone ? maskPhone(phone) : null, telHref: phone ? telLink(phone) : null, waHref: phone ? waLink(phone) : null,
      hasPhone: !!phone,
      children: group.map((a) => ({
        assessmentId: a.id, sessionId: a.session_id, childName: a.child_name || "—",
        ageBand: a.age_band || "—", worry: worryLabel(a.concerns?.[0] ?? ""), journey: journeyLine(a),
        archetype: a.archetype ?? "", assessedAt: a.created_at,
      })),
      leadAt: istDate(head.created_at), leadAtMs: +new Date(head.created_at),
      bucket, statusLabel,
      followUpAt: fu ? istDateTime(fu) : null, followUpMs: fu ? +new Date(fu) : null, followUpOverdue: !!fu && +new Date(fu) < now,
      tries: groupCalls.length, lastNote: latest?.notes?.slice(0, 60) ?? null,
      coachFlag: group.some((g) => g.coach_flag),
      isInternal: group.some((g) => g.is_internal),
    });
  }
  rows.sort((a, b) => b.leadAtMs - a.leadAtMs);

  const counts = Object.fromEntries(BUCKETS.map((b) => [b, 0])) as Record<Bucket, number>;
  counts.all = rows.length;
  for (const r of rows) counts[r.bucket]++;
  return { rows, counts };
}
