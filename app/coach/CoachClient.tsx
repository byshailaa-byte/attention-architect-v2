"use client";

// Attention Coach — fully conversational chat UI. The Coach speaks first (a cached opener fetched on
// open), replies stream token-by-token, and there are NO onboarding chips or step cards: everything
// happens in conversation. Pure client island; endpoints/ids come from props so Preview Coach reuses
// this exact UI. Design system mirrors FlowShell / PlanV2: cream ground, navy ink, gold accent.
import { useEffect, useRef, useState } from "react";
import { splitBold } from "@/lib/coach-trial/markdown";

const C = {
  cream: "#FBF6EE", navy: "#1E3A5F", gold: "#E8A33D", goldSoft: "#F2C77E",
  ink: "#2E3A4B", dim: "#5B6577", white: "#FFFFFF", line: "#E7E0D2", onNavy: "#CFE0F2",
} as const;
const HEAD = "var(--font-newsreader), Georgia, serif";
const BODY = "var(--font-figtree), system-ui, sans-serif";

type Props = {
  childName: string;
  trialDay: number;
  messagesLeft: number;
  stepHref?: string;                     // link to the kept /coach/step/[day] detail page
  messageEndpoint?: string;              // POST (stream) + GET (opener). Defaults to the live trial endpoint.
  flagEndpoint?: string;                 // admin preview: show a ⚑ Flag control under each reply
  extraBody?: Record<string, unknown>;   // merged into POST body + GET query (e.g. { trialId, day })
};

type Bubble = { kind: "coach" | "parent"; text: string; id?: string };

