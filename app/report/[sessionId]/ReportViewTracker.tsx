"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/track";

// GA4 report_view only (the funnel_events DB row is written server-side). Carries the report
// variant (v1|v2|simplified); NO archetype is sent to any ad platform. The old Pixel-only
// "ReportView" custom event is retired.
export default function ReportViewTracker({ variant = "v1" }: { variant?: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    track("report_view", { variant }, null, { db: false });
  }, [variant]);
  return null;
}
