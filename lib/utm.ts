const STORAGE_KEY = "aa_utm";
const COOKIE_KEY = "aa_utm";
const COOKIE_DAYS = 30;
const UTM_PARAMS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "fbclid", "gclid",
] as const;

export type UtmData = Partial<Record<(typeof UTM_PARAMS)[number], string>>;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string, days: number): void {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
}

// Capture UTM params from the current URL into a FIRST-PARTY cookie (30 days) on the FIRST visit
// only — first visit wins, so later landings don't overwrite the original attribution. Also
// mirrored to sessionStorage for same-session reads. No-op once a cookie already exists.
export function captureUtmOnce(): void {
  if (typeof window === "undefined") return;
  if (readCookie(COOKIE_KEY) !== null) return; // first visit wins — never overwrite
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of UTM_PARAMS) {
    const val = params.get(key);
    if (val) utm[key] = val;
  }
  const json = JSON.stringify(utm);
  writeCookie(COOKIE_KEY, json, COOKIE_DAYS);
  try { sessionStorage.setItem(STORAGE_KEY, json); } catch { /* ignore */ }
}

export function getStoredUtm(): UtmData {
  if (typeof window === "undefined") return {};
  try {
    const raw = readCookie(COOKIE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as UtmData;
  } catch {
    return {};
  }
}
