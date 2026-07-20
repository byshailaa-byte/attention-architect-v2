"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export default function ExitIntentPopup({ sessionId }: { sessionId: string }) {
  const [visible, setVisible] = useState(false);
  const fired = useRef(false);

  function trigger() {
    if (fired.current) return;
    fired.current = true;
    setVisible(true);

    fetch("/api/funnel/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: "exit_intent_shown", session_id: sessionId, metadata: {} }),
    }).catch(() => {});

    if (typeof window.gtag === "function") {
      window.gtag("event", "exit_intent_shown");
    }
    if (typeof window.fbq === "function") {
      window.fbq("trackCustom", "ExitIntentShown");
    }
  }

  useEffect(() => {
    function onMouseLeave(e: MouseEvent) {
      if (e.clientY <= 0) trigger();
    }
    function onVisibilityChange() {
      if (document.hidden) trigger();
    }
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  const BG = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={() => setVisible(false)}
    >
      <div
        style={{
          background: "var(--paper)",
          color: "var(--ink)",
          borderRadius: "16px",
          padding: "36px 32px 28px",
          maxWidth: "440px",
          width: "100%",
          textAlign: "center",
          fontFamily: "var(--font-instrument), 'Instrument Sans', sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p
          style={{
            fontFamily: BG,
            fontSize: "20px",
            fontWeight: 800,
            lineHeight: 1.35,
            marginBottom: "12px",
            color: "var(--ink)",
          }}
        >
          Other parents found this helpful — take another look
        </p>
        <p style={{ fontSize: "14px", color: "var(--ink-dim)", lineHeight: 1.6, marginBottom: "28px" }}>
          Both options below are one-time — not a subscription. You can start with just the first module if you want to try it first.
        </p>
        <button
          onClick={() => setVisible(false)}
          style={{
            display: "block",
            width: "100%",
            background: "var(--ink)",
            color: "var(--paper)",
            border: "none",
            borderRadius: "10px",
            padding: "14px",
            fontSize: "15px",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: BG,
            marginBottom: "10px",
          }}
        >
          Take another look →
        </button>
        <button
          onClick={() => setVisible(false)}
          style={{
            display: "block",
            width: "100%",
            background: "none",
            border: "none",
            color: "var(--ink-dim)",
            fontSize: "13px",
            cursor: "pointer",
            padding: "6px",
          }}
        >
          No thanks
        </button>
      </div>
    </div>
  );
}
