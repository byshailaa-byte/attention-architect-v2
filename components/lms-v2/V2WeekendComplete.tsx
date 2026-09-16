"use client";

import { useState } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export default function V2WeekendComplete({
  week,
  alreadyComplete,
}: {
  week: number;
  alreadyComplete: boolean;
}) {
  const [done, setDone]       = useState(alreadyComplete);
  const [loading, setLoading] = useState(false);

  const BG = `var(--font-bricolage),'Bricolage Grotesque',sans-serif`;

  async function markComplete() {
    setLoading(true);
    try {
      await fetch("/api/lms/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week, day: 0 }),
      });
      if (typeof window.gtag === "function") {
        window.gtag("event", "lms_day_complete", { week, day: 0 });
      }
      if (typeof window.fbq === "function") {
        window.fbq("trackCustom", "LmsDayComplete", { week, day: 0 });
      }
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="v2-card" style={{ padding:"24px 28px", textAlign:"center" }}>
        <p style={{ fontFamily:BG, fontSize:20, fontWeight:800, marginBottom:8, color:"var(--v2-teal-700)" }}>
          Week {week} complete ✓
        </p>
        <p style={{ fontSize:14, color:"var(--v2-dim2)", marginBottom:20 }}>
          The next week opens 24 hours after you finished Day 5.
        </p>
        <a
          href="/lms-v2"
          style={{
            display:"inline-block", textDecoration:"none",
            background:"var(--v2-navy)", color:"#fff",
            fontFamily:BG, fontWeight:700, fontSize:14,
            borderRadius:10, padding:"12px 24px",
          }}
        >
          Back to home →
        </a>
      </div>
    );
  }

  return (
    <button
      onClick={markComplete}
      disabled={loading}
      style={{
        width:"100%", borderRadius:10, padding:"14px 20px",
        fontFamily:BG, fontSize:14, fontWeight:700, cursor:"pointer",
        background:"var(--v2-navy)", color:"#fff", border:"none",
        opacity: loading ? 0.5 : 1,
      }}
    >
      {loading ? "Saving…" : `Mark Week ${week} weekend complete →`}
    </button>
  );
}
