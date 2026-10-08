"use client";
import type { Lead, QueueTab, Stats } from "@/lib/admin/crm";
import { telLink, waLink, worryLabel } from "@/lib/admin/crm";
import { T, STAGE } from "../crm-theme";
import { Toaster } from "../PreviewUI";

// WhatsApp glyph (compact action button on phones, where a "WA" label reads as a typo).
function WaGlyph({ size = 18, fill = T.waText }: { size?: number; fill?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" style={{ display: "block" }}>
      <path fill={fill} d="M16.03 3C9.4 3 4.02 8.37 4.02 15c0 2.12.55 4.19 1.6 6.01L4 29l8.2-1.58A11.97 11.97 0 0 0 16.03 27C22.65 27 28.03 21.63 28.03 15S22.65 3 16.03 3zm0 21.9c-1.78 0-3.52-.48-5.04-1.38l-.36-.21-4.87.94.97-4.75-.24-.38A9.87 9.87 0 0 1 6.1 15c0-5.46 4.44-9.9 9.93-9.9s9.93 4.44 9.93 9.9-4.45 9.9-9.93 9.9zm5.44-7.42c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z" />
    </svg>
  );
}

const TABS: { key: QueueTab; label: string; count?: number }[] = [];

function tabList(stats: Stats): { key: QueueTab; label: string; count: number | null }[] {
  const s = stats.segments;
  if (s) {
    // Live data: tabs are segment filters (see lib/admin/call-queue.ts).
    return [
      { key: "due_today", label: "All due", count: stats.callsDue },
      { key: "callbacks", label: "Follow-ups", count: s.A },
      { key: "scheduled", label: "Scheduled", count: stats.scheduled ?? 0 },
      { key: "read_report", label: "Report sent", count: s.B + s.C },
      { key: "reached_plan", label: "Plan calls", count: s.D },
      { key: "interested", label: "Interested", count: null },
      { key: "done", label: "Done", count: null },
    ];
  }
  return [
    { key: "due_today", label: "Due today", count: stats.dueToday },
    { key: "replied", label: "Replied on WhatsApp", count: 2 },
    { key: "reached_plan", label: "Reached plan", count: stats.reachedPlanNotBought },
    { key: "read_report", label: "Read report", count: stats.readReportOnly },
    { key: "callbacks", label: "Callbacks", count: stats.callbacksThisWeek },
    { key: "interested", label: "Interested", count: 2 },
    { key: "done", label: "Done", count: null },
  ];
}
void TABS;

const GRID = "26px 1.1fr 1.3fr 1.2fr 1fr 0.9fr 1fr 1.4fr 150px";

