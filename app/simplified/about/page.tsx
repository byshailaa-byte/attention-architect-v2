"use client";
import { useRouter } from "next/navigation";
import { SiteNav, SiteFooterFull, Eyebrow, Wrap, CloseBand, headingStyle } from "../_shared";

const PRINCIPLES = [
  {
    n: "01", title: "Understand first, then change",
    text: "No plan is worth anything until you can see what you are looking at. That is why the questions and the profile are free, and always will be.",
  },
  {
    n: "02", title: "You are part of it",
    text: "Your child's attention is shaped by what happens in the room when they struggle. Looking only at the child measures half of it.",
  },
  {
    n: "03", title: "One change at a time",
    text: "Six weeks, one small change each, inside things you already do. A plan that needs an hour a day is not a plan. It is a second job, and it gets dropped by week three.",
  },
  {
    n: "04", title: "Never a diagnosis",
    text: "We describe, in plain words. We do not score children, rank them, or name conditions. Where there is real reason for concern we say so and step back — even when that ends the conversation.",
  },
];

const TRUST_ITEMS = [
  "No account required",
  "Nothing shared or sold",
  "Report never expires",
  "Replies come from us",
  "Refund inside seven days",
];

export default function AboutPage() {
  const router = useRouter();
  const go = () => router.push("/simplified/start");

  const h2: React.CSSProperties = { ...headingStyle, fontSize: "var(--type-display-size)", lineHeight: 1.16 };
  const h3: React.CSSProperties = { ...headingStyle, fontSize: "var(--text-2xl)", lineHeight: 1.3 };
  const h4: React.CSSProperties = { ...headingStyle, fontSize: "var(--text-lg)", lineHeight: 1.3 };

  return (
    <div className="aa-site">
      <SiteNav onCta={go} active="about" />

      {/* Hero */}
      <div style={{ background: "var(--surface-page-warm)", borderBottom: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ padding: "var(--site-section-gap) 0", maxWidth: 720, display: "flex", flexDirection: "column", gap: 20 }}>
            <Eyebrow>About us</Eyebrow>
            <h1 style={h2}>We started with one question</h1>
            <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-body)" }}>
              Why does the same advice work beautifully for one child and do nothing for another? The answer was not that some parents try harder. It was that they had a clearer map.
            </p>
          </div>
        </Wrap>
      </div>

      {/* Story + founders */}
      <section style={{ padding: "var(--site-section-gap) 0", borderBottom: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ display: "grid", gridTemplateColumns: "var(--grid-split)", gap: "var(--space-16)", alignItems: "start" }}>
            {/* Story */}
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 22 }}>
              <Eyebrow>How this started</Eyebrow>
              <h2 style={h3}>It did not start as a business plan</h2>
              <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-body)" }}>
                Years of watching the same advice work in one house and fail in the next. What nobody was looking at was the parent in the room, and the one skill the child had never been taught.
              </p>
              <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-body)" }}>
                You can reach us directly. Write in and you get one of us, not a queue.
              </p>
              <blockquote style={{
                margin: 0,
                borderLeft: "3px solid var(--border-divider)", paddingLeft: "var(--space-5)",
                font: "var(--weight-regular) var(--text-md)/var(--leading-relaxed) var(--font-sans)",
                color: "var(--ink-600)", fontStyle: "italic",
              }}>
                &ldquo;We built this because we realised parents are often trying harder when what they actually need is a better map.&rdquo;
              </blockquote>
            </div>

            {/* Founders */}
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Shashank */}
              <div style={{ display: "flex", gap: "var(--space-5)", alignItems: "flex-start" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/founder.jpg" alt="Shashank Agrawal" style={{
                  width: 56, height: 56, borderRadius: "50%", objectFit: "cover", flexShrink: 0,
                }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ font: "var(--weight-bold) var(--text-lg)/1.3 var(--font-sans)", color: "var(--navy-800)" }}>Shashank Agrawal</div>
                  <div style={{ font: "var(--type-body-sm)", color: "var(--text-muted)" }}>Founder, Attention Architect</div>
                  <span style={{
                    alignSelf: "flex-start", padding: "3px 10px", borderRadius: "var(--radius-pill)",
                    background: "var(--amber-100)", border: "1px solid var(--amber-200)",
                    font: "var(--weight-medium) var(--text-xs)/1.4 var(--font-sans)", color: "var(--amber-700)",
                  }}>IIM Rohtak Alumnus</span>
                </div>
              </div>

              {/* Shaily */}
              <div style={{ display: "flex", gap: "var(--space-5)", alignItems: "flex-start" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/shaily-headshot-square.png" alt="Shaily Badonia" style={{
                  width: 56, height: 56, borderRadius: "50%", objectFit: "cover", flexShrink: 0,
                }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ font: "var(--weight-bold) var(--text-lg)/1.3 var(--font-sans)", color: "var(--navy-800)" }}>Shaily Badonia</div>
                  <div style={{ font: "var(--type-body-sm)", color: "var(--text-muted)" }}>Chief Attention Architect</div>
                  <span style={{
                    alignSelf: "flex-start", padding: "3px 10px", borderRadius: "var(--radius-pill)",
                    background: "var(--teal-100)", border: "1px solid var(--teal-200)",
                    font: "var(--weight-medium) var(--text-xs)/1.4 var(--font-sans)", color: "var(--teal-700)",
                  }}>10+ years of experience</span>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border-divider)", paddingTop: "var(--space-5)" }}>
                <p style={{ margin: 0, font: "var(--type-body-sm)", color: "var(--text-muted)" }}>
                  Operating as The Human Decision. support@thehumandecision.in · +91 99933 74923
                </p>
              </div>
            </div>
          </div>
        </Wrap>
      </section>

      {/* Principles */}
      <section style={{ padding: "var(--site-section-gap) 0", background: "var(--surface-page-warm)", borderBottom: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Eyebrow>Our position</Eyebrow>
              <h2 style={{ ...h3, maxWidth: 720 }}>Four things we hold to — including the ones that cost us sales</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "var(--grid-2up)", gap: "var(--space-10)" }}>
              {PRINCIPLES.map((p) => (
                <div key={p.n} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-4)" }}>
                    <div style={{ font: "var(--weight-bold) var(--text-sm)/1 var(--font-sans)", color: "var(--amber-500)" }}>{p.n}</div>
                    <h3 style={h4}>{p.title}</h3>
                  </div>
                  <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-body)" }}>{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        </Wrap>
      </section>

      {/* What we are not + How we work */}
      <section style={{ padding: "var(--site-section-gap) 0", borderBottom: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ display: "grid", gridTemplateColumns: "var(--grid-split)", gap: "var(--space-16)", alignItems: "start" }}>
            {/* What we are not */}
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
              <Eyebrow>Our limits, stated plainly</Eyebrow>
              <h2 style={h3}>What we are not</h2>
              <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-body)" }}>
                We are not doctors and this is not a medical service. Nothing here tests for, names, or rules out any condition — including ADHD. If what you see at home worries you, the next step is a qualified professional, and we will tell you so rather than sell you six weeks.
              </p>
              <p style={{ margin: 0, font: "var(--type-body-sm)", color: "var(--text-muted)" }}>
                No community, no forum, no subscription. One set of questions, one profile, one optional plan. Nothing that renews.
              </p>
            </div>

            {/* How we work with parents */}
            <div style={{
              minWidth: 0,
              border: "1px solid var(--border-card)", borderRadius: "var(--radius-lg)",
              background: "var(--surface-card)", boxShadow: "var(--shadow-card)",
              padding: "var(--card-pad-lg)", display: "flex", flexDirection: "column", gap: 16,
            }}>
              <div style={{
                font: "var(--type-eyebrow)", letterSpacing: "var(--tracking-eyebrow)",
                textTransform: "uppercase", color: "var(--text-eyebrow)",
              }}>How we work with parents</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                {TRUST_ITEMS.map((item) => (
                  <div key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "var(--teal-600)", fontWeight: "var(--weight-bold)", flexShrink: 0 }}>✓</span>
                    <span style={{ font: "var(--type-body-sm)", color: "var(--text-body)" }}>{item}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: "1px solid var(--border-divider)", paddingTop: "var(--space-4)" }}>
                <p style={{ margin: 0, font: "var(--type-body-sm)", color: "var(--text-body)" }}>
                  Write to us and you get a written answer, usually the same day. support@thehumandecision.in
                </p>
              </div>
            </div>
          </div>
        </Wrap>
      </section>

      <CloseBand
        title="The best way to judge us is to read your own profile."
        lead="Free, five minutes. If it does not sound like your child, we would rather you told us than paid us."
        onCta={go}
      />
      <SiteFooterFull />
    </div>
  );
}
