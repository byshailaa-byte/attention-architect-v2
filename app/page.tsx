"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import SiteFooter from "@/app/components/SiteFooter";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

function fireGtag(event: string, params?: Record<string, string | number>) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", event, params ?? {});
  }
}

const BG = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";

// ── Content constants ────────────────────────────────────────────────────────

const OOB_NOTES: Record<string, string> = {
  younger: "This assessment is built for ages 8–14. A version for younger children is coming — continue and we'll show you what applies now.",
  older:   "This assessment is built for ages 8–14. Much of it still applies to teens — continue and answer for your teen.",
};

const AGE_LABELS: Record<string, string> = {
  "8-9":    "8 and 9-year-olds",
  "10-11":  "10 and 11-year-olds",
  "12-14":  "12 to 14-year-olds",
  younger:  "younger children",
  older:    "teenagers",
};

const CONCERN_LABELS: Record<string, string> = {
  homework:   "homework battles",
  reminders:  "focus reminders",
  screens:    "screen time",
  confidence: "confidence",
  giveup:     "giving up easily",
  finish:     "not finishing things",
  other:      "something else",
};

const CONCERN_CARDS: { key: string; emoji: string | null; label: string; wide?: boolean }[] = [
  { key: "homework",   emoji: "📖", label: "Homework turns into a battle" },
  { key: "reminders",  emoji: "🎯", label: "I keep reminding them to focus" },
  { key: "screens",    emoji: "📱", label: "Screens always win" },
  { key: "confidence", emoji: "👤", label: "They've lost confidence" },
  { key: "giveup",     emoji: "🌱", label: "They give up too easily" },
  { key: "finish",     emoji: "📝", label: "They start everything and finish nothing" },
  { key: "other",      emoji: null,  label: "Something else…", wide: true },
];

type FollowUpOption = { label: string; echo: string };
type FollowUpConfig =
  | { question: string; options: FollowUpOption[] }
  | { question: string; isText: true };

const FOLLOW_UP: Record<string, FollowUpConfig> = {
  homework: {
    question: "When homework time starts, what usually happens first?",
    options: [
      { label: "They delay starting as long as possible",              echo: "They delay starting as long as possible" },
      { label: "They start, but stop again within minutes",             echo: "They start, then stop within minutes" },
      { label: "They get upset or overwhelmed before really trying",   echo: "They get upset before really trying" },
      { label: "They rush through it just to be done",                 echo: "They rush through it just to be done" },
      { label: "It depends on the subject",                            echo: "It depends on the subject" },
    ],
  },
  reminders: {
    question: "When you remind your child to focus, what usually happens next?",
    options: [
      { label: "They focus for a few minutes, then drift away again",  echo: "They focus briefly, then drift" },
      { label: "They say \"Okay\" but don't really start",              echo: "They say Okay but don't start" },
      { label: "They get irritated or argue",                           echo: "They get irritated or argue" },
      { label: "They genuinely try but can't stay with it",             echo: "They genuinely try but can't stay" },
      { label: "It depends on the day",                                 echo: "It depends on the day" },
    ],
  },
  screens: {
    question: "When it's time to put the screen down, what usually happens?",
    options: [
      { label: "A small negotiation turns into a bigger one",           echo: "A small negotiation turns into a bigger one" },
      { label: "They get irritable or upset",                           echo: "They get irritable or upset" },
      { label: "They agree, but \"just five more minutes\" keeps happening", echo: "Just five more minutes — keeps happening" },
      { label: "They put it down fine, but can't settle into anything else", echo: "They put it down but can't settle" },
      { label: "It depends on what they were doing",                   echo: "It depends on what they were doing" },
    ],
  },
  confidence: {
    question: "When something feels hard for them, what do you usually see first?",
    options: [
      { label: "They say \"I can't\" before really trying",             echo: "They say I can't before trying" },
      { label: "They get frustrated and give up quickly",               echo: "They get frustrated and give up quickly" },
      { label: "They ask you to do it for them",                        echo: "They ask you to do it for them" },
      { label: "They avoid starting at all",                            echo: "They avoid starting at all" },
      { label: "It depends on the day",                                 echo: "It depends on the day" },
    ],
  },
  giveup: {
    question: "When they hit something difficult, how long before they stop trying?",
    options: [
      { label: "Almost immediately",                  echo: "Almost immediately" },
      { label: "After one real attempt",              echo: "After one real attempt" },
      { label: "Only after getting visibly upset",    echo: "Only after getting visibly upset" },
      { label: "It varies a lot",                     echo: "It varies a lot" },
    ],
  },
  finish: {
    question: "When they move on to something new mid-task, what happens to the first thing?",
    options: [
      { label: "It just sits there, forgotten",                         echo: "It just sits there, forgotten" },
      { label: "They say they'll come back to it — and don't",          echo: "They say they'll come back — they don't" },
      { label: "You have to remind them to finish it",                  echo: "You have to remind them to finish" },
      { label: "Sometimes they do circle back on their own",            echo: "Sometimes they circle back" },
    ],
  },
  other: {
    question: "Tell us a little more about what's going on.",
    isText: true,
  },
};

