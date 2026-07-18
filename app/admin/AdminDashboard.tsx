"use client";

import { useState, useMemo, useEffect, useRef } from "react";

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg:       "#0e0f11",
  card:     "#1a1b1f",
  border:   "#2a2b30",
  text:     "#e8e6f0",
  muted:    "#9c9aa8",
  yellow:   "#F6C63D",
  green:    "#4caf82",
  red:      "#e05252",
  blue:     "#5b9cf6",
  purple:   "#a78bfa",
} as const;

const BG = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";
const MONO = "'JetBrains Mono', 'Fira Code', monospace";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TierBreakdown = { tier: string; count: number; revenue_paise: number };

export type KpiData = {
  revenue_paise: number;
  paid_count: number;
  total_purchases: number;
  completed_count: number;
  top_archetype: string | null;
  tier_breakdown: TierBreakdown[];
};

export type AssessmentData = {
  id: string;
  session_id: string;
  child_name: string;
  parent_name: string | null;
  email: string | null;
  archetype: string | null;
  parent_pattern: string | null;
  age_band: string;
  created_at: string;
  resolved_answers: { id: string; question: string; answer: string }[];
  concerns: string[];
  tried: string[] | null;
  better: string[] | null;
  purchase_status: string | null;
  tier: string | null;
  amount_paise: number | null;
  purchased_at: string | null;
  lms_max_day: number | null;
};

export type ArchetypeCount = { archetype: string; count: number };

export type ActivityItem = {
  type: string;
  created_at: string;
  email: string | null;
  detail: string | null;
};

export type LmsRow = { week: number; day: number; user_count: number };

export type FunnelCounts = { assessment_started: number; report_viewed: number; filled_details: number };

export type FunnelEventCounts = {
  assessment_started: number;
  assessment_complete: number;
  generate_lead: number;
  report_view: number;
  begin_checkout: number;
  purchase: number;
};

export type DropOffRow = {
  session_id: string;
  last_event: string;
  last_seen: string;
  seconds_since: number;
  child_name: string | null;
  parent_name: string | null;
};

export type SessionEvent = {
  event_type: string;
  created_at: string;
  metadata: Record<string, unknown>;
};

export type AdminDashboardProps = {
  kpi: KpiData;
  assessments: AssessmentData[];
  archetypes: ArchetypeCount[];
  activity: ActivityItem[];
  lms: LmsRow[];
  funnelEvents: FunnelEventCounts;
  dropOffs: DropOffRow[];
  // legacy prop kept for compatibility — not used in new dashboard
  funnel?: FunnelCounts;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRs(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function fmtDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function timeBetween(a: string, b: string) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  const s = Math.round(ms / 1000);
  if (s < 2) return null;
  if (s < 60) return `+${s}s`;
  if (s < 3600) return `+${Math.floor(s / 60)}m`;
  return `+${Math.floor(s / 3600)}h`;
}

const TIER_LABEL: Record<string, string> = {
  module1: "Module 1",
  full: "Full Roadmap",
  topup: "Upgrade",
};

const EVENT_LABEL: Record<string, string> = {
  assessment_started: "Started assessment",
  assessment_dimension_complete: "Dimension complete",
  assessment_complete: "Assessment complete",
  report_gate_view: "Viewed report gate",
  generate_lead: "Filled details",
  report_view: "Viewed report",
  view_item: "Saw pricing",
  begin_checkout: "Opened checkout",
  purchase: "Purchased",
  lms_day_complete: "LMS day complete",
  lms_reflection_submitted: "LMS reflection",
  scroll_milestone: "Scroll milestone",
};

const EVENT_COLOR: Record<string, string> = {
  assessment_started: C.blue,
  assessment_dimension_complete: C.muted,
  assessment_complete: C.green,
  report_gate_view: C.muted,
  generate_lead: C.yellow,
  report_view: C.yellow,
  view_item: C.purple,
  begin_checkout: C.purple,
  purchase: C.green,
  lms_day_complete: C.blue,
  lms_reflection_submitted: C.blue,
  scroll_milestone: C.muted,
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "20px 24px", ...style }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, margin: "0 0 14px" }}>
      {children}
    </p>
  );
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <Card style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, margin: "0 0 10px" }}>{label}</p>
      <p style={{ fontFamily: BG, fontSize: 28, fontWeight: 800, color: accent ? C.yellow : C.text, margin: "0 0 4px", lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontFamily: MONO, fontSize: 11, color: C.muted, margin: 0 }}>{sub}</p>}
    </Card>
  );
}

