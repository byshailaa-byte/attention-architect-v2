// honest_flag and honest_trigger MUST NOT appear anywhere in this file — Gate 3.
import { getSql } from "@/lib/db/client";
import {
  GATEWAY_QUESTIONS,
  D1_1, D1_2,
  D2_1, D2_2, D2_3, D2_CONFIRM,
  D3_1, D3_2, D3_3, D3_CONFIRM,
  P1, P2,
  D5_1, D5_2,
  D6_1, D6_2, D6_3, D6_CONFIRM,
  type Question,
} from "@/lib/engine/questions";
import AdminDashboard from "./AdminDashboard";
import type { AdminDashboardProps, DropOffRow } from "./AdminDashboard";

// ── Question lookup ───────────────────────────────────────────────────────────

const ALL_QUESTIONS: Question[] = [
  ...GATEWAY_QUESTIONS,
  D1_1, D1_2,
  D2_1, D2_2, D2_3, D2_CONFIRM,
  D3_1, D3_2, D3_3, D3_CONFIRM,
  P1, P2,
  D5_1, D5_2,
  D6_1, D6_2, D6_3, D6_CONFIRM,
];

const QUESTION_ORDER = ALL_QUESTIONS.map(q => q.id);
const QUESTION_MAP = new Map(ALL_QUESTIONS.map(q => [q.id, q]));