const REVEAL_HEADLINES: Record<string, string> = {
  homework:   "Why does homework become a battle every evening?",
  reminders:  "Why do reminders to focus stop working, no matter how many times you say it?",
  screens:    "Why do screens always win the fight?",
  confidence: "Why has your child's confidence quietly gone missing?",
  giveup:     "Why do they give up before they've really started?",
  finish:     "Why does your child start everything, and finish nothing?",
  other:      "Let's figure out what's actually going on.",
};

const REVEAL_INSIGHTS: Record<string, string> = {
  homework:   "That nightly battle has a shape — and the shape tells us something specific about how this child's attention works under low-interest conditions. One of 8 attention types explains it directly, and the six-week roadmap responds to it.",
  reminders:  "Reminders wear out because they're the wrong signal for this attention type. Once the type is mapped, you'll understand why repetition doesn't reach this child — and what actually does.",
  screens:    "Screens win because they're engineered to. But the specific way your child responds when the screen goes off tells us which attention type is underneath. That gap is addressable once it's named.",
  confidence: "Confidence gaps at this age trace almost directly to what a child's attention type predicts will happen when they try something new. That's a mismatch problem — and mismatch problems respond to different things than self-esteem problems do.",
  giveup:     "The speed of giving up is a signal, not a character trait. It maps to a specific place in one of 8 attention patterns — and once it's named, the six-week plan addresses it at exactly that point.",
  finish:     "Starting-without-finishing is one of the clearest signals in the attention type data. It almost always maps to a specific pattern — and that pattern has a roadmap that actually fits it.",
  other:      "Whatever you're seeing is a signal. This assessment maps 6 dimensions of how your child's attention works, alongside 4 parent instinct patterns — and what you're living with is almost certainly visible in those dimensions.",
};

const CHILD_ARCHETYPES = [
  ["The All-In Kid",  "goes deep — interruption costs more"],
  ["The Inventor",    "builds it his way"],
  ["The Explorer",    "connects ideas, hard to pin down"],
  ["The Magnet",      "better with someone there"],
  ["The Glue",        "reads the room first"],
  ["The Captain",     "thrives in charge"],
  ["The Live Wire",   "needs real stakes"],
  ["The Storm",       "needs it to be his choice"],
];

const PARENT_PATTERNS = [
  ["The Quick Fixer",  "fixes fast, sometimes too fast"],
  ["The Pusher",       "pushes hard, sometimes too hard"],
  ["The Negotiator",   "makes deals, sometimes too many"],
  ["The Steady Hand",  "stays calm, sometimes too still"],
];

const TESTIMONIALS = [
  {
    quote: "We thought our son was just being lazy or spending too much time on screens. This helped us understand what was really happening. Homework became much calmer, and so did our evenings.",
    cite:  "— Manya Gangele, Parent of an 11-year-old Son · Indore",
  },
  {
    quote: "I was constantly reminding my daughter to stay on task. Small changes in how we approached things at home made a huge difference. She's much more independent now.",
    cite:  "— Suchitra Mehta, Parent of an 8-year-old Daughter · Mumbai",
  },
  {
    quote: "We believed our son just needed more discipline. This completely changed our perspective. A few simple changes reduced the daily arguments, and studying no longer feels like a battle.",
    cite:  "— Sandeel Shukla, Parent of a 14-year-old Son · Raipur",
  },
];

type Stage = "step1" | "step2" | "reveal";

// ── Shared brand mark used at top of step1 and step2 ────────────────────────

