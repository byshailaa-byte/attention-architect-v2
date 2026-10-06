"use client";
import type { Drip, Spend, Template } from "@/lib/admin/crm";
import { formatInr } from "@/lib/admin/crm";
import { T } from "../../crm-theme";
import { PreviewBanner, Toaster, previewToast } from "../../PreviewUI";

const STATUS_STYLE: Record<Template["status"], { label: string; color: string }> = {
  approved: { label: "Approved", color: T.successText },
  in_review: { label: "In review", color: T.label },
  rejected: { label: "Rejected", color: T.dangerText },
};
const CAT_LABEL = { utility: "Utility", marketing: "Marketing" } as const;

export function TemplatesView({ spend, drip, templates }: { spend: Spend; drip: Drip; templates: Template[] }) {
  const sectionLabel: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, letterSpacing: "0.12em", color: T.label };
  const panel: React.CSSProperties = { background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 14 };

  const statLine = (s: Template) => <span style={{ color: s.category === "utility" ? T.successText : T.warmText, fontWeight: 600, fontSize: 11.5 }}>{CAT_LABEL[s.category]} · {formatInr(s.costInr)}</span>;

  const DripSteps = () => (
    <>
      {/* desktop grid / mobile stack via flexWrap */}
      <div className="aa-drip-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12 }}>
        {drip.steps.map((s) => (
          <div key={s.order} style={{ border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.navy }}>{s.label}</div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{s.title}</div>
            <div style={{ fontSize: 12.5, color: T.text2, lineHeight: 1.4 }}>{s.description}</div>
            {statLine({ name: "", category: s.category, status: "approved", usedFor: "", costInr: s.costInr })}
            <div style={{ fontSize: 12, color: T.textRow, borderTop: `1px solid ${T.divider}`, paddingTop: 6 }}>
              Sent {s.stats.sent} · read {s.stats.read} · {s.order === 4 ? `“call me” ${s.stats.replied}` : `replied ${s.stats.replied}`}
            </div>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <>
      <PreviewBanner />
      <main style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18, color: T.text }} className="aa-tpl-main">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: T.FONT_HEAD, fontSize: 28, fontWeight: 600 }}>Templates and drip</h1>
            <div style={{ fontSize: 13.5, color: T.text2, marginTop: 4 }}>
              Sample numbers. Spend this month: <b style={{ color: T.text }}>{formatInr(spend.monthInr)}</b> · {spend.freeReplies.toLocaleString("en-IN")} free replies · {spend.usedReplies} used
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => previewToast("Preview data: not saved")} style={{ background: T.card, border: `1px solid ${T.inputBorder}`, borderRadius: 10, padding: "10px 14px", fontWeight: 600, fontSize: 14, cursor: "pointer", color: T.text }}>Sync status from Meta</button>
            <button onClick={() => previewToast("Preview data: not saved")} style={{ background: T.navy, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>+ New template</button>
          </div>
        </div>

        <section style={panel}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={sectionLabel}>DRIP AFTER THE REPORT · STOPS WHEN THEY REPLY, BUY, OR SEND STOP</div>
            <span style={{ fontSize: 12.5, fontWeight: 700, background: T.successBg, color: T.successText, borderRadius: 999, padding: "4px 10px" }}>On · {drip.parentsInIt} parents in it</span>
          </div>
          <DripSteps />
          <div style={{ fontSize: 12.5, color: T.text2 }}>A reply or a “Yes, call me” moves the parent into the Calls queue for today. Send window: 9 am – 8 pm IST only.</div>
        </section>

        <section style={{ ...panel, gap: 10 }}>
          <div style={sectionLabel}>TEMPLATES (APPROVED BY META)</div>
          {/* desktop table */}
          <div className="aa-tpl-table" style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr 0.8fr 2.4fr 0.8fr", fontSize: 13.5 }}>
            {["Name", "Type", "Status", "Used for", "Cost"].map((h) => (
              <div key={h} style={{ fontSize: 12, fontWeight: 700, color: T.text2, padding: "8px 0", borderBottom: `1px solid ${T.cardBorder}` }}>{h}</div>
            ))}
            {templates.map((t, i) => {
              const last = i === templates.length - 1;
              const cell: React.CSSProperties = { padding: "10px 0", borderBottom: last ? "none" : `1px solid ${T.divider}` };
              return (
                <div key={t.name} style={{ display: "contents" }}>
                  <div style={{ ...cell, fontWeight: 600 }}>{t.name}</div>
                  <div style={cell}>{CAT_LABEL[t.category]}</div>
                  <div style={{ ...cell, color: STATUS_STYLE[t.status].color, fontWeight: 600 }}>{STATUS_STYLE[t.status].label}</div>
                  <div style={{ ...cell, color: T.textRow }}>{t.usedFor}</div>
                  <div style={cell}>{formatInr(t.costInr)}</div>
                </div>
              );
            })}
          </div>
          {/* mobile cards */}
          <div className="aa-tpl-cards" style={{ display: "none", flexDirection: "column", gap: 10 }}>
            {templates.map((t) => (
              <div key={t.name} style={{ border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><b>{t.name}</b><span>{formatInr(t.costInr)}</span></div>
                <div style={{ fontSize: 13, color: T.text2 }}>{CAT_LABEL[t.category]} · <span style={{ color: STATUS_STYLE[t.status].color, fontWeight: 600 }}>{STATUS_STYLE[t.status].label}</span></div>
                <div style={{ fontSize: 13, color: T.textRow }}>{t.usedFor}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Toaster />
      <style>{`@media (max-width:767px){
        .aa-drip-grid{grid-template-columns:1fr!important}
        .aa-tpl-table{display:none!important}
        .aa-tpl-cards{display:flex!important}
      }`}</style>
    </>
  );
}