function resolveAnswers(answers: Record<string, string>, childName: string) {
  return Object.entries(answers)
    .map(([qId, val]) => {
      const q = QUESTION_MAP.get(qId);
      if (!q) return { id: qId, question: qId, answer: val };
      const opt = q.options.find(o => o.value === val);
      return {
        id: qId,
        question: q.text.replace(/\{name\}/g, childName),
        answer: opt?.label ?? val,
      };
    })
    .sort((a, b) => {
      const ai = QUESTION_ORDER.indexOf(a.id);
      const bi = QUESTION_ORDER.indexOf(b.id);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  const sql = getSql();

  const [kpiRows, tierRows, archetypeRows, activityRows, assessmentRows, lmsRows] = await Promise.all([
    sql`
      SELECT
        COALESCE((SELECT SUM(amount_paise) FROM purchases WHERE status = 'paid')::bigint, 0) AS revenue_paise,
        (SELECT COUNT(*)::int FROM purchases WHERE status = 'paid')                           AS paid_count,
        (SELECT COUNT(*)::int FROM purchases)                                                  AS total_purchases,
        (SELECT COUNT(*)::int FROM assessments WHERE archetype IS NOT NULL)                    AS completed_count,
        (SELECT archetype FROM assessments WHERE archetype IS NOT NULL
         GROUP BY archetype ORDER BY COUNT(*) DESC LIMIT 1)                                   AS top_archetype
    `,

    sql`
      SELECT tier, COUNT(*)::int AS count, COALESCE(SUM(amount_paise), 0)::bigint AS revenue_paise
      FROM purchases
      WHERE status = 'paid'
      GROUP BY tier
      ORDER BY revenue_paise DESC
    `,

    sql`
      SELECT archetype, COUNT(*)::int AS count
      FROM assessments
      WHERE archetype IS NOT NULL
      GROUP BY archetype
      ORDER BY count DESC
    `,

    sql`
      SELECT type, created_at, email, detail FROM (
        SELECT 'purchase'   AS type, p.created_at, u.email,
               p.tier || ' ₹' || (p.amount_paise / 100) AS detail
        FROM purchases p JOIN users u ON u.id = p.user_id WHERE p.status = 'paid'

        UNION ALL

        SELECT 'assessment' AS type, a.created_at, a.email,
               a.archetype AS detail
        FROM assessments a WHERE a.archetype IS NOT NULL AND a.email IS NOT NULL

        UNION ALL

        SELECT 'lms'        AS type, lp.completed_at AS created_at, u.email,
               'Week ' || lp.week || ' Day ' || lp.day AS detail
        FROM lms_progress lp JOIN users u ON u.id = lp.user_id
      ) combined
      ORDER BY created_at DESC
      LIMIT 20
    `,

    sql`
      SELECT
        a.id::text,
        a.session_id::text,
        a.child_name,
        a.parent_name,
        a.email,
        a.archetype,
        a.parent_pattern,
        a.age_band,
        a.created_at,
        a.answers,
        a.concerns,
        a.tried,
        a.better,
        p.status              AS purchase_status,
        p.tier,
        p.amount_paise,
        p.created_at          AS purchased_at,
        COALESCE(lp.max_day, 0)::int AS lms_max_day
      FROM assessments a
      LEFT JOIN purchases p ON p.assessment_id = a.id AND p.status = 'paid'
      LEFT JOIN (
        SELECT user_id, MAX(day)::int AS max_day
        FROM lms_progress WHERE week = 1
        GROUP BY user_id
      ) lp ON lp.user_id = p.user_id
      ORDER BY a.created_at DESC
    `,

    sql`
      SELECT week::int, day::int, COUNT(DISTINCT user_id)::int AS user_count
      FROM lms_progress
      GROUP BY week, day
      ORDER BY week, day
    `,
  ]);

  type FunnelEventCounts = {
    assessment_started: number;
    assessment_complete: number;
    generate_lead: number;
    report_view: number;
    begin_checkout: number;
    purchase: number;
  };
  let funnelEventCounts: FunnelEventCounts = {
    assessment_started: 0,
    assessment_complete: 0,
    generate_lead: 0,
    report_view: 0,
    begin_checkout: 0,
    purchase: 0,
  };
  let dropOffs: DropOffRow[] = [];

  try {
    const [eventRows, dropOffRows] = await Promise.all([
      sql`
        SELECT event_type, COUNT(DISTINCT session_id)::int AS count
        FROM funnel_events
        WHERE event_type IN (
          'assessment_started','assessment_complete','generate_lead',
          'report_view','begin_checkout','purchase'
        )
        GROUP BY event_type
      `,
      sql`
        SELECT
          last_events.session_id,
          last_events.last_event,
          last_events.last_seen,
          EXTRACT(EPOCH FROM (now() - last_events.last_seen))::int AS seconds_since,
          a.child_name,
          a.parent_name
        FROM (
          SELECT DISTINCT ON (session_id)
            session_id::text,
            event_type AS last_event,
            created_at AS last_seen
          FROM funnel_events
          ORDER BY session_id, created_at DESC
        ) last_events
        LEFT JOIN assessments a ON a.session_id = last_events.session_id::uuid
        WHERE NOT EXISTS (
          SELECT 1 FROM funnel_events fe2
          WHERE fe2.session_id = last_events.session_id::uuid
            AND fe2.event_type = 'assessment_complete'
        )
        AND last_events.last_seen < now() - INTERVAL '30 minutes'
        ORDER BY last_events.last_seen DESC
        LIMIT 50
      `,
    ]);

    for (const row of eventRows as { event_type: string; count: number }[]) {
      const k = row.event_type as keyof FunnelEventCounts;
      if (k in funnelEventCounts) funnelEventCounts[k] = row.count;
    }
    dropOffs = (dropOffRows as unknown as { session_id: string; last_event: string; last_seen: unknown; seconds_since: number; child_name: string | null; parent_name: string | null }[]).map(r => ({
      session_id: r.session_id,
      last_event: r.last_event,
      last_seen: r.last_seen instanceof Date ? r.last_seen.toISOString() : String(r.last_seen),
      seconds_since: r.seconds_since,
      child_name: r.child_name,
      parent_name: r.parent_name,
    }));
  } catch {
    // funnel_events table not yet migrated — show zeros
  }

  type RawAssessment = {
    id: string;
    session_id: string;
    child_name: string;
    parent_name: string | null;
    email: string | null;
    archetype: string | null;
    parent_pattern: string | null;
    age_band: string;
    created_at: unknown;
    answers: Record<string, string> | null;
    concerns: string[] | null;
    tried: string[] | null;
    better: string[] | null;
    purchase_status: string | null;
    tier: string | null;
    amount_paise: number | null;
    purchased_at: unknown;
    lms_max_day: number | null;
  };

  const assessments: AdminDashboardProps["assessments"] = (assessmentRows as RawAssessment[]).map(a => ({
    id: a.id,
    session_id: a.session_id,
    child_name: a.child_name,
    parent_name: a.parent_name,
    email: a.email,
    archetype: a.archetype,
    parent_pattern: a.parent_pattern,
    age_band: a.age_band,
    created_at: a.created_at instanceof Date ? a.created_at.toISOString() : String(a.created_at),
    resolved_answers: resolveAnswers(a.answers ?? {}, a.child_name),
    concerns: a.concerns ?? [],
    tried: a.tried ?? null,
    better: a.better ?? null,
    purchase_status: a.purchase_status,
    tier: a.tier,
    amount_paise: a.amount_paise,
    purchased_at: a.purchased_at != null
      ? (a.purchased_at instanceof Date ? a.purchased_at.toISOString() : String(a.purchased_at))
      : null,
    lms_max_day: a.lms_max_day,
  }));

  type RawActivity = { type: string; created_at: unknown; email: string | null; detail: string | null };
  const activity: AdminDashboardProps["activity"] = (activityRows as RawActivity[]).map(r => ({
    type: r.type,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    email: r.email,
    detail: r.detail,
  }));

  const kpiRaw = (kpiRows as unknown as Omit<AdminDashboardProps["kpi"], "tier_breakdown">[])[0];
  const kpi: AdminDashboardProps["kpi"] = {
    ...kpiRaw,
    tier_breakdown: (tierRows as { tier: string; count: number; revenue_paise: number }[]),
  };

  return (
    <AdminDashboard
      kpi={kpi}
      assessments={assessments}
      archetypes={archetypeRows as AdminDashboardProps["archetypes"]}
      activity={activity}
      lms={lmsRows as AdminDashboardProps["lms"]}
      funnelEvents={funnelEventCounts}
      dropOffs={dropOffs}
    />
  );
}
