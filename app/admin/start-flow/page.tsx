import { getSql } from "@/lib/db/client";

// Admin "Start flow" table — the v2 (?flow=v2) acquisition funnel, measured end-to-end
// under ONE unified session id (the fix for the baseline's two-disjoint-id-spaces problem).
// Reached + % lost per step, with filters for window / device / source / flow. Internal
// (operator) sessions are always excluded via flow_sessions.is_internal.
//
// Protected by the /admin Basic-Auth middleware matcher. URL-driven filters (no client JS).

export const dynamic = "force-dynamic";

type SP = { [k: string]: string | string[] | undefined };

// C2 v2 order: age → worry → child → intro, then the assessment. Phone is captured at the
// CONTACT step (now a preview + form), after details_view. "Outside 8–14" (start_oob) is NOT a
// funnel step — it's an off-ramp to the handbook, shown separately below and excluded from the maths.
const STEPS: Array<{ key: string; label: string }> = [
  { key: "landing_view",         label: "Landing" },
  { key: "start_age",            label: "1 · Age" },
  { key: "start_worry",          label: "2 · Worry" },
  { key: "start_child",          label: "3 · Child" },
  { key: "assessment_intro_view",label: "4 · Intro" },
  { key: "assessment_started",   label: "Questions start" },
  { key: "q_answered",           label: "    first question" },
  { key: "halfway_view",         label: "Halfway" },
  { key: "details_view",         label: "Preview + contact shown" },
  { key: "details_submitted",    label: "    contact submitted" },
  { key: "phone_captured",       label: "    WhatsApp saved + sent" },
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
        'landing_view','start_age','start_worry','start_child','assessment_intro_view','start_oob',
        'phone_captured','assessment_started','q_answered','halfway_view','details_view','details_submitted',
        'report_view','simplified_report_view'
      )
    GROUP BY 1
  `) as unknown as { step: string; n: number }[];

  const counts = new Map(rows.map((r) => [r.step, r.n]));
  const top = counts.get("landing_view") ?? counts.get("start_age") ?? 0;
  // Off-ramp, NOT part of the funnel: parents who chose an out-of-range age (<8 / 15+) and were
  // sent to the handbook. Shown separately below; excluded from the drop-off maths above.
  const outsideRange = counts.get("start_oob") ?? 0;

  // UTM breakdowns off the first-party assessments.utm_* columns (phase_56), last 30 days.
  // Internal/test leads excluded. Counts + utm values only — never phone/email/child_name.
  const chatgptByTerm = (await sql`
    SELECT COALESCE(NULLIF(btrim(utm_term), ''), '(none)') AS term, COUNT(*)::int AS n
    FROM assessments
    WHERE NOT is_internal
      AND created_at >= now() - interval '30 days'
      AND (utm_source ILIKE 'chatgpt' OR utm_source ILIKE 'openai')
    GROUP BY 1
    ORDER BY n DESC, term ASC
    LIMIT 25
  `) as unknown as { term: string; n: number }[];

  const metaByContent = (await sql`
    SELECT COALESCE(NULLIF(btrim(utm_content), ''), '(none)') AS content, COUNT(*)::int AS n
    FROM assessments
    WHERE NOT is_internal
      AND created_at >= now() - interval '30 days'
      AND lower(utm_source) = ANY(ARRAY['meta','facebook','fb','instagram','ig'])
    GROUP BY 1
    ORDER BY n DESC, content ASC
    LIMIT 25
  `) as unknown as { content: string; n: number }[];

  function href(next: Partial<{ days: string; device: string; source: string; flow: string }>) {
    const p = new URLSearchParams({ days, device, source, flow, ...next });
    return `/admin/start-flow?${p.toString()}`;
  }

  const seg = (label: string, active: boolean, to: string) => (
    <a href={to} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 13, textDecoration: "none", marginRight: 8, border: "1px solid #d9d4c7", background: active ? "#14284D" : "#fff", color: active ? "#fff" : "#14284D", fontWeight: active ? 700 : 500 }}>{label}</a>
  );

  const breakdown = (title: string, colLabel: string, items: { key: string; n: number }[]) => (
    <div style={{ flex: "1 1 320px", minWidth: 280 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 2px" }}>{title}</h2>
      <p style={{ fontSize: 11.5, color: "#9a927c", margin: "0 0 10px" }}>Last 30 days · internal excluded</p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #14284D" }}>
            <th style={{ padding: "7px 6px" }}>{colLabel}</th>
            <th style={{ padding: "7px 6px", textAlign: "right" }}>Leads</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr><td colSpan={2} style={{ padding: "10px 6px", color: "#9a927c" }}>No leads yet.</td></tr>
          )}
          {items.map((it) => (
            <tr key={it.key} style={{ borderBottom: "1px solid #ece8da" }}>
              <td style={{ padding: "7px 6px", wordBreak: "break-word" }}>{it.key}</td>
              <td style={{ padding: "7px 6px", textAlign: "right", fontWeight: 700 }}>{it.n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

      {/* Off-ramp — excluded from the drop-off maths above. */}
      <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FBF6EE", border: "1px dashed #d9d4c7", borderRadius: 10, padding: "10px 14px", fontSize: 13.5 }}>
        <span style={{ color: "#6b6756" }}>Outside 8–14 (chose &lt;8 / 15+ → handbook) · <em>not counted in the funnel</em></span>
        <span style={{ fontWeight: 700 }}>{outsideRange}</span>
      </div>

      <div style={{ marginTop: 36 }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "#9a927c", marginBottom: 14 }}>UTM breakdowns (first-party)</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 32 }}>
          {breakdown("ChatGPT leads by term", "utm_term", chatgptByTerm.map((r) => ({ key: r.term, n: r.n })))}
          {breakdown("Meta leads by content", "utm_content", metaByContent.map((r) => ({ key: r.content, n: r.n })))}
        </div>
      </div>
    </div>
  );
}
