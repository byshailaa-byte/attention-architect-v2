"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteNav, SiteFooterFull, Eyebrow, Wrap, CloseBand, headingStyle } from "../_shared";

const REFRAME_TABS = [
  {
    tab: "Homework at 6:40pm",
    seen: "Ten genuinely good minutes — you can see them thinking. Then a question about something unrelated. Twenty minutes on, the page has not moved.",
    verdict: "You conclude: they cannot concentrate.",
    actually: "Attention was being held by difficulty. At minute ten the problem stopped being difficult, and attention let go — doing exactly what it is built to do. Nothing failed. The task ran out of grip.",
    skill: "Holding on",
  },
  {
    tab: "Four hours on one game",
    seen: "They will not sit for twenty minutes of maths, but they will build in a game all afternoon without being asked once.",
    verdict: "You conclude: they only focus on what they enjoy.",
    actually: "The game gets harder every few minutes and shows the result at once. Homework does neither. Your child is not choosing fun over work — they are following difficulty and feedback, which is what attention follows.",
    skill: "Starting",
  },
  {
    tab: "Interrupted, and gone",
    seen: "They were fine until someone spoke to them. Now the session is over and getting them back is a negotiation.",
    verdict: "You conclude: they are too easily distracted.",
    actually: "Every child gets interrupted. Coming back is a separate skill from staying — and it is the one nobody has taught yet. It can be, in about a week.",
    skill: "Recovering",
  },
  {
    tab: "Fine at school, not at home",
    seen: "The teacher says there is no problem at all. At the kitchen table it is a fight every evening.",
    verdict: "You conclude: they are doing it on purpose with you.",
    actually: "School supplies the structure — a fixed start, a visible end, someone else holding the line. At home your child has to supply that themselves. That is a different skill, and the last of the six to arrive.",
    skill: "Running it themselves",
  },
];

const SIX_SKILLS = [
  { n: "1", name: "Starting",              text: "Getting from \"I should\" to actually begun, without a push from outside." },
  { n: "2", name: "Holding on",            text: "Staying with a task once it stops being interesting or hard enough to hold them." },
  { n: "3", name: "Staying with it",       text: "Continuing across a whole session, not just the first good ten minutes." },
  { n: "4", name: "Recovering",            text: "Coming back after an interruption — a separate skill from never being interrupted." },
  { n: "5", name: "Carrying it over",      text: "Using the same attention in a new place: a different subject, a different room." },
  { n: "6", name: "Running it themselves", text: "Noticing their own drift and doing something about it without being told." },
];

