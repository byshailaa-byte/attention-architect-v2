"use client";
// Report v3 as 6 cards, each sized to ONE phone screen (rendered when content.layout === "v3").
// Cards 1–5 are the report; card 6 is the goal picker (card 5 → card 6 → plan).
// Layout contract (report-fixes-v4 · B):
//   • 100dvh flex column: sticky TOP bar (progress + ← Back + "N of 6" + "See plan →" on 1–4) and
//     sticky BOTTOM bar (the one main button). Content between, never covered by either.
//   • NO inner scroll anywhere — the body has no overflow box. From 360×700 up the card fits with
//     no page scroll; below 700px tall the whole card scrolls as one page (bars stay sticky).
//   • Swiping is OFF. Only the buttons and the phone Back button move between cards.
//   • One history entry per card via ?c=N; reloading stays on the same card; Back = previous card.
//   • Every tappable control has a ≥44px hit area (text links use padding + negative margin so the
//     look is unchanged).
import { useCallback, useEffect, useState } from "react";
import { FLOW, HEAD, BODY, FREQUENCY_CARD1_PHRASE } from "@/app/components/FlowShell";
import { CARD_TOTAL_V3 as TOTAL } from "@/lib/report-v2/cards-nav";
import { makeFiller, typeName, type CardsCopy } from "@/lib/report-v2/cards-copy";
import type { ReportV2Content } from "@/lib/report-v2/types";
import type { Gender } from "@/lib/report/pronouns";
import {
  CARD1_INTRO_ONELINE, CARD1_EYEBROW, CARD1_BOX_LABEL, CARD1_BTN_WHY, WORRY_LINE,
  CARD2_EYEBROW, CARD2_BTN, WHY_BOXES, bareArchetype,
  CARD3_EYEBROW, CARD3_HEADLINE, CARD3_BOX_LABEL, card3BoxClosing, CARD3_NOTE, CARD3_BTN, NEED, PLAIN_ANSWER,
  CARD4_EYEBROW, CARD4_HEADLINE, CARD4_INSTEAD_LABEL, CARD4_SAY_LABEL, CARD4_HOW_LABEL, CARD4_UNDER, CARD4_BTN,
  CARD5_EYEBROW, CARD5_HEADLINE, CARD5_SUB, CARD5_GOAL_LABEL, CARD5_GOAL_SMALL, CARD5_BTN_GOAL, GOAL_LINE,
  CARD6_EYEBROW, CARD6_HEADING, CARD6_SUGGESTED, CARD6_BTN_PLAN,
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
  goalOptions: { key: string; text: string }[];  // card-6 picker options (key = concern key)
  initialCard: number;
  planHref: string;
  calendlyUrl: string;             // kept for signature parity (call link removed from card 5)
};

