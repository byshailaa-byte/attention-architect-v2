"use client";
import { useState } from "react";
import type { Conversation, Thread, Template, ConversationFilter, Message } from "@/lib/admin/crm";
import { getCrmSource, replyWindow, rowPill, composerMode, telLink, formatInr, maskPhone, dripControl, COMPOSER_FREE_NOTE } from "@/lib/admin/crm";
import { T, STAGE } from "../crm-theme";
import { PreviewBanner, Toaster, previewToast } from "../PreviewUI";

const TEMPLATE_LABEL: Record<string, string> = { report_ready: "REPORT READY", step_check_in: "DRIP STEP 1", payment_confirmed: "PAYMENT CONFIRMED", checking_in_plan: "CHECKING IN", daily_call_list: "DAILY CALL LIST" };

function pillStyle(kind: "open" | "closing" | "closed"): React.CSSProperties {
  if (kind === "open") return { background: T.successBg, color: T.successText };
  if (kind === "closing") return { background: T.dangerBg, color: T.dangerText };
  return { background: T.greyBg, color: T.greyText };
}

// Compact phone glyph for the phone-screen thread header (where a "Call" word button crowds
// the ⋯ menu).
function PhoneGlyph({ size = 17 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" style={{ display: "block" }}>
      <path fill="#fff" d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.3 1.1l-2.2 2.2z" />
    </svg>
  );
}

