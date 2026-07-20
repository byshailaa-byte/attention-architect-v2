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
    window.gtag("event", event, { variant: "A", ...params });
  }
}

const TICK_ITEMS = [
  "Homework that should take 30 minutes takes 3 hours.",
  "Total focus on a game, zero focus on a worksheet.",
  "You've explained it three times and it still hasn't landed.",
  "Screen time fights that end the same way every night.",
  '"He\'s clearly smart — so why is this so hard?"',
];

const OOB_NOTES: Record<string, string> = {
  younger:
    "This assessment is built for ages 8–14. A version for younger children is coming — tap Open and we'll show you what applies now.",
  older:
    "This assessment is built for ages 8–14. Much of it still applies to teens — tap Open and answer for your teen.",
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
    cite: "— Manya Gangele, Parent of an 11-year-old Son · Indore",
  },
  {
    quote: "I was constantly reminding my daughter to stay on task. Small changes in how we approached things at home made a huge difference. She's much more independent now.",
    cite: "— Suchitra Mehta, Parent of an 8-year-old Daughter · Mumbai",
  },
  {
    quote: "We believed our son just needed more discipline. This completely changed our perspective. A few simple changes reduced the daily arguments, and studying no longer feels like a battle.",
    cite: "— Sandeel Shukla, Parent of a 14-year-old Son · Raipur",
  },
];

const BG = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";

