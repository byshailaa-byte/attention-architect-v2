"use client";
// Report + Roadmap v3 — 6 swipe cards then one scroll, same page. All copy is the approved bank in
// lib/report-v3/copy.ts (filled per child); the ONLY generated bit is tonight's step (Card 5), passed
// in `facts`. No pattern names, no scores/tiers, pronouns from child_gender. Matches the approved mockup.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  PATTERN_LINE, STRENGTH, PULL, STUCK, TODAY_TOWARD,
  CARD1, CARD2, CARD3, CARD4, CARD5, CARD6,
  LADDER, LADDER_START_NOTE, WEEKS, SUPPORT, PLANS, FAQ, FINAL_CTA, fillV3,
  type ArchetypeKey, type WorryKey,
} from "@/lib/report-v3/copy";
import type { Gender } from "@/lib/report/pronouns";

// ── Palette (navy / cream / gold, matching the rest of the product) ──
const C = {
  navy: "#17293B", ink: "#223247", dim: "#6B7686", white: "#FFFFFF", cream: "#FBF6EC",
  gold: "#E0A127", darkGold: "#B07D18", line: "#EDE6D6", line2: "#E2DAC8",
  tintGold: "#FBF1DC", tintNavy: "#EAEFF4", green: "#2F9E6E", greenInk: "#1F6B49", tintGreen: "#E7F3EC",
  red: "#C2543B",
};
const HEAD = "'Fraunces', Georgia, serif";
const BODY = "'Inter', system-ui, sans-serif";

export type V3Facts = {
  name: string; gender: Gender; band: string; archKey: ArchetypeKey; worryKey: WorryKey;
  tonightMoment: string; tonightStep: string; tonightInstead: string | null; tonightNotice: string;
  tonightSource: "llm" | "fallback";
};
type Week1Day = { day: number; title: string; teaser: string; observe: boolean };

// The 8 existing testimonials — verbatim from app/simplified/page.tsx. Not edited, none added.
const TESTIMONIALS = [
  { quote: "It was the ten-second pause that did it. I stopped rescuing him the second he stalled, and within a fortnight he was finishing questions I would have jumped into.", who: "Meghna R.", detail: "Mother of a 9-year-old, Pune" },
  { quote: "I had been calling it laziness for two years. Reading the profile was uncomfortable — it described me as much as her. That is what made it useful.", who: "Arun S.", detail: "Father of an 11-year-old, Bengaluru" },
  { quote: "Nothing about our evening got longer. One sentence changed, that is all. He now starts on his own about four nights out of five.", who: "Priya N.", detail: "Mother of an 8-year-old, Delhi" },
  { quote: "We had done the tutoring, the charts, the rewards. This is the first thing that explained why none of it stuck.", who: "Fatima K.", detail: "Mother of a 12-year-old, Hyderabad" },
  { quote: "The plan told me what to stop doing, which no one had ever done. Week three was the one that mattered for us.", who: "Rahul & Divya", detail: "Parents of a 10-year-old, Mumbai" },
  { quote: "We believed our son just needed more discipline. This completely changed our perspective. A few simple changes reduced the daily arguments, and studying no longer feels like a battle.", who: "Sandeel Shukla", detail: "Parent of a 14-year-old Son · Raipur" },
  { quote: "We thought our son was just being lazy or spending too much time on screens. This helped us understand what was really happening. Homework became much calmer, and so did our evenings.", who: "Manya Gangele", detail: "Parent of an 11-year-old Son · Indore" },
  { quote: "I was constantly reminding my daughter to stay on task. Small changes in how we approached things at home made a huge difference. She's much more independent now.", who: "Suchitra Mehta", detail: "Parent of an 8-year-old Daughter · Mumbai" },
];

const TAP_LABEL: [string, "worked" | "mixed" | "didnt_land", keyof typeof CARD5.after][] = [
  ["Worked", "worked", "worked"], ["Partly", "mixed", "partly"], ["Didn't work", "didnt_land", "didnt"],
];