export function InboxView({ conversations, thread, filter, templates }: {
  conversations: Conversation[]; thread: Thread | null; filter: ConversationFilter; templates: Template[];
}) {
  const [draft, setDraft] = useState("");
  const [picked, setPicked] = useState<string>(templates.find((t) => t.status === "approved")?.name ?? "");
  const [menuOpen, setMenuOpen] = useState(false); // mobile thread-header ⋯ menu
  const selId = thread?.conversation.id ?? null;

  const filters: { k: ConversationFilter; label: string; count?: number }[] = [
    { k: "needs_reply", label: "Needs reply", count: conversations.filter(() => true).length && undefined },
    { k: "all", label: "All" }, { k: "drip_running", label: "Drip running" }, { k: "opted_out", label: "Opted out" },
  ];

  const win = thread ? replyWindow(thread.conversation.lastInboundAt) : { open: false, hoursLeft: 0 };
  const mode = composerMode(win);

  const send = async () => {
    if (!thread) return;
    await getCrmSource().sendMessage({ conversationId: thread.conversation.id, body: mode === "free" ? draft : "", templateName: mode === "template" ? picked : undefined });
    previewToast("Preview data: not saved");
    setDraft("");
  };
  const setDrip = async (action: "pause" | "resume" | "stop") => {
    if (!thread?.conversation.leadId) return;
    await getCrmSource().setDrip(thread.conversation.leadId, action);
    previewToast("Preview data: not saved");
  };

  // ── conversation list ──
  const List = ({ mobile }: { mobile?: boolean }) => (
    <section style={{ width: mobile ? "100%" : 340, flexShrink: 0, background: T.card, borderRight: mobile ? "none" : `1px solid ${T.cardBorder}`, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "18px 16px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
        <h1 style={{ margin: 0, fontFamily: T.FONT_HEAD, fontSize: 24, fontWeight: 600 }}>WhatsApp</h1>
        <div style={{ border: `1px solid ${T.inputBorder}`, borderRadius: 10, padding: "9px 12px", fontSize: 13.5, color: T.muted }}>Search name, child or number</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 12.5, fontWeight: 600 }}>
          {filters.map((f) => {
            const active = f.k === filter;
            const label = f.k === "needs_reply" ? `Needs reply ${conversations.filter((c) => c.needsReply).length || 4}` : f.label;
            return <a key={f.k} href={`/admin/whatsapp?filter=${f.k}`} style={{ textDecoration: "none", borderRadius: 999, padding: "5px 10px", background: active ? T.navy : undefined, color: active ? "#fff" : T.navy, border: active ? "none" : `1px solid ${T.inputBorder}` }}>{label}</a>;
          })}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", overflowY: "auto" }}>
        {conversations.map((c) => {
          const w = replyWindow(c.lastInboundAt);
          const p = rowPill(w);
          const selected = c.id === selId && !mobile;
          const outboundLast = c.lastPreview.startsWith("You:");
          return (
            <a key={c.id} href={`/admin/whatsapp?filter=${filter}&c=${c.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{
                padding: "12px 16px", display: "flex", flexDirection: "column", gap: 3,
                background: selected ? "#FBF4E6" : undefined, borderLeft: selected ? `3px solid ${T.amber}` : undefined,
                borderBottom: `1px solid ${T.divider}`, opacity: outboundLast ? 0.7 : 1,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <b>{c.displayName}</b>
                  <span style={{ fontSize: 12, color: outboundLast ? T.muted : T.successText, fontWeight: 700 }}>{c.lastAt}</span>
                </div>
                <div style={{ fontSize: 13, color: outboundLast ? T.text2 : T.textRow }}>{c.lastPreview}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                  {c.stage && <span style={{ fontSize: 11, fontWeight: 600, background: STAGE[c.stage].bg, color: STAGE[c.stage].fg, borderRadius: 999, padding: "2px 8px" }}>{STAGE[c.stage].label}</span>}
                  {!c.matched && <span style={{ fontSize: 11, fontWeight: 600, background: T.greyBg, color: T.greyText, borderRadius: 999, padding: "2px 8px" }}>Not matched to a lead</span>}
                  {c.dripState?.startsWith("step")
                    ? <span style={{ fontSize: 11, fontWeight: 600, background: T.greyBg, color: T.greyText, borderRadius: 999, padding: "2px 8px" }}>Drip · {c.dripState}</span>
                    : <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 999, padding: "2px 8px", ...pillStyle(p.kind) }}>{p.label}</span>}
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );

  const Bubble = ({ m }: { m: Message }) => {
    const out = m.direction === "out";
    return (
      <div style={{ alignSelf: out ? "flex-end" : "flex-start", maxWidth: "62%", background: out ? T.bubbleOut : T.bubbleIn, borderRadius: out ? "12px 12px 2px 12px" : "12px 12px 12px 2px", padding: "8px 12px" }}>
        {out && m.source === "auto" && m.templateName && (
          <div style={{ fontSize: 11, fontWeight: 700, color: T.successText, letterSpacing: "0.06em" }}>AUTO · {m.label ?? TEMPLATE_LABEL[m.templateName] ?? m.templateName.toUpperCase()} · {(m.category ?? "utility").toUpperCase()}</div>
        )}
        {m.body}
        <div style={{ textAlign: "right", fontSize: 11, color: T.text2 }}>{m.at}{out && m.status === "read" ? " ✓✓ read" : out ? " ✓✓" : ""}</div>
      </div>
    );
  };

  const Composer = ({ mobile }: { mobile?: boolean }) => (
    <div style={{
      background: T.card, borderTop: `1px solid ${T.cardBorder}`, display: "flex", flexDirection: "column", gap: 8,
      ...(mobile
        ? { position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 30, padding: "10px 14px calc(10px + env(safe-area-inset-bottom))", boxShadow: "0 -4px 16px rgba(20,40,77,.08)" }
        : { padding: "12px 20px" }),
    }}>
      {mode === "free" ? (
        <>
          <div style={{ display: "flex", gap: 6, fontSize: 12.5, fontWeight: 600, alignItems: "center", ...(mobile ? { flexWrap: "nowrap", overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 2 } : { flexWrap: "wrap" }) }}>
            <span style={{ color: T.text2, padding: "5px 0", flexShrink: 0 }}>Saved replies:</span>
            {thread?.savedReplies.map((s) => <span key={s.label} onClick={() => setDraft(s.body)} style={{ border: `1px solid ${T.inputBorder}`, borderRadius: 999, padding: "5px 10px", color: T.navy, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>{s.label}</span>)}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Hi ${thread?.conversation.displayName.split(" ")[0]}, …`} style={{ flex: 1, border: `1px solid ${T.inputBorder}`, borderRadius: 12, padding: "10px 12px", fontSize: 14, color: T.textRow, minHeight: 44, fontFamily: "inherit", resize: "vertical", background: T.card }} />
            <button onClick={send} style={{ background: T.wa, color: T.waText, border: "none", borderRadius: 10, padding: "12px 18px", fontWeight: 700, cursor: "pointer" }}>Send</button>
          </div>
          <div style={{ fontSize: 12, color: T.text2 }}>{COMPOSER_FREE_NOTE}</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12.5, color: T.text2 }}>Reply window closed. Only an approved template can go out.</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <select value={picked} onChange={(e) => setPicked(e.target.value)} style={{ flex: 1, minWidth: 220, border: `1px solid ${T.inputBorder}`, borderRadius: 12, padding: "11px 12px", fontSize: 14, color: T.text, background: T.card, fontFamily: "inherit" }}>
              {templates.filter((t) => t.status === "approved").map((t) => (
                <option key={t.name} value={t.name}>{t.name} · {t.category} · {formatInr(t.costInr)}</option>
              ))}
            </select>
            <button onClick={send} style={{ background: T.navy, color: "#fff", border: "none", borderRadius: 10, padding: "12px 18px", fontWeight: 700, cursor: "pointer" }}>Send template</button>
          </div>
          <div style={{ fontSize: 12, color: T.text2 }}>Each template costs about {formatInr(0.86)} (marketing) or {formatInr(0.12)} (utility).</div>
        </>
      )}
    </div>
  );

  const ThreadPane = ({ mobile }: { mobile?: boolean }) => {
    if (!thread) return <section style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.text2, background: T.thread }}>Select a conversation</section>;
    const c = thread.conversation;
    const reportId = thread.context?.reportId;
    const maskedPhone = c.matched ? maskPhone(c.phoneE164) : c.phoneE164.replace(/\d(?=\d{3})/g, "•");
    return (
      <section style={{ flex: 1, display: "flex", flexDirection: "column", background: T.thread, minWidth: 0 }}>
        {mobile ? (
          <div style={{ background: T.card, borderBottom: `1px solid ${T.cardBorder}`, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
            <a href={`/admin/whatsapp?filter=${filter}`} aria-label="Back to inbox" style={{ fontSize: 22, color: T.navy, textDecoration: "none", lineHeight: 1, padding: "4px 6px", flexShrink: 0 }}>←</a>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.displayName}</div>
              <div style={{ fontSize: 12, color: T.text2, fontVariantNumeric: "tabular-nums" }}>{maskedPhone}</div>
            </div>
            <a href={telLink(c.phoneE164)} aria-label="Call" style={{ background: T.navy, color: "#fff", borderRadius: 10, padding: "9px 11px", display: "flex", alignItems: "center", textDecoration: "none", flexShrink: 0 }}><PhoneGlyph /></a>
            <button aria-label="More actions" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)} style={{ background: T.card, border: `1px solid ${T.inputBorder}`, borderRadius: 10, padding: "7px 12px", fontSize: 18, lineHeight: 1, color: T.text, cursor: "pointer", flexShrink: 0 }}>⋯</button>
            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 20 }} />
                <div style={{ position: "absolute", top: 52, right: 10, zIndex: 21, background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 12, boxShadow: "0 8px 24px rgba(20,40,77,.16)", overflow: "hidden", minWidth: 180 }}>
                  {c.leadId && <a href={`/admin/calls/${c.leadId}`} style={{ display: "block", padding: "11px 14px", fontSize: 14, color: T.text, textDecoration: "none", borderBottom: reportId ? `1px solid ${T.divider}` : undefined }}>Open call screen</a>}
                  {reportId && <a href={`/report/${reportId}`} target="_blank" rel="noopener noreferrer" style={{ display: "block", padding: "11px 14px", fontSize: 14, color: T.text, textDecoration: "none" }}>Open report ↗</a>}
                  {!c.leadId && !reportId && <div style={{ padding: "11px 14px", fontSize: 13, color: T.text2 }}>No linked lead</div>}
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ background: T.card, borderBottom: `1px solid ${T.cardBorder}`, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{c.displayName}</div>
              <div style={{ fontSize: 12.5, color: T.text2 }}>{maskedPhone} · {c.dripState ?? "no drip"}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <a href={telLink(c.phoneE164)} style={{ background: T.navy, color: "#fff", borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 14, textDecoration: "none", whiteSpace: "nowrap" }}>Call</a>
              {c.leadId && <a href={`/admin/calls/${c.leadId}`} style={{ background: T.card, border: `1px solid ${T.inputBorder}`, borderRadius: 10, padding: "9px 14px", fontWeight: 600, fontSize: 14, textDecoration: "none", color: T.text, whiteSpace: "nowrap" }}>Open call screen</a>}
            </div>
          </div>
        )}
        <div style={{ flex: 1, padding: mobile ? "14px 14px 184px" : "18px 24px", display: "flex", flexDirection: "column", gap: 10, fontSize: 14, lineHeight: 1.45, overflowY: "auto" }}>
          {thread.messages.map((m) => <Bubble key={m.id} m={m} />)}
          {win.open && c.dripState?.startsWith("paused") && (
            <div style={{ alignSelf: "center", fontSize: 12, color: T.successText, background: T.successBg, borderRadius: 10, padding: "6px 12px", textAlign: "center" }}>
              She replied, so the drip is paused. Her reply window is open for {win.hoursLeft} more hours: you can write anything, free.
            </div>
          )}
        </div>
        <Composer mobile={mobile} />
      </section>
    );
  };

  const Context = () => {
    if (!thread?.context) return null;
    const ctx = thread.context; const r = ctx.report;
    const dc = dripControl(thread.conversation.dripState, thread.conversation.optedOut);
    const sec: React.CSSProperties = { background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 8, fontSize: 13.5 };
    const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: T.label };
    const dripBtn: React.CSSProperties = { border: `1px solid ${T.inputBorder}`, borderRadius: 8, padding: "5px 9px", fontWeight: 600, color: T.navy, fontSize: 12.5, cursor: "pointer", background: T.card };
    return (
      <aside style={{ width: 300, flexShrink: 0, padding: "18px 16px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
        <section style={sec}>
          <div style={lbl}>{thread.conversation.childName?.toUpperCase()} · {r.typeName.toUpperCase()} · {r.ageBand}</div>
          <div><span style={{ color: T.text2 }}>Worry:</span> {thread.conversation.childName ? r.worry : ""}</div>
          <div><span style={{ color: T.text2 }}>Goal:</span> {r.goal}</div>
          <div><span style={{ color: T.text2 }}>Stage:</span> reached plan, no checkout</div>
          <a href={`/report/${ctx.reportId}`} target="_blank" rel="noopener noreferrer" style={{ color: T.navy, fontWeight: 600, textDecoration: "none" }}>Open report ↗</a>
        </section>
        <section style={sec}>
          <div style={lbl}>FOLLOW-UP</div>
          <div><span style={{ color: T.text2 }}>Last call:</span> {ctx.lastCall}</div>
          <div><span style={{ color: T.text2 }}>Next:</span> <b>{ctx.nextFollowUp}</b></div>
          <div><span style={{ color: T.text2 }}>Drip:</span> {ctx.drip}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 2, alignItems: "center", flexWrap: "wrap" }}>
            {dc.state === "running" && <>
              <button onClick={() => setDrip("pause")} style={dripBtn}>Pause drip</button>
              <button onClick={() => setDrip("stop")} style={dripBtn}>Stop drip</button>
            </>}
            {dc.state === "paused" && <>
              <button onClick={() => setDrip("resume")} style={dripBtn}>Resume drip</button>
              <button onClick={() => setDrip("stop")} style={dripBtn}>Stop drip</button>
            </>}
            {(dc.state === "stopped" || dc.state === "opted_out" || dc.state === "none") && (
              <span style={{ fontSize: 12.5, color: T.text2, fontWeight: 600 }}>{dc.label}</span>
            )}
          </div>
        </section>
      </aside>
    );
  };

  return (
    <>
      <PreviewBanner />
      {/* DESKTOP: list + thread + context */}
      <div className="aa-wa-desktop" style={{ display: "flex", height: "calc(100vh - 27px)", color: T.text, minWidth: 0 }}>
        <List />
        <ThreadPane />
        <Context />
      </div>
      {/* MOBILE: list only, or full-screen thread when ?c= set */}
      <div className="aa-wa-mobile" style={{ display: "none", height: "calc(100vh - 27px)", color: T.text }}>
        {thread ? <ThreadPane mobile /> : <List mobile />}
      </div>
      <Toaster />
      <style>{`@media (max-width:767px){.aa-wa-desktop{display:none!important}.aa-wa-mobile{display:flex!important;flex-direction:column}}`}</style>
    </>
  );
}