export default function LandingPage() {
  const router = useRouter();
  const [age, setAge] = useState<string | null>(null);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const [showSticky, setShowSticky] = useState(false);
  const [ctaError, setCtaError] = useState<string | null>(null);

  const heroCtaRef = useRef<HTMLButtonElement>(null);
  // Transient UUID per page load — links scroll milestones to each landing page visit
  const landingSessionId = useRef(typeof crypto !== "undefined" ? crypto.randomUUID() : "");
  const firedScrollDepths = useRef(new Set<number>());

  useEffect(() => {
    function onScroll() {
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      const pct = (scrolled / total) * 100;
      const sid = landingSessionId.current;
      if (!sid) return;
      for (const depth of [25, 50, 75, 100] as const) {
        if (pct >= depth && !firedScrollDepths.current.has(depth)) {
          firedScrollDepths.current.add(depth);
          fetch("/api/track/scroll", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sid, page: "landing", depth }),
          }).catch(() => {});
          fireGtag("scroll_milestone", { page: "landing", depth });
          if (typeof window.fbq === "function") window.fbq("trackCustom", "ScrollMilestone", { page: "landing", depth });
        }
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = heroCtaRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const seen = new Set<string>();
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const name = (e.target as HTMLElement).dataset.section;
          if (e.isIntersecting && name && !seen.has(name)) {
            seen.add(name);
            fireGtag("section_view", { section: name });
          }
        });
      },
      { threshold: 0.4 }
    );
    document.querySelectorAll("[data-section]").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  function selectAge(a: string) {
    setAge(a);
    setCtaError(null);
    fireGtag(a === "younger" || a === "older" ? "age_out_of_band" : "age_selected", { age_band: a });
  }

  function toggleConcern(c: string) {
    setCtaError(null);
    setConcerns((prev) => {
      if (prev.includes(c)) return prev.filter((x) => x !== c);
      const next = prev.length >= 2 ? [...prev.slice(1), c] : [...prev, c];
      fireGtag("concern_selected", { concerns: next.join(",") });
      return next;
    });
  }

  function toggleTick(i: number) {
    setTicked((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      fireGtag("symptom_ticked", { count: next.size });
      return next;
    });
  }

  function buildCtaUrl() {
    const p = new URLSearchParams();
    if (age) {
      // younger/older are out-of-band but still conscious selections — map to 10-11 so the gate sees a valid age param
      p.set("age", (age === "younger" || age === "older") ? "10-11" : age);
    }
    if (concerns.length > 0) p.set("concerns", concerns.join(","));
    const qs = p.toString();
    return `/pre-assessment${qs ? "?" + qs : ""}`;
  }

  function handleCtaClick(location: string) {
    if (!age) {
      setCtaError("Select your child's age above to continue.");
      return;
    }
    if (concerns.length === 0) {
      setCtaError("Pick at least one concern above to continue.");
      return;
    }
    setCtaError(null);
    fireGtag("cta_click", { location });
    router.push(buildCtaUrl());
  }

  const isOob = age === "younger" || age === "older";
  const heroCtaText = isOob
    ? "Open anyway →"
    : age
    ? `Open for your ${age} year old →`
    : "Open the free assessment →";

  const tickCount = ticked.size;
  const kickerText =
    tickCount >= 2
      ? `That's ${tickCount} of ${TICK_ITEMS.length}. This was built for your house.`
      : tickCount === 1
      ? "One is enough to wonder. Two is a pattern."
      : '"If two of these are your Tuesday — keep reading."';

  return (
    <div style={{ background: "var(--paper)" }}>
      <div className="land-shell">

        {/* ── HERO ──────────────────────────────────────────────────── */}
        <section className="hero-section" data-section="hero">
          <div className="hero-grid">

            {/* Left: hook copy + trust badges */}
            <div className="hero-left">
              <div style={{ fontSize: "11.5px", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink-dim)", fontWeight: 700, marginBottom: "20px" }}>
                Attention Architect · For Parents
              </div>
              <h1 style={{ fontFamily: BG, fontWeight: 800, fontSize: "52px", lineHeight: 1.1, letterSpacing: "-.01em", color: "var(--ink)" }}>
                Smart kid.<br />
                Somehow still not listening.<br />
                <span className="mark">Sound familiar?</span>
              </h1>
              <p className="lead-in">
                You&rsquo;ve told your child to <b>pay attention.</b> But have you ever actually told them <b>how?</b>
              </p>
              <div className="badge-stack">
                <div className="trust-item">
                  <div className="trust-icon">⏱</div>
                  <div className="trust-text"><b>Under 5 min</b>Adapts as you answer</div>
                </div>
                <div className="trust-item">
                  <div className="trust-icon">🔒</div>
                  <div className="trust-text"><b>100% private</b>Never shared, never sold</div>
                </div>
                <div className="trust-item">
                  <div className="trust-icon">✓</div>
                  <div className="trust-text"><b>Built for both</b>Your child, and you</div>
                </div>
              </div>
            </div>

            {/* Right: age/concern chips + CTA + reassure list */}
            <div className="hero-right">
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>How old is your child?</div>
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

              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>
                  What concerns you most?{" "}
                  <span style={{ fontWeight: 400, color: "var(--ink-dim)", fontSize: "12.5px" }}>(optional, pick up to 2)</span>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {["Focus", "Screens", "Confidence", "Emotions", "School", "Potential"].map((c) => {
                    const val = c.toLowerCase();
                    return (
                      <button
                        key={val}
                        className={`chip-btn${concerns.includes(val) ? " sel" : ""}`}
                        onClick={() => toggleConcern(val)}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                ref={heroCtaRef}
                className="cta-btn"
                onClick={() => handleCtaClick("hero")}
                style={{ marginTop: "4px" }}
              >
                {heroCtaText}
              </button>

              {ctaError && (
                <p style={{ fontSize: "13px", color: "var(--redpen)", marginTop: "10px", fontWeight: 500 }}>
                  {ctaError}
                </p>
              )}

              <ul className="reassure-list">
                <li>No signup needed</li>
                <li>No Scores</li>
                <li>No Labels</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── INFO ABUNDANCE — "A Shift Nobody Announced" ──────────── */}
        <section className="land-section" data-section="shift">
          <div style={{ fontSize: "11.5px", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink-dim)", fontWeight: 700, marginBottom: "20px" }}>
            A Shift Nobody Announced
          </div>
          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "36px", lineHeight: 1.18, letterSpacing: "-.01em", color: "var(--ink)", marginBottom: "20px" }}>
            The world changed.{" "}
            <span className="mark">The way we raise children didn&rsquo;t.</span>
          </h2>
          <p style={{ fontSize: "17.5px", lineHeight: 1.7, color: "var(--ink-dim)", maxWidth: "560px", marginBottom: "16px" }}>
            Think about how you were raised. Information was scarce — it lived in libraries, in the one teacher who knew. The skill that mattered was finding it. Once you found it, it was yours.
          </p>
          <p style={{ fontSize: "16px", lineHeight: 1.7, color: "var(--ink-dim)", marginBottom: "0" }}>
            Our children live in the exact opposite world. Information is infinite, instant, free. Finding it is no longer the skill — it&rsquo;s barely a task.
          </p>
          <div className="shift-box">
            <div className="shift-row">
              <div className="shift-yr">1995</div>
              <div className="shift-st">Information was scarce. The skill was finding it.</div>
            </div>
            <div className="shift-row">
              <div className="shift-yr">2026</div>
              <div className="shift-st">Information is infinite. The skill is directing your attention within it.</div>
            </div>
          </div>
          <p className="shift-closer">
            No wonder it isn&rsquo;t clicking — no one ever actually taught either of you the new skill.
          </p>
        </section>

        {/* ── RECOGNITION ───────────────────────────────────────────── */}
        <section className="land-section" data-section="recognition">
          <div style={{ fontSize: "11.5px", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink-dim)", fontWeight: 700, marginBottom: "20px" }}>
            Does This Sound Familiar
          </div>
          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "36px", lineHeight: 1.18, letterSpacing: "-.01em", color: "var(--ink)", marginBottom: "20px" }}>
            Does this sound like <span className="mark">your house?</span>
          </h2>
          <p style={{ fontSize: "17px", lineHeight: 1.7, color: "var(--ink-dim)", maxWidth: "560px", marginBottom: "32px" }}>
            Tap the ones that happen in yours — most parents recognize at least two.
          </p>
          <div className="recog-grid">
            <div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {TICK_ITEMS.map((text, i) => (
                  <li
                    key={i}
                    tabIndex={0}
                    className={`tick-li${ticked.has(i) ? " on" : ""}`}
                    style={{ marginBottom: "10px" }}
                    onClick={() => toggleTick(i)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleTick(i); } }}
                  >
                    {text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="recog-side">
              <div style={{ fontFamily: "var(--font-caveat), 'Caveat', cursive", fontSize: "22px", color: "var(--calm-text)", lineHeight: 1.4, marginBottom: "16px" }}>
                {kickerText}
              </div>
              <div style={{ fontSize: "13.5px", color: "var(--calm-text)", lineHeight: 1.6, borderTop: "1px solid rgba(110,95,176,.25)", paddingTop: "16px" }}>
                <strong>What this usually means:</strong> the gap between high-stimulation activities (games, screens) and everything else is rarely about effort. It&rsquo;s about how the task is structured, not how much your child cares.
              </div>
              {tickCount >= 2 && (
                <button
                  className="cta-btn"
                  style={{ marginTop: "20px" }}
                  onClick={() => handleCtaClick("recognition")}
                >
                  Yes, this is my house →
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ── UNFAIR FIGHT ──────────────────────────────────────────── */}
        <section className="land-section" data-section="unfair">
          <div style={{ fontSize: "11.5px", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink-dim)", fontWeight: 700, marginBottom: "20px" }}>
            An Unfair Fight
          </div>
          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "36px", lineHeight: 1.18, letterSpacing: "-.01em", color: "var(--ink)", marginBottom: "20px" }}>
            Someone is training your child&rsquo;s attention every day.<br />
            <span className="mark">It probably isn&rsquo;t you.</span>
          </h2>
          <div style={{ display: "flex", gap: "12px", margin: "28px 0" }}>
            <div style={{ flex: 1, borderRadius: "12px", padding: "22px", background: "var(--card)", border: "1px solid var(--line)" }}>
              <div style={{ fontSize: "10.5px", letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700, color: "var(--ink-dim)", marginBottom: "14px" }}>The Quiet Trainers</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "14px", lineHeight: 2 }}>
                {["You", "School", "Books", "Sport & music", "A slow dinner conversation"].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div style={{ flex: 1, borderRadius: "12px", padding: "22px", background: "var(--ink)", color: "var(--paper)" }}>
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

        {/* ── TWO SYSTEMS, ONE FIT ──────────────────────────────────── */}
        <section className="land-section" data-section="curiosity">
          <div style={{ fontSize: "11.5px", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink-dim)", fontWeight: 700, marginBottom: "20px" }}>
            Two Systems, One Fit
          </div>
          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "36px", lineHeight: 1.18, letterSpacing: "-.01em", color: "var(--ink)", marginBottom: "12px" }}>
            8 ways kids pay attention. <span className="mark">4 ways parents respond.</span>
          </h2>
          <p style={{ fontSize: "17.5px", lineHeight: 1.7, color: "var(--ink-dim)", maxWidth: "560px" }}>
            The real insight isn&rsquo;t either one alone — it&rsquo;s how they fit together.
          </p>

          <div style={{ fontFamily: BG, fontWeight: 700, fontSize: "14px", margin: "32px 0 4px" }}>
            Your child&rsquo;s attention type
          </div>
          <div className="arch-grid-8">
            {CHILD_ARCHETYPES.map(([name, shadow]) => (
              <div key={name} style={{ borderRadius: "12px", padding: "16px 12px", textAlign: "center", fontFamily: BG, fontWeight: 700, fontSize: "13px", background: "var(--marker-tint)", border: "1px solid var(--marker)", color: "var(--marker-text)" }}>
                {name}
                <span style={{ display: "block", fontFamily: "var(--font-instrument), 'Instrument Sans', sans-serif", fontWeight: 500, fontSize: "10px", marginTop: "5px", opacity: 0.85, lineHeight: 1.3 }}>{shadow}</span>
              </div>
            ))}
          </div>

          <div style={{ fontFamily: BG, fontWeight: 700, fontSize: "14px", margin: "32px 0 4px" }}>
            Your instinct pattern
          </div>
          <div className="arch-grid-4">
            {PARENT_PATTERNS.map(([name, shadow]) => (
              <div key={name} style={{ borderRadius: "12px", padding: "16px 12px", textAlign: "center", fontFamily: BG, fontWeight: 700, fontSize: "13px", background: "var(--calm-tint)", border: "1px solid var(--calm)", color: "var(--calm-text)" }}>
                {name}
                <span style={{ display: "block", fontFamily: "var(--font-instrument), 'Instrument Sans', sans-serif", fontWeight: 500, fontSize: "10px", marginTop: "5px", opacity: 0.85, lineHeight: 1.3 }}>{shadow}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── TESTIMONIALS — 3-card scroll row ─────────────────────── */}
        <section className="land-section" data-section="testimonial">
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

        {/* ── FINAL CTA ─────────────────────────────────────────────── */}
        <section
          className="land-section"
          style={{ borderBottom: "none", textAlign: "center", paddingTop: "88px", paddingBottom: "88px" }}
          data-section="finalcta"
        >
          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "38px", lineHeight: 1.18, letterSpacing: "-.01em", color: "var(--ink)", marginBottom: "16px" }}>
            Knowledge is free now.<br />
            <span className="mark">Attention is the advantage.</span>
          </h2>
          <p style={{ fontSize: "17px", lineHeight: 1.7, color: "var(--ink-dim)", maxWidth: "480px", margin: "0 auto 36px" }}>
            A free, adaptive assessment. Two answers — about your child, and about you. Under 5 minutes.
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

      {/* Sticky bar */}
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
