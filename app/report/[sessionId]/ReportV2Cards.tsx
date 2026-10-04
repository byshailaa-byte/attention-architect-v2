"use client";
// Report v2 as 7 full-screen cards (behind ?report=v2). Navy: 1,4,7. Cream: 2,3,5,6.
// Navigate by button, swipe, or browser Back. ?card=N keeps the current card on refresh/share.
// Nothing overflows: each card's body scrolls inside a fixed 100dvh frame. No SiteFooter.
import { useCallback, useEffect, useRef, useState } from "react";
import { FLOW, HEAD, BODY } from "@/app/components/FlowShell";
import { CARD_TOTAL as TOTAL, clampCard } from "@/lib/report-v2/cards-nav";
import type { ReportV2Content } from "@/lib/report-v2/types";

const GREEN = "#2F9E6E";

function fireEvent(eventType: string, sessionId: string, metadata?: Record<string, unknown>) {
  fetch("/api/funnel/event", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_type: eventType, session_id: sessionId, metadata: metadata ?? {} }),
  }).catch(() => {});
}

type Props = {
  sessionId: string;
  content: ReportV2Content;
  strengths: [string, string, string];
  ageBand: string;
  goalOptions: { key: string; text: string }[];
  initialCard: number;
  planHref: string;
  calendlyUrl: string;
  checkinEnabled: boolean;
};

