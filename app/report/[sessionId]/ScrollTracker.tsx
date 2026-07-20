"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export default function ScrollTracker({ sessionId }: { sessionId: string }) {
  const fired = useRef(new Set<number>());

  useEffect(() => {
    function onScroll() {
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      const pct = (scrolled / total) * 100;

      for (const depth of [25, 50, 75, 100] as const) {
        if (pct >= depth && !fired.current.has(depth)) {
          fired.current.add(depth);
          fetch("/api/track/scroll", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId, page: "report", depth }),
          }).catch(() => {});
          if (typeof window.gtag === "function") {
            window.gtag("event", "scroll_milestone", { page: "report", depth });
          }
          if (typeof window.fbq === "function") {
            window.fbq("trackCustom", "ScrollMilestone", { page: "report", depth });
          }
        }
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // check on mount for short pages
    return () => window.removeEventListener("scroll", onScroll);
  }, [sessionId]);

  return null;
}