function HBar({ label, count, max, color, pctOfPrev }: { label: string; count: number; max: number; color: string; pctOfPrev?: number | null }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, alignItems: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>{label}</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {pctOfPrev != null && (
            <span style={{ fontFamily: MONO, fontSize: 10, color: C.muted }}>
              {pctOfPrev}% of prev
            </span>
          )}
          <span style={{ fontFamily: MONO, fontSize: 11, color: C.text }}>{count}</span>
        </div>
      </div>
      <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

function ActivityDot({ type }: { type: string }) {
  const color = type === "purchase" ? C.green : type === "lms" ? C.blue : C.muted;
  return <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: color, marginRight: 8, flexShrink: 0, marginTop: 5 }} />;
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{ fontFamily: MONO, fontSize: 10, color, border: `1px solid ${color}30`, background: `${color}12`, borderRadius: 4, padding: "2px 7px", letterSpacing: "0.06em" }}>
      {text}
    </span>
  );
}

// ── Graphical Funnel ──────────────────────────────────────────────────────────

function FunnelChart({ stages }: { stages: { label: string; count: number; color: string }[] }) {
  const max = Math.max(...stages.map(s => s.count), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {stages.map((stage, i) => {
        const pctOfMax = max > 0 ? (stage.count / max) : 0;
        const pctOfPrev = i > 0 && stages[i - 1].count > 0
          ? Math.round((stage.count / stages[i - 1].count) * 100)
          : null;
        const barWidth = Math.max(pctOfMax * 100, 2);

        return (
          <div key={stage.label}>
            {i > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 14 }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: C.muted }}>
                  {pctOfPrev != null ? `↓ ${pctOfPrev}%` : "—"}
                </span>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, height: 32, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${barWidth}%`,
                  background: stage.color,
                  borderRadius: 4,
                  transition: "width 0.5s ease",
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 10,
                }}>
                  {barWidth > 15 && (
                    <span style={{ fontFamily: MONO, fontSize: 11, color: C.bg, fontWeight: 700, whiteSpace: "nowrap" }}>
                      {stage.count}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ minWidth: 140, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>{stage.label}</span>
                {barWidth <= 15 && (
                  <span style={{ fontFamily: MONO, fontSize: 11, color: C.text, marginLeft: 8 }}>{stage.count}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Session Timeline ──────────────────────────────────────────────────────────

function SessionTimeline({ sessionId }: { sessionId: string }) {
  const [events, setEvents] = useState<SessionEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    setLoading(true);
    fetch(`/api/admin/session-events/${sessionId}`)
      .then(r => r.json())
      .then((data: SessionEvent[]) => setEvents(data))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <p style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>Loading events…</p>;
  if (!events) return null;
  if (events.length === 0) return <p style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>No events recorded for this session.</p>;

  return (
    <div>
      {events.map((ev, i) => {
        const gap = i > 0 ? timeBetween(events[i - 1].created_at, ev.created_at) : null;
        const color = EVENT_COLOR[ev.event_type] ?? C.muted;
        const meta = Object.entries(ev.metadata ?? {}).filter(([, v]) => v !== null && v !== undefined);
        return (
          <div key={i}>
            {gap && (
              <div style={{ paddingLeft: 16, marginBottom: 2 }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: C.muted }}>{gap}</span>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 3 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: C.text }}>
                    {EVENT_LABEL[ev.event_type] ?? ev.event_type}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.muted, whiteSpace: "nowrap" }}>
                    {fmtDateTime(ev.created_at)}
                  </span>
                </div>
                {meta.length > 0 && (
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.muted }}>
                    {meta.map(([k, v]) => `${k}: ${v}`).join(" · ")}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Answers + Timeline Panel ──────────────────────────────────────────────────

function AnswersPanel({ assessment, onClose }: { assessment: AssessmentData; onClose: () => void }) {
  const [tab, setTab] = useState<"answers" | "timeline">("answers");

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40 }}
      />
      <div style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(600px, 94vw)",
        background: C.card,
        borderLeft: `1px solid ${C.border}`,
        overflowY: "auto",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ padding: "24px 28px 20px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
            <div>
              <p style={{ fontFamily: BG, fontWeight: 700, fontSize: 17, color: C.text, margin: "0 0 8px" }}>
                {assessment.child_name}
                {assessment.parent_name && (
                  <span style={{ fontFamily: MONO, fontWeight: 400, fontSize: 11, color: C.muted, marginLeft: 10 }}>
                    parent: {assessment.parent_name}
                  </span>
                )}
              </p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Badge text={assessment.archetype ?? "no archetype"} color={C.yellow} />
                <Badge text={assessment.age_band} color={C.blue} />
                {assessment.parent_pattern && <Badge text={assessment.parent_pattern} color={C.muted} />}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              {assessment.parent_name && (
                <a
                  href={`/report/${assessment.session_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ background: "none", border: `1px solid ${C.border}`, color: C.blue, borderRadius: 6, padding: "6px 12px", fontFamily: MONO, fontSize: 12, textDecoration: "none" }}
                >
                  Report →
                </a>
              )}
              <button
                onClick={onClose}
                style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontFamily: MONO, fontSize: 12 }}
              >
                Close
              </button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: (assessment.concerns ?? []).length > 0 ? 12 : 0 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>Email</span>
            {assessment.email ? (
              <span style={{ fontFamily: MONO, fontSize: 12, color: C.text }}>{assessment.email}</span>
            ) : (
              <span style={{ fontFamily: MONO, fontSize: 12, color: C.red }}>Not captured</span>
            )}
          </div>

          {(assessment.concerns ?? []).length > 0 && (
            <div>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Concerns</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7 }}>
                {assessment.concerns.map((c, i) => (
                  <span key={i} style={{ fontFamily: MONO, fontSize: 11, color: C.text, background: C.border, borderRadius: 4, padding: "3px 9px" }}>{c}</span>
                ))}
              </div>
            </div>
          )}

          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 0, marginTop: 16, borderBottom: `1px solid ${C.border}` }}>
            {(["answers", "timeline"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: tab === t ? `2px solid ${C.yellow}` : "2px solid transparent",
                  color: tab === t ? C.text : C.muted,
                  fontFamily: MONO,
                  fontSize: 11,
                  padding: "8px 16px",
                  cursor: "pointer",
                  textTransform: "capitalize",
                  letterSpacing: "0.06em",
                  marginBottom: -1,
                }}
              >
                {t === "timeline" ? "Event Timeline" : "Answers"}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 28px", flex: 1 }}>
          {tab === "timeline" ? (
            <SessionTimeline sessionId={assessment.session_id} />
          ) : (
            <>
              {assessment.resolved_answers.length > 0 ? (
                assessment.resolved_answers.map(({ id, question, answer }) => (
                  <div key={id} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
                    <p style={{ fontFamily: MONO, fontSize: 10, color: C.yellow, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 5px" }}>{id}</p>
                    <p style={{ fontSize: 13, color: C.muted, margin: "0 0 7px", lineHeight: 1.5 }}>{question}</p>
                    <p style={{ fontSize: 14, color: C.text, fontWeight: 600, margin: 0 }}>{answer}</p>
                  </div>
                ))
              ) : (
                <p style={{ fontFamily: MONO, fontSize: 12, color: C.muted }}>No answers recorded.</p>
              )}
              {(assessment.tried ?? []).length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontFamily: MONO, fontSize: 10, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 8px" }}>What They&apos;ve Tried</p>
                  {(assessment.tried ?? []).map((t, i) => (
                    <p key={i} style={{ fontSize: 13, color: C.text, margin: "0 0 4px" }}>· {t}</p>
                  ))}
                </div>
              )}
              {(assessment.better ?? []).length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontFamily: MONO, fontSize: 10, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 8px" }}>What &ldquo;Better&rdquo; Looks Like</p>
                  {(assessment.better ?? []).map((b, i) => (
                    <p key={i} style={{ fontSize: 13, color: C.text, margin: "0 0 4px" }}>· {b}</p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

type Section = "overview" | "funnel" | "journeys" | "dropoffs" | "lms" | "users" | "archetypes";

const NAV: { id: Section; label: string }[] = [
  { id: "overview",   label: "Overview" },
  { id: "funnel",     label: "Funnel" },
  { id: "journeys",   label: "User Journeys" },
  { id: "dropoffs",   label: "Drop-offs" },
  { id: "lms",        label: "LMS Activity" },
  { id: "users",      label: "Users" },
  { id: "archetypes", label: "Archetypes" },
];

export default function AdminDashboard({ kpi, assessments, archetypes, activity, lms, funnelEvents, dropOffs }: AdminDashboardProps) {
  const [active, setActive] = useState<Section>("overview");
  const [search, setSearch] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);

  const viewingAssessment = viewingId ? assessments.find(a => a.id === viewingId) ?? null : null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assessments;
    return assessments.filter(a =>
      a.child_name.toLowerCase().includes(q) ||
      (a.email ?? "").toLowerCase().includes(q) ||
      (a.parent_name ?? "").toLowerCase().includes(q) ||
      (a.archetype ?? "").toLowerCase().includes(q)
    );
  }, [assessments, search]);

  const lmsWeeks = useMemo(() => {
    const byWeek: Record<number, { day: number; user_count: number }[]> = {};
    for (const row of lms) {
      if (!byWeek[row.week]) byWeek[row.week] = [];
      byWeek[row.week].push({ day: row.day, user_count: row.user_count });
    }
    return Object.entries(byWeek).map(([week, days]) => ({ week: Number(week), days }));
  }, [lms]);

  const conversion = kpi.completed_count > 0
    ? Math.round((kpi.paid_count / kpi.completed_count) * 100)
    : 0;

  const funnelStages = [
    { label: "Started",     count: funnelEvents.assessment_started,  color: C.blue },
    { label: "Completed",   count: funnelEvents.assessment_complete,  color: C.blue },
    { label: "Filled details", count: funnelEvents.generate_lead,    color: C.yellow },
    { label: "Viewed report",  count: funnelEvents.report_view,      color: C.yellow },
    { label: "Checkout opened", count: funnelEvents.begin_checkout,  color: C.purple },
    { label: "Purchased",   count: funnelEvents.purchase,            color: C.green },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: BG, color: C.text }}>

      {/* Left Sidebar */}
      <aside style={{
        width: 200,
        flexShrink: 0,
        background: C.card,
        borderRight: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
      }}>
        <div style={{ padding: "24px 20px 16px" }}>
          <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, margin: "0 0 4px" }}>
            Attention Architect
          </p>
          <p style={{ fontFamily: BG, fontWeight: 800, fontSize: 15, color: C.text, margin: 0 }}>Admin</p>
        </div>

        <nav style={{ flex: 1, padding: "4px 12px" }}>
          {NAV.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: active === id ? `${C.yellow}18` : "none",
                border: "none",
                borderRadius: 6,
                color: active === id ? C.yellow : C.muted,
                fontFamily: MONO,
                fontSize: 12,
                padding: "9px 12px",
                cursor: "pointer",
                marginBottom: 2,
                fontWeight: active === id ? 700 : 400,
                letterSpacing: "0.04em",
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        <div style={{ padding: "12px 20px 20px" }}>
          <a
            href="/admin"
            style={{ fontFamily: MONO, fontSize: 10, color: C.muted, textDecoration: "none", display: "block", textAlign: "center", border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 0" }}
          >
            ↺ Refresh
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, minWidth: 0, padding: "32px 32px 64px", overflowX: "hidden" }}>

        {/* ── OVERVIEW ── */}
        {active === "overview" && (
          <div>
            <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: 20, color: C.text, margin: "0 0 24px" }}>Overview</h2>

            <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
              <KpiCard
                label="Total Revenue"
                value={fmtRs(kpi.revenue_paise)}
                sub={kpi.tier_breakdown.length > 0
                  ? kpi.tier_breakdown.map(t => `${TIER_LABEL[t.tier] ?? t.tier} ${fmtRs(t.revenue_paise)}`).join(" · ")
                  : undefined}
                accent
              />
              <KpiCard
                label="Paid Purchases"
                value={String(kpi.paid_count)}
                sub={kpi.tier_breakdown.length > 0
                  ? kpi.tier_breakdown.map(t => `${t.count} ${TIER_LABEL[t.tier] ?? t.tier}`).join(" · ")
                  : `${kpi.total_purchases} total incl. pending`}
              />
              <KpiCard label="Assessments Done" value={String(kpi.completed_count)} />
              <KpiCard label="Conversion" value={`${conversion}%`} sub="completed → paid" />
              <KpiCard label="Top Archetype" value={kpi.top_archetype ?? "—"} />
            </div>

            <Card style={{ marginBottom: 24 }}>
              <SectionLabel>Recent Activity</SectionLabel>
              {activity.length === 0 ? (
                <p style={{ fontFamily: MONO, fontSize: 12, color: C.muted }}>No activity yet.</p>
              ) : (
                activity.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", padding: "10px 0", borderBottom: i < activity.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <ActivityDot type={item.type} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>
                          {item.email ?? "—"}
                          {item.detail && <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginLeft: 10 }}>{item.detail}</span>}
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: C.muted, whiteSpace: "nowrap", flexShrink: 0 }}>
                          {fmtDateTime(item.created_at)}
                        </span>
                      </div>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.type}</span>
                    </div>
                  </div>
                ))
              )}
            </Card>
          </div>
        )}

        {/* ── FUNNEL ── */}
        {active === "funnel" && (
          <div>
            <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: 20, color: C.text, margin: "0 0 24px" }}>Funnel</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              {funnelStages.map((stage, i) => {
                const pctOfPrev = i > 0 && funnelStages[i - 1].count > 0
                  ? Math.round((stage.count / funnelStages[i - 1].count) * 100)
                  : null;
                return (
                  <Card key={stage.label}>
                    <p style={{ fontFamily: MONO, fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>{stage.label}</p>
                    <p style={{ fontFamily: BG, fontSize: 32, fontWeight: 800, color: stage.color, margin: "0 0 4px", lineHeight: 1 }}>{stage.count}</p>
                    {pctOfPrev != null && (
                      <p style={{ fontFamily: MONO, fontSize: 11, color: C.muted, margin: 0 }}>{pctOfPrev}% of previous stage</p>
                    )}
                  </Card>
                );
              })}
            </div>

            <Card>
              <SectionLabel>Funnel Flow</SectionLabel>
              <FunnelChart stages={funnelStages} />
            </Card>
          </div>
        )}

        {/* ── USER JOURNEYS ── */}
        {active === "journeys" && (
          <div>
            <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: 20, color: C.text, margin: "0 0 8px" }}>User Journeys</h2>
            <p style={{ fontFamily: MONO, fontSize: 11, color: C.muted, margin: "0 0 24px" }}>
              Click &ldquo;Answers →&rdquo; then open the Event Timeline tab to see per-session events.
            </p>
            <AssessmentsTable
              filtered={filtered}
              search={search}
              setSearch={setSearch}
              setViewingId={setViewingId}
            />
          </div>
        )}

        {/* ── DROP-OFFS ── */}
        {active === "dropoffs" && (
          <div>
            <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: 20, color: C.text, margin: "0 0 8px" }}>Drop-offs</h2>
            <p style={{ fontFamily: MONO, fontSize: 11, color: C.muted, margin: "0 0 24px" }}>
              Sessions that started but have no <code style={{ color: C.yellow }}>assessment_complete</code> event, last active &gt;30 min ago.
            </p>
            <Card>
              {dropOffs.length === 0 ? (
                <p style={{ fontFamily: MONO, fontSize: 12, color: C.muted }}>No drop-offs found — or funnel events are still propagating.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO, fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        {["Last Event", "Last Seen", "Child", "Parent", "Session"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "0 12px 10px 0", color: C.muted, fontWeight: 400, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dropOffs.map((row, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: "12px 12px 12px 0" }}>
                            <Badge text={EVENT_LABEL[row.last_event] ?? row.last_event} color={EVENT_COLOR[row.last_event] ?? C.muted} />
                          </td>
                          <td style={{ padding: "12px 12px 12px 0", color: C.muted, whiteSpace: "nowrap" }}>
                            {fmtDuration(row.seconds_since)}
                          </td>
                          <td style={{ padding: "12px 12px 12px 0", color: C.text }}>{row.child_name ?? <span style={{ color: C.border }}>—</span>}</td>
                          <td style={{ padding: "12px 12px 12px 0", color: C.muted }}>{row.parent_name ?? <span style={{ color: C.border }}>—</span>}</td>
                          <td style={{ padding: "12px 0 12px 0", color: C.muted, fontFamily: MONO, fontSize: 10 }}>
                            {row.session_id.slice(0, 8)}…
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── LMS ACTIVITY ── */}
        {active === "lms" && (
          <div>
            <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: 20, color: C.text, margin: "0 0 24px" }}>LMS Activity</h2>
            {lms.length === 0 ? (
              <Card>
                <p style={{ fontFamily: MONO, fontSize: 12, color: C.muted }}>No LMS progress recorded yet.</p>
              </Card>
            ) : (
              lmsWeeks.map(({ week, days }) => (
                <Card key={week} style={{ marginBottom: 16 }}>
                  <SectionLabel>Week {week}</SectionLabel>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {days.map(({ day, user_count }) => (
                      <div key={day} style={{ display: "flex", flexDirection: "column", alignItems: "center", background: C.border, borderRadius: 6, padding: "8px 14px" }}>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: C.muted, marginBottom: 4 }}>
                          {day === 0 ? "Review" : `Day ${day}`}
                        </span>
                        <span style={{ fontFamily: BG, fontWeight: 700, fontSize: 20, color: C.green }}>{user_count}</span>
                        <span style={{ fontFamily: MONO, fontSize: 9, color: C.muted }}>user{user_count !== 1 ? "s" : ""}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* ── USERS ── */}
        {active === "users" && (
          <div>
            <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: 20, color: C.text, margin: "0 0 24px" }}>Users</h2>
            <AssessmentsTable
              filtered={filtered}
              search={search}
              setSearch={setSearch}
              setViewingId={setViewingId}
            />
          </div>
        )}

        {/* ── ARCHETYPES ── */}
        {active === "archetypes" && (
          <div>
            <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: 20, color: C.text, margin: "0 0 24px" }}>Archetypes</h2>
            <Card>
              <SectionLabel>Distribution</SectionLabel>
              {archetypes.length === 0 ? (
                <p style={{ fontFamily: MONO, fontSize: 12, color: C.muted }}>No data yet.</p>
              ) : (
                archetypes.map(({ archetype, count }) => (
                  <HBar
                    key={archetype}
                    label={archetype}
                    count={count}
                    max={kpi.completed_count}
                    color={C.yellow}
                  />
                ))
              )}
            </Card>
          </div>
        )}

      </main>

      {/* Answers + Timeline Panel */}
      {viewingAssessment && (
        <AnswersPanel assessment={viewingAssessment} onClose={() => setViewingId(null)} />
      )}
    </div>
  );
}

// ── Assessments Table (shared between Users + Journeys) ───────────────────────

function AssessmentsTable({
  filtered,
  search,
  setSearch,
  setViewingId,
}: {
  filtered: AssessmentData[];
  search: string;
  setSearch: (v: string) => void;
  setViewingId: (id: string | null) => void;
}) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <SectionLabel>Assessments ({filtered.length})</SectionLabel>
        <input
          type="text"
          placeholder="Search name, email, archetype…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background: C.border,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: "7px 14px",
            fontFamily: MONO,
            fontSize: 12,
            color: C.text,
            outline: "none",
            width: 240,
          }}
        />
      </div>
      {filtered.length === 0 ? (
        <p style={{ fontFamily: MONO, fontSize: 12, color: C.muted }}>No results.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO, fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Child", "Parent", "Email", "Archetype", "Age", "Purchase", "LMS", "Date", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "0 12px 10px 0", color: C.muted, fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase", fontSize: 10, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "12px 12px 12px 0", color: C.text, fontWeight: 600, whiteSpace: "nowrap" }}>{a.child_name}</td>
                  <td style={{ padding: "12px 12px 12px 0", color: C.muted, whiteSpace: "nowrap" }}>
                    {a.parent_name ?? <span style={{ color: C.border }}>—</span>}
                  </td>
                  <td style={{ padding: "12px 12px 12px 0", whiteSpace: "nowrap" }}>
                    {a.email
                      ? <span style={{ color: C.muted }}>{a.email}</span>
                      : <span style={{ color: C.red }}>not captured</span>
                    }
                  </td>
                  <td style={{ padding: "12px 12px 12px 0", color: C.text, whiteSpace: "nowrap" }}>{a.archetype ?? "—"}</td>
                  <td style={{ padding: "12px 12px 12px 0", color: C.muted }}>{a.age_band}</td>
                  <td style={{ padding: "12px 12px 12px 0", whiteSpace: "nowrap" }}>
                    {a.purchase_status === "paid" ? (
                      <Badge text={`${TIER_LABEL[a.tier ?? ""] ?? a.tier ?? "paid"} · ${fmtRs(a.amount_paise ?? 0)}`} color={C.green} />
                    ) : (
                      <span style={{ color: C.muted }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 12px 12px 0", color: C.muted }}>
                    {(a.lms_max_day ?? 0) > 0 ? (
                      <span style={{ color: C.blue }}>W1 D{a.lms_max_day}</span>
                    ) : a.purchase_status === "paid" ? (
                      <span style={{ color: C.muted }}>not started</span>
                    ) : (
                      <span style={{ color: C.muted }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 12px 12px 0", color: C.muted, whiteSpace: "nowrap" }}>{fmtDate(a.created_at)}</td>
                  <td style={{ padding: "12px 0 12px 0", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => setViewingId(a.id)}
                        style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 5, padding: "4px 12px", cursor: "pointer", fontFamily: MONO, fontSize: 11 }}
                      >
                        Answers →
                      </button>
                      {a.parent_name ? (
                        <a
                          href={`/report/${a.session_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ background: "none", border: `1px solid ${C.border}`, color: C.blue, borderRadius: 5, padding: "4px 12px", fontFamily: MONO, fontSize: 11, textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                        >
                          Report →
                        </a>
                      ) : (
                        <span style={{ fontFamily: MONO, fontSize: 11, color: C.border, padding: "4px 0" }}>—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