function BrandMark({ mb }: { mb?: string }) {
  return (
    <div style={{ marginBottom: mb ?? "32px" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-horizontal-icon-wordmark.png" alt="Attention Architect" style={{ height: 28, width: "auto" }} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const [stage, setStage]       = useState<Stage>("step1");
  const [age, setAge]           = useState<string | null>(null);
  const [concern, setConcern]   = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<FollowUpOption | null>(null);
  const [otherText, setOtherText] = useState("");
  const [showSticky, setShowSticky] = useState(false);

  // Out-of-band popup state
  const [oobPopup, setOobPopup]         = useState<"younger" | "older" | null>(null);
  const [oobName, setOobName]           = useState("");
  const [oobPhone, setOobPhone]         = useState("");
  const [oobSubmitting, setOobSubmitting] = useState(false);
  const [oobResult, setOobResult]       = useState<{ wa_sent: boolean } | null>(null);

  const revealRef   = useRef<HTMLDivElement>(null);
  const heroCTARef  = useRef<HTMLButtonElement>(null);
  const landSid     = useRef(typeof crypto !== "undefined" ? crypto.randomUUID() : "");
  const firedDepths = useRef(new Set<number>());

  // Scroll depth tracking (fires from reveal stage onward)
  useEffect(() => {
    if (stage !== "reveal") return;
    function onScroll() {
      const pct = ((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100;
      for (const d of [25, 50, 75, 100] as const) {
        if (pct >= d && !firedDepths.current.has(d)) {
          firedDepths.current.add(d);
          fetch("/api/track/scroll", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: landSid.current, page: "landing", depth: d }),
          }).catch(() => {});
          fireGtag("scroll_milestone", { page: "landing", depth: d });
          if (typeof window.fbq === "function") window.fbq("trackCustom", "ScrollMilestone", { page: "landing", depth: d });
        }
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [stage]);

  // Section view tracking
  useEffect(() => {
    if (stage !== "reveal") return;
    if (!("IntersectionObserver" in window)) return;
    const seen = new Set<string>();
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const name = (e.target as HTMLElement).dataset.section;
        if (e.isIntersecting && name && !seen.has(name)) {
          seen.add(name);
          fireGtag("section_view", { section: name });
        }
      });
    }, { threshold: 0.4 });
    document.querySelectorAll("[data-section]").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [stage]);

  // Sticky bar: show when hero CTA scrolls off screen
  useEffect(() => {
    if (stage !== "reveal") return;
    const el = heroCTARef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver(([e]) => setShowSticky(!e.isIntersecting), { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [stage]);

  // After reveal transition, scroll to top
  useEffect(() => {
    if (stage === "reveal") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [stage]);

  function selectAge(a: string) {
    setAge(a);
    fireGtag("age_selected", { age_band: a });
  }

  function openOobPopup(band: "younger" | "older") {
    setOobPopup(band);
    setOobName("");
    setOobPhone("");
    setOobSubmitting(false);
    setOobResult(null);
    fireGtag("age_out_of_band", { age_band: band });
  }

  async function submitOobPopup() {
    if (!oobName.trim() || !oobPhone.trim() || !oobPopup) return;
    setOobSubmitting(true);
    try {
      const res = await fetch("/api/handbook-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: oobName.trim(), phone: oobPhone.trim(), ageBand: oobPopup }),
      });
      const data = await res.json().catch(() => ({})) as { wa_sent?: boolean };
      setOobResult({ wa_sent: data.wa_sent ?? false });
    } catch {
      setOobResult({ wa_sent: false });
    } finally {
      setOobSubmitting(false);
    }
  }

  function selectConcern(c: string) {
    setConcern(c);
    fireGtag("concern_selected", { concern: c });
  }

  function goToStep2() {
    if (!age || !concern) return;
    setStage("step2");
    fireGtag("cta_click", { location: "step1" });
  }

  function selectFollowUp(opt: FollowUpOption) {
    setFollowUp(opt);
    fireGtag("follow_up_selected", { concern: concern ?? "", answer: opt.echo });
    setTimeout(() => setStage("reveal"), 250);
  }

  function submitOther() {
    const echo = otherText.trim() || "Something specific — hard to describe in a word.";
    selectFollowUp({ label: echo, echo });
  }

  function buildCtaUrl() {
    const p = new URLSearchParams();
    const ageMapped = age === "younger" || age === "older" ? "10-11" : age ?? "10-11";
    p.set("age", ageMapped);
    if (concern) p.set("concerns", concern);
    return `/pre-assessment?${p.toString()}`;
  }

  function handleCtaClick(location: string) {
    fireGtag("cta_click", { location });
    router.push(buildCtaUrl());
  }

  const step1Ready = !!age && !!concern;

  // ── STEP 1 ────────────────────────────────────────────────────────────────
  if (stage === "step1") {
    return (
      <>
      <div className="funnel-screen">
        <div className="funnel-card">

          <BrandMark />

          <div style={{ fontSize: "11px", letterSpacing: ".13em", textTransform: "uppercase", fontWeight: 700, color: "var(--calm-text)", marginBottom: "10px" }}>
            Step 1 of 2
          </div>

          <h1 style={{ fontFamily: BG, fontWeight: 800, fontSize: "clamp(21px,3vw,27px)", lineHeight: 1.35, color: "var(--ink)", marginBottom: "8px" }}>
            What&rsquo;s worrying you the most right now?
          </h1>
          <div style={{ fontSize: "14px", color: "var(--ink-dim)", marginBottom: "26px" }}>
            Choose what feels closest to your situation.
          </div>

          {/* Age selection */}
          <div style={{ marginBottom: "22px" }}>
            <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--ink)", marginBottom: "8px" }}>
              Your child&rsquo;s age
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {[["8–9", "8-9"], ["10–11", "10-11"], ["12–14", "12-14"]].map(([label, val]) => (
                <button
                  key={val}
                  className={`chip-btn${age === val ? " sel" : ""}`}
                  onClick={() => selectAge(val)}
                >
                  {label}
                </button>
              ))}
              <button className="chip-btn" onClick={() => openOobPopup("younger")}>Younger</button>
              <button className="chip-btn" onClick={() => openOobPopup("older")}>Older</button>
            </div>
          </div>

          {/* Concern grid — 2-col cards with emoji + full phrase */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
            {CONCERN_CARDS.map(({ key, emoji, label, wide }) => {
              const selected = concern === key;
              return (
                <button
                  key={key}
                  onClick={() => selectConcern(key)}
                  style={{
                    gridColumn: wide ? "1 / -1" : undefined,
                    background: selected
                      ? "var(--calm-tint)"
                      : wide
                      ? "transparent"
                      : "var(--paper)",
                    border: selected
                      ? "2px solid var(--calm)"
                      : wide
                      ? "1.5px dashed var(--line)"
                      : "2px solid transparent",
                    outline: "none",
                    borderRadius: "14px",
                    padding: wide ? "14px 18px" : "18px 14px",
                    textAlign: "center",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all .12s",
                    display: "flex",
                    flexDirection: wide ? "row" : "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: wide ? "8px" : "0",
                  }}
                >
                  {emoji && (
                    <span style={{ fontSize: "24px", marginBottom: wide ? 0 : "8px", display: "block", lineHeight: 1 }}>
                      {emoji}
                    </span>
                  )}
                  <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--ink)", lineHeight: 1.35 }}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Reassure */}
          <div style={{ background: "var(--calm-tint)", borderRadius: "10px", padding: "11px 15px", fontSize: "13px", color: "var(--calm-text)", display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
            🛡️ Your answer helps us personalise the next questions and your report.
          </div>

          <button
            className="cta-btn"
            disabled={!step1Ready}
            onClick={goToStep2}
            style={{
              background: step1Ready ? "var(--marker)" : "var(--line)",
              color: step1Ready ? "var(--marker-ink)" : "var(--ink-dim)",
              cursor: step1Ready ? "pointer" : "not-allowed",
            }}
          >
            {step1Ready
              ? `Continue — ${AGE_LABELS[age!]} with ${CONCERN_LABELS[concern!]} →`
              : "Select age and concern to continue"}
          </button>

          <div style={{ display: "flex", gap: "16px", marginTop: "16px", fontSize: "12px", color: "var(--ink-dim)" }}>
            <span>Free</span>
            <span>·</span>
            <span>Under 5 minutes</span>
            <span>·</span>
            <span>No sign-up needed</span>
          </div>

        </div>
      </div>

      {/* Out-of-band popup */}
      {oobPopup && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={(e) => { if (e.target === e.currentTarget && !oobSubmitting) setOobPopup(null); }}
        >
          <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "18px", padding: "32px 28px", maxWidth: "400px", width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,.22)", position: "relative" }}>
            <button
              onClick={() => setOobPopup(null)}
              style={{ position: "absolute", top: "16px", right: "18px", background: "none", border: "none", fontSize: "20px", color: "var(--ink-dim)", cursor: "pointer", lineHeight: 1, padding: "4px" }}
              aria-label="Close"
            >×</button>

            {!oobResult ? (
              <>
                <div style={{ fontFamily: BG, fontWeight: 800, fontSize: "18px", color: "var(--ink)", lineHeight: 1.3, marginBottom: "12px" }}>
                  {oobPopup === "younger"
                    ? "The assessment is built for children between 8 and 14."
                    : "The assessment is built for children between 8 and 14."}
                </div>
                <p style={{ fontSize: "14px", color: "var(--ink-dim)", lineHeight: 1.6, marginBottom: "22px" }}>
                  {oobPopup === "younger"
                    ? "We're building a version for younger children. In the meantime, get the free Attention Handbook — the same principles explained clearly, with six things you can try tonight."
                    : "A dedicated version for older teens is coming. The free Attention Handbook covers the same foundations and gives you practical tools you can use right now."}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "18px" }}>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={oobName}
                    onChange={(e) => setOobName(e.target.value)}
                    style={{ border: "1.5px solid var(--line)", borderRadius: "10px", padding: "12px 14px", fontSize: "14.5px", fontFamily: "inherit", color: "var(--ink)", background: "var(--paper)", outline: "none", width: "100%" }}
                  />
                  <input
                    type="tel"
                    placeholder="WhatsApp number"
                    value={oobPhone}
                    onChange={(e) => setOobPhone(e.target.value)}
                    style={{ border: "1.5px solid var(--line)", borderRadius: "10px", padding: "12px 14px", fontSize: "14.5px", fontFamily: "inherit", color: "var(--ink)", background: "var(--paper)", outline: "none", width: "100%" }}
                  />
                </div>
                <button
                  onClick={submitOobPopup}
                  disabled={!oobName.trim() || !oobPhone.trim() || oobSubmitting}
                  style={{
                    width: "100%", background: "var(--marker)", color: "var(--marker-ink)", border: "none", borderRadius: "10px",
                    padding: "14px 20px", fontWeight: 700, fontSize: "15px", cursor: oobName.trim() && oobPhone.trim() && !oobSubmitting ? "pointer" : "not-allowed",
                    opacity: oobName.trim() && oobPhone.trim() && !oobSubmitting ? 1 : 0.55, fontFamily: "inherit",
                  }}
                >
                  {oobSubmitting ? "Sending…" : "Send me the Handbook →"}
                </button>
                <div style={{ marginTop: "12px", fontSize: "12px", color: "var(--ink-dim)", textAlign: "center" }}>
                  Free. No spam. Unsubscribe anytime.
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{ fontSize: "32px", marginBottom: "16px" }}>✓</div>
                <div style={{ fontFamily: BG, fontWeight: 800, fontSize: "18px", color: "var(--ink)", marginBottom: "10px" }}>
                  {oobResult.wa_sent ? "Handbook sent to your WhatsApp." : "You're on the list."}
                </div>
                <p style={{ fontSize: "14px", color: "var(--ink-dim)", lineHeight: 1.6 }}>
                  {oobResult.wa_sent
                    ? "Check your WhatsApp — the link is on its way."
                    : "We'll send you the Attention Handbook on WhatsApp in 1–2 days, once our messaging setup is live."}
                </p>
                <button
                  onClick={() => setOobPopup(null)}
                  style={{ marginTop: "20px", background: "none", border: "1.5px solid var(--line)", borderRadius: "10px", padding: "10px 22px", fontSize: "13.5px", fontWeight: 600, color: "var(--ink-dim)", cursor: "pointer", fontFamily: "inherit" }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      </>
    );
  }

  // ── STEP 2 ────────────────────────────────────────────────────────────────
  if (stage === "step2") {
    const fuConfig = concern ? FOLLOW_UP[concern] : null;
    const isText = fuConfig !== null && "isText" in fuConfig && fuConfig.isText;
    const hasOptions = fuConfig !== null && "options" in fuConfig;

    return (
      <div className="funnel-screen">
        <div className="funnel-card">

          <BrandMark mb="28px" />

          <button
            onClick={() => setStage("step1")}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--calm-text)", fontWeight: 600, marginBottom: "20px", padding: 0, display: "flex", alignItems: "center", gap: "6px" }}
          >
            ← {AGE_LABELS[age!]} · {CONCERN_LABELS[concern!]}
          </button>

          <div style={{ fontSize: "11px", letterSpacing: ".13em", textTransform: "uppercase", fontWeight: 700, color: "var(--calm-text)", marginBottom: "10px" }}>
            Step 2 of 2 · No assumptions
          </div>

          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "clamp(20px,3vw,25px)", lineHeight: 1.3, color: "var(--ink)", marginBottom: "24px" }}>
            {fuConfig?.question}
          </h2>

          {hasOptions && (
            <div style={{ fontSize: "13.5px", color: "var(--ink-dim)", marginBottom: "16px" }}>
              Select what feels true. There&rsquo;s no right or wrong answer.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {isText ? (
              <>
                <textarea
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  placeholder="Type freely — a sentence or two is plenty."
                  rows={4}
                  style={{
                    width: "100%",
                    border: "1.5px solid var(--line)",
                    borderRadius: "12px",
                    padding: "14px 16px",
                    fontFamily: "inherit",
                    fontSize: "15px",
                    resize: "vertical",
                    color: "var(--ink)",
                    background: "var(--paper)",
                    outline: "none",
                    marginBottom: "8px",
                  }}
                />
                <button className="cta-btn" onClick={submitOther}>
                  See what this tells us →
                </button>
              </>
            ) : (
              (fuConfig as { question: string; options: FollowUpOption[] }).options.map((opt) => (
                <button
                  key={opt.echo}
                  onClick={() => selectFollowUp(opt)}
                  style={{
                    background: followUp?.echo === opt.echo ? "var(--calm-tint)" : "var(--paper)",
                    border: followUp?.echo === opt.echo ? "1.5px solid var(--calm)" : "1.5px solid var(--line)",
                    borderRadius: "12px",
                    padding: "14px 16px",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "var(--ink)",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    transition: "border-color .1s, background .1s",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <span>{opt.label}</span>
                  {followUp?.echo === opt.echo && (
                    <span style={{ width: 20, height: 20, borderRadius: 5, background: "var(--calm)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>✓</span>
                  )}
                </button>
              ))
            )}
          </div>

        </div>
      </div>
    );
  }

  // ── REVEAL — full page ────────────────────────────────────────────────────
  const ageLabel     = AGE_LABELS[age!] ?? "this age group";
  const concernLabel = CONCERN_LABELS[concern!] ?? concern ?? "";
  const headline     = concern ? REVEAL_HEADLINES[concern] : "You've found the right place.";
  const insight      = concern ? REVEAL_INSIGHTS[concern] : "";

  return (
    <div style={{ background: "var(--paper)" }}>
      <div className="land-shell">

        {/* ── PERSONALIZED REVEAL ──────────────────────────────────────── */}
        <section
          ref={revealRef}
          className="hero-section"
          data-section="reveal"
          style={{ paddingTop: "56px", paddingBottom: "56px" }}
        >
          <div style={{ maxWidth: 600 }}>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-horizontal-with-tagline.png" alt="Attention Architect" style={{ height: 40, width: "auto", marginBottom: "32px" }} />

            <div style={{ fontSize: "11px", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink-dim)", fontWeight: 700, marginBottom: "20px" }}>
              What we found for {ageLabel} with {concernLabel} difficulty
            </div>

            <h1 style={{ fontFamily: BG, fontWeight: 800, fontSize: "clamp(26px,5vw,40px)", lineHeight: 1.15, letterSpacing: "-.01em", color: "var(--ink)", marginBottom: "28px" }}>
              {headline}
            </h1>

            {/* Speech bubble echoing their own answer */}
            {followUp && (
              <div style={{ marginBottom: "24px" }}>
                <div style={{
                  background: "var(--marker-tint)",
                  border: "2px solid var(--marker)",
                  borderRadius: "16px 16px 16px 4px",
                  padding: "16px 20px",
                  fontSize: "15px",
                  color: "var(--ink)",
                  fontStyle: "italic",
                  lineHeight: 1.5,
                  marginBottom: "8px",
                  position: "relative",
                  maxWidth: 440,
                }}>
                  &ldquo;{followUp.echo}&rdquo;
                  <div style={{ fontSize: "11px", fontStyle: "normal", fontWeight: 600, color: "var(--marker-text)", marginTop: "8px", letterSpacing: ".04em" }}>
                    — YOU, JUST NOW
                  </div>
                </div>
              </div>
            )}

            <p style={{ fontSize: "17px", lineHeight: 1.7, color: "var(--ink-dim)", maxWidth: 520, marginBottom: "32px" }}>
              {insight}
            </p>

            <button
              ref={heroCTARef}
              className="cta-btn"
              onClick={() => handleCtaClick("reveal")}
            >
              Map it in the free assessment →
            </button>

            <div style={{ display: "flex", gap: "16px", marginTop: "14px", fontSize: "12px", color: "var(--ink-dim)" }}>
              <span>Free</span>
              <span>·</span>
              <span>Under 5 minutes</span>
              <span>·</span>
              <span>No diagnosis. No score.</span>
            </div>

          </div>
        </section>

        {/* ── UNFAIR FIGHT ─────────────────────────────────────────────── */}
        <section className="land-section" data-section="unfair">
          <div style={{ fontSize: "11.5px", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink-dim)", fontWeight: 700, marginBottom: "20px" }}>
            An Unfair Fight
          </div>
          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "36px", lineHeight: 1.18, letterSpacing: "-.01em", color: "var(--ink)", marginBottom: "20px" }}>
            Someone is training your child&rsquo;s attention every day.<br />
            <span className="mark">It probably isn&rsquo;t you.</span>
          </h2>
          <div style={{ display: "flex", gap: "12px", margin: "28px 0", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200, borderRadius: "12px", padding: "22px", background: "var(--card)", border: "1px solid var(--line)" }}>
              <div style={{ fontSize: "10.5px", letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700, color: "var(--ink-dim)", marginBottom: "14px" }}>The Quiet Trainers</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "14px", lineHeight: 2 }}>
                {["You", "School", "Books", "Sport & music", "A slow dinner conversation"].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div style={{ flex: 1, minWidth: 200, borderRadius: "12px", padding: "22px", background: "var(--ink)", color: "var(--paper)" }}>
              <div style={{ fontSize: "10.5px", letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700, color: "var(--marker)", marginBottom: "14px" }}>The Loud Ones</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "14px", lineHeight: 2, color: "rgba(246,244,236,.9)" }}>
                {["Infinite scroll", "Autoplay", "Notifications", "Recommendation engines", "Thousands of engineers"].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <div style={{ textAlign: "center", fontFamily: BG, fontWeight: 800, fontSize: "18px", margin: "24px 0" }}>
            One child. <span style={{ color: "var(--redpen)" }}>Against thousands of engineers.</span>
          </div>
          <p style={{ fontSize: "16px", lineHeight: 1.7, color: "var(--ink-dim)" }}>
            They aren&rsquo;t weak. They&rsquo;re out-engineered — and no amount of willpower fixes a mismatch in scale.
          </p>
        </section>

        {/* ── WE MEASURE EVERYTHING EXCEPT THIS ────────────────────────── */}
        <section className="land-section" data-section="measure">
          <div style={{ fontSize: "11.5px", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink-dim)", fontWeight: 700, marginBottom: "20px" }}>
            What&rsquo;s really going on
          </div>
          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "36px", lineHeight: 1.18, letterSpacing: "-.01em", color: "var(--ink)", marginBottom: "28px" }}>
            We measure everything about our children. Except this.
          </h2>

          {/* Report-card checklist */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0", marginBottom: "24px", maxWidth: "320px" }}>
            {[
              { tick: "✓", label: "Height", missing: false },
              { tick: "✓", label: "Weight", missing: false },
              { tick: "✓", label: "Marks", missing: false },
              { tick: "?", label: "Attention Health", missing: true },
            ].map(({ tick, label, missing }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--line)",
                  background: missing ? "var(--marker-tint)" : "transparent",
                  borderRadius: missing ? "8px" : "0",
                  marginBottom: missing ? "0" : "0",
                }}
              >
                <span style={{ fontWeight: 800, fontSize: "15px", color: missing ? "var(--marker-text)" : "var(--calm-text)", width: "18px", flexShrink: 0 }}>{tick}</span>
                <span style={{ fontSize: "15px", fontWeight: missing ? 700 : 400, color: missing ? "var(--ink)" : "var(--ink-dim)" }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Bridge line naming Attention Health */}
          <p style={{ fontSize: "16px", lineHeight: 1.7, color: "var(--ink-dim)", maxWidth: 520, marginBottom: "32px" }}>
            These aren&rsquo;t behaviour issues. They&rsquo;re signs of how your child&rsquo;s{" "}
            <strong style={{ color: "var(--ink)" }}>Attention Health</strong>{" "}is currently working — and it&rsquo;s never actually been measured, the way height or marks have.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", margin: "0 0 28px" }}>
            <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "12px", padding: "22px" }}>
              <div style={{ fontSize: "10.5px", letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700, color: "var(--ink-dim)", marginBottom: "14px" }}>What gets measured everywhere</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "14px", lineHeight: 2, color: "var(--ink-dim)" }}>
                {["Attention span", "Compliance", "IQ and grades", "Screen time hours"].map(i => <li key={i}>{i}</li>)}
              </ul>
            </div>
            <div style={{ background: "var(--marker-tint)", border: "1.5px solid var(--marker)", borderRadius: "12px", padding: "22px" }}>
              <div style={{ fontSize: "10.5px", letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700, color: "var(--marker-text)", marginBottom: "14px" }}>What we map instead</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "14px", lineHeight: 2, color: "var(--ink)" }}>
                {["The shape of your child's attention", "Your instinct pattern as a parent", "How the two interact", "Where that creates the friction you're living"].map(i => <li key={i}>{i}</li>)}
              </ul>
            </div>
          </div>
          <p style={{ fontSize: "16px", lineHeight: 1.7, color: "var(--ink-dim)", marginBottom: "28px" }}>
            The result is a map — not a score, not a label. One of 8 attention types paired with one of 4 parent patterns.
            <br />
            <strong style={{ color: "var(--ink)" }}>Which of these is your child?</strong>
          </p>
          <div className="arch-grid-8">
            {CHILD_ARCHETYPES.map(([name, shadow]) => (
              <div key={name} style={{ borderRadius: "12px", padding: "16px 12px", textAlign: "center", fontFamily: BG, fontWeight: 700, fontSize: "13px", background: "var(--marker-tint)", border: "1px solid var(--marker)", color: "var(--marker-text)" }}>
                {name}
                <span style={{ display: "block", fontFamily: "var(--font-instrument), 'Instrument Sans', sans-serif", fontWeight: 500, fontSize: "10px", marginTop: "5px", opacity: 0.85, lineHeight: 1.3 }}>{shadow}</span>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: BG, fontWeight: 700, fontSize: "14px", margin: "28px 0 8px" }}>Your instinct pattern</div>
          <div className="arch-grid-4">
            {PARENT_PATTERNS.map(([name, shadow]) => (
              <div key={name} style={{ borderRadius: "12px", padding: "16px 12px", textAlign: "center", fontFamily: BG, fontWeight: 700, fontSize: "13px", background: "var(--calm-tint)", border: "1px solid var(--calm)", color: "var(--calm-text)" }}>
                {name}
                <span style={{ display: "block", fontFamily: "var(--font-instrument), 'Instrument Sans', sans-serif", fontWeight: 500, fontSize: "10px", marginTop: "5px", opacity: 0.85, lineHeight: 1.3 }}>{shadow}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── TESTIMONIALS ─────────────────────────────────────────────── */}
        <section className="land-section" data-section="testimonials">
          <div style={{ fontSize: "11.5px", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink-dim)", fontWeight: 700, marginBottom: "20px", textAlign: "center" }}>
            What Parents Found
          </div>
          <div className="t-scroll">
            {TESTIMONIALS.map(({ quote, cite }) => (
              <div key={cite} className="t-card">
                <blockquote>&ldquo;{quote}&rdquo;</blockquote>
                <cite>{cite}</cite>
              </div>
            ))}
          </div>
          <div className="t-hint">← Scroll to see more →</div>
        </section>

        {/* ── PRETRUST BLOCK ───────────────────────────────────────────── */}
        <section className="land-section" data-section="pretrust">
          <div style={{ fontSize: "11.5px", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink-dim)", fontWeight: 700, marginBottom: "20px" }}>
            Before You Start
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "32px" }}>
            {["Free", "Under 5 minutes", "No sign-up", "Your data stays private"].map((t) => (
              <div key={t} style={{ background: "var(--marker-tint)", border: "1px solid var(--marker)", borderRadius: "8px", padding: "6px 14px", fontSize: "13px", fontWeight: 600, color: "var(--marker-text)" }}>
                {t}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "28px" }}>
            <div style={{ borderRadius: "12px", padding: "22px", background: "var(--green-tint)", border: "1px solid var(--green)" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--green)", marginBottom: "14px" }}>This is</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "14px", lineHeight: 2, color: "var(--ink)" }}>
                {[
                  "A behavioural map built from how you describe your child",
                  "Specific to your child's age and what you came here with",
                  "About how your child's attention type and your instinct interact",
                ].map((t) => <li key={t} style={{ display: "flex", gap: "8px" }}><span style={{ color: "var(--green)", flexShrink: 0 }}>✓</span>{t}</li>)}
              </ul>
            </div>
            <div style={{ borderRadius: "12px", padding: "22px", background: "var(--card)", border: "1px solid var(--line)" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-dim)", marginBottom: "14px" }}>This isn&rsquo;t</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "14px", lineHeight: 2, color: "var(--ink-dim)" }}>
                {[
                  "A diagnosis, a score, or a ranking",
                  "Generic parenting advice",
                  "A label that follows your child",
                ].map((t) => <li key={t} style={{ display: "flex", gap: "8px" }}><span style={{ flexShrink: 0 }}>—</span>{t}</li>)}
              </ul>
            </div>
          </div>

          <div style={{ background: "var(--calm-tint)", border: "1px solid var(--calm)", borderRadius: "12px", padding: "18px 22px", fontSize: "15px", color: "var(--calm-text)", lineHeight: 1.6 }}>
            At the end, you&rsquo;ll see your child&rsquo;s attention type, your own instinct pattern — and how the two create the friction you&rsquo;re living right now.
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────────────────── */}
        <section
          className="land-section"
          data-section="finalcta"
          style={{ borderBottom: "none", textAlign: "center", paddingTop: "80px", paddingBottom: "80px" }}
        >
          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "38px", lineHeight: 1.18, letterSpacing: "-.01em", color: "var(--ink)", marginBottom: "16px" }}>
            Knowledge is free now.<br />
            <span className="mark">Attention is the advantage.</span>
          </h2>
          <p style={{ fontSize: "17px", lineHeight: 1.7, color: "var(--ink-dim)", maxWidth: "480px", margin: "0 auto 36px" }}>
            A free, adaptive assessment. A map of your child&rsquo;s attention type and your instinct pattern. Under 5 minutes.
          </p>
          <div style={{ maxWidth: "420px", margin: "0 auto" }}>
            <button className="cta-btn" onClick={() => handleCtaClick("finalcta")}>
              Open the free assessment →
            </button>
          </div>
          <div style={{ fontSize: "12px", color: "var(--ink-dim)", marginTop: "16px" }}>
            Your answers stay private. We never share your data.
          </div>
        </section>

      </div>

      <SiteFooter />

      {/* Sticky CTA bar */}
      <div className={`land-sticky${showSticky ? " show" : ""}`} aria-hidden={!showSticky}>
        <div style={{ fontSize: "12.5px", color: "rgba(246,244,236,.7)" }}>
          <strong style={{ color: "var(--paper)" }}>Free</strong> · ~4 minutes
        </div>
        <button
          style={{ background: "var(--marker)", color: "var(--marker-ink)", fontFamily: BG, fontWeight: 800, fontSize: "14.5px", padding: "10px 20px", borderRadius: "11px", flexShrink: 0, border: "none", cursor: "pointer" }}
          onClick={() => handleCtaClick("sticky")}
        >
          Open →
        </button>
      </div>
    </div>
  );
}