export default function AttentionHealthPage() {
  const router = useRouter();
  const go = () => router.push("/start");
  const [activeTab, setActiveTab] = useState(0);
  const tab = REFRAME_TABS[activeTab];

  const h2: React.CSSProperties = { ...headingStyle, fontSize: "var(--type-display-size)", lineHeight: 1.16 };
  const h3: React.CSSProperties = { ...headingStyle, fontSize: "var(--text-2xl)", lineHeight: 1.3 };

  return (
    <div className="aa-site">
      <SiteNav onCta={go} active="health" />

      {/* Hero */}
      <div style={{ background: "var(--surface-page-warm)", borderBottom: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ padding: "var(--site-section-gap) 0", maxWidth: 720, display: "flex", flexDirection: "column", gap: 20 }}>
            <Eyebrow>Attention Health</Eyebrow>
            <h1 style={h2}>Attention is built in six steps. Not one big talent.</h1>
            <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-body)" }}>
              Your child already has some of them. One is usually missing — and that one is why the evenings are hard.
            </p>
          </div>
        </Wrap>
      </div>

      {/* ReframePair */}
      <section style={{ padding: "var(--site-section-gap) 0", borderBottom: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 14 }}>
              <Eyebrow>Four evenings</Eyebrow>
              <h2 style={h3}>You have already seen the evidence. Here is what it was telling you.</h2>
              <p style={{ margin: 0, font: "var(--type-body-sm)", color: "var(--text-muted)" }}>
                What you see is on the left. What was actually happening is on the right.
              </p>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {REFRAME_TABS.map((t, i) => (
                <button key={i} onClick={() => setActiveTab(i)} style={{
                  all: "unset", cursor: "pointer",
                  padding: "9px 16px", borderRadius: "var(--radius-pill)",
                  whiteSpace: "nowrap",
                  font: `var(--weight-${activeTab === i ? "bold" : "medium"}) var(--text-sm)/1.3 var(--font-sans)`,
                  background: activeTab === i ? "var(--navy-800)" : "var(--white)",
                  border: `1px solid ${activeTab === i ? "var(--navy-800)" : "var(--ink-200)"}`,
                  color: activeTab === i ? "#fff" : "var(--ink-600)",
                }}>{t.tab}</button>
              ))}
            </div>

            {/* Panel */}
            <div style={{
              display: "grid", gridTemplateColumns: "var(--grid-2up)", gap: "var(--space-8)",
              border: "1px solid var(--border-card)", borderRadius: "var(--radius-panel)",
              overflow: "hidden", background: "var(--surface-card)", boxShadow: "var(--shadow-card)",
            }}>
              {/* Left */}
              <div style={{ padding: "var(--card-pad-lg)", display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{
                  font: "var(--type-eyebrow)", letterSpacing: "var(--tracking-eyebrow)",
                  textTransform: "uppercase", color: "var(--text-eyebrow)",
                }}>What it looks like</div>
                <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-body)" }}>{tab.seen}</p>
                <p style={{ margin: 0, font: "var(--weight-medium) var(--text-base)/1.5 var(--font-sans)", color: "var(--text-muted)", fontStyle: "italic" }}>{tab.verdict}</p>
              </div>
              {/* Right */}
              <div style={{ padding: "var(--card-pad-lg)", background: "var(--navy-050)", display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{
                  font: "var(--type-eyebrow)", letterSpacing: "var(--tracking-eyebrow)",
                  textTransform: "uppercase", color: "var(--teal-700)",
                }}>What is actually happening</div>
                <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-body)" }}>{tab.actually}</p>
                <div style={{
                  font: "var(--weight-bold) var(--text-sm)/1.4 var(--font-sans)",
                  color: "var(--teal-700)",
                }}>The step: {tab.skill}</div>
              </div>
            </div>
          </div>
        </Wrap>
      </section>

      {/* Six skills */}
      <section style={{ padding: "var(--site-section-gap) 0", background: "var(--surface-page-warm)", borderBottom: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 14 }}>
              <Eyebrow>The six steps</Eyebrow>
              <h2 style={h3}>They arrive roughly in this order.</h2>
              <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-body)" }}>
                A child can be strong at the fourth and have never built the first — which is why &ldquo;she can&rsquo;t concentrate&rdquo; tells you nothing.
              </p>
            </div>
            <div style={{
              border: "1px solid var(--border-card)", borderRadius: "var(--radius-panel)",
              background: "var(--surface-card)", boxShadow: "var(--shadow-card)", overflow: "hidden",
            }}>
              {SIX_SKILLS.map((s, i) => (
                <div key={s.name} className="aa-skill-row" style={{
                  borderTop: i === 0 ? "none" : "1px solid var(--border-divider)",
                }}>
                  <div style={{ font: "var(--weight-bold) var(--text-base)/1.4 var(--font-sans)", color: "var(--navy-800)" }}>
                    {s.n}. {s.name}
                  </div>
                  <div style={{ font: "var(--type-body)", color: "var(--text-body)" }}>{s.text}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <a href="/simplified/children" style={{ font: "var(--weight-bold) var(--text-md)/1.4 var(--font-sans)", color: "var(--navy-800)", textDecoration: "none" }}>The 8 kinds of children →</a>
              <a href="/simplified/parents" style={{ font: "var(--weight-bold) var(--text-md)/1.4 var(--font-sans)", color: "var(--navy-800)", textDecoration: "none" }}>The 4 kinds of parents →</a>
            </div>
          </div>
        </Wrap>
      </section>

      <CloseBand
        title="See where your child stands on all six."
        lead="Five minutes of questions about what you already notice. The profile is free and yours to keep."
        onCta={go}
      />
      <SiteFooterFull />
    </div>
  );
}