export default function ReportV2Cards(props: Props) {
  const { sessionId, content: c, strengths, ageBand, goalOptions, planHref, calendlyUrl, checkinEnabled } = props;
  const [card, setCard] = useState(clampCard(props.initialCard || 1));
  const [goal, setGoal] = useState(c.goal);
  const [sheet, setSheet] = useState(false);
  const touchX = useRef<number | null>(null);

  // URL + analytics on every card change (covers buttons, swipe, and browser Back).
  useEffect(() => {
    fireEvent("report_card_view", sessionId, { card });
  }, [card, sessionId]);

  const nav = useCallback((n: number, push = true) => {
    const next = clampCard(n);
    if (push) {
      const url = `?report=v2&card=${next}`;
      window.history.pushState({ card: next }, "", url);
    }
    setCard(next);
  }, []);

  useEffect(() => {
    // Keep the initial card in the URL without adding a history entry.
    window.history.replaceState({ card }, "", `?report=v2&card=${card}`);
    const onPop = (e: PopStateEvent) => {
      const fromState = (e.state && typeof e.state.card === "number") ? e.state.card : null;
      const fromUrl = Number(new URLSearchParams(window.location.search).get("card"));
      const n = fromState ?? (fromUrl >= 1 ? fromUrl : 1);
      setCard(clampCard(n));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goPlan = (skip: boolean) => {
    if (skip) fireEvent("report_skip_to_plan", sessionId, { from: card });
    window.location.assign(planHref);
  };
  const saveGoal = async (opt: { key: string; text: string }) => {
    setGoal(opt.text); setSheet(false);
    fireEvent("goal_changed", sessionId, { goalKey: opt.key });
    fetch("/api/report/goal-v2", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, goal: opt.text, goalKey: opt.key }),
    }).catch(() => {});
  };

  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 55) return;
    nav(card + (dx < 0 ? 1 : -1));
  };

  const navy = card === 1 || card === 4 || card === 7;
  const bg = navy ? FLOW.navy : FLOW.cream;
  const ink = navy ? "#fff" : FLOW.ink;
  const dim = navy ? FLOW.onNavy : FLOW.dim;
  const eyebrow = (t: string) => (
    <div style={{ fontFamily: BODY, fontSize: 12, fontWeight: 700, letterSpacing: ".12em", color: navy ? FLOW.goldSoft : FLOW.gold, textTransform: "uppercase", marginBottom: 12 }}>{t}</div>
  );
  const Btn = ({ label, onClick, variant = "primary" as "primary" | "ghost" }: { label: string; onClick: () => void; variant?: "primary" | "ghost" }) => (
    <button onClick={onClick} style={{
      width: "100%", minHeight: 50, borderRadius: 13, cursor: "pointer", fontFamily: BODY, fontWeight: 700, fontSize: 16,
      border: variant === "ghost" ? `1.5px solid ${navy ? "rgba(255,255,255,.4)" : FLOW.line}` : "none",
      background: variant === "ghost" ? "transparent" : FLOW.gold, color: variant === "ghost" ? ink : "#1a1a1a",
    }}>{label}</button>
  );

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      style={{ height: "100dvh", background: bg, color: ink, fontFamily: BODY, display: "flex", flexDirection: "column", maxWidth: 520, margin: "0 auto", overflow: "hidden" }}>
      {/* full-screen card takeover — hide the global chat widget here */}
      <style>{`#wa-widget{display:none!important}`}</style>
      {/* progress */}
      <div style={{ padding: "16px 20px 8px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 5, marginBottom: 7 }}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i < card ? FLOW.gold : (navy ? "rgba(255,255,255,.22)" : FLOW.line) }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 600, color: dim }}>
          <span>{card} of {TOTAL}</span>
          {card === 1 && <span>About 2 min</span>}
        </div>
      </div>

      {/* body (scrolls if needed → never clips at 390×700) */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 22px 8px" }}>
        {card === 1 && (<>
          {eyebrow("You told us")}
          <h1 style={{ fontFamily: HEAD, fontSize: 30, lineHeight: 1.18, margin: "0 0 20px", fontWeight: 500 }}>{c.headline}</h1>
          <div style={{ background: "#fff", color: FLOW.ink, borderRadius: 14, borderTop: `3px solid ${GREEN}`, padding: "18px 18px 6px", boxShadow: "0 6px 20px rgba(0,0,0,.12)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: FLOW.dim, textTransform: "uppercase", marginBottom: 12 }}>The short version</div>
            <ShortRow label="This is good news." body={c.shortGood} />
            <ShortRow label={`Why the ${c.worryLabel} happens`} body={c.shortWhy} />
            <ShortRow label="What fixes it" body={c.shortFix} last />
          </div>
        </>)}

        {card === 2 && (<>
          {eyebrow(`Why the ${c.worryLabel} doesn’t stick`)}
          {c.whyParas.map((p, i) => <p key={i} style={{ fontSize: 18, lineHeight: 1.5, margin: "0 0 16px" }}>{p}</p>)}
        </>)}

        {card === 3 && (<>
          {eyebrow("It’s in your own answers")}
          {c.evidence.map((e, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: FLOW.dim, marginBottom: 4 }}>{e.leadIn}</div>
              <div style={{ fontFamily: HEAD, fontSize: 19, lineHeight: 1.35, color: FLOW.navy }}>“{e.quote}”</div>
            </div>
          ))}
          <p style={{ fontSize: 16, lineHeight: 1.5, color: FLOW.dim, marginTop: 18 }}>{c.evidenceTie}</p>
        </>)}

        {card === 4 && (<>
          {eyebrow(`A name for how ${c.childName} works`)}
          <h1 style={{ fontFamily: HEAD, fontSize: 44, lineHeight: 1.1, margin: "0 0 14px", fontWeight: 500 }}>{c.archetype}</h1>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: dim, margin: "0 0 22px" }}>One of eight common ways children pay attention. None is better or worse.</p>
          {strengths.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
              <span style={{ color: FLOW.goldSoft, fontWeight: 800, fontSize: 18, flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: 17, lineHeight: 1.4 }}>{s}</span>
            </div>
          ))}
        </>)}

        {card === 5 && (<>
          {eyebrow("The one switch")}
          <h1 style={{ fontFamily: HEAD, fontSize: 26, lineHeight: 1.2, margin: "0 0 20px", fontWeight: 500 }}>Change one sentence tonight.</h1>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", color: FLOW.dim, textTransform: "uppercase", marginBottom: 6 }}>Instead of</div>
          <p style={{ fontSize: 18, lineHeight: 1.4, color: FLOW.dim, textDecoration: "line-through", margin: "0 0 20px" }}>{c.switch.instead}</p>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", color: "#8A5F0F", textTransform: "uppercase", marginBottom: 6 }}>Try</div>
          <div style={{ border: `2px solid ${FLOW.gold}`, borderRadius: 14, padding: "16px 18px", background: FLOW.sel, marginBottom: 18 }}>
            <p style={{ fontFamily: HEAD, fontSize: 22, lineHeight: 1.3, margin: 0, color: FLOW.navy }}>{c.switch.try}</p>
          </div>
          <p style={{ fontSize: 16, lineHeight: 1.5 }}>{c.switch.after}</p>
        </>)}

        {card === 6 && (<>
          {eyebrow("Try it tonight · 5 min")}
          <ol style={{ listStyle: "none", padding: 0, margin: 0, counterReset: "step" }}>
            {c.tonight.map((t, i) => (
              <li key={i} style={{ display: "flex", gap: 13, alignItems: "flex-start", marginBottom: 16 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: FLOW.navy, color: "#fff", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 17, lineHeight: 1.4 }}>{t}</span>
              </li>
            ))}
          </ol>
          {checkinEnabled && (
            <p style={{ fontSize: 15, lineHeight: 1.5, color: FLOW.dim, marginTop: 10 }}>
              We’ll send one WhatsApp tomorrow to ask how it went.
            </p>
          )}
        </>)}

        {card === 7 && (<>
          {eyebrow("In six weeks")}
          <h1 style={{ fontFamily: HEAD, fontSize: 36, lineHeight: 1.15, margin: "0 0 16px", fontWeight: 500 }}>{goal}</h1>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: dim, margin: "0 0 10px" }}>
            Six weeks, one small change a week, 5 minutes a day. Written for {c.archetype}, age {ageBand}.
          </p>
          <button onClick={() => setSheet(true)} style={{ background: "none", border: "none", color: FLOW.goldSoft, fontWeight: 700, fontSize: 15, padding: 0, cursor: "pointer", textDecoration: "underline" }}>
            Not the goal you want? Pick another
          </button>
        </>)}
      </div>

      {/* footer actions */}
      <div style={{ flexShrink: 0, padding: "10px 22px calc(16px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 10 }}>
        {card === 1 && (<>
          <Btn label="Show me why →" onClick={() => nav(2)} />
          <button onClick={() => goPlan(true)} style={{ background: "none", border: "none", color: dim, fontWeight: 600, fontSize: 14, cursor: "pointer", minHeight: 38 }}>Skip to the plan</button>
        </>)}
        {card === 2 && <Btn label="How do you know? →" onClick={() => nav(3)} />}
        {card === 3 && <Btn label="Next →" onClick={() => nav(4)} />}
        {card === 4 && <Btn label="So what do I do? →" onClick={() => nav(5)} />}
        {card === 5 && <Btn label="Try it tonight →" onClick={() => nav(6)} />}
        {card === 6 && <Btn label="Where this goes →" onClick={() => nav(7)} />}
        {card === 7 && (<>
          <Btn label={`See ${c.childName}’s six-week plan →`} onClick={() => goPlan(false)} />
          <a href={calendlyUrl} target="_blank" rel="noopener noreferrer" onClick={() => fireEvent("call_click", sessionId, { where: "cards" })}
            style={{ textAlign: "center", minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 13, border: "1.5px solid rgba(255,255,255,.4)", color: "#fff", fontWeight: 700, fontSize: 15, textDecoration: "none" }}>
            Talk to us first (15 min, free)
          </a>
          <button onClick={() => nav(1)} style={{ background: "none", border: "none", color: dim, fontWeight: 600, fontSize: 14, cursor: "pointer", minHeight: 36 }}>Read the report again</button>
        </>)}
      </div>

      {/* goal bottom sheet */}
      {sheet && (
        <div onClick={() => setSheet(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "#fff", color: FLOW.ink, borderRadius: "18px 18px 0 0", padding: "20px 20px calc(20px + env(safe-area-inset-bottom))", maxHeight: "80dvh", overflowY: "auto" }}>
            <div style={{ fontFamily: HEAD, fontSize: 20, marginBottom: 14 }}>Pick the goal that fits</div>
            {goalOptions.map((o) => (
              <button key={o.key} onClick={() => saveGoal(o)} style={{ display: "block", width: "100%", textAlign: "left", padding: "14px 16px", marginBottom: 8, borderRadius: 12, border: `1.5px solid ${o.text === goal ? FLOW.gold : FLOW.line}`, background: o.text === goal ? FLOW.sel : "#fff", fontSize: 16, lineHeight: 1.35, cursor: "pointer", fontFamily: BODY, color: FLOW.ink }}>
                {o.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ShortRow({ label, body, last }: { label: string; body: string; last?: boolean }) {
  return (
    <div style={{ marginBottom: last ? 14 : 14, paddingBottom: last ? 0 : 14, borderBottom: last ? "none" : `1px solid ${FLOW.line}` }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: FLOW.navy, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 16, lineHeight: 1.45 }}>{body}</div>
    </div>
  );
}

