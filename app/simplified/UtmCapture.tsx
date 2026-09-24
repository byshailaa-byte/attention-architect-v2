"use client";

import { useEffect } from "react";
import { captureUtmOnce } from "@/lib/utm";

// Captures first-touch UTM / click-id params on EVERY /simplified/* entry route.
// All ad-landing paths (/, /about, /health, /children, /parents, /resources,
// /roadmap, /profile, /start) rewrite under app/simplified/ and share this
// layout, so mounting one capture here runs it at true first touch — before any
// client navigation (e.g. the landing CTA's router.push) strips the query string.
// captureUtmOnce is idempotent (writes sessionStorage once), so this composes
// harmlessly with the existing per-page calls on /start and /assessment.
export default function UtmCapture() {
  useEffect(() => {
    captureUtmOnce();
  }, []);
  return null;
}
