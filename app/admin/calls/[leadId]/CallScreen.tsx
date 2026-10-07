"use client";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Lead, QueueTab } from "@/lib/admin/crm";
import { telLink, waLink } from "@/lib/admin/crm";
import { followUpRequired, type CallLogOutcome } from "@/lib/admin/call-queue";
import { T, STAGE } from "../../crm-theme";
import { Toaster, previewToast } from "../../PreviewUI";

// The eight call_log outcomes (lib/admin/call-queue.ts). Stored verbatim; drives the queue.
const OUTCOMES: { k: CallLogOutcome; label: string }[] = [
  { k: "interested", label: "Interested" }, { k: "callback", label: "Call back" },
  { k: "purchased", label: "Purchased" }, { k: "not_interested", label: "Not interested" },
  { k: "no_answer", label: "No answer" }, { k: "busy", label: "Busy" },
  { k: "wrong_number", label: "Wrong number" }, { k: "do_not_call", label: "Do not call" },
];

// Local YYYY-MM-DD, n days from today — for the quick follow-up chips.
function dateInDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CallScreen({ lead, tab, nextId }: { lead: Lead; tab: QueueTab; nextId: string | null }) {
  const router = useRouter();
  const r = lead.report;
  const [outcome, setOutcome] = useState<CallLogOutcome>("interested");
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState(""); // YYYY-MM-DD or ""
  const [saving, setSaving] = useState(false);

  // interested / callback must schedule the next call — default to tomorrow (11:00 IST applied at
  // submit). Set in an effect (not useState init) to avoid an SSR/client hydration mismatch.
  const mustFollowUp = followUpRequired(outcome);
  useEffect(() => {
    if (mustFollowUp && !followUp) setFollowUp(dateInDays(1));
  }, [mustFollowUp, followUp]);

  const quick = useMemo(() => ({
    "First message": `Hi ${lead.parentName}, this is Shashank from Attention Architect. As promised, here's ${lead.childName}'s plan in short: …`,
    "Missed call": `Hi ${lead.parentName}, tried calling about ${lead.childName}'s plan — when's a good time today?`,
    "Summary for spouse": `Hi ${lead.parentName}, this is Shashank from Attention Architect. As promised, here's ${lead.childName}'s plan in short, to share with your family: …`,
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

  const openWhatsApp = () => { window.open(waLink(lead.phoneE164, waText), "_blank", "noopener"); };

  const saveNext = async () => {
    if (saving) return;
    if (mustFollowUp && !followUp) { previewToast("Pick a follow-up date for interested/callback"); return; }
    setSaving(true);
    const followUpAt = followUp ? `${followUp}T11:00:00+05:30` : null; // 11:00 IST
    try {
      const res = await fetch("/api/admin/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, outcome, notes: note || undefined, followUpAt }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; enabled?: boolean };
      if (res.ok && data.ok) previewToast("Call logged");
      else if (res.ok && data.enabled === false) previewToast("Call logging not enabled yet");
      else previewToast("Couldn't save the call");
    } catch {
      previewToast("Couldn't save the call");
    }
    setTimeout(() => router.push(nextId ? `/admin/calls/${nextId}?tab=${tab}` : `/admin/calls?tab=${tab}`), 500);
  };

  const Pills = () => (
    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
      {lead.stage === "replied" && <span style={{ fontSize: 12, fontWeight: 600, background: STAGE.replied.bg, color: STAGE.replied.fg, borderRadius: 999, padding: "3px 9px" }}>Replied on WhatsApp</span>}
      {lead.stage === "bought" && <span style={{ fontSize: 12, fontWeight: 600, background: STAGE.bought.bg, color: STAGE.bought.fg, borderRadius: 999, padding: "3px 9px" }}>Bought</span>}
      <span style={{ fontSize: 12, fontWeight: 600, background: T.greyBg, color: T.greyText, borderRadius: 999, padding: "3px 9px" }}>Lead {lead.leadAt}</span>
    </div>
  );

  // Only render talking-point rows we actually have content for (hide those with no real source).
  const tpRows: [string, React.ReactNode][] = [];
  if (r.worry) tpRows.push(["Worry", r.worry]);
  if (r.focusWhen) tpRows.push(["Can focus when", r.focusWhen]);
  if (r.hardPart) tpRows.push(["The hard part", <b key="hp">{r.hardPart}</b>]);
  if (r.tonightStep) tpRows.push(["Tonight’s step", r.tonightStep]);
  if (r.parentInstinct) tpRows.push(["Parent instinct", <span key="pi">{r.parentInstinct} <span style={{ color: T.muted }}>(don’t name it on the call)</span></span>]);
  tpRows.push(["Type · age", `${r.typeName} · ${r.ageBand}${r.goal ? ` · goal: ${r.goal}` : ""}`]);

  const TalkingPoints = () => (
    <section style={panel}>
      <div style={sectionLabel}>TALKING POINTS, FROM {lead.childName.toUpperCase()}’S REPORT</div>
      <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "10px 16px", fontSize: 14.5, lineHeight: 1.45 }}>
        {tpRows.map(([k, v], i) => (
          <Fragment key={i}>
            <span style={{ color: T.text2 }}>{k}</span>
            <span>{v}</span>
          </Fragment>
        ))}
      </div>
    </section>
  );

  const Timeline = () => (
    <section style={panel}>
      <div style={sectionLabel}>WHAT {lead.parentName.toUpperCase()} DID</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {lead.timeline.length === 0 && <span style={{ fontSize: 13.5, color: T.text2 }}>No activity recorded yet.</span>}
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
      <div style={sublabel}>Notes</div>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was said, next step…" style={{ border: `1px solid ${T.inputBorder}`, borderRadius: 12, padding: "10px 12px", fontSize: 14, color: T.textRow, minHeight: 64, fontFamily: "inherit", resize: "vertical", background: T.card }} />
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.textRow }}>Next follow-up{mustFollowUp ? <span style={{ color: T.warmText }}> · required</span> : ""}</span>
        <span style={chip(followUp === dateInDays(1))} onClick={() => setFollowUp(dateInDays(1))}>Tomorrow</span>
        <span style={chip(followUp === dateInDays(3))} onClick={() => setFollowUp(dateInDays(3))}>In 3 days</span>
        <input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} style={{ border: `1px solid ${mustFollowUp && !followUp ? T.warmText : T.inputBorder}`, borderRadius: 10, padding: "7px 10px", fontSize: 13.5, color: T.navy, fontFamily: "inherit", background: T.card }} />
        {followUp && !mustFollowUp && <span style={{ fontSize: 13, color: T.text2, cursor: "pointer" }} onClick={() => setFollowUp("")}>clear</span>}
      </div>
      <button onClick={saveNext} disabled={saving || (mustFollowUp && !followUp)} style={{ background: T.amber, color: T.navy, border: "none", borderRadius: 12, padding: 12, fontWeight: 700, textAlign: "center", cursor: saving || (mustFollowUp && !followUp) ? "default" : "pointer", fontSize: 14, opacity: saving || (mustFollowUp && !followUp) ? 0.6 : 1 }}>{saving ? "Saving…" : "Save and next parent →"}</button>
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
        <h1 style={{ margin: "4px 0 0", fontFamily: T.FONT_HEAD, fontSize: 28, fontWeight: 600 }}>{lead.parentName}{lead.parentRelation ? ` · ${lead.parentRelation}` : ""}</h1>
        <Pills />
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{lead.phoneE164}</span>
        <a href={telLink(lead.phoneE164)} style={{ background: T.navy, color: "#fff", borderRadius: 10, padding: "11px 18px", fontWeight: 700, textDecoration: "none" }}>Call</a>
        <button onClick={openWhatsApp} style={{ background: T.wa, color: T.waText, border: "none", borderRadius: 10, padding: "11px 18px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>WhatsApp</button>
        <a href={`/report/${lead.reportId}`} target="_blank" rel="noopener noreferrer" style={{ background: T.card, border: `1px solid ${T.inputBorder}`, borderRadius: 10, padding: "11px 14px", fontWeight: 600, textDecoration: "none", color: T.text }}>Open report ↗</a>
      </div>
    </div>
  );

  return (
    <>
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
          <button onClick={saveNext} disabled={saving || (mustFollowUp && !followUp)} style={{ width: "100%", background: T.amber, color: T.navy, border: "none", borderRadius: 12, padding: 14, fontWeight: 700, cursor: saving || (mustFollowUp && !followUp) ? "default" : "pointer", fontSize: 15, opacity: saving || (mustFollowUp && !followUp) ? 0.6 : 1 }}>{saving ? "Saving…" : "Save and next parent →"}</button>
        </div>
      </main>
      <Toaster />
      <style>{`@media (max-width:767px){.aa-call-desktop{display:none!important}.aa-call-mobile{display:flex!important}}`}</style>
    </>
  );
}
