"use client";

import { useEffect, useRef } from "react";

// Fire-and-forget: records that this reading module was opened. The endpoint is
// idempotent (UNIQUE user/week/module), so repeated opens never double-count.
export default function V2ModuleRead({ week, module }: { week: number; module: number }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    fetch("/api/lms/module-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week, module }),
    }).catch(() => { /* non-fatal */ });
  }, [week, module]);
  return null;
}
