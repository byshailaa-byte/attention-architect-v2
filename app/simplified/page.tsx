"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteFooterFull } from "./_shared";

// ─── Shared primitives ────────────────────────────────────────────────────────

function Eyebrow({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <div style={{
      font: "var(--type-eyebrow)",
      letterSpacing: "var(--tracking-eyebrow)",
      textTransform: "uppercase",
      color: light ? "var(--amber-500)" : "var(--text-eyebrow)",
    }}>{children}</div>
  );
}

function Wrap({ children, narrow }: { children: React.ReactNode; narrow?: boolean }) {
  return (
    <div style={{ maxWidth: narrow ? 880 : "var(--site-max)", margin: "0 auto", padding: "0 var(--page-pad)" }}>
      {children}
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
    <header style={{ background: "var(--surface-footer)", position: "sticky", top: 0, zIndex: 50 }}>
      <div style={{
        background: "var(--white)",
        maxWidth: 1160, margin: "0 auto", padding: "var(--space-4) var(--page-pad)",
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
          padding: "9px 18px", borderRadius: "var(--radius-button)",
          boxShadow: "var(--shadow-button)",
        }}>
          Take free assessment
        </button>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen((o) => !o)} aria-label="Menu" style={{
          all: "unset", cursor: "pointer", display: "var(--nav-toggle-display)", flex: "0 0 auto",
          font: "var(--weight-bold) var(--text-xl)/1 var(--font-sans)",
          color: "var(--navy-800)", padding: "0 4px",
        }}>
          {open ? "×" : "≡"}
        </button>
      </div>

      {/* Mobile drawer */}
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

const CAPABILITIES = [
  { label: "NOTICE",  desc: "Recognise when their attention has drifted.",            icon: "👁" },
  { label: "DIRECT",  desc: "Choose where their attention needs to go.",              icon: "🎯" },
  { label: "PROTECT", desc: "Reduce the things that repeatedly pull it away.",        icon: "🛡" },
  { label: "RECOVER", desc: "Know how to return when attention is lost.",             icon: "🌱" },
];

const WHY_NOBODY_COLS = [
  {
    title: "School assumes it is already there",
    body:  "Every subject is taught to a child who is presumed to be paying attention. None of them build the paying attention.",
  },
  {
    title: "It compounds quietly",
    body:  "At eight it looks like homework. At eighteen it is whether they can run their own day without anyone standing over it.",
  },
  {
    title: "It is built in an order",
    body:  "Six skills, and they arrive in sequence. Nothing goes wrong when a child skips one — it just means effort stops paying, and no one can say why.",
  },
];

const PROCESS_STEPS = [
  { n: 1, title: "Answer",           text: "A few real questions about your child" },
  { n: 2, title: "Discover",         text: "We look for patterns in how attention shows up" },
  { n: 3, title: "Get insights",     text: "Your child's attention profile, in plain language" },
  { n: 4, title: "Understand",       text: "What it means in everyday situations" },
  { n: 5, title: "Get your roadmap", text: "A personalised plan for what to try first — and what comes next" },
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

  const heading: React.CSSProperties = {
    margin: 0,
    fontFamily: "var(--font-sans)",
    fontWeight: "var(--weight-bold)",
    fontSize: "var(--type-display-size)",
    lineHeight: 1.2,
    letterSpacing: "var(--tracking-tight)",
    color: "var(--navy-800)",
  };

  const ctaBtn: React.CSSProperties = {
    all: "unset",
    cursor: "pointer",
    background: "var(--amber-500)",
    color: "var(--navy-800)",
    font: "var(--weight-bold) var(--text-base)/1.3 var(--font-sans)",
    padding: "16px 28px",
    borderRadius: "var(--radius-button)",
    boxShadow: "var(--shadow-button)",
    display: "inline-block",
  };

  const colBar: React.CSSProperties = {
    borderTop: "2px solid var(--amber-500)",
    paddingTop: "var(--space-4)",
    marginBottom: "var(--space-3)",
  };

  return (
    <div className="aa-site">
      <SiteNav onCta={go} active="home" />

      {/* ── S1: Hero ──────────────────────────────────────────────────────── */}
      <div style={{ background: "var(--surface-page-warm)" }}>
        <Wrap>
          <div style={{
            padding: "var(--site-section-gap) 0",
            maxWidth: 680,
            display: "flex", flexDirection: "column", gap: 22,
          }}>
            <h2 style={{ margin: 0, font: "var(--weight-bold) var(--text-xl)/1.3 var(--font-sans)", color: "var(--text-eyebrow)" }}>Become the Architect of your Child&rsquo;s Attention Health</h2>
            <h1 style={{ ...heading, fontSize: "var(--type-display-size)", lineHeight: 1.16 }}>
              You want them to do it without being told.
            </h1>
            <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-body)" }}>
              Every parent does. And it is not about discipline — it is a skill. Your child's attention can be built, in a set order, starting from wherever they are now. Almost no one is ever shown how.
            </p>
            <div style={{ paddingTop: 4 }}>
              <button onClick={go} style={ctaBtn}>See where my child is today →</button>
            </div>
            <p style={{ margin: 0, font: "var(--type-body)", fontSize: "var(--text-base)", color: "var(--ink-500)" }}>
              Free · 5 minutes · Nothing for your child to sit
            </p>
          </div>
        </Wrap>
      </div>

      {/* ── S2: "What without being told actually takes" — capability card ── */}
      <section style={{ borderTop: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ padding: "var(--site-section-gap) 0" }}>
            <div style={{
              border: "1px solid var(--border-card)", borderRadius: "var(--radius-panel)",
              padding: "var(--card-pad-lg)", background: "var(--surface-card)",
              boxShadow: "var(--shadow-card)",
            }}>
              <Eyebrow>What "without being told" actually takes</Eyebrow>
              <div style={{ marginTop: "var(--space-6)", display: "flex", flexDirection: "column" }}>
                {CAPABILITIES.map(({ label, desc, icon }, i) => (
                  <div key={label} style={{
                    display: "flex", alignItems: "flex-start", gap: "var(--space-4)",
                    padding: "var(--space-4) 0",
                    borderTop: i === 0 ? "none" : "1px solid var(--border-divider)",
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: "50%",
                      background: "var(--amber-100)", display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 19, flexShrink: 0,
                    }}>{icon}</div>
                    <div>
                      <div style={{
                        font: "var(--weight-bold) var(--text-base)/1.3 var(--font-sans)",
                        color: "var(--amber-700)", marginBottom: 4,
                      }}>{label}</div>
                      <div style={{ font: "var(--type-body)", color: "var(--text-body)" }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{
                borderTop: "1px solid var(--border-divider)", marginTop: "var(--space-2)",
                paddingTop: "var(--space-5)",
                font: "var(--weight-bold) var(--text-md)/1.45 var(--font-sans)", color: "var(--navy-800)",
              }}>
                A child who can do these four does not need you in the chair.
              </div>
            </div>
          </div>
        </Wrap>
      </section>

      {/* ── S3: Why nobody has given you this before ──────────────────────── */}
      <section style={{ padding: "var(--site-section-gap) 0", borderTop: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 14 }}>
              <Eyebrow>Why nobody has given you this before</Eyebrow>
              <h2 style={heading}>It is the one capability no one is responsible for teaching.</h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "var(--grid-3up)", gap: "var(--space-8)" }}>
              {WHY_NOBODY_COLS.map(({ title, body }) => (
                <div key={title}>
                  <div style={colBar} />
                  <h3 style={{
                    margin: "0 0 var(--space-3)",
                    font: "var(--weight-bold) var(--text-lg)/var(--leading-snug) var(--font-sans)",
                    color: "var(--navy-800)",
                  }}>{title}</h3>
                  <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-body)" }}>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </Wrap>
      </section>

      {/* ── S4: What makes this different ────────────────────────────────── */}
      <section style={{ padding: "var(--site-section-gap) 0", background: "var(--surface-page-warm)", borderTop: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 14, margin: "0 auto", textAlign: "center" }}>
              <Eyebrow>What makes this different</Eyebrow>
              <h2 style={heading}>Most assessments only look at your child. We look at both of you.</h2>
              <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-body)" }}>
                Attention is not something a child manages alone. It is shaped by the relationship between how they focus and how you respond when they struggle. Understanding one without the other only tells half the story.
              </p>
            </div>

            <div className="aa-pattern-link">
              <div style={{ flex: 1, padding: "var(--card-pad-lg)" }}>
                <div style={{
                  fontFamily: "var(--font-sans)", fontWeight: "var(--weight-extrabold)",
                  fontSize: "var(--text-lg)", color: "var(--navy-800)", marginBottom: 8,
                }}>Your child's pattern</div>
                <div style={{ font: "var(--type-body)", fontSize: "var(--text-sm)", color: "var(--text-body)" }}>
                  How they focus, what pulls them away, and how they come back.
                </div>
              </div>
              <div className="aa-pattern-connector" style={{
                flexShrink: 0, width: 120, display: "flex", alignItems: "center", justifyContent: "center",
                background: "linear-gradient(180deg,var(--amber-100),var(--teal-100))",
                padding: "0 12px",
              }}>
                <span style={{
                  font: "var(--weight-bold) var(--text-xs)/1.4 var(--font-sans)",
                  color: "var(--navy-800)", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center",
                }}>shapes &amp; is shaped by</span>
              </div>
              <div style={{ flex: 1, padding: "var(--card-pad-lg)" }}>
                <div style={{
                  fontFamily: "var(--font-sans)", fontWeight: "var(--weight-extrabold)",
                  fontSize: "var(--text-lg)", color: "var(--navy-800)", marginBottom: 8,
                }}>Your instinct</div>
                <div style={{ font: "var(--type-body)", fontSize: "var(--text-sm)", color: "var(--text-body)" }}>
                  How you respond when they struggle — and whether that helps or works against their pattern.
                </div>
              </div>
            </div>

            <p style={{ margin: "0 auto", maxWidth: 760, font: "var(--type-body)", color: "var(--text-body)", textAlign: "center" }}>
              Every profile names your own Parent Instinct — not to judge how you parent, but to show you exactly where your instinct and your child's pattern meet.
            </p>
          </div>
        </Wrap>
      </section>

      {/* ── S5: How it works — 5 steps ────────────────────────────────────── */}
      <section style={{ padding: "var(--site-section-gap) 0", borderTop: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 14 }}>
              <Eyebrow>The process</Eyebrow>
              <h2 style={heading}>How it works</h2>
            </div>

            <div className="aa-steps-grid">
              {PROCESS_STEPS.map(({ n, title, text }) => (
                <div key={n} style={{
                  background: "var(--surface-card)", border: "1px solid var(--border-card)",
                  borderRadius: "var(--radius-card)", padding: "var(--card-pad)", boxShadow: "var(--shadow-card)",
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "var(--radius-md)",
                    background: "var(--amber-500)", color: "var(--navy-800)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-sans)", fontWeight: "var(--weight-extrabold)", fontSize: "var(--text-sm)",
                    marginBottom: 14, flexShrink: 0,
                  }}>{n}</div>
                  <div style={{
                    fontFamily: "var(--font-sans)", fontWeight: "var(--weight-bold)",
                    fontSize: "var(--text-base)", color: "var(--navy-800)", marginBottom: 6,
                  }}>{title}</div>
                  <div style={{ font: "var(--type-body)", fontSize: "var(--text-sm)", color: "var(--text-body)" }}>{text}</div>
                </div>
              ))}
            </div>
          </div>
        </Wrap>
      </section>

      {/* ── S6: What this is built on — 4-column foundation ──────────────── */}
      <section style={{ padding: "var(--site-section-gap) 0", background: "var(--surface-page-warm)", borderTop: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center", display: "flex", flexDirection: "column", gap: 14 }}>
              <Eyebrow>What this is built on</Eyebrow>
              <h2 style={heading}>Not opinion. Not parenting philosophy.</h2>
              <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-body)" }}>
                Everything here comes from established work on how attention develops in children — translated out of the literature and into the language of your evening.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "var(--grid-2up)", gap: "var(--space-8)" }}>
              {FOUNDATION_COLS.map(({ title, body }) => (
                <div key={title}>
                  <div style={colBar} />
                  <h3 style={{
                    margin: "0 0 var(--space-3)",
                    font: "var(--weight-bold) var(--text-lg)/var(--leading-snug) var(--font-sans)",
                    color: "var(--navy-800)",
                  }}>{title}</h3>
                  <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-body)" }}>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </Wrap>
      </section>

      {/* ── S7: Testimonials — 8 cards, horizontal scroll ────────────────── */}
      <section style={{ padding: "var(--site-section-gap) 0", borderTop: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 14 }}>
              <Eyebrow>From other parents</Eyebrow>
              <h2 style={heading}>What actually changed at home</h2>
            </div>

            <div className="aa-hscroll">
              {TESTIMONIALS.map((t, i) => (
                <div key={i} style={{
                  flex: "0 0 300px", background: "var(--surface-card)",
                  border: "1px solid var(--border-card)", borderRadius: "var(--radius-card)",
                  padding: "var(--card-pad)", boxShadow: "var(--shadow-card)",
                }}>
                  <p style={{
                    margin: "0 0 16px",
                    font: "italic var(--weight-regular) var(--text-base)/var(--leading-relaxed) var(--font-sans)",
                    color: "var(--ink-600)",
                  }}>&ldquo;{t.quote}&rdquo;</p>
                  <div style={{
                    fontFamily: "var(--font-sans)", fontWeight: "var(--weight-bold)",
                    fontSize: "var(--text-sm)", color: "var(--navy-800)", marginBottom: 2,
                  }}>{t.who}</div>
                  <div style={{ font: "var(--type-body-sm)", color: "var(--text-muted)" }}>{t.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </Wrap>
      </section>

      {/* ── S8: CloseBand ─────────────────────────────────────────────────── */}
      <div style={{ background: "var(--navy-800)" }}>
        <Wrap>
          <div style={{
            padding: "var(--site-section-gap) 0",
            display: "flex", flexDirection: "column", gap: 20, maxWidth: 760,
          }}>
            <Eyebrow light>Free · 5 minutes · No sign-up</Eyebrow>
            <div style={{
              fontFamily: "var(--font-sans)", fontWeight: "var(--weight-bold)",
              fontSize: "var(--type-display-size)", lineHeight: 1.2,
              letterSpacing: "var(--tracking-tight)", color: "#fff",
            }}>
              Five minutes to see the picture properly.
            </div>
            <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-on-navy-muted)" }}>
              You answer a few questions about things you already notice. You get your child's attention profile — where they stand, which instinct you bring to it, and what to change first. Free, and yours to keep.
            </p>
            <div style={{ paddingTop: 4 }}>
              <button onClick={go} style={ctaBtn}>See where my child is today →</button>
            </div>
          </div>
        </Wrap>
      </div>

      {/* ── S9: If you want the detail — quiet links ──────────────────────── */}
      <div style={{ background: "var(--surface-page-warm)", borderTop: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div className="aa-detail-links" style={{ padding: "var(--space-10) 0" }}>
            <span style={{
              font: "var(--weight-bold) var(--text-sm)/1.4 var(--font-sans)",
              color: "var(--ink-500)", letterSpacing: "0.06em", textTransform: "uppercase",
            }}>If you want the detail</span>
            {([
              ["What Attention Health is", "/simplified/health"],
              ["The 8 kinds of children",  "/simplified/children"],
              ["The 4 parent instincts",   "/simplified/parents"],
              ["Other families",           "/simplified/resources"],
            ] as [string, string][]).map(([label, href]) => (
              <a key={label}
                href={href}
                style={{
                  font: "var(--weight-medium) var(--text-base)/1.4 var(--font-sans)",
                  color: "var(--ink-600)", textDecoration: "none", cursor: "pointer",
                }}
              >{label} →</a>
            ))}
          </div>
        </Wrap>
      </div>

      <SiteFooterFull />
    </div>
  );
}
