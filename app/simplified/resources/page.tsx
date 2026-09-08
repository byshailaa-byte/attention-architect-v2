"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteNav, SiteFooterFull, Eyebrow, Wrap, CloseBand, headingStyle } from "../_shared";

const CASES = [
  {
    arch: "The Live Wire", instinct: "The Pusher", age: "Age 9",
    title: "The last three answers were always guessed",
    problem: "Excellent for eight minutes, then clearly rushing. His mother read it as carelessness and pushed harder — which finished the page and taught nothing.",
    found: "Not effort. Attention was running out before the work did, and the pushing hid the moment it happened.",
    did: "Stop before the fade, not after. Two short sittings, with the second one started by him.",
    week6: 'He began saying it himself — "I have got about two more left." That is the whole skill, arriving early.',
  },
  {
    arch: "The Explorer", instinct: "The Quick Fixer", age: "Age 8",
    title: "No fuss, no protest, and no work either",
    problem: "The easiest child in the house, and the furthest behind. Every stop was met with kindness, so nothing ever got noticed.",
    found: "She had never learned to come back, because nobody ever named the drifting. Comfort arrived before the problem was said out loud.",
    did: 'Say it, calmly, before comforting. One line: "you left about a minute ago."',
    week6: "She started noticing it herself, during the work instead of after it.",
  },
  {
    arch: "The All-In Kid", instinct: "The Quick Fixer", age: "Age 11",
    title: "An hour of real focus, and a fight every time it ended",
    problem: "Not a focus problem at all. A stopping problem. Every ending was met with one more idea, which pushed the fight later into the night.",
    found: "He could start and stay. He could not be moved. His father was, without meaning to, rescuing him from every ending.",
    did: "Build the ending, not the start. A stated stop time, a five-minute warning, and no new ideas after it.",
    week6: "Endings stopped being arguments. The deep focus stayed exactly where it was.",
  },
];

const ARTICLES = [
  {
    slug: "ten-minutes", kind: "Article", mins: "4 min",
    title: "Why the good ten minutes always end at minute ten",
    dek: "Attention lets go when the work stops being hard. Most homework gets easier as it goes — so it is built to lose your child.",
  },
  {
    slug: "fine-at-school", kind: "Article", mins: "4 min",
    title: '"Fine at school, impossible at home" is not defiance',
    dek: "School gives your child the structure. At home they have to make it themselves. That is a different skill, and the last one to arrive.",
  },
  {
    slug: "eight-seconds", kind: "Article", mins: "3 min",
    title: "The eight seconds after your child stops",
    dek: "The most repeated moment in your child’s day, and the one nobody looks at. What each of the four reactions builds, and what it quietly removes.",
  },
  {
    slug: "screens", kind: "Article", mins: "4 min",
    title: "Screens are not the cause. They are the comparison.",
    dek: "A game gets harder every few minutes and shows the result at once. A worksheet does neither. Your child is following that, not choosing fun.",
  },
  {
    slug: "six-skills", kind: "Explainer", mins: "6 min",
    title: "The six steps, and what each looks like at 8, 11 and 14",
    dek: "For parents who want to work out where their own child sits without answering anything.",
  },
  {
    slug: "professional", kind: "Explainer", mins: "3 min",
    title: "When to stop reading us and call a professional",
    dek: "The specific signs that mean this is not the right help. Written plainly, because getting it wrong costs years.",
  },
];

