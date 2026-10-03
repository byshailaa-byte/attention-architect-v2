"use client";

import Image from "next/image";
import type { ReactNode } from "react";

const BG   = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";
const NAVY = "#14284D";
const GOLD = "#F5A623";

// Shared chrome for the v2 start→assessment flow so steps across BOTH routes
// (/simplified/start and /assessment) look and feel like ONE continuous flow:
// the same cream ground, white card, wordmark, a progress bar carried across
// routes, an "About N min left" read, and a back link on every step after step 1.
export default function FlowShell({
  label,
  pct,
  minutesLeft,
  onBack,
  children,
  footer,
}: {
  label: string;
  pct: number;
  minutesLeft: number;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="funnel-screen">
      <div className="funnel-card">
        <Image src="/logo-horizontal-icon-wordmark.png" alt="Attention Architect" width={120} height={28} style={{ marginBottom: 18 }} />

        {/* Progress header — carried across routes */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, minHeight: 20 }}>
            {onBack ? (
              <button
                onClick={onBack}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: NAVY, fontWeight: 600, padding: 0, display: "inline-flex", alignItems: "center", gap: 6, minHeight: 44, marginLeft: -2 }}
                aria-label="Go back"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back
              </button>
            ) : <span />}
            <span style={{ fontSize: 12, color: "var(--ink-dim)", fontWeight: 600 }}>
              About {Math.max(1, minutesLeft)} min left
            </span>
          </div>
          <div style={{ height: 6, width: "100%", background: "var(--line)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${clamped}%`, background: GOLD, borderRadius: 999, transition: "width .35s ease" }} />
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-dim)", fontWeight: 600, marginTop: 7, letterSpacing: ".02em" }}>
            {label}
          </div>
        </div>

        {children}
      </div>
      {footer != null && (
        <div style={{ textAlign: "center", padding: "14px 20px 4px", fontSize: 12, color: "var(--ink-dim)", fontFamily: BG }}>
          {footer}
        </div>
      )}
    </div>
  );
}
