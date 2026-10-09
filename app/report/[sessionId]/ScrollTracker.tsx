"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/track";

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
          track("scroll_milestone", { page: "report", depth }, sessionId, { db: false });
        }
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // check on mount for short pages
    return () => window.removeEventListener("scroll", onScroll);
  }, [sessionId]);

  return null;
}
