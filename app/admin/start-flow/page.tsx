import { getSql } from "@/lib/db/client";

// Admin "Start flow" table — the v2 (?flow=v2) acquisition funnel, measured end-to-end
// under ONE unified session id (the fix for the baseline's two-disjoint-id-spaces problem).
// Reached + % lost per step, with filters for window / device / source / flow. Internal
// (operator) sessions are always excluded via flow_sessions.is_internal.
//
// Protected by the /admin Basic-Auth middleware matcher. URL-driven filters (no client JS).

export const dynamic = "force-dynamic";

type SP = { [k: string]: string | string[] | undefined };

// New v2 order: phone is captured at the CONTACT step (step 6), after details_view.
const STEPS: Array<{ key: string; label: string }> = [
  { key: "landing_view",      label: "Landing" },
  { key: "start_worry",       label: "1 · Worry" },
  { key: "start_age",         label: "2 · Age" },
  { key: "start_child",       label: "3 · Child" },
  { key: "assessment_started",label: "Questions start" },
  { key: "q_answered",        label: "    first question" },
  { key: "halfway_view",      label: "Halfway" },
  { key: "details_view",      label: "6 · Contact shown" },
  { key: "details_submitted", label: "    contact submitted" },
  { key: "phone_captured",    label: "    WhatsApp saved + sent" },
];

function pick(sp: SP, k: string, fallback: string): string {
  const v = sp[k];
  return (Array.isArray(v) ? v[0] : v) ?? fallback;
}

export default async function StartFlowAdminPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const days   = pick(sp, "days", "14") === "7" ? "7" : "14";
  const device = ["all", "mobile", "tablet", "desktop"].includes(pick(sp, "device", "all")) ? pick(sp, "device", "all") : "all";
  const source = ["all", "meta", "other"].includes(pick(sp, "source", "all")) ? pick(sp, "source", "all") : "all";
  const flow   = pick(sp, "flow", "v2") === "v1" ? "v1" : "v2";
  const daysInterval = `${days} days`;

  const sql = getSql();
  const rows = (await sql`
    SELECT
      CASE WHEN e.event_type = 'simplified_report_view' THEN 'report_view' ELSE e.event_type END AS step,
      COUNT(DISTINCT e.session_id)::int AS n
    FROM funnel_events e
    JOIN flow_sessions f ON f.session_id = e.session_id
    WHERE f.flow = ${flow}
      AND NOT f.is_internal
      AND e.created_at >= now() - ${daysInterval}::interval
      AND (${device} = 'all' OR f.device = ${device})
      AND (${source} = 'all'
           OR (${source} = 'meta'  AND f.utm->>'utm_source' = 'meta')
           OR (${source} = 'other' AND (f.utm->>'utm_source' IS DISTINCT FROM 'meta')))
      AND e.event_type IN (
        'landing_view','start_worry','start_age','start_child','phone_captured',
        'assessment_started','q_answered','halfway_view','details_view','details_submitted',
        'report_view','simplified_report_view'
      )
    GROUP BY 1
  `) as unknown as { step: string; n: number }[];

  const counts = new Map(rows.map((r) => [r.step, r.n]));
  const top = counts.get("landing_view") ?? counts.get("start_worry") ?? 0;

  function href(next: Partial<{ days: string; device: string; source: string; flow: string }>) {
    const p = new URLSearchParams({ days, device, source, flow, ...next });
    return `/admin/start-flow?${p.toString()}`;
  }

  const seg = (label: string, active: boolean, to: string) => (
    <a href={to} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 13, textDecoration: "none", marginRight: 8, border: "1px solid #d9d4c7", background: active ? "#14284D" : "#fff", color: active ? "#fff" : "#14284D", fontWeight: active ? 700 : 500 }}>{label}</a>
  );

  let prev = 0;
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 20px", fontFamily: "system-ui, sans-serif", color: "#14284D" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Start flow — v2 funnel</h1>
      <p style={{ fontSize: 13.5, color: "#6b6756", marginBottom: 20 }}>
        One unified session id across <code>/simplified/start</code> → <code>/assessment</code>. Internal/operator sessions excluded.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div><div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "#9a927c", marginBottom: 6 }}>Window</div>{seg("7 days", days === "7", href({ days: "7" }))}{seg("14 days", days === "14", href({ days: "14" }))}</div>
        <div><div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "#9a927c", marginBottom: 6 }}>Device</div>{(["all", "mobile", "tablet", "desktop"] as const).map((d) => <span key={d}>{seg(d, device === d, href({ device: d }))}</span>)}</div>
        <div><div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "#9a927c", marginBottom: 6 }}>Source</div>{seg("All", source === "all", href({ source: "all" }))}{seg("Meta", source === "meta", href({ source: "meta" }))}{seg("Other", source === "other", href({ source: "other" }))}</div>
        <div><div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "#9a927c", marginBottom: 6 }}>Flow</div>{seg("v2 (new)", flow === "v2", href({ flow: "v2" }))}{seg("v1", flow === "v1", href({ flow: "v1" }))}</div>
      </div>

      {flow === "v1" && (
        <div style={{ background: "#FFF8E6", border: "1px solid #F5A623", borderRadius: 10, padding: "12px 16px", fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>
          v1 is not instrumented with a unified session id (the legacy landing/assessment id split documented in the baseline), so no per-step v1 funnel exists here. Use the main dashboard&rsquo;s drop-off view for v1.
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #14284D" }}>
            <th style={{ padding: "8px 6px" }}>Step</th>
            <th style={{ padding: "8px 6px", textAlign: "right" }}>Reached</th>
            <th style={{ padding: "8px 6px", textAlign: "right" }}>% of start</th>
            <th style={{ padding: "8px 6px", textAlign: "right" }}>% lost vs prev</th>
          </tr>
        </thead>
        <tbody>
          {STEPS.map((s, i) => {
            const n = counts.get(s.key) ?? 0;
            const ofStart = top > 0 ? Math.round((n / top) * 100) : 0;
            const lost = i > 0 && prev > 0 ? Math.round((1 - n / prev) * 100) : 0;
            const row = (
              <tr key={s.key} style={{ borderBottom: "1px solid #ece8da" }}>
                <td style={{ padding: "8px 6px", whiteSpace: "pre", fontFamily: s.label.startsWith("    ") ? "ui-monospace, monospace" : "inherit", color: s.label.startsWith("    ") ? "#6b6756" : "#14284D" }}>{s.label}</td>
                <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700 }}>{n}</td>
                <td style={{ padding: "8px 6px", textAlign: "right", color: "#6b6756" }}>{ofStart}%</td>
                <td style={{ padding: "8px 6px", textAlign: "right", color: lost >= 25 ? "#c0392b" : "#6b6756", fontWeight: lost >= 25 ? 700 : 400 }}>{i === 0 ? "—" : `${lost}%`}</td>
              </tr>
            );
            prev = n;
            return row;
          })}
        </tbody>
      </table>
    </div>
  );
}