export default function ReportV3({ sessionId, facts, week1Days }: { sessionId: string; facts: V3Facts; week1Days: Week1Day[] }) {
  const f = useCallback((s: string) => fillV3(s, facts.name, facts.gender, facts.band), [facts]);
  const [card, setCard] = useState(0);
  const planRef = useRef<HTMLDivElement>(null);
  const TOTAL = 6;

  const go = useCallback((n: number) => setCard((c) => Math.min(TOTAL - 1, Math.max(0, n))), []);
  const toPlan = useCallback(() => planRef.current?.scrollIntoView({ behavior: "smooth" }), []);

  // Keyboard: ← / → move between cards.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "ArrowRight") go(card + 1); if (e.key === "ArrowLeft") go(card - 1); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [card, go]);

  // Swipe: horizontal drag on the deck.
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x, dy = e.changedTouches[0].clientY - touch.current.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? card + 1 : card - 1);
    touch.current = null;
  };

  return (
    <div style={{ background: C.cream, minHeight: "100dvh", fontFamily: BODY, color: C.ink }}>
      {/* ── Swipe deck ── */}
      <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100dvh", display: "flex", flexDirection: "column" }}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {/* progress + skip */}
        <div style={{ padding: "12px 18px 0", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {Array.from({ length: TOTAL }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= card ? C.gold : C.line2 }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, color: C.dim }}>
            <span>{card + 1} of {TOTAL}</span>
            <button onClick={toPlan} style={linkBtn}>Skip to the plan ↓</button>
          </div>
        </div>
        {/* current card */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px 18px 18px" }}>
          <Card index={card} f={f} facts={facts} sessionId={sessionId} onNext={() => go(card + 1)} onPlan={toPlan} />
        </div>
      </div>

      {/* ── Scroll (same page) ── */}
      <div ref={planRef} style={{ maxWidth: 520, margin: "0 auto", padding: "8px 18px 64px", display: "flex", flexDirection: "column", gap: 28 }}>
        <Ladder f={f} />
        <Weeks f={f} week1Days={week1Days} />
        <Support f={f} />
        <Plans f={f} />
        <Testimonials />
        <Faq f={f} />
        <FinalCta f={f} />
      </div>
    </div>
  );
}

// ── Card shell + the 6 cards ──
function Card({ index, f, facts, sessionId, onNext, onPlan }: { index: number; f: (s: string) => string; facts: V3Facts; sessionId: string; onNext: () => void; onPlan: () => void }) {
  const dark = index === 0 || index === 2 || index === 5;
  const bg = dark ? C.navy : C.white;
  const fg = dark ? C.white : C.ink;
  const shell: React.CSSProperties = {
    flex: 1, background: bg, color: fg, border: dark ? "none" : `1px solid ${C.line}`, borderRadius: 22,
    padding: 24, display: "flex", flexDirection: "column", gap: 14, minHeight: 540,
  };
  const eyebrow = (t: string) => <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", color: dark ? C.gold : C.darkGold }}>{t}</div>;
  const nextBtn = (label: string, gold = false) => (
    <button onClick={index === 5 ? onPlan : onNext}
      style={{ marginTop: "auto", minHeight: 52, borderRadius: 12, border: 0, cursor: "pointer", fontFamily: BODY, fontSize: 16, fontWeight: 700,
        background: gold ? C.gold : dark ? C.white : C.navy, color: gold ? C.navy : dark ? C.navy : C.white }}>{label}</button>
  );
  const H = (t: string, size = 27) => <h1 style={{ margin: 0, fontFamily: HEAD, fontSize: size, lineHeight: 1.16, fontWeight: 600 }}>{t}</h1>;

  if (index === 0) return (
    <div style={shell}>
      {eyebrow(f(CARD1.kicker))}
      {H(f(CARD1.headline), 30)}
      <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.5, color: dark ? "#D7DEE6" : C.ink }}>{f(CARD1.body)}</p>
      {nextBtn(f(CARD1.button))}
    </div>
  );
  if (index === 1) return (
    <div style={shell}>
      {eyebrow(f(CARD2.kicker))}
      {H(`${f(CARD2.patternPrefix)}${f(PATTERN_LINE[facts.archKey])}.`)}
      <Row label={CARD2.rows.strength} value={f(STRENGTH[facts.archKey])} />
      <Row label={CARD2.rows.stuck} value={f(STUCK[facts.worryKey])} />
      <Row label={CARD2.rows.pull} value={f(PULL[facts.archKey])} />
      <p style={{ margin: 0, fontSize: 12.5, color: C.dim }}>{f(CARD2.footnote)}</p>
      {nextBtn("Next →")}
    </div>
  );
  if (index === 2) return (
    <div style={shell}>
      {eyebrow(f(CARD3.kicker))}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 4 }}>
        {CARD3.rows.map(([a, b], i) => (
          <div key={i}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{f(a)}</div>
            <div style={{ fontSize: 14.5, color: "#C8D1DA", lineHeight: 1.45 }}>{f(b)}</div>
          </div>
        ))}
      </div>
      <p style={{ margin: 0, fontSize: 12, color: "#9AA6B2" }}>{f(CARD3.source)}</p>
      {nextBtn("Next →")}
    </div>
  );
  if (index === 3) return (
    <div style={shell}>
      {eyebrow(f(CARD4.kicker))}
      {H(f(CARD4.headline))}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: C.dim }}>
        <div>{f(CARD4.colToday)}</div><div>{f(CARD4.colToward)}</div>
      </div>
      {TODAY_TOWARD[facts.worryKey].map(([a, b], i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "start" }}>
          <div style={{ fontSize: 14, color: C.dim }}>{f(a)}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.greenInk }}>{f(b)}</div>
        </div>
      ))}
      <p style={{ margin: 0, fontSize: 12.5, color: C.dim }}>{f(CARD4.footnote)}</p>
      {nextBtn("Next →")}
    </div>
  );
  if (index === 4) return <Card5 shell={shell} eyebrow={eyebrow} H={H} nextBtn={nextBtn} f={f} facts={facts} sessionId={sessionId} />;
  // index 5
  return (
    <div style={shell}>
      {eyebrow(f(CARD6.kicker))}
      {H(f(CARD6.headline))}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {CARD6.loop.map(([a, b], i) => (
          <div key={i} style={{ display: "flex", gap: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.gold, color: C.navy, fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
            <div><b style={{ fontWeight: 700 }}>{f(a)}</b> <span style={{ color: "#C8D1DA" }}>{f(b)}</span></div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: "#9AA6B2", marginTop: 2 }}>{f(CARD6.chatLabel)}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {CARD6.chat.map(([who, line], i) => (
          <div key={i} style={{ alignSelf: who === "P" ? "flex-end" : "flex-start", maxWidth: "85%", background: who === "P" ? "#2A3E52" : C.gold, color: who === "P" ? "#E6ECF2" : C.navy, borderRadius: 12, padding: "8px 11px", fontSize: 13.5, lineHeight: 1.4 }}>{f(line)}</div>
        ))}
      </div>
      {nextBtn(f(CARD6.button), true)}
    </div>
  );
}

function Card5({ shell, eyebrow, H, nextBtn, f, facts, sessionId }: any) {
  const [tapped, setTapped] = useState<keyof typeof CARD5.after | null>(null);
  const onTap = async (enumVal: "worked" | "mixed" | "didnt_land", key: keyof typeof CARD5.after) => {
    setTapped(key);
    // Stored only — the plan hasn't started, so nothing is pre-generated. DB-only, no child data.
    fetch("/api/report-v3/tonight", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, outcome: enumVal }) }).catch(() => {});
  };
  return (
    <div style={shell}>
      {eyebrow(f(CARD5.kicker))}
      {H(`${f(CARD5.headlinePrefix)}${facts.tonightMoment}.`)}
      {facts.tonightInstead && <p style={{ margin: 0, fontSize: 14.5, color: C.dim }}>Instead of saying “{facts.tonightInstead}”</p>}
      <div style={{ borderLeft: `3px solid ${C.gold}`, paddingLeft: 14, fontSize: 16.5, lineHeight: 1.45, fontWeight: 500 }}>{facts.tonightStep}</div>
      <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5 }}><b>{f(CARD5.notePrefix)}</b>{facts.tonightNotice}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        {TAP_LABEL.map(([label, enumVal, key]) => {
          const on = tapped === key;
          return (
            <button key={key} onClick={() => onTap(enumVal, key)}
              style={{ minHeight: 48, borderRadius: 10, border: `${on ? 1.5 : 1}px solid ${on ? C.green : C.line2}`, background: on ? C.tintGreen : C.white, color: on ? C.greenInk : C.ink, fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: BODY }}>{label}</button>
          );
        })}
      </div>
      {tapped && <p style={{ margin: 0, fontSize: 14, color: C.greenInk, background: C.tintGreen, border: `1px solid #CFE6D6`, borderRadius: 10, padding: "10px 12px" }}>{f(CARD5.after[tapped])}</p>}
      {nextBtn("Next →")}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: C.darkGold }}>{label}</div>
      <div style={{ fontSize: 15.5, lineHeight: 1.45 }}>{value}</div>
    </div>
  );
}

