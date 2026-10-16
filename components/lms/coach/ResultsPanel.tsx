"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { OUTCOME_LABEL, OUTCOME_CHIP, type Outcome } from "@/lib/lms/coach/outcomes";

// Parent-facing results panel (trial Day 4 + paid weekly). Shows ONLY what the parent logged. Asks
// the same "where are you now?" question as the Day-0 baseline (optional, skippable). Shows a direct
// number ONLY when the server said it improved vs baseline; otherwise honest, no number, never invent.
const C = { navy: "#1E3A5F", gold: "#E8A33D", ink: "#2E3A4B", dim: "#5B6577", white: "#fff", line: "#E7E0D2", sel: "#FFF8EC", cream: "#FBF6EE" } as const;
const HEAD = "var(--font-newsreader), Georgia, serif";

export type ResultOutcome = { day: number; outcome: Outcome; note: string | null };
export type ResultsPanelProps = {
  endpoint: string;                                   // /api/coach/checkin | /api/lms/checkin
  extraBody?: Record<string, unknown>;                // { week } for paid
  question: string;                                   // baseline question, token-filled
  chips: { label: string; value: string }[];
  answered: boolean;                                  // has the parent already given the end number?
  improved: { fromLabel: string; toLabel: string } | null; // present ONLY if improved vs baseline
  outcomes: ResultOutcome[];                          // what the parent logged, per day/week
  outcomeUnit?: "day" | "week";
};

export function ResultsPanel(props: ResultsPanelProps) {
  const { endpoint, extraBody = {}, question, chips, answered, improved, outcomes, outcomeUnit = "day" } = props;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(answered);

  async function pick(value: string) {
    if (busy) return; setBusy(true);
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...extraBody, value }) });
      if (res.ok) { setDone(true); router.refresh(); }
    } finally { setBusy(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* End-number capture — only until answered */}
      {!done && (
        <div style={{ background: C.white, border: `1.5px solid ${C.line}`, borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ fontFamily: HEAD, fontSize: 17, color: C.navy, lineHeight: 1.35, marginBottom: 12 }}>{question}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {chips.map((c) => (
              <button key={c.value} onClick={() => pick(c.value)} disabled={busy}
                style={{ minHeight: 40, padding: "8px 14px", borderRadius: 999, border: `1.5px solid ${C.gold}`, background: C.sel, color: C.navy, fontWeight: 600, fontSize: 14, cursor: busy ? "default" : "pointer" }}>
                {c.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12.5, color: C.dim, marginTop: 10 }}>Optional — only what you tell us is ever shown.</div>
        </div>
      )}

      {/* Direct number ONLY if improved */}
      {improved && (
        <div style={{ background: "#E7F6EC", border: "1px solid #BFE6CC", borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#1F7A46", marginBottom: 6 }}>What you logged</div>
          <div style={{ fontSize: 15.5, color: C.ink, lineHeight: 1.5 }}>
            You started at <b>{improved.fromLabel}</b>. Now you logged <b>{improved.toLabel}</b>.
          </div>
        </div>
      )}
      {done && !improved && (
        <div style={{ fontSize: 14.5, color: C.dim, lineHeight: 1.55 }}>
          No big change in the number yet — and that&rsquo;s okay. Here&rsquo;s exactly what you logged.
        </div>
      )}

      {/* What the parent logged — outcomes + their own words only */}
      {outcomes.length > 0 && (
        <div style={{ background: C.white, border: `1.5px solid ${C.line}`, borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: C.gold, marginBottom: 12 }}>What you logged</div>
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {outcomes.map((o, i) => {
              const chip = OUTCOME_CHIP[o.outcome];
              return (
                <li key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                  <span style={{ width: 26, height: 26, borderRadius: 8, background: chip.bg, color: chip.fg, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{chip.t}</span>
                  <div>
                    <div style={{ fontSize: 14, color: C.navy, fontWeight: 600 }}>{outcomeUnit === "day" ? `Day ${o.day}` : `Week ${o.day}`} — {OUTCOME_LABEL[o.outcome]}</div>
                    {o.note && <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.5, marginTop: 2 }}>&ldquo;{o.note}&rdquo;</div>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
