import { getSql } from "@/lib/db/client";

// Admin "Start flow" — the v2 (?flow=v2) acquisition funnel, measured end-to-end under ONE
// unified session id. Reached + % lost per step, with filters for window / device / source /
// flow version. Internal (operator) sessions always excluded via flow_sessions.is_internal.
//
// report-fixes (ChatGPT funnel):
//   • Source filter includes ChatGPT (utm_source chatgpt/openai), kept mutually exclusive from Meta/Other.
//   • "Flow version" toggle (current / older) around the age-first deploy so old + new never mix.
//   • Steps are STRICT/cumulative (a session that reached step N counts for every step ≤ N), so no
//     step can read higher than the one above it.
//   • Landings AND leads by source + by term, sourced from flow_sessions (landings) joined to
//     assessments (leads) — so ChatGPT clicks that never convert still show.
//   • Funnel-insert error count (funnel_event_errors) shown, so silent loss is visible.
//
// Protected by the /admin Basic-Auth middleware. URL-driven filters (no client JS).

export const dynamic = "force-dynamic";

type SP = { [k: string]: string | string[] | undefined };

// The age-first redesign (eb82959) merged 2026-10-10 01:28 IST ≈ 2026-10-09 20:00 UTC. "Current"
// flow = sessions started at/after this; "older" = before. Keeps the two step-orders from mixing.
const FLOW_CUTOFF = "2026-10-09 20:00:00+00";

// C2 v2 order: age → worry → child → intro, then the assessment. Each step has an ordinal used for
// the strict/cumulative count. start_oob (outside 8–14) is an off-ramp, not a step (ordinal 0).
const STEPS: Array<{ key: string; label: string; ord: number }> = [
  { key: "landing_view",          label: "Landing",                  ord: 1 },
  { key: "start_age",             label: "1 · Age",                  ord: 2 },
  { key: "start_worry",           label: "2 · Worry",                ord: 3 },
  { key: "start_child",           label: "3 · Child",                ord: 4 },
  { key: "assessment_intro_view", label: "4 · Intro",                ord: 5 },
  { key: "assessment_started",    label: "Questions start",          ord: 6 },
  { key: "q_answered",            label: "    first question",       ord: 7 },
  { key: "halfway_view",          label: "Halfway",                  ord: 8 },
  { key: "details_view",          label: "Contact shown",            ord: 9 },
  { key: "details_submitted",     label: "    contact submitted",    ord: 10 },
  { key: "phone_captured",        label: "    WhatsApp saved + sent", ord: 11 },
];

function pick(sp: SP, k: string, fallback: string): string {
  const v = sp[k];
  return (Array.isArray(v) ? v[0] : v) ?? fallback;
}

