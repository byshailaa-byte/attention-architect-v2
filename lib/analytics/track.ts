// ════════════════════════════════════════════════════════════════════════════════
// CLIENT TRACKER — the ONE place client code emits analytics. No component may call
// fbq / gtag / fetch("/api/funnel/event") directly anymore; everything goes through track().
//
// track(name, params, sessionId) does, in order:
//   1. writes the funnel_events row (via /api/funnel/event) — the admin source of truth;
//   2. fans out to the ad adapters (GA4, Meta Pixel, OpenAI) — but only the allow-listed
//      params, only if consent allows ads, and never for internal traffic.
// The server half (CAPI, dedup) lives in track.server.ts.
// ════════════════════════════════════════════════════════════════════════════════
"use client";

import { fireGtag } from "@/lib/gtag";
import { CATALOG, pickAdParams, consentAllowsAds, metaEventId } from "./catalog";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

// Internal test traffic (aa_internal=1 cookie): never reaches an ad platform.
function isInternalClient(): boolean {
  return typeof document !== "undefined" && /(?:^|;\s*)aa_internal=1(?:;|$)/.test(document.cookie);
}

// ── Adapters ─────────────────────────────────────────────────────────────────────
function ga4Adapter(name: string, adParams: Record<string, unknown>): void {
  fireGtag(name, adParams);
}

function metaPixelAdapter(
  name: string,
  adParams: Record<string, unknown>,
  standard: string | undefined,
  eventId: string | undefined,
): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  // Same snake_case name as a CUSTOM event…
  window.fbq("trackCustom", name, adParams);
  // …plus the Meta STANDARD event for key conversions (shares event_id with CAPI for dedup).
  if (standard) {
    if (eventId) window.fbq("track", standard, adParams, { eventID: eventId });
    else window.fbq("track", standard, adParams);
  }
}

// OpenAI / ChatGPT pixel — empty slot. Wire its real event names in here once we have the
// pixel snippet; it does nothing today.
function openaiAdapter(_name: string, _adParams: Record<string, unknown>): void {
  /* no-op until the OpenAI pixel is provided */
}

function postFunnelEvent(name: string, sessionId: string | null | undefined, params: Record<string, unknown>): void {
  // funnel_events.session_id is NOT NULL; only whatsapp_click may be session-less (route skips its insert).
  if (!sessionId && name !== "whatsapp_click") return;
  fetch("/api/funnel/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_type: name, session_id: sessionId ?? null, metadata: params }),
    keepalive: true,
  }).catch(() => {});
}

export type TrackOpts = {
  // Skip the funnel_events write (use when a server route already inserts the row, e.g. the
  // Lead/Purchase DB rows are written server-side — the client only needs the ad pixels).
  db?: boolean;
};

export function track(
  name: string,
  params: Record<string, unknown> = {},
  sessionId?: string | null,
  opts: TrackOpts = {},
): void {
  // 1) DB first.
  if (opts.db !== false) postFunnelEvent(name, sessionId, params);

  // 2) Ad adapters — allow-listed params only, gated by consent + internal-traffic.
  const spec = CATALOG[name];
  if (!spec || (!spec.ga4 && !spec.meta)) return;
  if (!consentAllowsAds() || isInternalClient()) return;

  const adParams = pickAdParams(params);
  if (spec.ga4) ga4Adapter(name, adParams);
  if (spec.meta) metaPixelAdapter(name, adParams, spec.metaStandard, metaEventId(name, { sessionId, params }));
  openaiAdapter(name, adParams);
}

// Set the Meta Pixel external_id for advanced matching — HASHED (SHA-256 of the lowercased,
// trimmed session id), matching how the server hashes it for CAPI (lib/meta/match.ts). Replaces
// the old behaviour of sending the raw session UUID to Meta in the browser.
export async function identifyPixel(sessionId: string): Promise<void> {
  if (!sessionId) return;
  if (!consentAllowsAds() || isInternalClient()) return;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId || typeof window === "undefined" || typeof window.fbq !== "function") return;
  if (typeof crypto === "undefined" || !crypto.subtle) return; // needs a secure context
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sessionId.toLowerCase().trim()));
    const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    window.fbq("init", pixelId, { external_id: hex });
  } catch {
    /* hashing unavailable — skip advanced matching rather than send raw */
  }
}