// ── Scroll sections ──
function Ladder({ f }: { f: (s: string) => string }) {
  return (
    <div>
      <SectionLabel>THE SIX-WEEK CLIMB</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {LADDER.map((rung, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < LADDER.length - 1 ? `1px dashed ${C.line2}` : "none" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: i === 0 ? C.gold : C.tintGold, color: C.navy, fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{rung}</div>
            {i === 0 && <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 700, color: C.darkGold, background: C.tintGold, borderRadius: 999, padding: "3px 10px" }}>{LADDER_START_NOTE}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Weeks({ f, week1Days }: { f: (s: string) => string; week1Days: Week1Day[] }) {
  return (
    <div>
      <SectionLabel>{f("{NAME}'S SIX-WEEK PLAN")}</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {WEEKS.map((w, i) => {
          const open = i === 0;
          return (
            <div key={w.n} style={{ border: `1px solid ${C.line}`, borderRadius: 16, background: open ? C.white : C.tintGold, overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: C.darkGold }}>WEEK {w.n}{open ? " · THIS WEEK" : ""}</div>
                <div style={{ fontSize: 17, fontWeight: 700, fontFamily: HEAD }}>{w.title}</div>
                <div style={{ fontSize: 14, color: C.ink }}>{f(w.line)}</div>
                <div style={{ fontSize: 13.5, color: C.greenInk, fontWeight: 600 }}>→ {f(w.gain)}</div>
              </div>
              {open && week1Days.length > 0 && (
                <div style={{ borderTop: `1px solid ${C.line}`, padding: "10px 16px 14px", display: "flex", flexDirection: "column", gap: 10, background: C.cream }}>
                  {week1Days.map((d) => (
                    <div key={d.day} style={{ display: "flex", gap: 10 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, background: d.observe ? C.tintNavy : C.tintGold, color: C.navy, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{d.day}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{d.title}{d.observe && !/watch/i.test(d.title) ? " · just watch" : ""}</div>
                        <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.4 }}>{d.teaser}</div>
                        {d.observe && <div style={{ fontSize: 12.5, color: C.darkGold, marginTop: 3 }}>Then tap: Calm · Some pushback · Big fight</div>}
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize: 12.5, color: C.dim }}>Days 2–5 each take about 5 minutes — and <b>tomorrow adjusts</b> to how today went.</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Support({ f }: { f: (s: string) => string }) {
  return (
    <div style={{ background: C.navy, color: C.white, borderRadius: 18, padding: "20px 18px", textAlign: "center" }}>
      <div style={{ fontFamily: HEAD, fontSize: 20, fontWeight: 600, lineHeight: 1.3 }}>{f(SUPPORT.headline)}</div>
      <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 12, fontSize: 13, color: C.gold, fontWeight: 600 }}>
        {SUPPORT.strip.map((s, i) => <span key={i}>{f(s)}</span>)}
      </div>
    </div>
  );
}

function Plans({ f }: { f: (s: string) => string }) {
  const Plan = ({ name, price, bullets, gold }: { name: string; price: string; bullets: string[]; gold?: boolean }) => (
    <div style={{ border: `1.5px solid ${gold ? C.gold : C.line}`, borderRadius: 16, padding: 18, background: gold ? C.tintGold : C.white }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>{f(name)}</div>
      <div style={{ fontFamily: HEAD, fontSize: 28, fontWeight: 600, margin: "2px 0 8px" }}>{price}</div>
      <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5 }}>
        {bullets.map((b, i) => <li key={i} style={{ fontSize: 14, lineHeight: 1.4 }}>{f(b)}</li>)}
      </ul>
    </div>
  );
  return (
    <div>
      <SectionLabel>TWO WAYS TO START</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Plan name={PLANS.plan.name} price={PLANS.plan.price} bullets={PLANS.plan.bullets} gold />
        <Plan name={PLANS.planCalls.name} price={PLANS.planCalls.price} bullets={PLANS.planCalls.bullets} />
      </div>
      <p style={{ margin: "10px 0 0", fontSize: 13, color: C.dim, textAlign: "center" }}>{f(PLANS.refund)}</p>
    </div>
  );
}

function Testimonials() {
  return (
    <div>
      <SectionLabel>FROM OTHER PARENTS</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {TESTIMONIALS.map((t, i) => (
          <div key={i} style={{ border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, background: C.white }}>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5 }}>“{t.quote}”</p>
            <div style={{ marginTop: 8, fontSize: 12.5, color: C.dim }}><b style={{ color: C.ink }}>{t.who}</b> · {t.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Faq({ f }: { f: (s: string) => string }) {
  return (
    <div>
      <SectionLabel>QUESTIONS PARENTS ASK</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {FAQ.map((q, i) => (
          <details key={i} style={{ borderBottom: `1px solid ${C.line}`, padding: "12px 0" }}>
            <summary style={{ fontSize: 15, fontWeight: 600, cursor: "pointer", listStyle: "none" }}>{f(q.q)}</summary>
            <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.5, color: C.ink }}>{f(q.a)}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

function FinalCta({ f }: { f: (s: string) => string }) {
  return (
    <a href="#" style={{ display: "block", textAlign: "center", background: C.gold, color: C.navy, borderRadius: 14, padding: 18, fontSize: 17, fontWeight: 800, textDecoration: "none" }}>{f(FINAL_CTA)}</a>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", color: C.darkGold, marginBottom: 10 }}>{children}</div>;
}

const linkBtn: React.CSSProperties = { background: "none", border: "none", color: C.darkGold, fontWeight: 600, fontSize: 12.5, cursor: "pointer", padding: "6px 0", fontFamily: BODY };