export default async function StartFlowAdminPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const days   = pick(sp, "days", "14") === "7" ? "7" : "14";
  const device = ["all", "mobile", "tablet", "desktop"].includes(pick(sp, "device", "all")) ? pick(sp, "device", "all") : "all";
  const source = ["all", "meta", "chatgpt", "other"].includes(pick(sp, "source", "all")) ? pick(sp, "source", "all") : "all";
  const flow   = pick(sp, "flow", "v2") === "v1" ? "v1" : "v2";
  const fver   = pick(sp, "fver", "current") === "older" ? "older" : "current";
  const daysInterval = `${days} days`;

  const sql = getSql();

  // Strict/cumulative funnel: per-session FURTHEST ordinal reached, then step[k] = sessions whose
  // furthest ordinal >= k. Guarantees a monotonic non-increasing funnel (no step above its parent).
  const reached = (await sql`
    SELECT r.max_ord, COUNT(*)::int AS n FROM (
      SELECT e.session_id, MAX(CASE e.event_type
        WHEN 'landing_view' THEN 1 WHEN 'start_age' THEN 2 WHEN 'start_worry' THEN 3
        WHEN 'start_child' THEN 4 WHEN 'assessment_intro_view' THEN 5 WHEN 'assessment_started' THEN 6
        WHEN 'q_answered' THEN 7 WHEN 'halfway_view' THEN 8 WHEN 'details_view' THEN 9
        WHEN 'details_submitted' THEN 10 WHEN 'phone_captured' THEN 11 ELSE 0 END) AS max_ord
      FROM funnel_events e
      JOIN flow_sessions f ON f.session_id = e.session_id
      WHERE f.flow = ${flow}
        AND NOT f.is_internal
        AND e.created_at >= now() - ${daysInterval}::interval
        AND ((${fver} = 'current' AND f.created_at >= ${FLOW_CUTOFF}::timestamptz)
          OR (${fver} = 'older'   AND f.created_at <  ${FLOW_CUTOFF}::timestamptz))
        AND (${device} = 'all' OR f.device = ${device})
        AND (${source} = 'all'
          OR (${source} = 'meta'    AND lower(f.utm->>'utm_source') = ANY(ARRAY['meta','facebook','fb','instagram','ig']))
          OR (${source} = 'chatgpt' AND (f.utm->>'utm_source' ILIKE 'chatgpt' OR f.utm->>'utm_source' ILIKE 'openai'))
          OR (${source} = 'other'   AND COALESCE(lower(f.utm->>'utm_source'),'') <> ALL(ARRAY['meta','facebook','fb','instagram','ig'])
                                     AND COALESCE(f.utm->>'utm_source','') NOT ILIKE 'chatgpt'
                                     AND COALESCE(f.utm->>'utm_source','') NOT ILIKE 'openai'))
      GROUP BY e.session_id
    ) r
    WHERE r.max_ord > 0
    GROUP BY r.max_ord
  `) as unknown as { max_ord: number; n: number }[];
  // cumulative: count of sessions whose furthest ordinal >= k
  const cum = (k: number) => reached.filter((r) => r.max_ord >= k).reduce((a, r) => a + r.n, 0);
  const counts = new Map(STEPS.map((s) => [s.key, cum(s.ord)]));
  const top = counts.get("landing_view") ?? 0;

  // Off-ramp (start_oob) — separate, not a step.
  const oob = (await sql`
    SELECT COUNT(DISTINCT e.session_id)::int AS n FROM funnel_events e
    JOIN flow_sessions f ON f.session_id = e.session_id
    WHERE f.flow = ${flow} AND NOT f.is_internal AND e.event_type = 'start_oob'
      AND e.created_at >= now() - ${daysInterval}::interval
      AND ((${fver} = 'current' AND f.created_at >= ${FLOW_CUTOFF}::timestamptz) OR (${fver} = 'older' AND f.created_at < ${FLOW_CUTOFF}::timestamptz))
  `) as unknown as { n: number }[];
  const outsideRange = oob[0]?.n ?? 0;

  // (b) Funnel-insert error count — silent loss made visible. Last 7 days, by event type.
  const errs = (await sql`
    SELECT event_type, COUNT(*)::int AS n FROM funnel_event_errors
    WHERE created_at >= now() - interval '7 days' GROUP BY 1 ORDER BY n DESC LIMIT 10
  `) as unknown as { event_type: string; n: number }[];
  const errTotal = errs.reduce((a, e) => a + e.n, 0);

  // Landings → Age → Lead by source, for today (IST) / 7d / 14d. Attribution comes from
  // flow_sessions.utm (landings) joined to assessments (leads) — NOT assessments.utm_source, which
  // is empty for ChatGPT. "Current" flow version only (never mixes old + new).
  const bySource = (await sql`
    WITH s AS (
      SELECT f.session_id, f.created_at,
        CASE
          WHEN lower(f.utm->>'utm_source') = ANY(ARRAY['meta','facebook','fb','instagram','ig']) THEN 'Meta'
          WHEN f.utm->>'utm_source' ILIKE 'chatgpt' OR f.utm->>'utm_source' ILIKE 'openai' THEN 'ChatGPT'
          ELSE 'Other / Direct'
        END AS src,
        EXISTS (SELECT 1 FROM funnel_events e WHERE e.session_id = f.session_id AND e.event_type = 'start_age') AS reached_age,
        EXISTS (SELECT 1 FROM assessments a WHERE a.session_id = f.session_id AND a.parent_name IS NOT NULL AND NOT a.is_internal) AS is_lead
      FROM flow_sessions f
      WHERE NOT f.is_internal AND f.flow = 'v2'
        AND f.created_at >= ${FLOW_CUTOFF}::timestamptz
        AND f.created_at >= now() - interval '14 days'
    )
    SELECT src,
      COUNT(*) FILTER (WHERE created_at >= (now() AT TIME ZONE 'Asia/Kolkata')::date::timestamp AT TIME ZONE 'Asia/Kolkata')::int AS land_today,
      COUNT(*) FILTER (WHERE reached_age AND created_at >= (now() AT TIME ZONE 'Asia/Kolkata')::date::timestamp AT TIME ZONE 'Asia/Kolkata')::int AS age_today,
      COUNT(*) FILTER (WHERE is_lead     AND created_at >= (now() AT TIME ZONE 'Asia/Kolkata')::date::timestamp AT TIME ZONE 'Asia/Kolkata')::int AS lead_today,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS land_7,
      COUNT(*) FILTER (WHERE reached_age AND created_at >= now() - interval '7 days')::int AS age_7,
      COUNT(*) FILTER (WHERE is_lead     AND created_at >= now() - interval '7 days')::int AS lead_7,
      COUNT(*)::int AS land_14,
      COUNT(*) FILTER (WHERE reached_age)::int AS age_14,
      COUNT(*) FILTER (WHERE is_lead)::int AS lead_14
    FROM s GROUP BY src ORDER BY land_14 DESC
  `) as unknown as Record<string, number | string>[];

  // ChatGPT landings + leads by term (30d). Landings from flow_sessions; leads from the joined
  // assessment. Terms with landings but zero leads still appear.
  const chatgptByTerm = (await sql`
    SELECT COALESCE(NULLIF(btrim(f.utm->>'utm_term'), ''), '(none)') AS term,
           COUNT(DISTINCT f.session_id)::int AS landings,
           COUNT(DISTINCT a.session_id) FILTER (WHERE a.parent_name IS NOT NULL)::int AS leads
    FROM flow_sessions f
    LEFT JOIN assessments a ON a.session_id = f.session_id AND NOT a.is_internal
    WHERE NOT f.is_internal
      AND f.created_at >= now() - interval '30 days'
      AND (f.utm->>'utm_source' ILIKE 'chatgpt' OR f.utm->>'utm_source' ILIKE 'openai')
    GROUP BY 1 ORDER BY landings DESC, term ASC LIMIT 25
  `) as unknown as { term: string; landings: number; leads: number }[];

  function href(next: Partial<{ days: string; device: string; source: string; flow: string; fver: string }>) {
    const p = new URLSearchParams({ days, device, source, flow, fver, ...next });
    return `/admin/start-flow?${p.toString()}`;
  }
  const seg = (label: string, active: boolean, to: string) => (
    <a href={to} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 13, textDecoration: "none", marginRight: 8, border: "1px solid #d9d4c7", background: active ? "#14284D" : "#fff", color: active ? "#fff" : "#14284D", fontWeight: active ? 700 : 500 }}>{label}</a>
  );

  let prev = 0;
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px", fontFamily: "system-ui, sans-serif", color: "#14284D" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Start flow — v2 funnel</h1>
      <p style={{ fontSize: 13.5, color: "#6b6756", marginBottom: 16 }}>
        One unified session id across <code>/simplified/start</code> → <code>/assessment</code>. Internal/operator sessions excluded.
        Steps are cumulative (reaching a step counts for every step before it).
      </p>

      {/* (b) funnel-insert error count */}
      <div style={{ background: errTotal > 0 ? "#FDEDEC" : "#EAF5EC", border: `1px solid ${errTotal > 0 ? "#C0392B" : "#A6CBB0"}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, marginBottom: 18 }}>
        {errTotal === 0
          ? <span>✓ No funnel-event insert errors in the last 7 days.</span>
          : <span style={{ color: "#8A2A1C", fontWeight: 600 }}>⚠ {errTotal} funnel-event insert error(s) in 7 days — {errs.map((e) => `${e.event_type}×${e.n}`).join(", ")}</span>}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div><div style={labelCss}>Window</div>{seg("7 days", days === "7", href({ days: "7" }))}{seg("14 days", days === "14", href({ days: "14" }))}</div>
        <div><div style={labelCss}>Device</div>{(["all", "mobile", "tablet", "desktop"] as const).map((d) => <span key={d}>{seg(d, device === d, href({ device: d }))}</span>)}</div>
        <div><div style={labelCss}>Source</div>{seg("All", source === "all", href({ source: "all" }))}{seg("Meta", source === "meta", href({ source: "meta" }))}{seg("ChatGPT", source === "chatgpt", href({ source: "chatgpt" }))}{seg("Other", source === "other", href({ source: "other" }))}</div>
        <div><div style={labelCss}>Flow version</div>{seg("Current (age-first)", fver === "current", href({ fver: "current" }))}{seg("Older", fver === "older", href({ fver: "older" }))}</div>
        <div><div style={labelCss}>Flow</div>{seg("v2 (new)", flow === "v2", href({ flow: "v2" }))}{seg("v1", flow === "v1", href({ flow: "v1" }))}</div>
      </div>

      {flow === "v1" && (
        <div style={{ background: "#FFF8E6", border: "1px solid #F5A623", borderRadius: 10, padding: "12px 16px", fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>
          v1 is not instrumented with a unified session id, so no per-step v1 funnel exists here.
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

      <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FBF6EE", border: "1px dashed #d9d4c7", borderRadius: 10, padding: "10px 14px", fontSize: 13.5 }}>
        <span style={{ color: "#6b6756" }}>Outside 8–14 (chose &lt;8 / 15+ → handbook) · <em>not counted in the funnel</em></span>
        <span style={{ fontWeight: 700 }}>{outsideRange}</span>
      </div>

      {/* Landings → Age → Lead by source */}
      <div style={{ marginTop: 36 }}>
        <div style={labelCss}>Landings → Age → Lead by source (current flow; attribution from flow_sessions)</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, marginTop: 10 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #14284D" }}>
              <th style={{ padding: "7px 6px", textAlign: "left" }}>Source</th>
              {["Today", "7 days", "14 days"].map((w) => (
                <th key={w} colSpan={3} style={{ padding: "7px 6px", textAlign: "center", borderLeft: "1px solid #ece8da" }}>{w}</th>
              ))}
            </tr>
            <tr style={{ borderBottom: "1px solid #14284D", fontSize: 11.5, color: "#9a927c" }}>
              <th />
              {["today", "7d", "14d"].flatMap((g) => [
                <th key={`l${g}`} style={{ padding: "4px 6px", textAlign: "right", borderLeft: "1px solid #ece8da" }}>land</th>,
                <th key={`a${g}`} style={{ padding: "4px 6px", textAlign: "right" }}>age</th>,
                <th key={`d${g}`} style={{ padding: "4px 6px", textAlign: "right" }}>lead</th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {bySource.length === 0 && <tr><td colSpan={10} style={{ padding: "10px 6px", color: "#9a927c" }}>No landings in window.</td></tr>}
            {bySource.map((r) => (
              <tr key={String(r.src)} style={{ borderBottom: "1px solid #ece8da" }}>
                <td style={{ padding: "7px 6px", fontWeight: 600 }}>{String(r.src)}</td>
                <td style={cellR(true)}>{r.land_today}</td><td style={cellR()}>{r.age_today}</td><td style={cellR()}>{r.lead_today}</td>
                <td style={cellR(true)}>{r.land_7}</td><td style={cellR()}>{r.age_7}</td><td style={cellR()}>{r.lead_7}</td>
                <td style={cellR(true)}>{r.land_14}</td><td style={cellR()}>{r.age_14}</td><td style={cellR()}>{r.lead_14}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ChatGPT: landings + leads by term */}
      <div style={{ marginTop: 32 }}>
        <div style={labelCss}>ChatGPT — landings + leads by term (last 30 days · from flow_sessions)</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, marginTop: 10, maxWidth: 460 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #14284D" }}>
              <th style={{ padding: "7px 6px" }}>utm_term</th>
              <th style={{ padding: "7px 6px", textAlign: "right" }}>Landings</th>
              <th style={{ padding: "7px 6px", textAlign: "right" }}>Leads</th>
            </tr>
          </thead>
          <tbody>
            {chatgptByTerm.length === 0 && <tr><td colSpan={3} style={{ padding: "10px 6px", color: "#9a927c" }}>No ChatGPT landings in 30 days.</td></tr>}
            {chatgptByTerm.map((t) => (
              <tr key={t.term} style={{ borderBottom: "1px solid #ece8da" }}>
                <td style={{ padding: "7px 6px", wordBreak: "break-word" }}>{t.term}</td>
                <td style={cellR(true)}>{t.landings}</td>
                <td style={{ padding: "7px 6px", textAlign: "right", fontWeight: 700, color: t.leads === 0 ? "#c0392b" : "#14284D" }}>{t.leads}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const labelCss: React.CSSProperties = { fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "#9a927c", marginBottom: 6 };
const cellR = (strong = false): React.CSSProperties => ({ padding: "7px 6px", textAlign: "right", fontWeight: strong ? 700 : 400, color: strong ? "#14284D" : "#6b6756", borderLeft: strong ? "1px solid #ece8da" : undefined });
