"use client";
import { useRouter } from "next/navigation";
import { SiteNav, SiteFooterFull, Eyebrow, Wrap, CloseBand, headingStyle } from "../_shared";

const INSTINCTS = [
  {
    n: "01", name: "The Quick Fixer",
    tenSeconds: "You solve it before it becomes a problem.",
    removes: "The chance to meet the difficulty. Your child never quite gets there.",
    adjust: "Count to ten before you offer. Most stalls resolve themselves inside eight seconds.",
  },
  {
    n: "02", name: "The Pusher",
    tenSeconds: "You apply pressure, raise the stakes, and insist.",
    removes: "The task itself. Effort quality becomes about complying with you, not about the work.",
    adjust: "Ask one question before you push — where it got hard, not whether it did.",
  },
  {
    n: "03", name: "The Negotiator",
    tenSeconds: "You explain, bargain, and reason toward agreement.",
    removes: "The settled question. Every task becomes a discussion that can be reopened.",
    adjust: "Decide it once, before the task starts. Then stop discussing it tonight.",
  },
  {
    n: "04", name: "The Steady Hand",
    tenSeconds: "You hold the line calmly, and wait.",
    removes: "A way in — for a child who is not stalling, but genuinely stuck.",
    adjust: "Keep the calm. Just offer the first step when they have not found one in a minute.",
  },
];

export default function ParentsPage() {
  const router = useRouter();
  const go = () => router.push("/simplified/start");

  const h2: React.CSSProperties = { ...headingStyle, fontSize: "var(--type-display-size)", lineHeight: 1.16 };

  return (
    <div className="aa-site">
      <SiteNav onCta={go} active="instincts" />

      {/* Hero */}
      <div style={{ background: "var(--surface-page-warm)", borderBottom: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ padding: "var(--site-section-gap) 0", maxWidth: 720, display: "flex", flexDirection: "column", gap: 20 }}>
            <Eyebrow>Your instinct</Eyebrow>
            <h1 style={h2}>Your child stops. What do you do in the next ten seconds?</h1>
            <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-body)" }}>
              There are four common answers. All four are good instincts. All four, at the wrong moment, quietly do the job your child is trying to learn to do themselves.
            </p>
          </div>
        </Wrap>
      </div>

      {/* Instinct cards */}
      <section style={{ padding: "var(--site-section-gap) 0", borderBottom: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div style={{ display: "grid", gridTemplateColumns: "var(--grid-2up)", gap: "var(--space-6)" }}>
              {INSTINCTS.map((inst) => (
                <div key={inst.n} style={{
                  border: "1px solid var(--border-card)", borderRadius: "var(--radius-lg)",
                  background: "var(--surface-card)", boxShadow: "var(--shadow-card)",
                  display: "flex", flexDirection: "column", overflow: "hidden",
                }}>
                  {/* Header */}
                  <div style={{ padding: "var(--card-pad)", borderBottom: "1px solid var(--border-divider)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ font: "var(--weight-bold) var(--text-lg)/var(--leading-snug) var(--font-sans)", color: "var(--navy-800)" }}>
                      {inst.name}
                    </div>
                    <div style={{ font: "var(--weight-bold) var(--text-sm)/1 var(--font-sans)", color: "var(--amber-500)", flexShrink: 0, marginTop: 2 }}>
                      {inst.n}
                    </div>
                  </div>

                  {/* ten-seconds quote box */}
                  <div style={{ padding: "var(--space-5) var(--card-pad)", background: "var(--navy-050)" }}>
                    <p style={{ margin: 0, font: "var(--weight-medium) var(--text-base)/1.5 var(--font-sans)", color: "var(--navy-800)" }}>
                      {inst.tenSeconds}
                    </p>
                  </div>

                  {/* removes + adjust */}
                  <div style={{ padding: "var(--card-pad)", display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
                    <div>
                      <div style={{
                        font: "var(--type-eyebrow)", letterSpacing: "var(--tracking-eyebrow)",
                        textTransform: "uppercase", color: "var(--text-eyebrow)", marginBottom: 6,
                      }}>What it can remove</div>
                      <p style={{ margin: 0, font: "var(--type-body-sm)", color: "var(--text-body)" }}>{inst.removes}</p>
                    </div>
                    <div>
                      <div style={{
                        font: "var(--type-eyebrow)", letterSpacing: "var(--tracking-eyebrow)",
                        textTransform: "uppercase", color: "var(--teal-700)", marginBottom: 6,
                      }}>The adjustment</div>
                      <p style={{ margin: 0, font: "var(--weight-medium) var(--text-base)/1.5 var(--font-sans)", color: "var(--teal-700)" }}>{inst.adjust}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Nobody is being judged callout */}
            <div style={{
              border: "1px solid var(--sage-200)", borderRadius: "var(--radius-md)",
              background: "var(--sage-100)", padding: "var(--card-pad)",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <div style={{ font: "var(--weight-bold) var(--text-base)/1.4 var(--font-sans)", color: "var(--navy-800)" }}>
                Nobody is being judged here
              </div>
              <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-body)" }}>
                We do not score parents, and the profile never says you have been doing it wrong. In most houses the quickest change is a small change in your timing — not a big change in your child&rsquo;s effort. It is the easiest thing to move, so we say it.
              </p>
            </div>
          </div>
        </Wrap>
      </section>

      <CloseBand
        title="Which one is you?"
        lead="A few of the questions are about you, not your child. Your profile names your reaction, and what it is doing to the skill your child is missing."
        onCta={go}
      />
      <SiteFooterFull />
    </div>
  );
}
