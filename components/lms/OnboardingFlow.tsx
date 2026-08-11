"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const BG = `'Bricolage Grotesque', system-ui, sans-serif`;
const PP = `'Public Sans', 'Inter', system-ui, sans-serif`;

const S = {
  root: {
    minHeight: "100dvh",
    background: "var(--jm-paper)",
    color: "var(--jm-ink)",
    fontFamily: PP,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  card: {
    maxWidth: 560,
    width: "100%",
    background: "var(--jm-white)",
    borderRadius: 22,
    boxShadow: "var(--jm-shadow)",
    border: "1px solid var(--jm-rule)",
    padding: "40px 36px",
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: ".13em",
    textTransform: "uppercase" as const,
    fontWeight: 700,
    color: "var(--jm-accent-b)",
    marginBottom: 14,
  },
  h: {
    fontFamily: BG,
    fontSize: "clamp(22px, 3.4vw, 28px)",
    fontWeight: 700,
    lineHeight: 1.3,
    marginBottom: 12,
  },
  sub: {
    fontSize: 15,
    color: "var(--jm-ink-soft)",
    maxWidth: "44ch",
    marginBottom: 28,
    lineHeight: 1.6,
  },
  btn: {
    background: "var(--jm-accent-b)",
    color: "#fff",
    border: "none",
    fontFamily: PP,
    fontWeight: 700,
    fontSize: 15,
    padding: "15px 30px",
    borderRadius: 10,
    width: "100%",
    marginTop: 22,
    cursor: "pointer",
    boxShadow: "0 8px 22px rgba(31,122,76,.28)",
  },
  dots: {
    display: "flex",
    gap: 6,
    justifyContent: "center" as const,
    marginTop: 24,
  },
};

const WEEK_PREVIEWS = [
  { n: "01", t: "One real instance", d: "Prove it once" },
  { n: "02", t: "The hardest case: screens", d: "Does it hold up?" },
  { n: "03", t: "Sustained duration", d: "A whole routine, not one moment" },
  { n: "04", t: "When it doesn't go well", d: "Failure, on purpose" },
  { n: "05", t: "With other people around", d: "Real-world conditions" },
  { n: "06", t: "Making it theirs", d: "Without you there" },
];

function Dots({ current, total }: { current: number; total: number }) {
  return (
    <div style={S.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          style={{
            width: i === current ? 18 : 6,
            height: 6,
            borderRadius: i === current ? 4 : "50%",
            background: i === current ? "var(--jm-accent-b)" : "var(--jm-rule)",
            display: "block",
            transition: "width .2s",
          }}
        />
      ))}
    </div>
  );
}

