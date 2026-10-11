"use client";
// First-party anonymous visitor id. A random UUID in the aa_anon cookie (1 year, SameSite=Lax),
// with NO personal data. Purpose: count DISTINCT VISITORS (vs sessions) in the admin funnel.
//
// Privacy contract: this id is sent ONLY to our own endpoints (/api/flow/session,
// /api/funnel/event) and stored in our DB. It is NEVER put in analytics `params`, so it never
// reaches GA4, Meta or OpenAI (those receive only pickAdParams(params)).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Read the aa_anon cookie, minting + persisting one if absent. Returns null when unavailable (SSR). */
export function getAnonId(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)aa_anon=([^;]+)/);
  const existing = m?.[1];
  if (existing && UUID_RE.test(existing)) return existing;
  let id: string;
  try { id = crypto.randomUUID(); } catch { return null; }
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; secure" : "";
  document.cookie = `aa_anon=${id}; path=/; max-age=${maxAge}; samesite=lax${secure}`;
  return id;
}
