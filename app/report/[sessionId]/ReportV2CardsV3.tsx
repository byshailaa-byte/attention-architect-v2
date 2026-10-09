"use client";
// Report v3 as 5 full-screen cards (rendered when content.layout === "v3"). Shell, nav,
// progress, swipe, goal-change sheet and navy-card styling mirror the 7-card deck
// (ReportV2Cards.tsx); only the card count (5) and the content differ. Static copy is the
// VERBATIM v3-copy.ts strings; tokens are filled here via the shared makeFiller. No WhatsApp
// mentions anywhere. Navy cards: 1, 5. Cream cards: 2, 3, 4.
import { useCallback, useEffect, useRef, useState } from "react";
import { FLOW, HEAD, BODY, FREQUENCY_CARD1_PHRASE } from "@/app/components/FlowShell";
import { CARD_TOTAL_V3 as TOTAL } from "@/lib/report-v2/cards-nav";
import { makeFiller, typeName, type CardsCopy } from "@/lib/report-v2/cards-copy";
import type { ReportV2Content } from "@/lib/report-v2/types";
import type { Gender } from "@/lib/report/pronouns";
import {
  CARD1_PROGRESS, CARD_READ_TIME, INTRO_BOX, CARD1_EYEBROW, CARD1_BOX_LABEL, CARD1_BOX_CLOSING,
  CARD1_UNDER_BOX, CARD1_BTN_WHY, CARD1_BTN_SKIP, WORRY_LINE,
  CARD2_EYEBROW, CARD2_BTN, WHY_BOXES, bareArchetype,
  CARD3_EYEBROW, CARD3_HEADLINE, CARD3_BOX_LABEL, card3BoxClosing, CARD3_NOTE, CARD3_BTN, NEED, PLAIN_ANSWER,
  CARD4_EYEBROW, CARD4_HEADLINE, CARD4_INSTEAD_LABEL, CARD4_SAY_LABEL, CARD4_HOW_LABEL, CARD4_UNDER, CARD4_BTN,
  CARD5_EYEBROW, CARD5_HEADLINE, CARD5_SUB, CARD5_HOW_LABEL, HOW_IT_WORKS_STEPS, HOW_IT_WORKS_COACH,
  CARD5_GOAL_LABEL, CARD5_GOAL_SMALL, CARD5_BTN_PLAN, CARD5_BTN_CALL, CARD5_PICK_ANOTHER,
} from "@/lib/report-v2/v3-copy";

import { track } from "@/lib/analytics/track";

const GREEN = "#2F9E6E";
const RED = "#C2543B";

