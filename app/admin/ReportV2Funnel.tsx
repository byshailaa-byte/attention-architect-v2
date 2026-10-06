// Admin "Report v2" funnel: report views → plan views → checkout starts → paid, split
// v1 vs v2, internal excluded. Self-contained server component (own query). Cohorts:
// v2 = sessions with a report_v2_view; v1 = sessions with a (simplified_)report_view and no
// report_v2_view. Counts are distinct non-internal sessions. Wrapped so a missing event
// type (pre-migration) renders zeros rather than throwing.
import { getSql } from "@/lib/db/client";

type Funnel = { reports: number; plans: number; checkouts: number; paid: number };

export default async function ReportV2Funnel() {
  const sql = getSql();
  let v1: Funnel = { reports: 0, plans: 0, checkouts: 0, paid: 0 };
  let v2: Funnel = { reports: 0, plans: 0, checkouts: 0, paid: 0 };
  try {
    const rows = (await sql`
      WITH ni AS (
        SELECT fe.session_id, fe.event_type
        FROM funnel_events fe
        JOIN assessments a ON a.session_id = fe.session_id
        WHERE a.is_internal = false
      ),
      v2s AS (SELECT DISTINCT session_id FROM ni WHERE event_type = 'report_v2_view'),
      v1s AS (
        SELECT DISTINCT session_id FROM ni
        WHERE event_type IN ('simplified_report_view', 'report_view')
          AND session_id NOT IN (SELECT session_id FROM v2s)
      )
      SELECT
        (SELECT count(*)::int FROM v2s) AS v2_reports,
        (SELECT count(DISTINCT session_id)::int FROM ni WHERE event_type = 'plan_v2_view' AND session_id IN (SELECT session_id FROM v2s)) AS v2_plans,
        (SELECT count(DISTINCT session_id)::int FROM ni WHERE event_type IN ('plan_cta_click','begin_checkout') AND session_id IN (SELECT session_id FROM v2s)) AS v2_checkouts,
        (SELECT count(DISTINCT session_id)::int FROM ni WHERE event_type = 'purchase' AND session_id IN (SELECT session_id FROM v2s)) AS v2_paid,
        (SELECT count(*)::int FROM v1s) AS v1_reports,
        (SELECT count(DISTINCT session_id)::int FROM ni WHERE event_type = 'view_item' AND session_id IN (SELECT session_id FROM v1s)) AS v1_plans,
        (SELECT count(DISTINCT session_id)::int FROM ni WHERE event_type = 'begin_checkout' AND session_id IN (SELECT session_id FROM v1s)) AS v1_checkouts,
        (SELECT count(DISTINCT session_id)::int FROM ni WHERE event_type = 'purchase' AND session_id IN (SELECT session_id FROM v1s)) AS v1_paid
    `) as unknown as Record<string, number>[];
    const r = rows[0] ?? {};
    v2 = { reports: r.v2_reports ?? 0, plans: r.v2_plans ?? 0, checkouts: r.v2_checkouts ?? 0, paid: r.v2_paid ?? 0 };
    v1 = { reports: r.v1_reports ?? 0, plans: r.v1_plans ?? 0, checkouts: r.v1_checkouts ?? 0, paid: r.v1_paid ?? 0 };
  } catch { /* events not migrated yet — show zeros */ }

  const cell: React.CSSProperties = { padding: "8px 14px", borderBottom: "1px solid #EFE8DA", textAlign: "right", fontVariantNumeric: "tabular-nums" };
  const head: React.CSSProperties = { ...cell, textAlign: "left", fontWeight: 700, color: "#1B2333" };
  const rowEl = (label: string, a: number, b: number) => (
    <tr>
      <td style={{ ...cell, textAlign: "left" }}>{label}</td>
      <td style={cell}>{a}</td>
      <td style={cell}>{b}</td>
    </tr>
  );

  return (
    <section style={{ maxWidth: 900, margin: "24px auto", padding: "0 24px", fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ fontSize: 18, marginBottom: 4 }}>Report v2 funnel (internal excluded)</h2>
      <p style={{ fontSize: 12, color: "#5B6577", marginTop: 0 }}>Distinct sessions. v2 = report_v2_view cohort; v1 = (simplified) report_view cohort with no v2 view.</p>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
        <thead><tr><th style={head}>Step</th><th style={{ ...head, textAlign: "right" }}>v1</th><th style={{ ...head, textAlign: "right" }}>v2</th></tr></thead>
        <tbody>
          {rowEl("Report views", v1.reports, v2.reports)}
          {rowEl("Plan views", v1.plans, v2.plans)}
          {rowEl("Checkout starts", v1.checkouts, v2.checkouts)}
          {rowEl("Paid", v1.paid, v2.paid)}
        </tbody>
      </table>
    </section>
  );
}