export function CallsView({ stats, leads, tab, commit }: { stats: Stats; leads: Lead[]; tab: QueueTab; commit: string }) {
  const tabs = tabList(stats);
  const tile = (value: string, label: string, color: string) => (
    <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 26, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{value}</span>
      <span style={{ fontSize: 13, color: T.text2 }}>{label}</span>
    </div>
  );
  // Action controls live INSIDE the row link, so they are <button>s (not <a>s) to avoid an
  // invalid <a>-inside-<a> nesting (a React hydration error). preventDefault stops the row
  // link from also firing when a button is clicked.
  const btnCall = (l: Lead) => (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = telLink(l.phoneE164); }}
      style={{ background: T.navy, color: "#fff", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
    >Call</button>
  );
  const btnWa = (l: Lead) => (
    <button
      aria-label="WhatsApp"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(waLink(l.phoneE164), "_blank", "noopener"); }}
      style={{ background: T.wa, color: T.waText, border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
    >WhatsApp</button>
  );

  const seg = stats.segments;
  return (
    <>
      {/* DESKTOP */}
      <main className="aa-calls-desktop" style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18, minWidth: 0, color: T.text }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: T.label }}>CALLS</div>
            <h1 style={{ margin: "2px 0 0", fontFamily: T.FONT_HEAD, fontSize: 30, fontWeight: 600 }}>Who to call today</h1>
          </div>
          <span style={{ fontSize: 13, color: T.text2 }}>Sorted by how close each parent got to buying · test traffic hidden</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12 }}>
          {seg ? (
            <>
              {tile(String(seg.A), "Follow-up due today", T.warmText)}
              {tile(String(seg.B), "New report, not bought", T.navy)}
              {tile(String(seg.C), "Report ageing (2–14d)", T.navy)}
              {tile(String(seg.D), "Plan calls (₹4,999)", T.navy)}
              {tile(String(seg.E), "Paid but stuck", T.successText)}
            </>
          ) : (
            <>
              {tile(String(stats.dueToday), "Due today", T.warmText)}
              {tile(String(stats.reachedPlanNotBought), "Reached the plan, not bought", T.navy)}
              {tile(String(stats.readReportOnly), "Read the report only", T.navy)}
              {tile(String(stats.callbacksThisWeek), "Callbacks this week", T.navy)}
              {tile(`${stats.boughtThisMonth} / ${stats.calledThisMonth}`, "Bought / called this month", T.successText)}
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tabs.map((t) => {
            const active = t.key === tab;
            return (
              <a key={t.key} href={`/admin/calls?tab=${t.key}`} style={{
                padding: "7px 12px", borderRadius: 999, fontSize: 13.5, fontWeight: 600, textDecoration: "none",
                background: active ? T.navy : T.card, color: active ? "#fff" : T.navy, border: active ? "none" : `1px solid ${T.inputBorder}`,
              }}>{t.label}{t.count != null ? ` · ${t.count}` : ""}</a>
            );
          })}
          <a href="/admin/calls?view=contacts" style={{
            padding: "7px 12px", borderRadius: 999, fontSize: 13.5, fontWeight: 600, textDecoration: "none",
            background: T.card, color: T.navy, border: `1px dashed ${T.inputBorder}`,
          }}>All contacts</a>
        </div>

        <section style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 12, padding: "10px 16px", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.08em", color: T.muted, textTransform: "uppercase" }}>
            <span></span><span>Parent</span><span>Child</span><span>Type · worry</span><span>How far</span><span>Follow up</span><span>Status</span><span>Last note</span><span></span>
          </div>
          {leads.length === 0 && <div style={{ padding: "18px 16px", color: T.text2, fontSize: 14, borderTop: `1px solid ${T.cardBorder}` }}>Nothing here.</div>}
          {leads.map((l) => {
            const st = STAGE[l.stage];
            const highlight = l.stage === "replied";
            return (
              <a key={l.id} href={`/admin/calls/${l.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 12, alignItems: "center", padding: "12px 16px", borderTop: `1px solid ${T.cardBorder}`, fontSize: 14, background: highlight ? T.rowHighlight : undefined }}>
                  <span style={{ width: 16, height: 16, border: `1.5px solid ${T.checkbox}`, borderRadius: 4 }}></span>
                  <span style={{ fontWeight: 600 }}>{l.parentName}</span>
                  <span style={{ color: T.textRow }}>{l.childName}, {l.ageBand}</span>
                  <span style={{ color: T.text2 }}>{l.typeName} · {worryLabel(l.worry)}</span>
                  <span><span style={{ fontSize: 12, fontWeight: 600, background: st.bg, color: st.fg, borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>{st.label}</span></span>
                  <span style={{ fontWeight: 600, color: l.followUpUrgent ? T.warmText : T.text }}>{l.followUpDue}</span>
                  <span>{l.status}</span>
                  <span style={{ color: T.text2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.lastNote}</span>
                  <span style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>{btnCall(l)}{btnWa(l)}</span>
                </div>
              </a>
            );
          })}
        </section>
      </main>

      {/* MOBILE */}
      <main className="aa-calls-mobile" style={{ display: "none", padding: "16px", flexDirection: "column", gap: 14, color: T.text }}>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.12em", color: T.label }}>CALLS</div>
          <h1 style={{ margin: "2px 0 6px", fontFamily: T.FONT_HEAD, fontSize: 24, fontWeight: 600 }}>Who to call today</h1>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.warmText }}>Today: {stats.dueToday} due</div>
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, WebkitOverflowScrolling: "touch" }}>
          {tabs.map((t) => (
            <a key={t.key} href={`/admin/calls?tab=${t.key}`} style={{ flex: "0 0 auto", padding: "7px 12px", borderRadius: 999, fontSize: 13.5, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap", background: t.key === tab ? T.navy : T.card, color: t.key === tab ? "#fff" : T.navy, border: t.key === tab ? "none" : `1px solid ${T.inputBorder}` }}>{t.label}{t.count != null ? ` · ${t.count}` : ""}</a>
          ))}
          <a href="/admin/calls?view=contacts" style={{ flex: "0 0 auto", padding: "7px 12px", borderRadius: 999, fontSize: 13.5, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap", background: T.card, color: T.navy, border: `1px dashed ${T.inputBorder}` }}>All contacts</a>
        </div>
        {leads.map((l) => {
          const st = STAGE[l.stage];
          return (
            <div key={l.id} style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <a href={`/admin/calls/${l.id}`} style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{l.parentName}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, background: st.bg, color: st.fg, borderRadius: 999, padding: "3px 9px" }}>{st.label}</span>
                </div>
                <div style={{ color: T.textRow, fontSize: 14 }}>{l.childName}, {l.ageBand} · {l.typeName} · {worryLabel(l.worry)}</div>
                <div style={{ fontSize: 13, color: l.followUpUrgent ? T.warmText : T.text2, fontWeight: 600 }}>{l.followUpDue !== "—" ? l.followUpDue : l.status}</div>
              </a>
              <div style={{ display: "flex", gap: 8 }}>
                <a href={telLink(l.phoneE164)} style={{ flex: 1, textAlign: "center", background: T.navy, color: "#fff", borderRadius: 10, padding: "11px", fontWeight: 700, textDecoration: "none" }}>Call</a>
                <a href={waLink(l.phoneE164)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" style={{ background: T.wa, color: T.waText, borderRadius: 10, padding: "11px 16px", display: "flex", alignItems: "center" }}><WaGlyph size={20} /></a>
              </div>
            </div>
          );
        })}
      </main>
      <div style={{ padding: "4px 28px 22px", fontSize: 12, color: T.muted }}>Source: live · {commit}</div>
      <Toaster />
      <style>{`@media (max-width:767px){.aa-calls-desktop{display:none!important}.aa-calls-mobile{display:flex!important}}`}</style>
    </>
  );
}
