"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export default function ReportViewTracker({ archetype }: { archetype: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (typeof window.gtag === "function") {
      window.gtag("event", "report_view", { archetype });
    }
    if (typeof window.fbq === "function") {
      window.fbq("trackCustom", "ReportView", { archetype });
    }
  }, [archetype]);
  return null;
}
