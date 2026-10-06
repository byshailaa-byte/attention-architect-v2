"use client";
import type { Lead, QueueTab, Stats } from "@/lib/admin/crm";
import { telLink, waLink } from "@/lib/admin/crm";
import { T, STAGE } from "../crm-theme";
import { PreviewBanner, Toaster } from "../PreviewUI";

const TABS: { key: QueueTab; label: string; count?: number }[] = [];

function tabList(stats: Stats): { key: QueueTab; label: string; count: number | null }[] {
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

export function CallsView({ stats, leads, tab }: { stats: Stats; leads: Lead[]; tab: QueueTab }) {
  const tabs = tabList(stats);
  const tile = (value: string, label: string, color: string) => (
    <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 26, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{value}</span>
      <span style={{ fontSize: 13, color: T.text2 }}>{label}</span>
    </div>
  );
  const btnCall = (l: Lead) => (
    <a href={telLink(l.phoneE164)} style={{ background: T.navy, color: "#fff", borderRadius: 8, padding: "6px 10px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Call</a>
  );
  const btnWa = (l: Lead, label = "WhatsApp") => (
    <a href={waLink(l.phoneE164)} target="_blank" rel="noopener noreferrer" style={{ background: T.wa, color: T.waText, borderRadius: 8, padding: "6px 10px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>{label}</a>
  );

  return (
    <>
      <PreviewBanner />
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
          {tile(String(stats.dueToday), "Due today", T.warmText)}
          {tile(String(stats.reachedPlanNotBought), "Reached the plan, not bought", T.navy)}
          {tile(String(stats.readReportOnly), "Read the report only", T.navy)}
          {tile(String(stats.callbacksThisWeek), "Callbacks this week", T.navy)}
          {tile(`${stats.boughtThisMonth} / ${stats.calledThisMonth}`, "Bought / called this month", T.successText)}
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
                  <span style={{ color: T.text2 }}>{l.typeName} · {l.worry}</span>
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
                <div style={{ color: T.textRow, fontSize: 14 }}>{l.childName}, {l.ageBand} · {l.typeName} · {l.worry}</div>
                <div style={{ fontSize: 13, color: l.followUpUrgent ? T.warmText : T.text2, fontWeight: 600 }}>{l.followUpDue !== "—" ? l.followUpDue : l.status}</div>
              </a>
              <div style={{ display: "flex", gap: 8 }}>
                <a href={telLink(l.phoneE164)} style={{ flex: 1, textAlign: "center", background: T.navy, color: "#fff", borderRadius: 10, padding: "11px", fontWeight: 700, textDecoration: "none" }}>Call</a>
                <a href={waLink(l.phoneE164)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" style={{ background: T.wa, color: T.waText, borderRadius: 10, padding: "11px 16px", fontWeight: 700, textDecoration: "none" }}>WA</a>
              </div>
            </div>
          );
        })}
      </main>
      <Toaster />
      <style>{`@media (max-width:767px){.aa-calls-desktop{display:none!important}.aa-calls-mobile{display:flex!important}}`}</style>
    </>
  );
}