export default function ResourcesPage() {
  const router = useRouter();
  const go = () => router.push("/start");
  const [tab, setTab] = useState<"cases" | "articles">("cases");

  const h2: React.CSSProperties = { ...headingStyle, fontSize: "var(--type-display-size)", lineHeight: 1.16 };
  const h3: React.CSSProperties = { ...headingStyle, fontSize: "var(--text-2xl)", lineHeight: 1.3 };
  const h4: React.CSSProperties = { ...headingStyle, fontSize: "var(--text-lg)", lineHeight: 1.3 };

  const TabBtn = ({ id, label }: { id: "cases" | "articles"; label: string }) => (
    <button onClick={() => setTab(id)} style={{
      all: "unset", cursor: "pointer",
      padding: "10px 20px", borderRadius: "var(--radius-pill)",
      whiteSpace: "nowrap",
      font: `var(--weight-bold) var(--text-base)/1 var(--font-sans)`,
      background: tab === id ? "var(--navy-800)" : "var(--white)",
      border: `1px solid ${tab === id ? "var(--navy-800)" : "var(--ink-200)"}`,
      color: tab === id ? "#fff" : "var(--ink-600)",
    }}>{label}</button>
  );

  return (
    <div className="aa-site">
      <SiteNav onCta={go} active="resources" />

      {/* Hero */}
      <div style={{ background: "var(--surface-page-warm)", borderBottom: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ padding: "var(--site-section-gap) 0", maxWidth: 720, display: "flex", flexDirection: "column", gap: 20 }}>
            <Eyebrow>Resources</Eyebrow>
            <h1 style={h2}>Other families, and short reads</h1>
            <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-body)" }}>
              All free, nothing asked of you. The cases show what this looks like in a real house. The articles answer the things parents ask us most.
            </p>
          </div>
        </Wrap>
      </div>

      {/* Tab content */}
      <section style={{ padding: "var(--site-section-gap) 0", borderBottom: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <TabBtn id="cases" label="Case studies" />
              <TabBtn id="articles" label="Articles & explainers" />
            </div>

            {tab === "cases" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Note callout */}
                <div style={{
                  border: "1px solid var(--border-card)", borderRadius: "var(--radius-md)",
                  background: "var(--surface-card)", padding: "var(--card-pad)",
                  display: "flex", flexDirection: "column", gap: 8,
                }}>
                  <div style={{ font: "var(--weight-bold) var(--text-base)/1.4 var(--font-sans)", color: "var(--navy-800)" }}>A note on these</div>
                  <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-body)" }}>
                    Each one is put together from several families with the same pattern. No real child is named or described. We would rather show you an honest example than a review we cannot prove.
                  </p>
                </div>

                {CASES.map((c, i) => (
                  <div key={i} style={{
                    border: "1px solid var(--border-card)", borderRadius: "var(--radius-lg)",
                    background: "var(--surface-card)", boxShadow: "var(--shadow-card)",
                    padding: "var(--card-pad-lg)", display: "flex", flexDirection: "column", gap: 18,
                  }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{
                        padding: "4px 12px", borderRadius: "var(--radius-pill)",
                        background: "var(--teal-100)", border: "1px solid var(--teal-200)",
                        font: "var(--weight-medium) var(--text-sm)/1.4 var(--font-sans)", color: "var(--teal-700)",
                      }}>{c.arch}</span>
                      <span style={{
                        padding: "4px 12px", borderRadius: "var(--radius-pill)",
                        background: "var(--amber-100)", border: "1px solid var(--amber-200)",
                        font: "var(--weight-medium) var(--text-sm)/1.4 var(--font-sans)", color: "var(--amber-700)",
                      }}>{c.instinct}</span>
                      <span style={{ font: "var(--weight-regular) var(--text-sm)/1 var(--font-sans)", color: "var(--ink-500)" }}>{c.age}</span>
                    </div>
                    <h3 style={h4}>{c.title}</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "var(--grid-2up)", gap: "var(--space-8)" }}>
                      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
                        <div>
                          <div style={{ font: "var(--type-eyebrow)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", color: "var(--text-eyebrow)", marginBottom: 6 }}>What they told us</div>
                          <p style={{ margin: 0, font: "var(--type-body-sm)", color: "var(--text-body)" }}>{c.problem}</p>
                        </div>
                        <div>
                          <div style={{ font: "var(--type-eyebrow)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", color: "var(--text-eyebrow)", marginBottom: 6 }}>What we found</div>
                          <p style={{ margin: 0, font: "var(--type-body-sm)", color: "var(--text-body)" }}>{c.found}</p>
                        </div>
                      </div>
                      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
                        <div>
                          <div style={{ font: "var(--type-eyebrow)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", color: "var(--text-eyebrow)", marginBottom: 6 }}>Week one</div>
                          <p style={{ margin: 0, font: "var(--type-body-sm)", color: "var(--text-body)" }}>{c.did}</p>
                        </div>
                        <div style={{
                          padding: "14px 16px", background: "var(--sage-100)",
                          border: "1px solid var(--sage-200)", borderRadius: "var(--radius-md)",
                          display: "flex", flexDirection: "column", gap: 6,
                        }}>
                          <div style={{ font: "var(--type-eyebrow)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", color: "var(--teal-700)" }}>By week six</div>
                          <p style={{ margin: 0, font: "var(--type-body-sm)", color: "var(--text-body)" }}>{c.week6}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "articles" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {ARTICLES.map((a, i) => (
                  <div key={i} style={{
                    border: "1px solid var(--border-card)", borderRadius: "var(--radius-md)",
                    background: "var(--surface-card)", boxShadow: "var(--shadow-card)",
                    padding: "var(--card-pad)", display: "flex", flexDirection: "column", gap: 8,
                  }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
                      <span style={{ font: "var(--type-eyebrow)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", color: "var(--teal-700)" }}>{a.kind}</span>
                      <span style={{ font: "var(--weight-regular) var(--text-sm)/1 var(--font-sans)", color: "var(--ink-500)" }}>{a.mins} read</span>
                    </div>
                    <h3 style={{ margin: 0 }}>
                      <a href={`/simplified/resources/${a.slug}`} style={{
                        font: "var(--weight-bold) var(--text-base)/var(--leading-snug) var(--font-sans)",
                        color: "var(--navy-800)", textDecoration: "none",
                      }}>{a.title} →</a>
                    </h3>
                    <p style={{ margin: 0, font: "var(--type-body-sm)", color: "var(--text-body)" }}>{a.dek}</p>
                  </div>
                ))}
                <p style={{ margin: 0, font: "var(--type-body-sm)", color: "var(--text-muted)" }}>
                  We publish when something is finished, not on a schedule. If there is something you want explained, write to us — most of these started as a parent&rsquo;s question.
                </p>
              </div>
            )}
          </div>
        </Wrap>
      </section>

      {/* If you only read one thing */}
      <section style={{ padding: "var(--site-section-gap) 0", background: "var(--surface-page-warm)", borderBottom: "1px solid var(--border-divider)" }}>
        <Wrap narrow>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Eyebrow>Start here instead</Eyebrow>
            <h2 style={h3}>If you only read one thing</h2>
            <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-body)" }}>The quickest way in: eight kinds of children, four kinds of parents.</p>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <a href="/simplified/health" style={{ font: "var(--weight-bold) var(--text-md)/1.4 var(--font-sans)", color: "var(--navy-800)", textDecoration: "none" }}>What is Attention Health? →</a>
              <a href="/simplified/children" style={{ font: "var(--weight-bold) var(--text-md)/1.4 var(--font-sans)", color: "var(--navy-800)", textDecoration: "none" }}>The 8 kinds of children →</a>
            </div>
            <div style={{
              borderLeft: "3px solid var(--border-divider)", paddingLeft: "var(--space-5)",
              font: "var(--type-body-sm)", color: "var(--text-muted)",
            }}>
              8 kinds of children × 4 kinds of parents. Every story on this page is one of those pairs.
            </div>
          </div>
        </Wrap>
      </section>

      <CloseBand
        title="Reading helps. Knowing which one is your child helps more."
        lead="Five minutes, free, and then all of this has your child's name on it."
        onCta={go}
      />
      <SiteFooterFull />
    </div>
  );
}
