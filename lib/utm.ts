const STORAGE_KEY = "aa_utm";
const UTM_PARAMS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "fbclid", "gclid",
] as const;

export type UtmData = Partial<Record<(typeof UTM_PARAMS)[number], string>>;

// Write UTM params from the current URL to sessionStorage on first call only.
// Subsequent calls (e.g. from /assessment after navigating from /start) are no-ops.
export function captureUtmOnce(): void {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem(STORAGE_KEY) !== null) return;
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of UTM_PARAMS) {
    const val = params.get(key);
    if (val) utm[key] = val;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utm));
}

export function getStoredUtm(): UtmData {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as UtmData;
  } catch {
    return {};
  }
}
