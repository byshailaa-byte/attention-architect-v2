"use client";

import { useState } from "react";

export default function ShareNudge({ totalDays }: { totalDays: number }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const text = `Day ${totalDays}, still showing up. ${typeof window !== "undefined" ? window.location.origin : ""}/lms`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Attention Architect", text, url: typeof window !== "undefined" ? window.location.origin : "" });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(typeof window !== "undefined" ? window.location.href : "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div style={{
      background: "var(--jm-gold-soft)",
      borderRadius: 12,
      padding: "16px 20px",
      marginTop: 20,
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, flex: 1, color: "var(--jm-ink)", fontFamily: `'Public Sans', 'Inter', system-ui, sans-serif` }}>
        Day {totalDays}, still showing up. Worth sharing?
      </div>
      <button
        onClick={share}
        style={{
          background: "var(--jm-white)",
          border: "1.5px solid var(--jm-gold)",
          borderRadius: 8,
          padding: "8px 14px",
          fontSize: 12.5,
          fontWeight: 700,
          whiteSpace: "nowrap" as const,
          cursor: "pointer",
          fontFamily: `'Public Sans', 'Inter', system-ui, sans-serif`,
          color: "var(--jm-ink)",
        }}
      >
        {copied ? "Link copied ✓" : "Share ↗"}
      </button>
    </div>
  );
}
