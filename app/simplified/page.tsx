"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteFooterFull } from "./_shared";

// ─── Shared primitives ────────────────────────────────────────────────────────

const BF = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: "var(--site-max)", margin: "0 auto", padding: "0 var(--page-pad)" }}>
      {children}
    </div>
  );
}

function SectionMarker({ n, label, light }: { n: number; label: string; light?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <div style={{
        width: 25, height: 25, borderRadius: "50%",
        background: "linear-gradient(135deg,var(--amber-400),var(--amber-500))",
        color: "var(--navy-800)",
        fontFamily: BF, fontWeight: 800, fontSize: 11,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        boxShadow: "0 2px 8px rgba(245,166,35,.32)",
      }}>{n}</div>
      <div style={{
        fontSize: 9.5, letterSpacing: "0.15em", textTransform: "uppercase" as const, fontWeight: 700,
        color: light ? "#FBCB4A" : "#A38A5C",
      }}>{label}</div>
    </div>
  );
}

// ─── Nav ─────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "home",       label: "Home",                href: "/" },
  { id: "health",     label: "Attention Health",    href: "/health" },
  { id: "archetypes", label: "8 Types of Children", href: "/children" },
  { id: "instincts",  label: "4 Types of Parents",  href: "/parents" },
  { id: "resources",  label: "Resources",           href: "/resources" },
  { id: "about",      label: "About us",            href: "/about" },
];

