"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Lead, QueueTab, CallOutcome, LeadStatus, Objection } from "@/lib/admin/crm";
import { getCrmSource, telLink, waLink, maskPhone } from "@/lib/admin/crm";
import { T, STAGE } from "../../crm-theme";
import { PreviewBanner, Toaster, previewToast } from "../../PreviewUI";

const OUTCOMES: { k: CallOutcome; label: string }[] = [
  { k: "connected", label: "Connected" }, { k: "no_answer", label: "No answer" },
  { k: "call_back", label: "Call back later" }, { k: "wrong_number", label: "Wrong number" },
];
const STATUSES: { k: LeadStatus; label: string }[] = [
  { k: "interested", label: "Interested" }, { k: "thinking", label: "Thinking" },
  { k: "bought", label: "Bought" }, { k: "not_now", label: "Not for now" },
];
const OBJECTIONS: { k: Objection; label: string }[] = [
  { k: "price", label: "Price" }, { k: "time", label: "Time" }, { k: "will_it_work", label: "Will it work?" },
  { k: "ask_spouse", label: "Ask spouse" }, { k: "later", label: "Later" }, { k: "other", label: "Other" },
];

export function CallScreen({ lead, tab, nextId }: { lead: Lead; tab: QueueTab; nextId: string | null }) {
  const router = useRouter();
  const r = lead.report;
  const [outcome, setOutcome] = useState<CallOutcome>("connected");
  const [status, setStatus] = useState<LeadStatus>("interested");
  const [objection, setObjection] = useState<Objection | null>("ask_spouse");
  const [note, setNote] = useState("Liked the calls idea. Wants to show her husband the plan. Send the summary on WhatsApp tonight.");
  const [followUp, setFollowUp] = useState("In 3 days");

  const quick = useMemo(() => ({
    "First message": `Hi ${lead.parentName}, this is Shashank from Attention Architect. As promised, here's ${lead.childName}'s plan in short: …`,
    "Missed call": `Hi ${lead.parentName}, tried calling about ${lead.childName}'s plan — when's a good time today?`,
    "Summary for spouse": `Hi ${lead.parentName}, this is Shashank from Attention Architect. As promised, here's ${lead.childName}'s plan in short, to share with your husband: …`,
    "Plan link": `Here's ${lead.childName}'s plan: attentionparents…/r/•••• `,
  }), [lead]);
  const [waKey, setWaKey] = useState<keyof typeof quick>("Summary for spouse");
  const waText = quick[waKey];

  const chip = (active: boolean): React.CSSProperties => ({
    padding: "8px 12px", borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: "pointer", userSelect: "none",
    background: active ? T.navy : T.card, color: active ? "#fff" : T.navy, border: active ? "none" : `1px solid ${T.inputBorder}`,
  });
  const sublabel: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: T.textRow, marginTop: 4 };
  const sectionLabel: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, letterSpacing: "0.12em", color: T.label };
  const panel: React.CSSProperties = { background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 12 };

  const openWhatsApp = () => { previewToast("WhatsApp opened"); window.open(waLink(lead.phoneE164, waText), "_blank", "noopener"); };
  const saveNext = async () => {
    await getCrmSource().logCall({ leadId: lead.id, outcome, status, objection: objection ?? undefined, note, nextFollowUp: followUp });
    previewToast("Preview data: not saved");
    setTimeout(() => router.push(nextId ? `/admin/calls/${nextId}?tab=${tab}` : `/admin/calls?tab=${tab}`), 400);
  };

  const Pills = () => (
    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
      {lead.stage === "replied" && <span style={{ fontSize: 12, fontWeight: 600, background: STAGE.replied.bg, color: STAGE.replied.fg, borderRadius: 999, padding: "3px 9px" }}>Replied on WhatsApp</span>}
      <span style={{ fontSize: 12, fontWeight: 600, background: STAGE.reached_plan.bg, color: STAGE.reached_plan.fg, borderRadius: 999, padding: "3px 9px" }}>Reached plan</span>
      <span style={{ fontSize: 12, fontWeight: 600, background: T.greyBg, color: T.greyText, borderRadius: 999, padding: "3px 9px" }}>Lead {lead.leadAt}</span>
    </div>
  );

  const TalkingPoints = () => (
    <section style={panel}>
      <div style={sectionLabel}>TALKING POINTS, FROM {lead.childName.toUpperCase()}’S REPORT</div>
      <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "10px 16px", fontSize: 14.5, lineHeight: 1.45 }}>
        <span style={{ color: T.text2 }}>Worry</span><span>{r.worry}</span>
        <span style={{ color: T.text2 }}>Can focus when</span><span>{r.focusWhen}</span>
        <span style={{ color: T.text2 }}>The hard part</span><span><b>{r.hardPart}</b></span>
        <span style={{ color: T.text2 }}>Tonight’s step</span><span>{r.tonightStep}</span>
        <span style={{ color: T.text2 }}>Parent instinct</span><span>{r.parentInstinct} <span style={{ color: T.muted }}>(don’t name it on the call)</span></span>
        <span style={{ color: T.text2 }}>Type · age</span><span>{r.typeName} · {r.ageBand} · goal: {r.goal}</span>
      </div>
    </section>
  );

  const Timeline = () => (
    <section style={panel}>
      <div style={sectionLabel}>WHAT {lead.parentName.toUpperCase()} DID</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {lead.timeline.map((t, i) => (
          <div key={i} style={{ display: "flex", gap: 10, fontSize: 13.5 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.checkbox, marginTop: 6, flexShrink: 0 }}></span>
            <span><b style={{ fontWeight: 600 }}>{t.at}</b> · <span style={{ color: T.textRow }}>{t.text}</span></span>
          </div>
        ))}
      </div>
    </section>
  );

  const LogCall = () => (
    <section style={panel}>
      <div style={sectionLabel}>LOG THIS CALL</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {OUTCOMES.map((o) => <span key={o.k} style={chip(outcome === o.k)} onClick={() => setOutcome(o.k)}>{o.label}</span>)}
      </div>
      <div style={sublabel}>Where are they now?</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {STATUSES.map((s) => <span key={s.k} style={chip(status === s.k)} onClick={() => setStatus(s.k)}>{s.label}</span>)}
      </div>
      <div style={sublabel}>What’s holding them back?</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {OBJECTIONS.map((o) => <span key={o.k} style={chip(objection === o.k)} onClick={() => setObjection(objection === o.k ? null : o.k)}>{o.label}</span>)}
      </div>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} style={{ border: `1px solid ${T.inputBorder}`, borderRadius: 12, padding: "10px 12px", fontSize: 14, color: T.textRow, minHeight: 64, fontFamily: "inherit", resize: "vertical", background: T.card }} />
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.textRow }}>Next follow-up</span>
        {["Tomorrow", "In 3 days", "Pick date"].map((f) => <span key={f} style={chip(followUp === f)} onClick={() => setFollowUp(f)}>{f}</span>)}
      </div>
      <button onClick={saveNext} style={{ background: T.amber, color: T.navy, border: "none", borderRadius: 12, padding: 12, fontWeight: 700, textAlign: "center", cursor: "pointer", fontSize: 14 }}>Save and next parent →</button>
    </section>
  );

  const QuickWa = () => (
    <section style={panel}>
      <div style={sectionLabel}>QUICK WHATSAPP</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: T.textRow, background: T.chipFill, borderRadius: 12, padding: "10px 12px" }}>{waText}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(Object.keys(quick) as (keyof typeof quick)[]).map((k) => <span key={k} style={chip(waKey === k)} onClick={() => setWaKey(k)}>{k}</span>)}
      </div>
    </section>
  );

  const Header = () => (
    <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div>
        <a href={`/admin/calls?tab=${tab}`} style={{ fontSize: 13, color: T.text2, textDecoration: "none" }}>← Calls · Due today</a>
        <h1 style={{ margin: "4px 0 0", fontFamily: T.FONT_HEAD, fontSize: 28, fontWeight: 600 }}>{lead.parentName} · {lead.parentRelation}</h1>
        <Pills />
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{maskPhone(lead.phoneE164)}</span>
        <a href={telLink(lead.phoneE164)} style={{ background: T.navy, color: "#fff", borderRadius: 10, padding: "11px 18px", fontWeight: 700, textDecoration: "none" }}>Call</a>
        <button onClick={openWhatsApp} style={{ background: T.wa, color: T.waText, border: "none", borderRadius: 10, padding: "11px 18px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>WhatsApp</button>
        <a href={`/report/${lead.reportId}`} target="_blank" rel="noopener noreferrer" style={{ background: T.card, border: `1px solid ${T.inputBorder}`, borderRadius: 10, padding: "11px 14px", fontWeight: 600, textDecoration: "none", color: T.text }}>Open report ↗</a>
      </div>
    </div>
  );

  return (
    <>
      <PreviewBanner />
      {/* DESKTOP */}
      <main className="aa-call-desktop" style={{ padding: "24px 28px", display: "grid", gridTemplateColumns: "minmax(0, 1fr) 420px", gap: 20, alignContent: "start", color: T.text }}>
        <Header />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}><TalkingPoints /><Timeline /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}><LogCall /><QuickWa /></div>
      </main>

      {/* MOBILE */}
      <main className="aa-call-mobile" style={{ display: "none", padding: 16, flexDirection: "column", gap: 14, color: T.text, paddingBottom: 92 }}>
        <Header />
        <TalkingPoints />
        <LogCall />
        <QuickWa />
        <Timeline />
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, padding: "10px 16px calc(10px + env(safe-area-inset-bottom))", background: T.page, borderTop: `1px solid ${T.cardBorder}` }}>
          <button onClick={saveNext} style={{ width: "100%", background: T.amber, color: T.navy, border: "none", borderRadius: 12, padding: 14, fontWeight: 700, cursor: "pointer", fontSize: 15 }}>Save and next parent →</button>
        </div>
      </main>
      <Toaster />
      <style>{`@media (max-width:767px){.aa-call-desktop{display:none!important}.aa-call-mobile{display:flex!important}}`}</style>
    </>
  );
}
