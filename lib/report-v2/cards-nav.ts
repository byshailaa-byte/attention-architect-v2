// Shared card-navigation helpers for Report v2 cards. Pure — used by the server page
// (parsing ?card=N) and the client deck (clamping nav), and unit-tested.
export const CARD_TOTAL = 7;

// Clamp any value to a valid card number in [1, CARD_TOTAL]; non-numbers → 1.
export function clampCard(n: unknown): number {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return 1;
  return Math.min(CARD_TOTAL, Math.max(1, v));
}

// Parse the ?card= search param; undefined when absent/invalid so the deck starts at 1.
export function parseCardParam(raw: string | string[] | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const s = Array.isArray(raw) ? raw[0] : raw;
  const v = Math.floor(Number(s));
  return Number.isFinite(v) && v >= 1 ? Math.min(CARD_TOTAL, v) : undefined;
}
