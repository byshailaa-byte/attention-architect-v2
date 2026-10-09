// Coach trial lock screen — shown when the Quick Start trial has ended (access.locked). A calm,
// minimal "paused" state. This is intentionally basic: the final design is Stage 2. Design system
// mirrors FlowShell / PlanV2 (cream ground, navy ink, gold accent, Newsreader headings).
import type { JSX } from "react";

const C = {
  cream: "#FBF6EE", navy: "#1E3A5F", gold: "#E8A33D", goldSoft: "#F2C77E",
  ink: "#2E3A4B", dim: "#5B6577", white: "#FFFFFF", line: "#E7E0D2", sel: "#FFF8EC",
} as const;
const HEAD = "var(--font-newsreader), Georgia, serif";
const BODY = "var(--font-figtree), system-ui, sans-serif";

export function LockScreen(props: {
  childName: string;
  reportHref: string;
  calendlyUrl: string;
  baseline: string | null;
  days: { title: string }[];
}): JSX.Element {
  const { childName, reportHref, calendlyUrl, baseline, days } = props;

  return (
    <div style={{ minHeight: "100dvh", background: C.cream, display: "flex", justifyContent: "center", fontFamily: BODY, color: C.ink }}>
      <div style={{ width: "100%", maxWidth: 420, padding: "48px 22px 40px", boxSizing: "border-box" }}>
        <h1 style={{ fontFamily: HEAD, fontSize: 27, lineHeight: 1.25, fontWeight: 500, color: C.navy, margin: "0 0 12px" }}>
          Your Quick Start is paused
        </h1>
        <p style={{ fontSize: 15.5, lineHeight: 1.55, color: C.dim, margin: "0 0 26px" }}>
          The Coach and your daily steps are paused for now. Your report stays open — you can reread it any time.
        </p>

        {/* 4-day summary */}
        <div style={{ background: C.white, border: `1.5px solid ${C.line}`, borderRadius: 14, padding: "18px 18px", marginBottom: 26 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".1em", color: C.gold, textTransform: "uppercase", marginBottom: 12 }}>
            Your 4 days
          </div>
          <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {days.map((d, i) => (
              <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: i === 0 ? "0 0 10px" : "10px 0", borderTop: i === 0 ? "none" : `1px solid ${C.line}` }}>
                <span style={{ width: 26, height: 26, borderRadius: 8, background: C.sel, border: `1.5px solid ${C.gold}`, color: C.navy, fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: 15, lineHeight: 1.4, color: C.ink, paddingTop: 2 }}>{d.title}</span>
              </li>
            ))}
          </ol>
          {baseline && (
            <p style={{ fontSize: 14, color: C.dim, lineHeight: 1.5, margin: "14px 0 0", paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
              You started at: <strong style={{ color: C.navy, fontWeight: 700 }}>{baseline}</strong>
            </p>
          )}
        </div>

        {/* Actions */}
        <a
          href={reportHref}
          style={{
            display: "block", textAlign: "center", minHeight: 50, lineHeight: "50px", borderRadius: 13,
            background: C.white, border: `1.5px solid ${C.line}`, color: C.navy, fontWeight: 700, fontSize: 15.5,
            textDecoration: "none", marginBottom: 12,
          }}
        >
          Open {childName}&rsquo;s report
        </a>
        <a
          href={calendlyUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block", textAlign: "center", minHeight: 50, lineHeight: "50px", borderRadius: 13,
            background: C.gold, color: "#1a1a1a", fontWeight: 700, fontSize: 15.5, textDecoration: "none",
          }}
        >
          Book a free call
        </a>
      </div>
    </div>
  );
}
