"use client";
import { useEffect, useRef, useState } from "react";
import { useReadOnly, READ_ONLY_TOOLTIP } from "@/components/lms/ReadOnlyContext";
import type { CoachPageData, CoachDisplayMessage } from "@/lib/lms/coach/thread";

const C = {
  bg: "#FBF7EF", navy: "#1E3A5F", white: "#FFFFFF", border: "#EFE8DA", inputBorder: "#E6DECF",
  text: "#1B2333", text2: "#5B6577", amber: "#E8A33D", onNavy: "#C9D6E6", muted: "#8A93A3",
  dangerBg: "#FBEAEA", dangerBorder: "#E9B8B8", dangerText: "#9B2C2C",
};
const HEAD = "var(--font-newsreader), 'Newsreader', Georgia, serif";
const BODY = "var(--font-figtree), 'Figtree', system-ui, sans-serif";
const LIMIT_MSG = "You've used today's 30 messages. The Coach is back tomorrow morning.";
const CHIP_LABELS = (pronoun: string) => [
  `What if ${pronoun} refuses?`,
  "I missed yesterday",
  "Explain tonight's step",
];

type Msg = CoachDisplayMessage & { pending?: boolean };

// Light inline formatting for coach replies: **bold**, *italic*, newlines. HTML is escaped first.
function renderInline(text: string): string {
  let h = (text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  h = h.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>").replace(/(?<!\*)\*(?!\*)([^*\n]+?)\*(?!\*)/g, "<em>$1</em>");
  return h.replace(/\n/g, "<br/>");
}

export default function CoachScreen({
  data, backHref, prefill, initialSource,
}: { data: CoachPageData; backHref: string; prefill?: string; initialSource?: string }) {
  const readOnly = useReadOnly();
  const [messages, setMessages] = useState<Msg[]>(data.messages);
  const [draft, setDraft] = useState(prefill ?? "");
  const [sending, setSending] = useState(false);
  const [left, setLeft] = useState(data.messagesLeft);
  const [chipsHidden, setChipsHidden] = useState(false);
  const [limitHit, setLimitHit] = useState(data.messagesLeft <= 0);
  const [fbOpen, setFbOpen] = useState<string | null>(null);
  const [fbReason, setFbReason] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstSource = useRef(initialSource);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 1e9 }); }, [messages, sending]);

  async function send(text: string, source: string) {
    const msg = text.trim();
    if (!msg || sending || limitHit || readOnly) return;
    if (msg.length > 1000) { alert("Please keep it under 1000 characters."); return; }
    setDraft("");
    setChipsHidden(true);
    setMessages((m) => [...m, { id: "tmp-" + Date.now(), role: "parent", content: msg, feedback: null }]);
    setSending(true);
    const useSource = firstSource.current ?? source; firstSource.current = undefined;
    try {
      const res = await fetch("/api/lms/coach", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, source: useSource }),
      });
      if (res.status === 429) { setLimitHit(true); setMessages((m) => [...m, { id: "limit", role: "coach", content: LIMIT_MSG, feedback: null }]); return; }
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessages((m) => [...m, { id: "err-" + Date.now(), role: "coach", content: d.reply || d.error || "The Coach couldn't answer just now. Try again in a minute.", feedback: null }]);
        return;
      }
      setMessages((m) => [...m, { id: d.messageId ?? "r-" + Date.now(), role: d.role === "safety" ? "safety" : "coach", content: d.reply, feedback: null }]);
      if (typeof d.messagesLeft === "number") { setLeft(d.messagesLeft); if (d.messagesLeft <= 0) setLimitHit(true); }
    } catch {
      setMessages((m) => [...m, { id: "err-" + Date.now(), role: "coach", content: "The Coach couldn't answer just now. Try again in a minute.", feedback: null }]);
    } finally { setSending(false); }
  }

  async function sendFeedback(messageId: string, value: 1 | -1, reason?: string) {
    if (readOnly) return;
    setMessages((m) => m.map((x) => (x.id === messageId ? { ...x, feedback: value } : x)));
    if (value === -1 && reason === undefined) { setFbOpen(messageId); return; }
    setFbOpen(null); setFbReason("");
    await fetch("/api/lms/coach/feedback", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, value, reason }),
    }).catch(() => {});
  }

  const bubble = (m: Msg, i: number) => {
    if (m.role === "parent") {
      return <div key={m.id + i} style={{ alignSelf: "flex-end", maxWidth: "86%", background: C.navy, color: "#fff", borderRadius: "14px 14px 4px 14px", padding: "10px 12px", whiteSpace: "pre-wrap" }}>{m.content}</div>;
    }
    const safety = m.role === "safety";
    return (
      <div key={m.id + i} style={{ alignSelf: "flex-start", maxWidth: "86%", background: safety ? C.dangerBg : C.white, border: `1px solid ${safety ? C.dangerBorder : C.border}`, color: safety ? C.dangerText : C.text, borderRadius: "14px 14px 14px 4px", padding: "10px 12px", whiteSpace: safety ? "pre-wrap" : undefined }}>
        <span dangerouslySetInnerHTML={{ __html: renderInline(m.content) }} />
        {!safety && !m.id.startsWith("tmp") && !m.id.startsWith("err") && m.id !== "limit" && (
          <div style={{ display: "flex", gap: 8, marginTop: 8, fontSize: 13, color: C.text2 }}>
            <button disabled={readOnly} title={readOnly ? READ_ONLY_TOOLTIP : undefined} onClick={() => sendFeedback(m.id, 1)} style={chip(m.feedback === 1, readOnly)}>👍</button>
            <button disabled={readOnly} title={readOnly ? READ_ONLY_TOOLTIP : undefined} onClick={() => sendFeedback(m.id, -1)} style={chip(m.feedback === -1, readOnly)}>👎</button>
          </div>
        )}
        {fbOpen === m.id && (
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input value={fbReason} onChange={(e) => setFbReason(e.target.value)} placeholder="What was wrong?" maxLength={200}
              style={{ flex: 1, border: `1px solid ${C.inputBorder}`, borderRadius: 10, padding: "7px 10px", fontSize: 13, fontFamily: BODY }} />
            <button onClick={() => sendFeedback(m.id, -1, fbReason)} style={{ background: C.navy, color: "#fff", border: "none", borderRadius: 10, padding: "7px 12px", fontWeight: 700, cursor: "pointer" }}>Send</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: BODY, display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <header style={{ background: C.navy, color: "#fff", padding: "14px 18px 16px", display: "flex", flexDirection: "column", gap: 10, position: "sticky", top: 0, zIndex: 5 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: C.onNavy }}>
          <a href={backHref} style={{ color: C.onNavy, textDecoration: "none" }}>← Home</a>
          <span>Week {data.week} · Day {data.day === 0 ? "weekend" : data.day}</span>
        </div>
        <div style={{ fontFamily: HEAD, fontSize: 24, fontWeight: 600 }}>Attention Coach</div>
        <div style={{ fontSize: 13, color: C.onNavy, lineHeight: 1.45 }}>Knows {data.child}&rsquo;s report and where you are in the plan. Ask anything about tonight&rsquo;s step or what happened today.</div>
      </header>

      <div ref={scrollRef} style={{ flex: 1, padding: "14px 16px 170px", display: "flex", flexDirection: "column", gap: 10, fontSize: 14.5, lineHeight: 1.5, overflowY: "auto" }}>
        {messages.map(bubble)}
        {sending && <div style={{ alignSelf: "flex-start", background: C.white, border: `1px solid ${C.border}`, borderRadius: "14px 14px 14px 4px", padding: "10px 14px", color: C.muted }}>…</div>}
        {!chipsHidden && !limitHit && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
            {CHIP_LABELS(data.pronoun).map((c) => (
              <button key={c} disabled={readOnly} onClick={() => send(c, "chip")} style={{ border: `1px solid ${C.inputBorder}`, background: C.white, borderRadius: 999, padding: "7px 11px", fontSize: 13, fontWeight: 600, color: C.navy, cursor: readOnly ? "not-allowed" : "pointer" }}>{c}</button>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: C.white, borderTop: `1px solid ${C.border}`, padding: "10px 14px calc(14px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 8, position: "fixed", left: 0, right: 0, bottom: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} disabled={readOnly || limitHit}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(draft, "coach"); } }}
            placeholder={limitHit ? LIMIT_MSG : "Type in English or Hindi…"} rows={1}
            style={{ flex: 1, border: `1px solid ${C.inputBorder}`, borderRadius: 12, padding: "11px 12px", fontSize: 14, fontFamily: BODY, resize: "none", background: readOnly || limitHit ? "#F4EFE6" : "#fff", color: C.text, minHeight: 20, maxHeight: 120 }} />
          <button disabled={readOnly || limitHit || sending} title={readOnly ? READ_ONLY_TOOLTIP : undefined} onClick={() => send(draft, "coach")}
            style={{ background: C.amber, color: C.navy, border: "none", borderRadius: 12, padding: "11px 16px", fontWeight: 700, cursor: readOnly || limitHit ? "not-allowed" : "pointer", opacity: readOnly || limitHit ? 0.5 : 1 }}>Send</button>
        </div>
        <div style={{ fontSize: 11.5, color: C.text2, lineHeight: 1.4 }}>A coach, not a doctor. Our team may read chats to improve your coaching. {left} messages left today.</div>
      </div>
    </div>
  );
}

function chip(active: boolean, readOnly: boolean): React.CSSProperties {
  return { border: `1px solid ${active ? "#1E3A5F" : "#E6DECF"}`, background: active ? "#EAF0F6" : "#fff", borderRadius: 999, padding: "3px 10px", cursor: readOnly ? "not-allowed" : "pointer", fontSize: 13 };
}
