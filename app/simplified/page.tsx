"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteFooterFull } from "./_shared";

// ─── Shared primitives ────────────────────────────────────────────────────────

const BF = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";

function Wrap({ children, narrow }: { children: React.ReactNode; narrow?: boolean }) {
  return (
    <div style={{ maxWidth: narrow ? 880 : "var(--site-max)", margin: "0 auto", padding: "0 var(--page-pad)" }}>
      {children}
    </div>
  );
}

function SectionMarker({ n, label, light }: { n: number; label: string; light?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <div style={{
        width: 19, height: 19, borderRadius: "50%",
        background: "var(--amber-500)", color: "var(--navy-800)",
        fontFamily: BF, fontWeight: "var(--weight-extrabold)", fontSize: 9.5,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>{n}</div>
      <div style={{
        fontSize: 8.5, letterSpacing: "0.13em", textTransform: "uppercase" as const, fontWeight: 700,
        color: light ? "var(--gold-tint)" : "#A38A5C",
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

const WHY_ATTENTION_CARDS = [
  { icon: "🎯", bg: "#FBEDEA",           title: "Confidence", desc: "Finishing what you start builds a different self-image than being reminded five times." },
  { icon: "📚", bg: "var(--amber-100)",   title: "School",     desc: "Attention isn't intelligence. It's what lets intelligence turn up on the page." },
  { icon: "🏠", bg: "#EAF1F8",           title: "Home",       desc: "Most evening friction isn't about homework. It's about the asking." },
  { icon: "🕊️", bg: "var(--teal-100)",  title: "Later",      desc: "Nobody reminds a nineteen-year-old to start." },
];

const CAPABILITIES = [
  { label: "NOTICE",  desc: "Recognise when their attention has drifted.",            icon: "👁" },
  { label: "DIRECT",  desc: "Choose where their attention needs to go.",              icon: "🎯" },
  { label: "PROTECT", desc: "Reduce the things that repeatedly pull it away.",        icon: "🛡" },
  { label: "RECOVER", desc: "Know how to return when attention is lost.",             icon: "🌱" },
];

const PROCESS_STEPS = [
  { n: 1, title: "Answer",           text: "A few real questions about your child" },
  { n: 2, title: "Discover",         text: "We look for patterns in how attention shows up" },
  { n: 3, title: "Get your profile", text: "In plain language. No scores, no diagnoses." },
  { n: 4, title: "Understand",       text: "What it means in everyday situations" },
  { n: 5, title: "Get your roadmap", text: "A plan for what to try first. Six weeks, one adjustment at a time." },
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
    fontFamily: BF,
    fontWeight: "var(--weight-extrabold)",
    fontSize: 21,
    lineHeight: 1.16,
    letterSpacing: "-0.025em",
    color: "var(--navy-800)",
  };

  const ctaBtn: React.CSSProperties = {
    all: "unset",
    cursor: "pointer",
    display: "block",
    background: "var(--amber-500)",
    color: "var(--navy-800)",
    fontFamily: BF,
    fontWeight: "var(--weight-bold)",
    fontSize: 15,
    lineHeight: 1.3,
    padding: "15px",
    borderRadius: "var(--radius-button)",
    boxShadow: "0 3px 12px rgba(245,166,35,.28)",
    textAlign: "center" as const,
  };

  const colBar: React.CSSProperties = {
    borderTop: "2px solid var(--amber-500)",
    paddingTop: "var(--space-4)",
    marginBottom: "var(--space-3)",
  };

  return (
    <div className="aa-site">
      <SiteNav onCta={go} active="home" />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div style={{ background: "var(--surface-page-warm)", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: -60, right: -50,
          width: 195, height: 195, borderRadius: "50%",
          background: "radial-gradient(circle,rgba(245,166,35,.18),transparent 68%)",
          pointerEvents: "none",
        }} />
        <Wrap>
          <div style={{
            padding: "var(--site-section-gap) 0",
            maxWidth: 600,
            display: "flex", flexDirection: "column", gap: 0,
            position: "relative",
          }}>
            <div style={{
              fontSize: 8.5, letterSpacing: "0.14em", textTransform: "uppercase" as const,
              color: "var(--amber-500)", fontWeight: 700, marginBottom: 12,
            }}>Attention Health</div>
            <h1 style={{
              margin: "0 0 14px", fontFamily: BF, fontWeight: "var(--weight-extrabold)",
              fontSize: "clamp(24px,5vw,32px)", lineHeight: 1.09,
              letterSpacing: "-0.03em", color: "var(--navy-800)",
            }}>
              Two hours on a game.<br />Ten minutes on homework.
            </h1>
            <p style={{
              margin: "0 0 10px",
              font: "var(--weight-semibold) 13.5px/1.6 var(--font-sans)",
              color: "var(--navy-800)",
            }}>
              That gap isn&rsquo;t laziness, and it isn&rsquo;t discipline.
            </p>
            <p style={{ margin: "0 0 13px", font: "var(--type-body)", color: "var(--text-body)", fontSize: 13 }}>
              Nobody ever taught your child how to pay attention. We teach reading, tables, cricket&nbsp;&mdash; not the one thing all of it runs on.
            </p>
            <p style={{
              margin: "0 0 20px",
              fontFamily: BF, fontWeight: 700, fontSize: 15,
              color: "var(--teal-700)",
            }}>
              It&rsquo;s a skill. It can be built.
            </p>
            <button onClick={go} style={ctaBtn}>See how my child&rsquo;s attention works →</button>
            <p style={{ margin: "10px 0 0", font: "var(--type-body)", fontSize: 11, color: "#8A8D94", textAlign: "center" }}>
              Free · 5 minutes · Nothing for your child to sit
            </p>
          </div>
        </Wrap>
      </div>

      {/* ── S1: Why attention ─────────────────────────────────────────────── */}
      <section style={{ background: "var(--white)", borderTop: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ padding: "var(--site-section-gap) 0" }}>
            <SectionMarker n={1} label="Why attention" />
            <h2 style={heading}>It sits underneath most of it</h2>
            <p style={{ margin: "9px 0 0", font: "var(--type-body)", fontSize: 12.5, color: "var(--text-body)", lineHeight: 1.6 }}>
              Not the only thing that matters. The thing the others need in order to show up.
            </p>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr",
              gap: 9, marginTop: 16,
            }}>
              {WHY_ATTENTION_CARDS.map(({ icon, bg, title, desc }) => (
                <div key={title} style={{
                  background: "var(--white)", border: "1px solid var(--border-divider)",
                  borderRadius: 11, padding: 13,
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 9,
                    background: bg, display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 15, marginBottom: 8,
                  }}>{icon}</div>
                  <div style={{ fontFamily: BF, fontSize: 13.5, fontWeight: 700, color: "var(--navy-800)" }}>{title}</div>
                  <div style={{ fontSize: 11.5, lineHeight: 1.5, marginTop: 5, color: "var(--text-body)" }}>{desc}</div>
                </div>
              ))}
            </div>
            <div style={{
              fontSize: 12.5, lineHeight: 1.55, marginTop: 15, paddingTop: 13,
              borderTop: "1px solid #F2DFB8",
              color: "var(--navy-800)", fontWeight: 600,
            }}>
              Work on attention and you&rsquo;re working on all four at once.
            </div>
          </div>
        </Wrap>
      </section>

      {/* ── S2: What makes this different ────────────────────────────────── */}
      <section style={{ padding: "var(--site-section-gap) 0", background: "var(--surface-page-warm)", borderTop: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 14, margin: "0 auto", textAlign: "center" }}>
              <SectionMarker n={2} label="What makes this different" />
              <h2 style={heading}>We look at your child. And at how you respond.</h2>
              <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-body)" }}>
                Attention isn&rsquo;t something a child manages alone. It&rsquo;s shaped by how you respond when they struggle&nbsp;&mdash; and most reports only ever tell half the story.
              </p>
            </div>

            <div className="aa-pattern-link">
              <div style={{ flex: 1, padding: "var(--card-pad-lg)" }}>
                <div style={{
                  fontFamily: BF, fontWeight: "var(--weight-extrabold)",
                  fontSize: "var(--text-lg)", color: "var(--navy-800)", marginBottom: 8,
                }}>Your child&rsquo;s pattern</div>
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
                  fontFamily: BF, fontWeight: "var(--weight-extrabold)",
                  fontSize: "var(--text-lg)", color: "var(--navy-800)", marginBottom: 8,
                }}>Your instinct</div>
                <div style={{ font: "var(--type-body)", fontSize: "var(--text-sm)", color: "var(--text-body)" }}>
                  How you respond when they struggle&nbsp;&mdash; and whether that works with their pattern or against it.
                </div>
              </div>
            </div>

            <p style={{ margin: "0 auto", maxWidth: 760, font: "var(--type-body)", color: "var(--text-body)", textAlign: "center" }}>
              Every profile names your own Parent Instinct — not to judge how you parent, but to show you exactly where your instinct and your child&rsquo;s pattern meet.
            </p>
          </div>
        </Wrap>
      </section>

      {/* ── S3: How it works — 5 steps ────────────────────────────────────── */}
      <section style={{ padding: "var(--site-section-gap) 0", borderTop: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 14 }}>
              <SectionMarker n={3} label="The process" />
              <h2 style={heading}>Five steps, one evening to start</h2>
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
                    fontFamily: BF, fontWeight: "var(--weight-extrabold)", fontSize: "var(--text-sm)",
                    marginBottom: 14, flexShrink: 0,
                  }}>{n}</div>
                  <div style={{
                    fontFamily: BF, fontWeight: "var(--weight-bold)",
                    fontSize: "var(--text-base)", color: "var(--navy-800)", marginBottom: 6,
                  }}>{title}</div>
                  <div style={{ font: "var(--type-body)", fontSize: "var(--text-sm)", color: "var(--text-body)" }}>{text}</div>
                </div>
              ))}
            </div>
          </div>
        </Wrap>
      </section>

      {/* ── S4: What this is built on — foundation + capabilities ─────────── */}
      <section style={{ padding: "var(--site-section-gap) 0", background: "var(--surface-page-warm)", borderTop: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center", display: "flex", flexDirection: "column", gap: 14 }}>
              <SectionMarker n={4} label="What this is built on" />
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

            {/* 4 capabilities — what a child builds */}
            <div style={{
              border: "1px solid var(--border-card)", borderRadius: "var(--radius-panel)",
              padding: "var(--card-pad-lg)", background: "var(--surface-card)",
              boxShadow: "var(--shadow-card)",
            }}>
              <div style={{
                font: "var(--weight-bold) var(--text-sm)/1.3 var(--font-sans)",
                letterSpacing: "0.06em", textTransform: "uppercase" as const,
                color: "var(--text-eyebrow)", marginBottom: "var(--space-6)",
              }}>
                What &ldquo;without being told&rdquo; actually takes
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
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

      {/* ── S5: Testimonials — 8 cards, horizontal scroll ────────────────── */}
      <section style={{ padding: "var(--site-section-gap) 0", borderTop: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 14 }}>
              <SectionMarker n={5} label="Real parents" />
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
                    fontFamily: BF, fontWeight: "var(--weight-bold)",
                    fontSize: "var(--text-sm)", color: "var(--navy-800)", marginBottom: 2,
                  }}>{t.who}</div>
                  <div style={{ font: "var(--type-body-sm)", color: "var(--text-muted)" }}>{t.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </Wrap>
      </section>

      {/* ── CloseBand ─────────────────────────────────────────────────────── */}
      <div style={{ background: "var(--navy-800)" }}>
        <Wrap>
          <div style={{
            padding: "var(--site-section-gap) 0",
            display: "flex", flexDirection: "column", gap: 20, maxWidth: 760,
          }}>
            <div style={{
              fontSize: 8.5, letterSpacing: "0.13em", textTransform: "uppercase" as const,
              fontWeight: 700, color: "var(--amber-100)",
            }}>
              Free · 5 minutes · No sign-up
            </div>
            <div style={{
              fontFamily: BF, fontWeight: "var(--weight-extrabold)",
              fontSize: "clamp(22px,4vw,28px)", lineHeight: 1.18,
              letterSpacing: "-0.025em", color: "#fff",
            }}>
              Five minutes to see the picture properly.
            </div>
            <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-on-navy-muted)", fontSize: 12 }}>
              You answer a few questions about things you already notice. You get your child&rsquo;s attention profile — where they stand, which instinct you bring to it, and what to change first. Free, and yours to keep.
            </p>
            <div style={{ paddingTop: 4 }}>
              <button onClick={go} style={ctaBtn}>See how my child&rsquo;s attention works →</button>
            </div>
          </div>
        </Wrap>
      </div>

      {/* ── If you want the detail — quiet links ──────────────────────────── */}
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
