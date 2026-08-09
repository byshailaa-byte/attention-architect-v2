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
  focus:      "focus",
  screens:    "screen time",
  confidence: "confidence",
  emotions:   "emotional intensity",
  school:     "school friction",
  potential:  "untapped potential",
};

type FollowUpOption = { label: string; echo: string };

const FOLLOW_UP: Record<string, { question: string; options: FollowUpOption[] }> = {
  focus: {
    question: "What does the focus problem actually look like?",
    options: [
      { label: "Starts fine but drifts off after 5–10 minutes",             echo: "Starts fine — then drifts off" },
      { label: "Goes deep on things they love — blank for everything else",  echo: "All-in on loved things, absent from everything else" },
      { label: "Can't get started, even when they want to",                  echo: "Can't start, even when they want to" },
    ],
  },
  screens: {
    question: "What happens when screen time ends?",
    options: [
      { label: "Meltdown or argument — every single time",          echo: "Full meltdown, every single time" },
      { label: "Negotiates 'just five more minutes' on loop",        echo: "Endless five-more-minutes negotiation" },
      { label: "Complies, then shuts down completely for a while",   echo: "Complies — then goes dark for 30 minutes" },
    ],
  },
  confidence: {
    question: "Where does the gap show up most?",
    options: [
      { label: "Won't try if there's any chance of failing",                        echo: "Won't try if there's a chance of failing" },
      { label: "Gives up sooner than you'd expect from how capable they are",       echo: "Gives up faster than they should" },
      { label: "Compares themselves to other kids constantly",                      echo: "Constant comparison to other kids" },
    ],
  },
  emotions: {
    question: "How do hard moments usually land?",
    options: [
      { label: "Shuts down — goes quiet and unreachable",        echo: "Goes quiet and unreachable" },
      { label: "Escalates fast — anger or tears, no warning",    echo: "Escalates fast, no warning" },
      { label: "Seems fine, then carries it for hours after",    echo: "Carries it for hours afterward" },
    ],
  },
  school: {
    question: "What's the main friction at school?",
    options: [
      { label: "Homework takes three times longer than it should",           echo: "Homework takes three times longer than it should" },
      { label: "Fine in class — completely different child at home",         echo: "Different child at home than at school" },
      { label: "Teachers say 'not working to potential'",                    echo: "Teachers say 'not reaching potential'" },
    ],
  },
  potential: {
    question: "What makes you feel the potential is there?",
    options: [
      { label: "Intense focus on what they love — absent everywhere else",    echo: "Intense when interested, absent when not" },
      { label: "Sharp in conversation — that doesn't show up in grades",      echo: "Sharp in conversation, not in grades" },
      { label: "You've watched them do it when motivated — they just won't",  echo: "You've seen them do it. They just won't." },
    ],
  },
};

const REVEAL_HEADLINES: Record<string, string> = {
  focus:      "That's not a focus problem. It's a specific attention shape.",
  screens:    "That's not screen addiction. It's what happens when the stimulation gap gets too wide.",
  confidence: "That's not low confidence. It's a calibration problem.",
  emotions:   "That's not overreacting. It's how this pattern processes pressure.",
  school:     "That's not laziness. It's what the wrong structure looks like on a capable kid.",
  potential:  "You're not imagining it. The potential is real — and it only fires under specific conditions.",
};

