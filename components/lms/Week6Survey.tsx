"use client";

import { useState } from "react";

const BG = `'Bricolage Grotesque', system-ui, sans-serif`;
const PP = `'Public Sans', 'Inter', system-ui, sans-serif`;

const BEHAVIOR_OPTIONS = [
  "Yes, noticeably",
  "A little, some weeks more than others",
  "Not really, at least not yet",
  "Hard to tell honestly",
];

const ADVOCATE_OPTIONS = [
  { id: "testimonial", icon: "💬", label: "Share your story as a testimonial", desc: "We'll follow up to ask exactly what you're comfortable with" },
  { id: "referral",    icon: "🔗", label: "Refer another parent", desc: "Get a link to send directly" },
  { id: "review",      icon: "⭐", label: "Leave a public review", desc: "Wherever's easiest for you" },
];

export default function Week6Survey({ childName, onDone }: { childName: string; onDone: () => void }) {
  const [nps, setNps] = useState<number | null>(null);
  const [behavior, setBehavior] = useState<string | null>(null);
  const [workedBest, setWorkedBest] = useState("");
  const [hardest, setHardest] = useState("");
  const [advocates, setAdvocates] = useState<Set<string>>(new Set());
  const [skipAdvocate, setSkipAdvocate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isPromoter = nps !== null && nps >= 9;

  function toggleAdvocate(id: string) {
    setAdvocates((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (nps === null || !behavior) return;
    setSubmitting(true);
    await fetch("/api/lms/survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "week6_comprehensive",
        nps_score: nps,
        behavior_change: behavior,
        worked_best: workedBest || null,
        hardest: hardest || null,
        advocate_selections: isPromoter && !skipAdvocate ? Array.from(advocates) : [],
      }),
    }).catch(() => {});
    setSubmitted(true);
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--jm-paper)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: PP }}>
        <div style={{ maxWidth: 480, width: "100%", background: "var(--jm-white)", borderRadius: 20, padding: "48px 32px", textAlign: "center", boxShadow: "var(--jm-shadow)" }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🙏</div>
          <h2 style={{ fontFamily: BG, fontSize: 22, fontWeight: 700, marginBottom: 12, color: "var(--jm-ink)" }}>Thank you.</h2>
          <p style={{ fontSize: 15, color: "var(--jm-ink-soft)", marginBottom: 28 }}>Your feedback goes directly into what we fix and build next.</p>
          <button
            onClick={onDone}
            style={{ background: "var(--jm-accent-b)", color: "#fff", border: "none", fontFamily: PP, fontWeight: 700, fontSize: 15, padding: "14px 28px", borderRadius: 10, cursor: "pointer", boxShadow: "0 8px 22px rgba(31,122,76,.28)" }}
          >
            Back to journey →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "var(--jm-paper)", fontFamily: PP, color: "var(--jm-ink)" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px 60px" }}>
        <div style={{ background: "var(--jm-white)", borderRadius: 20, boxShadow: "var(--jm-shadow)", border: "1px solid var(--jm-rule)", padding: "34px 32px" }}>

          <div style={{ fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase" as const, fontWeight: 700, color: "var(--jm-accent-b)", marginBottom: 14 }}>
            Six Weeks Complete
          </div>
          <h1 style={{ fontFamily: BG, fontSize: 20, fontWeight: 700, marginBottom: 8, color: "var(--jm-ink)" }}>Real feedback, before anything else.</h1>
          <p style={{ fontSize: 14, color: "var(--jm-ink-soft)", marginBottom: 26 }}>
            This shapes what we fix and what we build next — for {childName}&rsquo;s family and every family after.
          </p>

          {/* NPS */}
          <div style={{ marginBottom: 28, paddingBottom: 26, borderBottom: "1px solid var(--jm-rule)" }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 8, color: "var(--jm-ink)" }}>
              How likely are you to recommend this to another parent?
            </div>
            <div style={{ fontSize: 12, color: "var(--jm-ink-faint)", marginBottom: 12 }}>
              0 = not at all likely · 10 = extremely likely
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                <button
                  key={n}
                  onClick={() => setNps(n)}
                  style={{
                    flex: 1, aspectRatio: "1", background: nps === n ? "var(--jm-accent-b)" : "var(--jm-paper2)",
                    border: `1.5px solid ${nps === n ? "var(--jm-accent-b)" : "transparent"}`,
                    borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12.5, fontWeight: 700, color: nps === n ? "#fff" : "var(--jm-ink)", cursor: "pointer", fontFamily: PP,
                  }}
                >{n}</button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--jm-ink-faint)", marginTop: 6 }}>
              <span>Not at all likely</span><span>Extremely likely</span>
            </div>
          </div>

          {/* Behavior change */}
          <div style={{ marginBottom: 28, paddingBottom: 26, borderBottom: "1px solid var(--jm-rule)" }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 12, color: "var(--jm-ink)" }}>
              Your report identified a specific pattern for {childName}. Has that specific thing actually shifted?
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {BEHAVIOR_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => setBehavior(opt)}
                  style={{
                    background: behavior === opt ? "var(--jm-accent-soft)" : "var(--jm-paper2)",
                    border: `1.5px solid ${behavior === opt ? "var(--jm-accent-b)" : "transparent"}`,
                    borderRadius: 10, padding: "12px 14px", fontSize: 13.5, color: "var(--jm-ink)",
                    textAlign: "left" as const, cursor: "pointer", fontFamily: PP,
                  }}
                >{opt}</button>
              ))}
            </div>
          </div>

          {/* What's worked best */}
          <div style={{ marginBottom: 28, paddingBottom: 26, borderBottom: "1px solid var(--jm-rule)" }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 12, color: "var(--jm-ink)" }}>What&rsquo;s worked best?</div>
            <textarea
              value={workedBest}
              onChange={e => setWorkedBest(e.target.value)}
              placeholder="Specific is more useful than general."
              rows={3}
              style={{ width: "100%", border: "1.5px solid var(--jm-rule)", borderRadius: 10, padding: 12, fontFamily: PP, fontSize: 13.5, resize: "vertical" as const, color: "var(--jm-ink)", background: "var(--jm-white)", outline: "none" }}
            />
          </div>

          {/* What was hardest */}
          <div style={{ marginBottom: 28, paddingBottom: 26, borderBottom: "1px solid var(--jm-rule)" }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 12, color: "var(--jm-ink)" }}>What was hardest, or what would you change?</div>
            <textarea
              value={hardest}
              onChange={e => setHardest(e.target.value)}
              placeholder="Genuinely useful either way — this isn't just for show."
              rows={3}
              style={{ width: "100%", border: "1.5px solid var(--jm-rule)", borderRadius: 10, padding: 12, fontFamily: PP, fontSize: 13.5, resize: "vertical" as const, color: "var(--jm-ink)", background: "var(--jm-white)", outline: "none" }}
            />
          </div>

          {/* Advocate pathway — only for promoters (NPS >= 9) */}
          {isPromoter && !skipAdvocate && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{
                background: "var(--jm-gold-soft)",
                border: "1px solid rgba(169,119,42,.25)",
                borderRadius: 16, padding: "26px 28px", textAlign: "left" as const,
              }}>
                <div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" as const, fontWeight: 700, color: "var(--jm-gold)", marginBottom: 10 }}>
                  Since it&rsquo;s genuinely working
                </div>
                <p style={{ fontSize: 13.5, color: "var(--jm-ink-soft)", marginBottom: 16 }}>
                  Would you be open to any of these? Completely optional, and nothing gets used publicly without asking you directly first.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {ADVOCATE_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => toggleAdvocate(opt.id)}
                      style={{
                        background: advocates.has(opt.id) ? "rgba(52,80,63,.08)" : "var(--jm-white)",
                        border: `1px solid ${advocates.has(opt.id) ? "var(--jm-accent)" : "var(--jm-rule)"}`,
                        borderRadius: 10, padding: "14px 16px",
                        display: "flex", alignItems: "center", gap: 12, textAlign: "left" as const,
                        cursor: "pointer", fontFamily: PP, width: "100%",
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{opt.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--jm-ink)" }}>{opt.label}</div>
                        <div style={{ fontSize: 11.5, color: "var(--jm-ink-faint)" }}>{opt.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div style={{ background: "var(--jm-white)", borderRadius: 10, padding: "12px 14px", fontSize: 11.5, color: "var(--jm-ink-faint)", marginTop: 14, lineHeight: 1.5 }}>
                  Nothing here is shared, published, or used anywhere until you&rsquo;ve explicitly reviewed and approved the exact wording.
                </div>
              </div>
            </div>
          )}

          {/* Low NPS note */}
          {nps !== null && !isPromoter && (
            <div style={{ background: "var(--jm-white)", border: "1px solid var(--jm-rule)", borderRadius: 14, padding: "20px 22px", marginBottom: 4, fontSize: 13.5, color: "var(--jm-ink-soft)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--jm-ink)" }}>Thank you for the honest answer.</strong> No further ask here — this kind of feedback is exactly what helps us actually fix what isn&rsquo;t working, and someone from our team may reach out directly if that&rsquo;s alright, just to understand more.
            </div>
          )}

          <button
            onClick={submit}
            disabled={!nps || !behavior || submitting}
            style={{
              background: nps !== null && behavior && !submitting ? "var(--jm-accent-b)" : "var(--jm-paper2)",
              color: nps !== null && behavior && !submitting ? "#fff" : "var(--jm-ink-faint)",
              border: "none", fontFamily: PP, fontWeight: 700, fontSize: 14.5,
              padding: "14px 26px", borderRadius: 10, width: "100%", marginTop: 20,
              cursor: nps !== null && behavior && !submitting ? "pointer" : "not-allowed",
              boxShadow: nps !== null && behavior ? "0 8px 22px rgba(31,122,76,.28)" : "none",
            }}
          >
            {submitting ? "Sending…" : "Send feedback →"}
          </button>

          {isPromoter && !skipAdvocate && (
            <div style={{ textAlign: "center" }}>
              <button
                onClick={() => setSkipAdvocate(true)}
                style={{ background: "none", border: "none", color: "var(--jm-ink-faint)", fontWeight: 600, fontSize: 12.5, marginTop: 12, textDecoration: "underline", cursor: "pointer", fontFamily: PP }}
              >
                Skip the advocate questions
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
