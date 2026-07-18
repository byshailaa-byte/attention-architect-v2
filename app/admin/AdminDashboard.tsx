"use client";

import { useState, useMemo } from "react";

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
} as const;

const BG = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";
const MONO = "'JetBrains Mono', 'Fira Code', monospace";

// ── Types ─────────────────────────────────────────────────────────────────────

export type KpiData = {
  revenue_paise: number;
  paid_count: number;
  total_purchases: number;
  completed_count: number;
  top_archetype: string | null;
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

export type FunnelCounts = { assessment_started: number; report_viewed: number };

export type AdminDashboardProps = {
  kpi: KpiData;
  assessments: AssessmentData[];
  archetypes: ArchetypeCount[];
  activity: ActivityItem[];
  lms: LmsRow[];
  funnel: FunnelCounts;
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

const TIER_LABEL: Record<string, string> = {
  module1: "Module 1",
  full: "Full Roadmap",
  topup: "Upgrade",
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

function FunnelBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.text }}>{count} <span style={{ color: C.muted }}>({pct}%)</span></span>
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

// ── Answers Modal ─────────────────────────────────────────────────────────────

function AnswersPanel({ assessment, onClose }: { assessment: AssessmentData; onClose: () => void }) {
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
        width: "min(560px, 92vw)",
        background: C.card,
        borderLeft: `1px solid ${C.border}`,
        overflowY: "auto",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
      }}>
        <div style={{ padding: "24px 28px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontFamily: BG, fontWeight: 700, fontSize: 17, color: C.text, margin: "0 0 4px" }}>{assessment.child_name}</p>
            <p style={{ fontFamily: MONO, fontSize: 11, color: C.muted, margin: 0 }}>
              {assessment.archetype ?? "—"} · {assessment.age_band} · {assessment.email ?? "no email"}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontFamily: MONO, fontSize: 12 }}
          >
            Close
          </button>
        </div>

        <div style={{ padding: "20px 28px", flex: 1 }}>
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

          {(assessment.concerns ?? []).length > 0 && (
            <div style={{ marginTop: 8 }}>
              <p style={{ fontFamily: MONO, fontSize: 10, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 8px" }}>Parent Concerns</p>
              {assessment.concerns.map((c, i) => (
                <p key={i} style={{ fontSize: 13, color: C.text, margin: "0 0 4px" }}>· {c}</p>
              ))}
            </div>
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
        </div>
      </div>
    </>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function AdminDashboard({ kpi, assessments, archetypes, activity, lms, funnel }: AdminDashboardProps) {
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

  // Funnel data — show real counts for stages that have data; fall back to DB counts for others
  const funnelStages = [
    { label: "Started assessment", count: funnel.assessment_started, note: funnel.assessment_started === 0 ? "instrumentation new" : null },
    { label: "Completed assessment", count: kpi.completed_count, note: null },
    { label: "Viewed report", count: funnel.report_viewed, note: funnel.report_viewed === 0 ? "instrumentation new" : null },
    { label: "Purchased", count: kpi.paid_count, note: null },
  ];
  const funnelMax = Math.max(...funnelStages.map(s => s.count), 1);
  const funnelColors = [C.blue, C.green, C.yellow, C.yellow];

  // LMS: group by week
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

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: BG, color: C.text }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, margin: "0 0 4px" }}>
            Attention Architect · Admin
          </p>
          <h1 style={{ fontFamily: BG, fontWeight: 800, fontSize: 22, color: C.text, margin: 0 }}>Dashboard</h1>
        </div>
        <a
          href="/admin"
          style={{ fontFamily: MONO, fontSize: 11, color: C.muted, textDecoration: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 14px" }}
        >
          ↺ Refresh
        </a>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 32px 64px" }}>

        {/* KPI Row */}
        <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
          <KpiCard label="Total Revenue" value={fmtRs(kpi.revenue_paise)} accent />
          <KpiCard label="Paid Purchases" value={String(kpi.paid_count)} sub={`${kpi.total_purchases} total incl. pending`} />
          <KpiCard label="Assessments Done" value={String(kpi.completed_count)} />
          <KpiCard label="Conversion" value={`${conversion}%`} sub="completed → paid" />
          <KpiCard label="Top Archetype" value={kpi.top_archetype ?? "—"} />
        </div>

        {/* Funnel + Archetype Distribution */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
          {/* Funnel */}
          <Card>
            <SectionLabel>Acquisition Funnel</SectionLabel>
            {funnelStages.map(({ label, count, note }, i) => (
              <div key={label}>
                <FunnelBar label={label} count={count} max={funnelMax} color={funnelColors[i]} />
                {note && (
                  <p style={{ fontFamily: MONO, fontSize: 10, color: C.muted, margin: "-8px 0 14px", fontStyle: "italic" }}>
                    ({note})
                  </p>
                )}
              </div>
            ))}
          </Card>

          {/* Archetype Distribution */}
          <Card>
            <SectionLabel>Archetype Distribution</SectionLabel>
            {archetypes.length === 0 ? (
              <p style={{ fontFamily: MONO, fontSize: 12, color: C.muted }}>No data yet.</p>
            ) : (
              archetypes.map(({ archetype, count }) => {
                const pct = kpi.completed_count > 0 ? Math.round((count / kpi.completed_count) * 100) : 0;
                return (
                  <div key={archetype} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>{archetype}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: C.text }}>{count} <span style={{ color: C.muted }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: C.yellow, borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })
            )}
          </Card>
        </div>

        {/* LMS Activity */}
        {lms.length > 0 && (
          <Card style={{ marginBottom: 32 }}>
            <SectionLabel>LMS Progress</SectionLabel>
            {lmsWeeks.map(({ week, days }) => (
              <div key={week} style={{ marginBottom: 12 }}>
                <p style={{ fontFamily: MONO, fontSize: 11, color: C.muted, margin: "0 0 8px" }}>Week {week}</p>
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
              </div>
            ))}
          </Card>
        )}

        {/* Recent Activity */}
        <Card style={{ marginBottom: 32 }}>
          <SectionLabel>Recent Activity</SectionLabel>
          {activity.length === 0 ? (
            <p style={{ fontFamily: MONO, fontSize: 12, color: C.muted }}>No activity yet.</p>
          ) : (
            <div>
              {activity.map((item, i) => (
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
              ))}
            </div>
          )}
        </Card>

        {/* Assessments Table */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <SectionLabel>Assessments ({filtered.length})</SectionLabel>
            <input
              type="text"
              placeholder="Search by name, email, archetype…"
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
                width: 260,
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
                    {["Child", "Parent / Email", "Archetype", "Age", "Purchase", "LMS", "Date", ""].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "0 12px 10px 0", color: C.muted, fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase", fontSize: 10, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => (
                    <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "12px 12px 12px 0", color: C.text, fontWeight: 600, whiteSpace: "nowrap" }}>{a.child_name}</td>
                      <td style={{ padding: "12px 12px 12px 0", color: C.muted, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {a.parent_name && <span style={{ color: C.text }}>{a.parent_name} · </span>}
                        {a.email ?? "—"}
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
                        <button
                          onClick={() => setViewingId(a.id)}
                          style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 5, padding: "4px 12px", cursor: "pointer", fontFamily: MONO, fontSize: 11 }}
                        >
                          Answers →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Answers Panel */}
      {viewingAssessment && (
        <AnswersPanel assessment={viewingAssessment} onClose={() => setViewingId(null)} />
      )}
    </div>
  );
}
