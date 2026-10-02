"use client";

import { useEffect, useRef } from "react";

// Records that this reading module was opened — ONLY on a genuine, visible view.
// Guards:
//  - useRef once-guard (never double-posts for the same mount)
//  - only posts when document.visibilityState === "visible", so a prefetched /
//    background render never counts; if the page mounts hidden, it waits for the
//    tab to become visible. (Module <Link>s also set prefetch={false}.)
// The endpoint is idempotent (UNIQUE user/week/module) as a final backstop.
export default function V2ModuleRead({ week, module }: { week: number; module: number }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    const record = () => {
      if (sent.current) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      sent.current = true;
      fetch("/api/lms/module-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week, module }),
      }).catch(() => { /* non-fatal */ });
    };
    record();
    if (!sent.current && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", record);
      return () => document.removeEventListener("visibilitychange", record);
    }
  }, [week, module]);
  return null;
}