// Minimal **bold** markdown → React nodes. Only ** is used in the v3 copy.
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**")
          ? <strong key={i} style={{ fontWeight: 700 }}>{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

function clampV3(n: unknown): number {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return 1;
  return Math.min(TOTAL, Math.max(1, v));
}

type Props = {
  sessionId: string;
  content: ReportV2Content;
  copy: CardsCopy;                 // reused: copy.card1Headline + copy.card2Headline
  strengths: [string, string, string];
  gender: Gender;
  childName: string;
  frequency?: string | null;       // C2 "how often?" key (d1_2/d3_4/most/daily) or null
  goalOptions: { key: string; text: string }[];
  initialCard: number;
  planHref: string;
  calendlyUrl: string;
};

export default function ReportV2CardsV3(props: Props) {
  const { sessionId, content: c, copy, strengths, gender, childName, frequency, goalOptions, planHref, calendlyUrl } = props;
  const frequencyPhrase = frequency ? (FREQUENCY_CARD1_PHRASE[frequency] ?? null) : null;
  const [card, setCard] = useState(clampV3(props.initialCard || 1));
  const [goal, setGoal] = useState(c.goal);
  const [sheet, setSheet] = useState(false);
  const touchX = useRef<number | null>(null);

  const f = makeFiller(childName, gender);
  const bare = bareArchetype(c.archetype);
  const type = typeName(c.archetype);

  useEffect(() => {
    track("report_card_view", { card, layout: "v3" }, sessionId);
  }, [card, sessionId]);

  const nav = useCallback((n: number, push = true) => {
    const next = clampV3(n);
    if (push) window.history.pushState({ card: next }, "", `?report=v2&card=${next}`);
    setCard(next);
  }, []);

  useEffect(() => {
    window.history.replaceState({ card }, "", `?report=v2&card=${card}`);
    const onPop = (e: PopStateEvent) => {
      const fromState = (e.state && typeof e.state.card === "number") ? e.state.card : null;
      const fromUrl = Number(new URLSearchParams(window.location.search).get("card"));
      const n = fromState ?? (fromUrl >= 1 ? fromUrl : 1);
      setCard(clampV3(n));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goPlan = (skip: boolean) => {
    if (skip) track("report_skip_to_plan", { from: card }, sessionId);
    window.location.assign(planHref);
  };
  const saveGoal = async (opt: { key: string; text: string }) => {
    setGoal(opt.text); setSheet(false);
    track("goal_changed", { goalKey: opt.key }, sessionId);
    await fetch("/api/report/goal-v2", {
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

  const navy = card === 1 || card === 5;
  const bg = navy ? FLOW.navy : FLOW.cream;
  const ink = navy ? "#fff" : FLOW.ink;
  const dim = navy ? FLOW.onNavy : FLOW.dim;
  const eyebrow = (t: string) => (
    <div style={{ fontFamily: BODY, fontSize: 12, fontWeight: 700, letterSpacing: ".12em", color: navy ? FLOW.goldSoft : FLOW.gold, textTransform: "uppercase", marginBottom: 12 }}>{t}</div>
  );
  const miniLabel = (t: string, color: string) => (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color, textTransform: "uppercase", marginBottom: 8 }}>{t}</div>
  );
  const Btn = ({ label, onClick, variant = "primary" as "primary" | "ghost" }: { label: string; onClick: () => void; variant?: "primary" | "ghost" }) => (
    <button onClick={onClick} style={{
      width: "100%", minHeight: 50, borderRadius: 13, cursor: "pointer", fontFamily: BODY, fontWeight: 700, fontSize: 16,
      border: variant === "ghost" ? `1.5px solid ${navy ? "rgba(255,255,255,.4)" : FLOW.line}` : "none",
      background: variant === "ghost" ? "transparent" : FLOW.gold, color: variant === "ghost" ? ink : "#1a1a1a",
    }}>{label}</button>
  );

  const why = WHY_BOXES[bare];
  // Card 3: the evidence picks → PLAIN_ANSWER[qid][optionValue], falling back to the stored
  // quote. evidence.ts already returns the supporting-and-non-contradicting set (2 or 3 items);
  // the closing count word ("Three"/"Two") follows that length so copy and evidence agree.
  const youToldUs = c.evidence.slice(0, 3).map((e) => {
    const tmpl = e.qid && e.optionValue ? PLAIN_ANSWER[e.qid]?.[e.optionValue] : undefined;
    return tmpl ? f(tmpl) : e.quote;
  });
  const needLine = f(card3BoxClosing(youToldUs.length).replace("{NEED}", NEED[bare] ?? "what fits {him}"));

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
          {card === 1 && <span>{CARD_READ_TIME}</span>}
        </div>
      </div>

      {/* body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 22px 8px" }}>
        {card === 1 && (<>
          <div style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.22)", borderRadius: 14, padding: "14px 16px", marginBottom: 20, fontSize: 15.5, lineHeight: 1.5 }}>
            <Rich text={f(INTRO_BOX)} />
          </div>
          {eyebrow(CARD1_EYEBROW)}
          <h1 style={{ fontFamily: HEAD, fontSize: 30, lineHeight: 1.18, margin: frequencyPhrase ? "0 0 8px" : "0 0 18px", fontWeight: 500 }}>{copy.card1Headline}</h1>
          {frequencyPhrase && (
            <p style={{ fontSize: 15, lineHeight: 1.4, color: dim, margin: "0 0 18px" }}>This happens {frequencyPhrase}.</p>
          )}
          <div style={{ background: "#fff", color: FLOW.ink, borderRadius: 14, padding: "18px 18px", boxShadow: "0 6px 20px rgba(0,0,0,.12)" }}>
            {miniLabel(CARD1_BOX_LABEL, FLOW.dim)}
            <div style={{ display: "flex", gap: 11, alignItems: "flex-start", marginBottom: 12 }}>
              <span style={{ color: GREEN, fontWeight: 800, fontSize: 18, flexShrink: 0, lineHeight: 1.4 }}>✓</span>
              <p style={{ fontSize: 16, lineHeight: 1.5, margin: 0 }}>{c.seenIt}</p>
            </div>
            <div style={{ display: "flex", gap: 11, alignItems: "flex-start", marginBottom: 14 }}>
              <span style={{ color: RED, fontWeight: 800, fontSize: 18, flexShrink: 0, lineHeight: 1.4 }}>!</span>
              <p style={{ fontSize: 16, lineHeight: 1.5, margin: 0 }}>{f(WORRY_LINE[c.concern] ?? WORRY_LINE.other)}</p>
            </div>
            <div style={{ height: 1, background: FLOW.line, margin: "0 0 14px" }} />
            <p style={{ fontSize: 16.5, lineHeight: 1.5, fontWeight: 700, margin: 0, color: FLOW.navy }}>{f(CARD1_BOX_CLOSING)}</p>
          </div>
          <p style={{ fontSize: 15.5, lineHeight: 1.5, color: dim, margin: "16px 0 0" }}>{f(CARD1_UNDER_BOX)}</p>
        </>)}

        {card === 2 && (<>
          {eyebrow(CARD2_EYEBROW)}
          <h1 style={{ fontFamily: HEAD, fontSize: 28, lineHeight: 1.2, margin: "0 0 20px", fontWeight: 500 }}>{copy.card2Headline}</h1>
          {why && (<>
            <div style={{ background: "rgba(47,158,110,.12)", border: `1px solid rgba(47,158,110,.4)`, borderRadius: 14, padding: "16px 18px", marginBottom: 12 }}>
              {miniLabel(f(why.greenLabel), GREEN)}
              <p style={{ fontSize: 17, lineHeight: 1.45, margin: 0, color: FLOW.navy }}>{f(why.greenLine)}</p>
            </div>
            <div style={{ background: "rgba(194,84,59,.08)", border: `1px solid rgba(194,84,59,.35)`, borderRadius: 14, padding: "16px 18px", marginBottom: 18 }}>
              {miniLabel(f(why.redLabel), RED)}
              <p style={{ fontSize: 17, lineHeight: 1.45, margin: 0, color: FLOW.navy }}>{f(why.redLine)}</p>
            </div>
          </>)}
          <p style={{ fontSize: 18, lineHeight: 1.5, margin: 0, fontWeight: 700, color: FLOW.navy }}>{c.hardPart}</p>
        </>)}

        {card === 3 && (<>
          {eyebrow(CARD3_EYEBROW)}
          <h1 style={{ fontFamily: HEAD, fontSize: 28, lineHeight: 1.2, margin: "0 0 20px", fontWeight: 500 }}>{CARD3_HEADLINE}</h1>
          <div style={{ background: "#fff", border: `1.5px solid ${FLOW.line}`, borderRadius: 14, padding: "18px 18px" }}>
            {miniLabel(CARD3_BOX_LABEL, FLOW.dim)}
            {youToldUs.map((line, i) => (
              <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start", marginBottom: i < youToldUs.length - 1 ? 12 : 14 }}>
                <span style={{ color: FLOW.gold, fontWeight: 800, fontSize: 16, flexShrink: 0, lineHeight: 1.4 }}>•</span>
                <p style={{ fontSize: 16, lineHeight: 1.5, margin: 0 }}>{line}</p>
              </div>
            ))}
            <div style={{ height: 1, background: FLOW.line, margin: "0 0 14px" }} />
            <p style={{ fontSize: 16.5, lineHeight: 1.5, fontWeight: 700, margin: 0, color: FLOW.navy }}>{needLine}</p>
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: FLOW.dim, margin: "16px 0 0" }}>
            {f(CARD3_NOTE.replace(/\{Type\}/g, type))} {strengths[0]}
          </p>
        </>)}

        {card === 4 && (<>
          {eyebrow(CARD4_EYEBROW)}
          <h1 style={{ fontFamily: HEAD, fontSize: 28, lineHeight: 1.2, margin: "0 0 20px", fontWeight: 500 }}>{CARD4_HEADLINE}</h1>
          {miniLabel(CARD4_INSTEAD_LABEL, FLOW.dim)}
          <p style={{ fontSize: 18, lineHeight: 1.4, color: FLOW.dim, textDecoration: "line-through", margin: "0 0 18px" }}>{c.switch.instead}</p>
          {miniLabel(CARD4_SAY_LABEL, "#8A5F0F")}
          <div style={{ border: `2px solid ${FLOW.gold}`, borderRadius: 14, padding: "16px 18px", background: FLOW.sel, marginBottom: 20 }}>
            <p style={{ fontFamily: HEAD, fontSize: 22, lineHeight: 1.3, margin: 0, color: FLOW.navy }}>{c.switch.try}</p>
          </div>
          {miniLabel(CARD4_HOW_LABEL, FLOW.dim)}
          <ol style={{ listStyle: "none", padding: 0, margin: "0 0 18px" }}>
            {c.tonight.slice(0, 3).map((t, i) => (
              <li key={i} style={{ display: "flex", gap: 13, alignItems: "flex-start", marginBottom: 14 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: FLOW.navy, color: "#fff", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 17, lineHeight: 1.4 }}>{t}</span>
              </li>
            ))}
          </ol>
          <p style={{ fontSize: 15.5, lineHeight: 1.5, color: FLOW.dim, margin: 0 }}>{CARD4_UNDER}</p>
        </>)}

        {card === 5 && (<>
          {eyebrow(CARD5_EYEBROW)}
          <h1 style={{ fontFamily: HEAD, fontSize: 30, lineHeight: 1.15, margin: "0 0 12px", fontWeight: 500 }}>{CARD5_HEADLINE}</h1>
          <p style={{ fontSize: 15.5, lineHeight: 1.5, color: dim, margin: "0 0 20px" }}>{f(CARD5_SUB)}</p>
          <div style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.22)", borderRadius: 14, padding: "16px 18px", marginBottom: 18 }}>
            {miniLabel(CARD5_HOW_LABEL, FLOW.goldSoft)}
            <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {HOW_IT_WORKS_STEPS.map((s, i) => (
                <li key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start", marginBottom: 11 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 7, background: FLOW.gold, color: "#1a1a1a", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 15.5, lineHeight: 1.45 }}><Rich text={f(s)} /></span>
                </li>
              ))}
            </ol>
            <div style={{ height: 1, background: "rgba(255,255,255,.22)", margin: "12px 0" }} />
            <p style={{ fontSize: 15.5, lineHeight: 1.5, margin: 0 }}><Rich text={f(HOW_IT_WORKS_COACH)} /></p>
          </div>
          <div style={{ background: FLOW.cream, color: FLOW.ink, borderRadius: 14, padding: "18px 18px", marginBottom: 6 }}>
            {miniLabel(CARD5_GOAL_LABEL, FLOW.gold)}
            <h2 style={{ fontFamily: HEAD, fontSize: 22, lineHeight: 1.2, margin: "0 0 10px", fontWeight: 500, color: FLOW.navy }}>{goal}</h2>
            <button onClick={() => setSheet(true)} style={{ background: "none", border: "none", color: "#8A5F0F", fontWeight: 700, fontSize: 14, padding: 0, cursor: "pointer", textDecoration: "underline", marginBottom: 12 }}>
              {CARD5_PICK_ANOTHER}
            </button>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: FLOW.dim, margin: 0 }}>{CARD5_GOAL_SMALL}</p>
          </div>
        </>)}
      </div>

      {/* footer actions */}
      <div style={{ flexShrink: 0, padding: "10px 22px calc(16px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 10 }}>
        {card === 1 && (<>
          <Btn label={CARD1_BTN_WHY} onClick={() => nav(2)} />
          <button onClick={() => goPlan(true)} style={{ background: "none", border: "none", color: dim, fontWeight: 600, fontSize: 14, cursor: "pointer", minHeight: 38 }}>{CARD1_BTN_SKIP}</button>
        </>)}
        {card === 2 && <Btn label={CARD2_BTN} onClick={() => nav(3)} />}
        {card === 3 && <Btn label={CARD3_BTN} onClick={() => nav(4)} />}
        {card === 4 && <Btn label={CARD4_BTN} onClick={() => nav(5)} />}
        {card === 5 && (<>
          <Btn label={f(CARD5_BTN_PLAN)} onClick={() => goPlan(false)} />
          <a href={calendlyUrl} target="_blank" rel="noopener noreferrer" onClick={() => track("call_click", { where: "cards" }, sessionId)}
            style={{ textAlign: "center", minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 13, border: "1.5px solid rgba(255,255,255,.4)", color: "#fff", fontWeight: 700, fontSize: 15, textDecoration: "none" }}>
            {CARD5_BTN_CALL}
          </a>
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