const REVEAL_INSIGHTS: Record<string, string> = {
  focus:      "That gap — wherever it shows up — is one of three specific attention shapes. Once the type is mapped, you know where the friction comes from and what actually reaches it.",
  screens:    "The screen problem is almost always a proxy. What it's measuring is how far the gap is between your child's attention pattern and everything that isn't a screen — and that gap is addressable.",
  confidence: "Confidence at this age almost always traces to what a child's attention pattern predicts will happen when they try something new. That's different from self-esteem — and responds to different things.",
  emotions:   "The emotional response is tied directly to the attention shape. Different types absorb pressure differently, reach their limit differently, and recover differently. This is mappable.",
  school:     "School friction in a capable child is almost always a structure mismatch, not a capability gap. The data shows which structure this child actually runs on.",
  potential:  "The potential is real. The gap between capability and output is almost always explained by a mismatch in environment — one of eight specific patterns. This assessment finds it.",
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

// ── Main component ────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const [stage, setStage]     = useState<Stage>("step1");
  const [age, setAge]         = useState<string | null>(null);
  const [concern, setConcern] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<FollowUpOption | null>(null);
  const [showSticky, setShowSticky] = useState(false);

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
    fireGtag(a === "younger" || a === "older" ? "age_out_of_band" : "age_selected", { age_band: a });
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

  const isOob    = age === "younger" || age === "older";
  const step1Ready = !!age && !!concern;

  // ── STEP 1 ────────────────────────────────────────────────────────────────
  if (stage === "step1") {
    return (
      <div style={{ background: "var(--paper)", minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
          <div style={{ width: "100%", maxWidth: 520 }}>

            <div style={{ fontSize: "11px", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink-dim)", fontWeight: 700, marginBottom: "28px" }}>
              Attention Architect · For Parents
            </div>

            <h1 style={{ fontFamily: BG, fontWeight: 800, fontSize: "clamp(28px,6vw,44px)", lineHeight: 1.15, letterSpacing: "-.01em", color: "var(--ink)", marginBottom: "32px" }}>
              Smart kid.<br />
              Somehow still not listening.<br />
              <span className="mark">Sound familiar?</span>
            </h1>

            {/* Age selection */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)", marginBottom: "10px" }}>
                How old is your child?
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {[["8–9", "8-9"], ["10–11", "10-11"], ["12–14", "12-14"], ["Younger", "younger"], ["Older", "older"]].map(([label, val]) => (
                  <button
                    key={val}
                    className={`chip-btn${age === val ? " sel" : ""}`}
                    onClick={() => selectAge(val)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {isOob && age && (
                <div style={{ marginTop: "10px", background: "var(--calm-tint)", border: "1px solid rgba(110,95,176,.3)", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "var(--calm-text)", lineHeight: 1.5 }}>
                  {OOB_NOTES[age]}
                </div>
              )}
            </div>

            {/* Concern selection */}
            <div style={{ marginBottom: "32px" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)", marginBottom: "10px" }}>
                What&rsquo;s the main friction right now?
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {(["Focus", "Screens", "Confidence", "Emotions", "School", "Potential"] as const).map((c) => {
                  const val = c.toLowerCase();
                  return (
                    <button
                      key={val}
                      className={`chip-btn${concern === val ? " sel" : ""}`}
                      onClick={() => selectConcern(val)}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
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
                : "Select age and concern above to continue"}
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
        <SiteFooter />
      </div>
    );
  }

  // ── STEP 2 ────────────────────────────────────────────────────────────────
  if (stage === "step2") {
    const fu = concern ? FOLLOW_UP[concern] : null;
    return (
      <div style={{ background: "var(--paper)", minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
          <div style={{ width: "100%", maxWidth: 520 }}>

            {/* Step summary */}
            <button
              onClick={() => setStage("step1")}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--calm-text)", fontWeight: 600, marginBottom: "28px", padding: 0, display: "flex", alignItems: "center", gap: "6px" }}
            >
              ← {AGE_LABELS[age!]} · {CONCERN_LABELS[concern!]}
            </button>

            <div style={{ fontSize: "11px", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink-dim)", fontWeight: 700, marginBottom: "20px" }}>
              One more thing
            </div>

            <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "clamp(22px,5vw,32px)", lineHeight: 1.2, color: "var(--ink)", marginBottom: "28px" }}>
              {fu?.question}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {fu?.options.map((opt) => (
                <button
                  key={opt.echo}
                  onClick={() => selectFollowUp(opt)}
                  style={{
                    background: followUp?.echo === opt.echo ? "var(--marker-tint)" : "var(--card)",
                    border: followUp?.echo === opt.echo ? "2px solid var(--marker)" : "1.5px solid var(--line)",
                    borderRadius: "12px",
                    padding: "18px 20px",
                    fontSize: "15px",
                    fontWeight: 500,
                    color: "var(--ink)",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    transition: "border-color .1s, background .1s",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

          </div>
        </div>
        <SiteFooter />
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
            What We Actually Measure
          </div>
          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "36px", lineHeight: 1.18, letterSpacing: "-.01em", color: "var(--ink)", marginBottom: "20px" }}>
            Most assessments measure{" "}
            <span className="mark">the wrong thing.</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", margin: "28px 0" }}>
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

          {/* Trust line */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "32px" }}>
            {["Free", "Under 5 minutes", "No sign-up", "Your data stays private"].map((t) => (
              <div key={t} style={{ background: "var(--marker-tint)", border: "1px solid var(--marker)", borderRadius: "8px", padding: "6px 14px", fontSize: "13px", fontWeight: 600, color: "var(--marker-text)" }}>
                {t}
              </div>
            ))}
          </div>

          {/* Is / isn't */}
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

          {/* Loop expectation line */}
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