export default function CoachClient(props: Props) {
  const { trialDay } = props;
  const messageEndpoint = props.messageEndpoint ?? "/api/coach/message";
  const flagEndpoint = props.flagEndpoint;
  const extraBody = props.extraBody ?? {};

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [messagesLeft, setMessagesLeft] = useState<number>(props.messagesLeft);
  const [draft, setDraft] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [thinking, setThinking] = useState<boolean>(true); // opener loading / coach composing
  const [notice, setNotice] = useState<string>("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const openedFor = useRef<number | null>(null);

  // Speak-first: fetch the cached opener when the chat opens (and whenever the day changes in preview).
  useEffect(() => {
    if (openedFor.current === trialDay) return;
    openedFor.current = trialDay;
    setBubbles([]);
    setThinking(true);
    const qs = new URLSearchParams(Object.entries(extraBody).map(([k, v]) => [k, String(v)])).toString();
    const url = qs ? `${messageEndpoint}?${qs}` : messageEndpoint;
    fetch(url, { method: "GET" })
      .then((r) => r.json())
      .then((d: { reply?: string }) => { if (d.reply) setBubbles([{ kind: "coach", text: d.reply }]); })
      .catch(() => setNotice("Couldn't load the Coach — refresh to try again."))
      .finally(() => setThinking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trialDay]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [bubbles, thinking, notice]);

  async function onSend() {
    const text = draft.trim();
    if (!text || sending || messagesLeft <= 0) return;
    setNotice("");
    setDraft("");
    setSending(true);
    setThinking(true);
    setBubbles((prev) => [...prev, { kind: "parent", text }]);
    setMessagesLeft((n) => Math.max(0, n - 1));

    try {
      const res = await fetch(messageEndpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...extraBody, message: text }),
      });
      const ct = res.headers.get("content-type") ?? "";

      // Non-streaming responses: safety replies + errors come back as plain JSON.
      if (!ct.includes("ndjson")) {
        const data = await res.json().catch(() => ({ error: "failed" }));
        setThinking(false);
        if (res.ok && data.reply) { setBubbles((prev) => [...prev, { kind: "coach", text: data.reply }]); }
        else if (res.status === 429 || data.error === "daily_limit") { setMessagesLeft(0); setNotice("No messages left today — back tomorrow"); }
        else if (res.status === 403) { setMessagesLeft(0); setNotice("Your Quick Start has ended. Your report stays open."); }
        else if (data.reply) { setBubbles((prev) => [...prev, { kind: "coach", text: data.reply }]); }
        else { setNotice("Something went wrong. Please try again."); }
        setSending(false);
        return;
      }

      // Streaming reply: one coach bubble that fills in as deltas arrive.
      const idx = await new Promise<number>((resolve) => {
        setBubbles((prev) => { resolve(prev.length); return [...prev, { kind: "coach", text: "" }]; });
      });
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "", acc = "", first = true;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
          if (!line) continue;
          let obj: { delta?: string; done?: { messageId?: string } };
          try { obj = JSON.parse(line); } catch { continue; }
          if (typeof obj.delta === "string") {
            if (first) { setThinking(false); first = false; }
            acc += obj.delta;
            setBubbles((prev) => { const next = [...prev]; if (next[idx]) next[idx] = { ...next[idx], text: acc }; return next; });
          } else if (obj.done) {
            setBubbles((prev) => { const next = [...prev]; if (next[idx]) next[idx] = { ...next[idx], id: obj.done?.messageId }; return next; });
          }
        }
      }
      setThinking(false);
    } catch {
      setThinking(false);
      setNotice("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const noneLeft = messagesLeft <= 0;

  return (
    <div style={{ minHeight: "100dvh", background: C.cream, display: "flex", justifyContent: "center", fontFamily: BODY, color: C.ink }}>
      <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", minHeight: "100dvh", boxSizing: "border-box" }}>
        <header style={{ position: "sticky", top: 0, zIndex: 10, background: C.navy, color: "#fff", padding: "14px 18px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontFamily: HEAD, fontSize: 19, fontWeight: 600, lineHeight: 1.2 }}>Attention Coach</div>
            {props.stepHref && <a href={props.stepHref} style={{ fontSize: 12.5, color: C.goldSoft, textDecoration: "underline", textUnderlineOffset: 3 }}>Today&rsquo;s step</a>}
          </div>
          <div style={{ fontSize: 12.5, color: C.onNavy, marginTop: 2 }}>Free Quick Start · Day {trialDay} of 4</div>
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            {[1, 2, 3, 4].map((seg) => (
              <div key={seg} style={{ flex: 1, height: 5, borderRadius: 999, background: seg <= trialDay ? C.gold : "rgba(255,255,255,.22)" }} />
            ))}
          </div>
        </header>

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "18px 16px 10px", display: "flex", flexDirection: "column", gap: 12 }}>
          {bubbles.map((b, i) => <BubbleRow key={i} bubble={b} flagEndpoint={flagEndpoint} />)}
          {thinking && <TypingDots />}
        </div>

        <div style={{ position: "sticky", bottom: 0, background: C.cream, borderTop: `1px solid ${C.line}`, padding: "10px 14px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: C.dim, fontWeight: 600 }}>
              {noneLeft ? "No messages left today — back tomorrow" : `${messagesLeft} left today`}
            </span>
            {notice && <span style={{ fontSize: 12, color: "#8C3F22", fontWeight: 600, textAlign: "right" }}>{notice}</span>}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void onSend(); } }}
              placeholder={noneLeft ? "Back tomorrow" : "Message the Coach…"}
              rows={1}
              disabled={noneLeft || sending}
              style={{
                flex: 1, resize: "none", minHeight: 44, maxHeight: 120, padding: "11px 13px", borderRadius: 12,
                border: `1.5px solid ${C.line}`, background: C.white, color: C.ink, fontFamily: BODY, fontSize: 15,
                lineHeight: 1.4, outline: "none", boxSizing: "border-box",
              }}
            />
            <button
              onClick={() => void onSend()}
              disabled={noneLeft || sending || !draft.trim()}
              style={{
                flexShrink: 0, minHeight: 44, padding: "0 18px", borderRadius: 12, border: "none",
                background: (noneLeft || sending || !draft.trim()) ? C.goldSoft : C.gold, color: "#1a1a1a",
                fontWeight: 700, fontSize: 15, cursor: (noneLeft || sending || !draft.trim()) ? "default" : "pointer", fontFamily: BODY,
              }}
            >
              {sending ? "…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderBold(text: string): React.ReactNode[] {
  return splitBold(text).map((p, i) =>
    p.bold ? <strong key={i} style={{ fontWeight: 700 }}>{p.text}</strong> : <span key={i}>{p.text}</span>,
  );
}

function BubbleRow({ bubble, flagEndpoint }: { bubble: Bubble; flagEndpoint?: string }) {
  const isParent = bubble.kind === "parent";
  const canFlag = !isParent && !!flagEndpoint && !!bubble.id;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: isParent ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: "82%", padding: "10px 14px", fontSize: 15, lineHeight: 1.5,
          borderRadius: isParent ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
          background: isParent ? C.gold : C.white, color: isParent ? "#1a1a1a" : C.ink,
          border: isParent ? "none" : `1px solid ${C.line}`, fontWeight: isParent ? 600 : 400, whiteSpace: "pre-wrap",
        }}
      >
        {isParent ? bubble.text : renderBold(bubble.text)}
      </div>
      {canFlag && <FlagReply messageId={bubble.id!} flagEndpoint={flagEndpoint!} />}
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 14px", alignSelf: "flex-start", background: C.white, border: `1px solid ${C.line}`, borderRadius: "14px 14px 14px 4px" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 6, height: 6, borderRadius: 999, background: C.dim, opacity: 0.5, animation: `coachdot 1s ${i * 0.15}s infinite` }} />
      ))}
      <style>{`@keyframes coachdot{0%,60%,100%{opacity:.25}30%{opacity:.8}}`}</style>
    </div>
  );
}

function FlagReply({ messageId, flagEndpoint }: { messageId: string; flagEndpoint: string }) {
  const [state, setState] = useState<"idle" | "done">("idle");
  async function onFlag() {
    const note = window.prompt("Flag this reply — add a note for review (optional):", "");
    if (note === null) return;
    try {
      const res = await fetch(flagEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId, note }) });
      if (res.ok) setState("done");
    } catch { /* non-blocking */ }
  }
  return (
    <button onClick={onFlag} disabled={state === "done"}
      style={{ marginTop: 3, marginLeft: 2, background: "none", border: "none", cursor: state === "done" ? "default" : "pointer", fontSize: 11.5, fontWeight: 700, color: state === "done" ? "#8C3F22" : C.dim, padding: "2px" }}>
      {state === "done" ? "⚑ Flagged" : "⚑ Flag this reply"}
    </button>
  );
}
