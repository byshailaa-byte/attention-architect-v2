"use client";

import { useState } from "react";

const PP = `'Public Sans', 'Inter', system-ui, sans-serif`;

export default function Week3Pulse({ childName }: { childName: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (dismissed || done) return null;

  async function dismiss() {
    setDismissed(true);
    fetch("/api/lms/survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "week3_pulse", dismiss: true }),
    }).catch(() => {});
  }

  async function submit() {
    if (!rating) return;
    setSubmitting(true);
    await fetch("/api/lms/survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "week3_pulse", rating, open_text: text || null }),
    }).catch(() => {});
    setDone(true);
  }

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(32,30,25,.45)",
      zIndex: 100,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      fontFamily: PP,
    }}>
      <div style={{
        background: "var(--jm-white)",
        borderRadius: 18,
        boxShadow: "var(--jm-shadow)",
        border: "1px solid var(--jm-rule)",
        padding: "28px 26px",
        maxWidth: 460,
        width: "100%",
        position: "relative",
      }}>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{ position: "absolute", top: 16, right: 18, color: "var(--jm-ink-faint)", fontSize: 16, background: "none", border: "none", cursor: "pointer", fontFamily: PP }}
        >
          ✕
        </button>

        <h2 style={{ fontFamily: `'Bricolage Grotesque', system-ui, sans-serif`, fontSize: 17, fontWeight: 700, marginBottom: 6, color: "var(--jm-ink)" }}>
          Quick check — three weeks in.
        </h2>
        <p style={{ fontSize: 13, color: "var(--jm-ink-soft)", marginBottom: 20 }}>
          Ten seconds. Nothing to overthink.
        </p>

        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--jm-ink)" }}>
          How&rsquo;s it going so far?
        </div>

        {/* 1–5 scale */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {[1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              onClick={() => setRating(v)}
              style={{
                flex: 1,
                background: rating === v ? "var(--jm-accent-soft)" : "var(--jm-paper2)",
                border: `1.5px solid ${rating === v ? "var(--jm-accent-b)" : "transparent"}`,
                borderRadius: 10,
                padding: "12px 4px",
                textAlign: "center",
                fontSize: 13,
                fontWeight: 700,
                color: rating === v ? "var(--jm-accent)" : "var(--jm-ink)",
                cursor: "pointer",
                fontFamily: PP,
              }}
            >
              {v}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--jm-ink-faint)", marginBottom: 20 }}>
          <span>Not really landing</span>
          <span>Really working</span>
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--jm-ink)" }}>
          Anything working especially well, or especially not?{" "}
          <span style={{ fontWeight: 400, color: "var(--jm-ink-faint)" }}>(optional)</span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="A sentence is plenty."
          rows={3}
          style={{
            width: "100%",
            border: "1.5px solid var(--jm-rule)",
            borderRadius: 10,
            padding: 12,
            fontFamily: PP,
            fontSize: 13.5,
            resize: "vertical",
            minHeight: 70,
            color: "var(--jm-ink)",
            background: "var(--jm-white)",
            outline: "none",
          }}
        />

        <button
          onClick={submit}
          disabled={!rating || submitting}
          style={{
            background: rating && !submitting ? "var(--jm-accent-b)" : "var(--jm-paper2)",
            color: rating && !submitting ? "#fff" : "var(--jm-ink-faint)",
            border: "none",
            fontFamily: PP,
            fontWeight: 700,
            fontSize: 14.5,
            padding: "14px 26px",
            borderRadius: 10,
            width: "100%",
            marginTop: 16,
            cursor: rating && !submitting ? "pointer" : "not-allowed",
            boxShadow: rating ? "0 8px 22px rgba(31,122,76,.28)" : "none",
          }}
        >
          {submitting ? "Sending…" : "Send →"}
        </button>

        <p style={{ fontSize: 11.5, color: "var(--jm-ink-faint)", marginTop: 10, lineHeight: 1.5 }}>
          This doesn&rsquo;t affect {childName}&rsquo;s program either way — we just want to know what to fix.
        </p>
      </div>
    </div>
  );
}