export default function OnboardingFlow({ childName }: { childName: string }) {
  const router = useRouter();
  const [screen, setScreen] = useState(0);
  const [completing, setCompleting] = useState(false);

  function next() {
    if (screen < 4) setScreen(screen + 1);
  }

  async function finish() {
    setCompleting(true);
    await fetch("/api/lms/onboarding-complete", { method: "POST" }).catch(() => {});
    router.push("/lms");
  }

  const screens = [
    // Screen 1 — Welcome
    <div key="s1" style={{ ...S.card, textAlign: "center" }}>
      <div style={{ ...S.eyebrow, textAlign: "center" }}>Welcome</div>
      <h1 style={{ ...S.h, textAlign: "center" }}>{childName}&rsquo;s Attention Health journey starts here.</h1>
      <p style={{ ...S.sub, margin: "0 auto 0" }}>Six weeks. One small, real move at a time — built entirely from what {childName}&rsquo;s report already found.</p>
      <button style={S.btn} onClick={next}>See how it works →</button>
      <Dots current={0} total={5} />
    </div>,

    // Screen 2 — How It Works
    <div key="s2" style={S.card}>
      <div style={S.eyebrow}>How It Works</div>
      <h2 style={S.h}>Two people, two small jobs.</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "10px 0" }}>
        <div style={{ background: "var(--jm-accent-soft)", borderRadius: 14, padding: "20px 18px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase" as const, fontWeight: 700, color: "var(--jm-accent)", marginBottom: 10 }}>What you&rsquo;ll do</div>
          <ul style={{ listStyle: "none", fontSize: 13.5, color: "var(--jm-ink-soft)" }}>
            {["About 5 minutes a day", "One small move, not a lesson", "Notice what actually happens, that's it"].map(t => (
              <li key={t} style={{ padding: "5px 0", display: "flex", gap: 8 }}><span style={{ flexShrink: 0 }}>–</span>{t}</li>
            ))}
          </ul>
        </div>
        <div style={{ background: "var(--jm-gold-soft)", borderRadius: 14, padding: "20px 18px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase" as const, fontWeight: 700, color: "var(--jm-gold)", marginBottom: 10 }}>What {childName} experiences</div>
          <ul style={{ listStyle: "none", fontSize: 13.5, color: "var(--jm-ink-soft)" }}>
            {["Small real changes at home", "Not a class, not homework", "Nothing that feels like a test"].map(t => (
              <li key={t} style={{ padding: "5px 0", display: "flex", gap: 8 }}><span style={{ flexShrink: 0 }}>–</span>{t}</li>
            ))}
          </ul>
        </div>
      </div>
      <button style={S.btn} onClick={next}>What&rsquo;s actually ahead →</button>
      <Dots current={1} total={5} />
    </div>,

    // Screen 3 — Six Weeks
    <div key="s3" style={S.card}>
      <div style={S.eyebrow}>The Six Weeks</div>
      <h2 style={S.h}>The shape of the whole journey.</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "20px 0" }}>
        {WEEK_PREVIEWS.map(w => (
          <div key={w.n} style={{ background: "var(--jm-paper2)", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14, fontSize: 13.5 }}>
            <span style={{ fontFamily: BG, fontWeight: 800, color: "var(--jm-ink-faint)", width: 22, flexShrink: 0 }}>{w.n}</span>
            <span style={{ fontWeight: 600, color: "var(--jm-ink)" }}>{w.t}</span>
            <span style={{ color: "var(--jm-ink-faint)", fontSize: 12, marginLeft: "auto", textAlign: "right" as const }}>{w.d}</span>
          </div>
        ))}
      </div>
      <button style={S.btn} onClick={next}>What counts as working →</button>
      <Dots current={2} total={5} />
    </div>,

    // Screen 4 — What Success Looks Like
    <div key="s4" style={S.card}>
      <div style={S.eyebrow}>Before You Begin</div>
      <h2 style={S.h}>What success actually looks like.</h2>
      <div style={{ background: "var(--jm-gold-soft)", borderLeft: "3px solid var(--jm-gold)", borderRadius: "0 12px 12px 0", padding: "16px 20px", margin: "18px 0", fontSize: 14, color: "var(--jm-ink-soft)", lineHeight: 1.6 }}>
        This isn&rsquo;t about a perfect six weeks. Real progress usually looks like <strong style={{ color: "var(--jm-ink)" }}>one specific moment shifting</strong> — not a whole personality change overnight. Some weeks will land more than others. That&rsquo;s real information, not failure.
      </div>
      <p style={{ fontSize: 13.5, color: "var(--jm-ink-soft)" }}>Same discipline your report was built on: nothing promised, everything grounded in what actually happens.</p>
      <button style={S.btn} onClick={next}>I&rsquo;m ready →</button>
      <Dots current={3} total={5} />
    </div>,

    // Screen 5 — Let's Begin
    <div key="s5" style={{ ...S.card, textAlign: "center" }}>
      <div style={{ ...S.eyebrow, textAlign: "center" }}>Let&rsquo;s Begin</div>
      <h2 style={{ ...S.h, textAlign: "center" }}>Week 1 is ready.</h2>
      <p style={{ ...S.sub, margin: "0 auto 0" }}>One small move today. That&rsquo;s all Day 1 is.</p>
      <button style={{ ...S.btn, opacity: completing ? 0.6 : 1 }} onClick={finish} disabled={completing}>
        {completing ? "One moment…" : "Start Week 1 →"}
      </button>
      <Dots current={4} total={5} />
    </div>,
  ];

  return (
    <div style={S.root}>
      <div style={{ marginBottom: 20 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-horizontal-icon-wordmark.png" alt="Attention Architect" style={{ height: 34, width: "auto" }} />
      </div>
      {screens[screen]}
    </div>
  );
}