function SiteNav({ onCta, active }: { onCta: () => void; active: string }) {
  const [open, setOpen] = useState(false);
  return (
    <header style={{
      background: "rgba(255,255,255,.92)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border-divider)",
      position: "sticky", top: 0, zIndex: 50,
    }}>
      <div style={{
        maxWidth: "var(--site-max)", margin: "0 auto", padding: "14px var(--page-pad)",
        display: "flex", alignItems: "center", gap: "var(--space-6)",
      }}>
        <a href="/" style={{ flex: "0 0 auto", display: "block" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-horizontal-icon-wordmark.png" alt="Attention Architect" style={{ height: 34, width: "auto", display: "block" }} />
        </a>

        <nav style={{
          flex: 1, display: "var(--nav-display)", alignItems: "center",
          justifyContent: "flex-end", gap: "var(--space-6)",
        }}>
          {NAV_ITEMS.map((item) => (
            <a key={item.id}
              href={item.href}
              style={{
                whiteSpace: "nowrap", textDecoration: "none", paddingBottom: 2,
                borderBottom: active === item.id ? "2px solid var(--amber-500)" : "2px solid transparent",
                font: `var(--weight-${active === item.id ? "bold" : "medium"}) var(--text-sm)/1.4 var(--font-sans)`,
                color: active === item.id ? "var(--navy-800)" : "var(--ink-600)",
              }}
            >{item.label}</a>
          ))}
        </nav>

        <button onClick={onCta} style={{
          all: "unset", cursor: "pointer", whiteSpace: "nowrap", flex: "0 0 auto",
          display: "var(--nav-cta-display)",
          background: "var(--navy-800)", color: "#fff",
          font: "var(--weight-bold) var(--text-sm)/1.3 var(--font-sans)",
          padding: "10px 18px", borderRadius: "var(--radius-button)",
          boxShadow: "0 2px 10px rgba(20,40,77,.22)",
        }}>
          Take free assessment
        </button>

        <button onClick={() => setOpen((o) => !o)} aria-label="Menu" style={{
          all: "unset", cursor: "pointer", display: "var(--nav-toggle-display)", flex: "0 0 auto",
          font: "var(--weight-bold) var(--text-xl)/1 var(--font-sans)",
          color: "var(--navy-800)", padding: "0 4px",
        }}>
          {open ? "×" : "≡"}
        </button>
      </div>

      {open && (
        <div style={{
          background: "var(--white)",
          display: "flex", flexDirection: "column",
          borderTop: "1px solid var(--border-divider)",
          padding: "var(--space-3) var(--page-pad) var(--space-5)",
        }}>
          {NAV_ITEMS.map((item) => (
            <a key={item.id}
              href={item.href}
              onClick={() => setOpen(false)}
              style={{
                padding: "var(--space-3) 0",
                font: "var(--weight-medium) var(--text-base)/1.4 var(--font-sans)",
                color: "var(--ink-600)", textDecoration: "none",
                borderBottom: "1px solid var(--border-divider)",
              }}
            >{item.label}</a>
          ))}
          <div style={{ paddingTop: "var(--space-4)" }}>
            <button onClick={() => { setOpen(false); onCta(); }} style={{
              all: "unset", cursor: "pointer",
              background: "var(--amber-500)", color: "var(--navy-800)",
              font: "var(--weight-bold) var(--text-sm)/1.3 var(--font-sans)",
              padding: "10px 20px", borderRadius: "var(--radius-button)",
            }}>Take free assessment</button>
          </div>
        </div>
      )}
    </header>
  );
}

// ─── Page data ────────────────────────────────────────────────────────────────

const WHY_ATTENTION_CARDS: {
  ramp: string; bg: string; iconStroke: string; title: string; desc: string;
  svg: React.ReactNode;
}[] = [
  {
    ramp: "#E2705F", bg: "#FBEDEA", iconStroke: "#E2705F",
    title: "Confidence",
    desc: "Finishing what you start builds a different self-image than being reminded five times.",
    svg: <><circle cx="12" cy="12" r="5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></>,
  },
  {
    ramp: "#E9973F", bg: "var(--amber-100)", iconStroke: "#E9973F",
    title: "School",
    desc: "Attention isn't intelligence. It's what lets intelligence turn up on the page.",
    svg: <path d="M4 4h7v16H4zM13 4h7v16h-7z"/>,
  },
  {
    ramp: "#3D7CB8", bg: "#EAF1F8", iconStroke: "#3D7CB8",
    title: "Home",
    desc: "Most evening friction isn't about homework. It's about the asking.",
    svg: <><path d="M3 11l9-7 9 7v9a1 1 0 01-1 1H4a1 1 0 01-1-1z"/><path d="M9 21v-6h6v6"/></>,
  },
  {
    ramp: "#4E9E86", bg: "var(--teal-100)", iconStroke: "#4E9E86",
    title: "Later",
    desc: "Nobody reminds a nineteen-year-old to start.",
    svg: <><path d="M5 21v-7a7 7 0 0114 0v7"/><path d="M12 3v4"/></>,
  },
];

const PROCESS_STEPS = [
  { n: 1, ramp: "#E2705F", title: "Answer",           text: "A few real questions about your child" },
  { n: 2, ramp: "#E9973F", title: "Discover",         text: "We look for patterns in how attention shows up" },
  { n: 3, ramp: "#DFC13C", title: "Get your profile", text: "In plain language. No scores, no diagnoses." },
  { n: 4, ramp: "#3D7CB8", title: "Understand",       text: "What it means in everyday situations" },
  { n: 5, ramp: "#4E9E86", title: "Get your roadmap", text: "A plan for what to try first. Six weeks, one adjustment at a time." },
];

const FOUNDATION_COLS = [
  {
    title: "Attention develops in a sequence",
    body:  "Developmental research is consistent on this: the capacities that let a child sustain and return their focus arrive in an order, not all at once. That is why the plan starts where your child actually is rather than at step one.",
  },
  {
    title: "The adult in the room is part of the system",
    body:  "Decades of parent-mediated intervention work shows the same thing — what shifts a child's self-regulation is usually a change in how the adult responds, not a change demanded of the child.",
  },
  {
    title: "One change at a time is what holds",
    body:  "Behaviour-change evidence is unambiguous: small, single, repeated adjustments survive; comprehensive overhauls do not. Six weeks, one change each, is a design decision taken from that.",
  },
  {
    title: "Description before prescription",
    body:  "Nothing here names, screens for, or rules out a condition. We describe how your child's attention behaves and what to do next. If something worries you clinically, that is a conversation for a qualified professional — this sits alongside it, never instead of it.",
  },
];

// Five from kit (verbatim from PDF); three from codebase (app/page.tsx, TestimonialsCarousel.tsx)
const TESTIMONIALS = [
  {
    quote:  "It was the ten-second pause that did it. I stopped rescuing him the second he stalled, and within a fortnight he was finishing questions I would have jumped into.",
    who:    "Meghna R.",
    detail: "Mother of a 9-year-old, Pune",
  },
  {
    quote:  "I had been calling it laziness for two years. Reading the profile was uncomfortable — it described me as much as her. That is what made it useful.",
    who:    "Arun S.",
    detail: "Father of an 11-year-old, Bengaluru",
  },
  {
    quote:  "Nothing about our evening got longer. One sentence changed, that is all. He now starts on his own about four nights out of five.",
    who:    "Priya N.",
    detail: "Mother of an 8-year-old, Delhi",
  },
  {
    quote:  "We had done the tutoring, the charts, the rewards. This is the first thing that explained why none of it stuck.",
    who:    "Fatima K.",
    detail: "Mother of a 12-year-old, Hyderabad",
  },
  {
    quote:  "The plan told me what to stop doing, which no one had ever done. Week three was the one that mattered for us.",
    who:    "Rahul & Divya",
    detail: "Parents of a 10-year-old, Mumbai",
  },
  {
    quote:  "We believed our son just needed more discipline. This completely changed our perspective. A few simple changes reduced the daily arguments, and studying no longer feels like a battle.",
    who:    "Sandeel Shukla",
    detail: "Parent of a 14-year-old Son · Raipur",
  },
  {
    quote:  "We thought our son was just being lazy or spending too much time on screens. This helped us understand what was really happening. Homework became much calmer, and so did our evenings.",
    who:    "Manya Gangele",
    detail: "Parent of an 11-year-old Son · Indore",
  },
  {
    quote:  "I was constantly reminding my daughter to stay on task. Small changes in how we approached things at home made a huge difference. She's much more independent now.",
    who:    "Suchitra Mehta",
    detail: "Parent of an 8-year-old Daughter · Mumbai",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SimplifiedHomepage() {
  const router = useRouter();
  function go() { router.push("/start"); }

  const h2style: React.CSSProperties = {
    margin: 0,
    fontFamily: BF,
    fontWeight: 800,
    fontSize: "clamp(22px,3.5vw,31px)",
    lineHeight: 1.12,
    letterSpacing: "-0.025em",
    color: "var(--navy-800)",
  };

  const ctaBtn: React.CSSProperties = {
    all: "unset",
    cursor: "pointer",
    display: "block",
    background: "linear-gradient(135deg,var(--amber-400),var(--amber-500))",
    color: "var(--navy-800)",
    fontFamily: BF,
    fontWeight: 800,
    fontSize: 16,
    lineHeight: 1.3,
    padding: "16px 30px",
    borderRadius: "var(--radius-button)",
    boxShadow: "0 6px 20px rgba(245,166,35,.34)",
    textAlign: "center" as const,
  };

  return (
    <div className="aa-site">

      {/* ── Tagbar — not sticky ───────────────────────────────────────────────── */}
      <div style={{
        background: "var(--navy-800)", padding: "11px var(--page-pad)",
        textAlign: "center" as const, position: "relative" as const, overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(90deg,transparent,rgba(245,166,35,.12),transparent)",
          pointerEvents: "none",
        }} />
        <span style={{ fontFamily: BF, fontSize: 12.5, fontWeight: 700, color: "#FBCB4A", position: "relative" }}>
          Become the Architect of your Child&rsquo;s Attention Health
        </span>
      </div>

      <SiteNav onCta={go} active="home" />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(168deg,var(--surface-page-warm),#FCF2E2)",
        position: "relative" as const, overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -140, right: -100, width: 430, height: 430,
          borderRadius: "50%", background: "radial-gradient(circle,rgba(245,166,35,.20),transparent 66%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -100, left: -80, width: 290, height: 290,
          borderRadius: "50%", background: "radial-gradient(circle,rgba(33,163,138,.10),transparent 68%)",
          pointerEvents: "none",
        }} />
        <Wrap>
          <div style={{ padding: "var(--site-section-gap) 0", position: "relative" as const }}>

            <h1 style={{
              margin: "0 0 17px", fontFamily: BF, fontWeight: 800,
              fontSize: "clamp(30px,5.5vw,46px)", lineHeight: 1.02,
              letterSpacing: "-0.035em", color: "var(--navy-800)", maxWidth: 790,
            }}>
              Two hours on a game.<br />Ten minutes on homework.
            </h1>

            <p style={{
              margin: "0 0 14px",
              fontSize: "clamp(14.5px,2vw,17.5px)", lineHeight: 1.5,
              color: "var(--navy-800)", fontWeight: 600, maxWidth: 640,
            }}>
              That gap isn&rsquo;t laziness. Attention is a skill nobody teaches &mdash; and it can be built.
            </p>

            <p style={{ margin: "0 0 28px", fontSize: "clamp(13px,1.5vw,15px)", lineHeight: 1.6, maxWidth: 630 }}>
              We look at how your child&rsquo;s attention actually works, and at what you do when they stall.<br />
              Then we give you six weeks, starting from where they already are.
            </p>

            <div style={{ maxWidth: 380 }}>
              <button onClick={go} style={ctaBtn}>See how my child&rsquo;s attention works →</button>
              <p style={{ margin: "12px 0 0", fontSize: 12.5, color: "#8A8D94", textAlign: "center" as const }}>
                Free · 5 minutes · Not a diagnostic test · Nothing for your child to sit
              </p>
            </div>

          </div>
        </Wrap>
      </div>

      {/* ── S1: Why attention ────────────────────────────────────────────────── */}
      <section style={{ background: "var(--white)", borderTop: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ padding: "var(--site-section-gap) 0" }}>
            <SectionMarker n={1} label="Why attention" />
            <h2 style={h2style}>It sits underneath most of it</h2>
            <p style={{ margin: "12px 0 0", fontSize: 15.5, lineHeight: 1.62, maxWidth: 620, color: "var(--text-body)" }}>
              Not the only thing that matters. The thing the others need in order to show up.
            </p>

            <div className="aa-why-grid">
              {WHY_ATTENTION_CARDS.map(({ ramp, bg, iconStroke, svg, title, desc }) => (
                <div key={title} style={{
                  background: "var(--surface-page-warm)", borderRadius: 14,
                  padding: 21, position: "relative" as const, overflow: "hidden",
                  boxShadow: "0 3px 14px rgba(20,40,77,.06)",
                }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: ramp }} />
                  <div style={{
                    width: 38, height: 38, borderRadius: 11, background: bg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 13,
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                      stroke={iconStroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      {svg}
                    </svg>
                  </div>
                  <div style={{ fontFamily: BF, fontSize: 16.5, fontWeight: 700, color: "var(--navy-800)" }}>{title}</div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 7, color: "var(--text-body)" }}>{desc}</div>
                </div>
              ))}
            </div>

            <div style={{
              fontFamily: BF, fontSize: 18, lineHeight: 1.4, marginTop: 26,
              color: "var(--navy-800)", fontWeight: 700, textAlign: "center" as const,
            }}>
              Work on attention and you&rsquo;re working on all four at once.
            </div>
          </div>
        </Wrap>
      </section>

      {/* ── S2: Why nobody has given you this before ─────────────────────────── */}
      <section style={{ padding: "var(--site-section-gap) 0", background: "var(--surface-page-warm)", borderTop: "1px solid var(--border-divider)" }}>
        <Wrap>
          <SectionMarker n={2} label="Why nobody has given you this before" />
          <h2 style={h2style}>It is the one capability no one is responsible for teaching.</h2>
          <div className="g3">
            <div className="gcol">
              <div className="gct">School assumes it is already there</div>
              <div className="gcd">Every subject is taught to a child who is presumed to be paying attention. None of them build the paying attention.</div>
            </div>
            <div className="gcol">
              <div className="gct">It compounds quietly</div>
              <div className="gcd">At eight it looks like homework. At eighteen it is whether they can run their own day without anyone standing over it.</div>
            </div>
            <div className="gcol">
              <div className="gct">It is built in an order</div>
              <div className="gcd">Six skills, and they arrive in sequence. Nothing goes wrong when a child skips one &mdash; it just means effort stops paying, and no one can say why.</div>
            </div>
          </div>
        </Wrap>
      </section>

      {/* ── S3: What makes this different ────────────────────────────────────── */}
      <section style={{ padding: "var(--site-section-gap) 0", background: "var(--white)", borderTop: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 14, margin: "0 auto", textAlign: "center" as const }}>
              <SectionMarker n={3} label="What makes this different" />
              <h2 style={h2style}>We look at your child. And at how you respond.</h2>
              <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.62, color: "var(--text-body)" }}>
                Attention isn&rsquo;t something a child manages alone. It&rsquo;s shaped by how you respond when they struggle&nbsp;&mdash; and most reports only ever tell half the story.
              </p>
            </div>

            <div className="aa-pattern-link">
              <div style={{ flex: 1, padding: "var(--card-pad-lg)" }}>
                <div style={{
                  width: 35, height: 35, borderRadius: 11, background: "var(--teal-100)",
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--teal-700)" strokeWidth={2} strokeLinecap="round">
                    <circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/>
                  </svg>
                </div>
                <div style={{ fontFamily: BF, fontWeight: 800, fontSize: "var(--text-lg)", color: "var(--navy-800)", marginBottom: 8 }}>
                  Your child&rsquo;s pattern
                </div>
                <div style={{ fontSize: "var(--text-sm)", lineHeight: 1.55, color: "var(--text-body)" }}>
                  How they focus, what pulls them away, and how they come back.
                </div>
              </div>
              <div className="aa-pattern-connector" style={{
                flexShrink: 0, width: 96, display: "flex", alignItems: "center", justifyContent: "center",
                background: "linear-gradient(180deg,var(--amber-100),var(--teal-100))",
                padding: "0 12px",
              }}>
                <span style={{
                  fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase" as const,
                  fontWeight: 700, color: "var(--navy-800)", textAlign: "center" as const, lineHeight: 1.5,
                }}>
                  shapes &amp;<br />is shaped by
                </span>
              </div>
              <div style={{ flex: 1, padding: "var(--card-pad-lg)" }}>
                <div style={{
                  width: 35, height: 35, borderRadius: 11, background: "var(--amber-100)",
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--amber-600)" strokeWidth={2} strokeLinecap="round">
                    <path d="M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z"/>
                  </svg>
                </div>
                <div style={{ fontFamily: BF, fontWeight: 800, fontSize: "var(--text-lg)", color: "var(--navy-800)", marginBottom: 8 }}>
                  Your instinct
                </div>
                <div style={{ fontSize: "var(--text-sm)", lineHeight: 1.55, color: "var(--text-body)" }}>
                  How you respond when they struggle&nbsp;&mdash; and whether that works with their pattern or against it.
                </div>
              </div>
            </div>

            <p style={{ margin: "0 auto", maxWidth: 640, fontSize: 14, lineHeight: 1.6, textAlign: "center" as const, color: "var(--text-body)" }}>
              Every profile names your own Parent Instinct —{" "}
              <strong style={{ color: "var(--navy-800)" }}>
                not to judge how you parent, but to show you exactly where your instinct and your child&rsquo;s pattern meet.
              </strong>
            </p>
          </div>
        </Wrap>
      </section>

      {/* ── S4: The process — 5 steps ────────────────────────────────────────── */}
      <section style={{ padding: "var(--site-section-gap) 0", background: "var(--surface-page-warm)", borderTop: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 14 }}>
              <SectionMarker n={4} label="The process" />
              <h2 style={h2style}>Five steps, one evening to start</h2>
            </div>

            <div className="aa-steps-grid">
              {PROCESS_STEPS.map(({ n, ramp, title, text }) => (
                <div key={n} style={{
                  background: "var(--surface-page-warm)", borderRadius: 13,
                  padding: 18, boxShadow: "0 3px 12px rgba(20,40,77,.05)",
                }}>
                  <div style={{
                    width: 27, height: 27, borderRadius: 9,
                    background: ramp, color: "#fff",
                    fontFamily: BF, fontWeight: 800, fontSize: 12,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 11, flexShrink: 0,
                  }}>{n}</div>
                  <div style={{ fontFamily: BF, fontSize: 14.5, fontWeight: 700, color: "var(--navy-800)" }}>{title}</div>
                  <div style={{ fontSize: 12, lineHeight: 1.5, marginTop: 5, color: "var(--text-body)" }}>{text}</div>
                </div>
              ))}
            </div>
          </div>
        </Wrap>
      </section>

      {/* ── S5: What this is built on — navy ─────────────────────────────────── */}
      <section style={{
        padding: "var(--site-section-gap) 0", borderTop: "1px solid var(--border-divider)",
        background: "linear-gradient(165deg,var(--navy-800),#1A3159)",
        position: "relative" as const, overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -110, right: -80, width: 340, height: 340,
          borderRadius: "50%", background: "radial-gradient(circle,rgba(245,166,35,.13),transparent 66%)",
          pointerEvents: "none",
        }} />
        <Wrap>
          <div style={{ display: "flex", flexDirection: "column", gap: 40, position: "relative" as const }}>
            <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" as const, display: "flex", flexDirection: "column", gap: 14 }}>
              <SectionMarker n={5} label="What this is built on" light />
              <h2 style={{ ...h2style, color: "#fff" }}>Not opinion. Not parenting philosophy.</h2>
              <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.62, color: "#AFBACB" }}>
                Everything here comes from established work on how attention develops in children — translated out of the literature and into the language of your evening.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "var(--grid-2up)", gap: 15 }}>
              {FOUNDATION_COLS.map(({ title, body }, i) => (
                <div key={title} style={{
                  background: "rgba(255,255,255,.055)", border: "1px solid rgba(255,255,255,.11)",
                  borderRadius: 15, padding: 23, position: "relative" as const, overflow: "hidden",
                }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,var(--amber-500),var(--amber-400))" }} />
                  <div style={{ fontFamily: BF, fontSize: 11, fontWeight: 800, color: "var(--amber-500)", letterSpacing: "0.08em" }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div style={{ fontFamily: BF, fontSize: 18, fontWeight: 700, color: "#fff", marginTop: 8, lineHeight: 1.24 }}>{title}</div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.65, color: "#A9B7CA", marginTop: 9 }}>{body}</div>
                </div>
              ))}
            </div>

            <div style={{ paddingTop: 20, borderTop: "1px solid rgba(255,255,255,.13)" }}>
              <div style={{
                fontSize: 11, letterSpacing: "0.17em", textTransform: "uppercase" as const,
                fontWeight: 700, color: "#FBCB4A", fontFamily: BF,
              }}>
                NOTICE · DIRECT · PROTECT · RECOVER
              </div>
              <div style={{
                fontFamily: BF, fontWeight: 700, color: "#fff", marginTop: 8, lineHeight: 1.3,
                fontSize: "clamp(14.5px,2.5vw,18.5px)",
              }}>
                A child who can do these four does not need you in the chair.
              </div>
            </div>
          </div>
        </Wrap>
      </section>

      {/* ── S6: Real parents — horizontal scroll ─────────────────────────────── */}
      <section style={{ padding: "var(--site-section-gap) 0", background: "var(--surface-page-warm)", borderTop: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 14 }}>
              <SectionMarker n={6} label="Real parents" />
              <h2 style={h2style}>What actually changed at home</h2>
            </div>

            <div className="aa-hscroll">
              {TESTIMONIALS.map((t, i) => (
                <div key={i} style={{
                  flex: "0 0 290px", background: "var(--surface-card)",
                  borderRadius: 15, padding: 22, boxShadow: "0 4px 16px rgba(20,40,77,.07)",
                }}>
                  <div style={{ fontFamily: BF, fontSize: 40, color: "#F2DFB8", lineHeight: 0.55, height: 18 }}>&ldquo;</div>
                  <p style={{ margin: "10px 0 0", fontSize: 13.5, lineHeight: 1.6, color: "var(--navy-800)" }}>{t.quote}</p>
                  <div style={{ fontSize: 11.5, marginTop: 15, paddingTop: 13, borderTop: "1px solid var(--border-divider)" }}>
                    <strong style={{ color: "var(--navy-800)", display: "block", fontSize: 12.5, fontFamily: BF }}>{t.who}</strong>
                    {t.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Wrap>
      </section>

      {/* ── CloseBand ────────────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(160deg,var(--navy-800),#1D3661)",
        padding: "clamp(42px,7vw,70px) 0", textAlign: "center" as const,
        position: "relative" as const, overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", bottom: -110, right: -70, width: 340, height: 340,
          borderRadius: "50%", background: "radial-gradient(circle,rgba(245,166,35,.19),transparent 66%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", top: -90, left: -70, width: 250, height: 250,
          borderRadius: "50%", background: "radial-gradient(circle,rgba(33,163,138,.13),transparent 68%)",
          pointerEvents: "none",
        }} />
        <Wrap>
          <div style={{ position: "relative" as const }}>
            <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" as const, color: "var(--amber-500)", fontWeight: 700 }}>
              Free · 5 minutes · No sign-up
            </div>
            <h2 style={{
              fontFamily: BF, fontWeight: 800, color: "#fff", marginTop: 12, lineHeight: 1.1,
              letterSpacing: "-0.025em", fontSize: "clamp(23px,4vw,34px)",
            }}>
              Five minutes to see the picture properly.
            </h2>
            <p style={{ fontSize: "clamp(13px,1.5vw,14.5px)", color: "#AFBACB", margin: "14px auto 0", lineHeight: 1.6, maxWidth: 530 }}>
              You answer a few questions about things you already notice. You get your child&rsquo;s attention profile — where they stand, which instinct you bring to it, and what to change first. Free, and yours to keep.
            </p>
            <div style={{ marginTop: 28, display: "inline-block" }}>
              <button onClick={go} style={{ ...ctaBtn, display: "inline-block" }}>See how my child&rsquo;s attention works →</button>
            </div>
          </div>
        </Wrap>
      </div>

      {/* ── If you want the detail ────────────────────────────────────────────── */}
      <div style={{ background: "var(--surface-page-warm)", borderTop: "1px solid var(--border-divider)", padding: "42px 0" }}>
        <Wrap>
          <div style={{ fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#A38A5C", fontWeight: 700 }}>
            If you want the detail
          </div>
          <div className="aa-quiet-grid">
            {([
              ["What Attention Health is", "/simplified/health"],
              ["The 8 kinds of children",  "/simplified/children"],
              ["The 4 parent instincts",   "/simplified/parents"],
              ["Other families",           "/simplified/resources"],
            ] as [string, string][]).map(([label, href]) => (
              <a key={label} href={href} style={{
                fontSize: 12.5, color: "var(--navy-800)", fontWeight: 600,
                textDecoration: "none", background: "var(--surface-card)",
                borderRadius: 10, padding: "14px 16px", display: "block",
                boxShadow: "0 2px 8px rgba(20,40,77,.05)",
              }}>{label} →</a>
            ))}
          </div>
        </Wrap>
      </div>

      <SiteFooterFull />
    </div>
  );
}