export default function ReportV2CardsV3(props: Props) {
  const { sessionId, content: c, copy, strengths, gender, childName, frequency, goalOptions, planHref } = props;
  const frequencyPhrase = frequency ? (FREQUENCY_CARD1_PHRASE[frequency] ?? null) : null;
  const [card, setCard] = useState(clampV3(props.initialCard || 1));
  // Card-6 goal picker: the worry's goal is the suggested default pre-selection.
  const suggestedKey = c.concern;
  const [selGoal, setSelGoal] = useState(suggestedKey);
  const [saving, setSaving] = useState(false);

  const f = makeFiller(childName, gender);
  const bare = bareArchetype(c.archetype);
  const type = typeName(c.archetype);
  // Card-5 goal box shows the approved per-worry line (the suggested goal).
  const goal = f(GOAL_LINE[c.concern] ?? GOAL_LINE.other);

  useEffect(() => {
    track("report_card_view", { card, layout: "v3" }, sessionId);
  }, [card, sessionId]);

  // One history entry per card. ?c=N so reloads land on the same card (page.tsx reads ?c).
  const nav = useCallback((n: number, push = true) => {
    const next = clampV3(n);
    if (push) window.history.pushState({ card: next }, "", `?report=v2&c=${next}`);
    setCard(next);
  }, []);

  useEffect(() => {
    window.history.replaceState({ card }, "", `?report=v2&c=${card}`);
    const onPop = (e: PopStateEvent) => {
      const fromState = (e.state && typeof e.state.card === "number") ? e.state.card : null;
      const fromUrl = Number(new URLSearchParams(window.location.search).get("c"));
      const n = fromState ?? (fromUrl >= 1 ? fromUrl : 1);
      setCard(clampV3(n));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goPlan = () => { window.location.assign(planHref); };
  // Cards 1–4 "See plan →": straight to the plan on the worry's default goal (no goal change).
  const goSkip = () => { track("report_skip_to_plan", { from: card }, sessionId); window.location.assign(planHref); };
  const back = () => { if (card > 1) window.history.back(); else goPlan(); };

  // Card 6 "See plan →": save the chosen goal (report_v2_goal) + fire report_goal_selected
  // (GA4 + DB only — goalKey is a concern key, no child data), then go to the plan.
  const confirmGoal = async () => {
    if (saving) return;
    setSaving(true);
    const opt = goalOptions.find((o) => o.key === selGoal);
    track("report_goal_selected", { goalKey: selGoal, changed: selGoal !== suggestedKey }, sessionId);
    if (opt) {
      await fetch("/api/report/goal-v2", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, goal: opt.text, goalKey: selGoal }),
      }).catch(() => {});
    }
    window.location.assign(planHref);
  };

  const navy = card === 1 || card === 5;
  const bg = navy ? FLOW.navy : FLOW.cream;
  const ink = navy ? "#fff" : FLOW.ink;
  const dim = navy ? FLOW.onNavy : FLOW.dim;
  const eyebrow = (t: string) => (
    <div style={{ fontFamily: BODY, fontSize: 12, fontWeight: 700, letterSpacing: ".12em", color: navy ? FLOW.goldSoft : FLOW.gold, textTransform: "uppercase", marginBottom: 10 }}>{t}</div>
  );
  const miniLabel = (t: string, color: string) => (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color, textTransform: "uppercase", marginBottom: 8 }}>{t}</div>
  );
  const H1 = ({ children, mb = 16 }: { children: React.ReactNode; mb?: number }) => (
    <h1 style={{ fontFamily: HEAD, fontSize: 27, lineHeight: 1.2, margin: `0 0 ${mb}px`, fontWeight: 500 }}>{children}</h1>
  );
  const Btn = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button onClick={onClick} style={{
      width: "100%", minHeight: 52, borderRadius: 13, cursor: "pointer", fontFamily: BODY, fontWeight: 700, fontSize: 16,
      border: "none", background: FLOW.gold, color: "#1a1a1a",
    }}>{label}</button>
  );
  // Top-bar text links: ≥44px hit area via padding, visual position preserved via negative margin.
  const barLink: React.CSSProperties = {
    background: "none", border: "none", color: dim, fontWeight: 700, fontSize: 13.5, cursor: "pointer",
    fontFamily: BODY, minHeight: 44, display: "inline-flex", alignItems: "center",
    padding: "0 10px", margin: "-14px -10px", lineHeight: 1,
  };

  const why = WHY_BOXES[bare];
  const youToldUs = c.evidence.slice(0, 3).map((e) => {
    const tmpl = e.qid && e.optionValue ? PLAIN_ANSWER[e.qid]?.[e.optionValue] : undefined;
    return tmpl ? f(tmpl) : e.quote;
  });
  const needLine = f(card3BoxClosing(youToldUs.length).replace("{NEED}", NEED[bare] ?? "what fits {him}"));

  return (
    <div style={{ minHeight: "100dvh", background: bg, color: ink, fontFamily: BODY, display: "flex", flexDirection: "column", maxWidth: 520, margin: "0 auto" }}>
      {/* full-screen card takeover — hide the global chat widget here */}
      <style>{`#wa-widget{display:none!important}`}</style>

      {/* fixed TOP bar: progress + ← Back + "N of 6" + "See plan →" (cards 1–4) */}
      <div style={{ position: "sticky", top: 0, zIndex: 2, background: bg, padding: "14px 20px 10px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i < card ? FLOW.gold : (navy ? "rgba(255,255,255,.22)" : FLOW.line) }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, fontWeight: 600, color: dim }}>
          <button onClick={back} aria-label="Back" style={barLink}>← Back</button>
          <span>{card} of {TOTAL}</span>
          {card <= 4
            ? <button onClick={goSkip} style={barLink}>See plan →</button>
            : <span aria-hidden style={{ width: 52 }} />}
        </div>
      </div>

      {/* body — no inner scroll; grows to fill, or the whole page scrolls on very short screens */}
      <div style={{ flex: "1 0 auto", padding: "12px 22px 10px" }}>
        {card === 1 && (<>
          <p style={{ fontSize: 15, lineHeight: 1.45, color: dim, margin: "0 0 16px" }}><Rich text={f(CARD1_INTRO_ONELINE)} /></p>
          {eyebrow(CARD1_EYEBROW)}
          <H1 mb={frequencyPhrase ? 8 : 16}>{copy.card1Headline}</H1>
          {frequencyPhrase && (
            <p style={{ fontSize: 15, lineHeight: 1.4, color: dim, margin: "0 0 16px" }}>This happens {frequencyPhrase}.</p>
          )}
          <div style={{ background: "#fff", color: FLOW.ink, borderRadius: 14, padding: 16, boxShadow: "0 6px 20px rgba(0,0,0,.12)" }}>
            {miniLabel(CARD1_BOX_LABEL, FLOW.dim)}
            <div style={{ display: "flex", gap: 11, alignItems: "flex-start", marginBottom: 12 }}>
              <span style={{ color: GREEN, fontWeight: 800, fontSize: 18, flexShrink: 0, lineHeight: 1.4 }}>✓</span>
              <p style={{ fontSize: 16, lineHeight: 1.5, margin: 0 }}>{c.seenIt}</p>
            </div>
            <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
              <span style={{ color: RED, fontWeight: 800, fontSize: 18, flexShrink: 0, lineHeight: 1.4 }}>!</span>
              <p style={{ fontSize: 16, lineHeight: 1.5, margin: 0 }}>{f(WORRY_LINE[c.concern] ?? WORRY_LINE.other)}</p>
            </div>
          </div>
        </>)}

        {card === 2 && (<>
          {eyebrow(CARD2_EYEBROW)}
          <H1>{copy.card2Headline}</H1>
          {why && (<>
            <div style={{ background: "rgba(47,158,110,.12)", border: `1px solid rgba(47,158,110,.4)`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
              {miniLabel(f(why.greenLabel), GREEN)}
              <p style={{ fontSize: 17, lineHeight: 1.45, margin: 0, color: FLOW.navy }}>{f(why.greenLine)}</p>
            </div>
            <div style={{ background: "rgba(194,84,59,.08)", border: `1px solid rgba(194,84,59,.35)`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
              {miniLabel(f(why.redLabel), RED)}
              <p style={{ fontSize: 17, lineHeight: 1.45, margin: 0, color: FLOW.navy }}>{f(why.redLine)}</p>
            </div>
          </>)}
          <p style={{ fontSize: 17, lineHeight: 1.5, margin: 0, fontWeight: 700, color: FLOW.navy }}>{c.hardPart}</p>
        </>)}

        {card === 3 && (<>
          {eyebrow(CARD3_EYEBROW)}
          <H1>{CARD3_HEADLINE}</H1>
          <div style={{ background: "#fff", border: `1.5px solid ${FLOW.line}`, borderRadius: 14, padding: 16 }}>
            {miniLabel(CARD3_BOX_LABEL, FLOW.dim)}
            {youToldUs.map((line, i) => (
              <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start", marginBottom: i < youToldUs.length - 1 ? 11 : 13 }}>
                <span style={{ color: FLOW.gold, fontWeight: 800, fontSize: 16, flexShrink: 0, lineHeight: 1.4 }}>•</span>
                <p style={{ fontSize: 15.5, lineHeight: 1.45, margin: 0 }}>{line}</p>
              </div>
            ))}
            <div style={{ height: 1, background: FLOW.line, margin: "0 0 13px" }} />
            <p style={{ fontSize: 16.5, lineHeight: 1.5, fontWeight: 700, margin: 0, color: FLOW.navy }}>{needLine}</p>
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: FLOW.dim, margin: "14px 0 0" }}>
            {f(CARD3_NOTE.replace(/\{Type\}/g, type))} {strengths[0]}
          </p>
        </>)}

        {card === 4 && (<>
          {eyebrow(CARD4_EYEBROW)}
          <H1>{CARD4_HEADLINE}</H1>
          {miniLabel(CARD4_INSTEAD_LABEL, FLOW.dim)}
          <p style={{ fontSize: 17, lineHeight: 1.4, color: FLOW.dim, textDecoration: "line-through", margin: "0 0 14px" }}>{c.switch.instead}</p>
          {miniLabel(CARD4_SAY_LABEL, "#8A5F0F")}
          <div style={{ border: `2px solid ${FLOW.gold}`, borderRadius: 14, padding: 16, background: FLOW.sel, marginBottom: 16 }}>
            <p style={{ fontFamily: HEAD, fontSize: 21, lineHeight: 1.3, margin: 0, color: FLOW.navy }}>{c.switch.try}</p>
          </div>
          {miniLabel(CARD4_HOW_LABEL, FLOW.dim)}
          <ol style={{ listStyle: "none", padding: 0, margin: "0 0 14px" }}>
            {c.tonight.slice(0, 3).map((t, i) => (
              <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
                <span style={{ width: 26, height: 26, borderRadius: 8, background: FLOW.navy, color: "#fff", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 16, lineHeight: 1.4 }}>{t}</span>
              </li>
            ))}
          </ol>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: FLOW.dim, margin: 0 }}>{CARD4_UNDER}</p>
        </>)}

        {card === 5 && (<>
          {eyebrow(CARD5_EYEBROW)}
          <H1 mb={10}>{CARD5_HEADLINE}</H1>
          <p style={{ fontSize: 15.5, lineHeight: 1.5, color: dim, margin: "0 0 18px" }}>{f(CARD5_SUB)}</p>
          <div style={{ background: FLOW.cream, color: FLOW.ink, borderRadius: 14, padding: 18 }}>
            {miniLabel(CARD5_GOAL_LABEL, FLOW.gold)}
            <h2 style={{ fontFamily: HEAD, fontSize: 22, lineHeight: 1.25, margin: "0 0 12px", fontWeight: 500, color: FLOW.navy }}>{goal}</h2>
            <p style={{ fontSize: 13.5, lineHeight: 1.5, color: FLOW.dim, margin: 0 }}>{CARD5_GOAL_SMALL}</p>
          </div>
        </>)}

        {card === 6 && (<>
          {eyebrow(CARD6_EYEBROW)}
          <H1 mb={12}>{CARD6_HEADING}</H1>
          <div>
            {goalOptions.map((o) => {
              const selected = o.key === selGoal;
              const suggested = o.key === suggestedKey;
              return (
                <button key={o.key} onClick={() => setSelGoal(o.key)} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%", textAlign: "left",
                  minHeight: 44, padding: "9px 14px", marginBottom: 6, borderRadius: 12, cursor: "pointer", fontFamily: BODY,
                  border: `1.5px solid ${selected ? FLOW.gold : FLOW.line}`, background: selected ? FLOW.sel : "#fff",
                  color: FLOW.ink, fontSize: 14.5, lineHeight: 1.3, fontWeight: selected ? 700 : 500,
                }}>
                  <span>{o.text}</span>
                  {suggested && (
                    <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "#8A5F0F", background: "#F6E3BE", borderRadius: 999, padding: "3px 8px" }}>{CARD6_SUGGESTED}</span>
                  )}
                </button>
              );
            })}
          </div>
        </>)}
      </div>

      {/* fixed BOTTOM bar: the one main button */}
      <div style={{ position: "sticky", bottom: 0, zIndex: 2, background: bg, flexShrink: 0, padding: "10px 22px calc(14px + env(safe-area-inset-bottom))", boxShadow: navy ? "0 -6px 18px rgba(30,58,95,.35)" : "0 -6px 18px rgba(0,0,0,.06)" }}>
        {card === 1 && <Btn label={CARD1_BTN_WHY} onClick={() => nav(2)} />}
        {card === 2 && <Btn label={CARD2_BTN} onClick={() => nav(3)} />}
        {card === 3 && <Btn label={CARD3_BTN} onClick={() => nav(4)} />}
        {card === 4 && <Btn label={CARD4_BTN} onClick={() => nav(5)} />}
        {card === 5 && <Btn label={f(CARD5_BTN_GOAL)} onClick={() => nav(6)} />}
        {card === 6 && <Btn label={f(CARD6_BTN_PLAN)} onClick={confirmGoal} />}
      </div>
    </div>
  );
}
