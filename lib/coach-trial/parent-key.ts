// The parent key dedups trials across phone/email — the same identity the call queue groups on.
// Prefer the normalised phone (+91XXXXXXXXXX, lib/phone.ts); fall back to the lowercased email.
import { normalizePhone } from "@/lib/phone";

export function parentKey(phone: string | null | undefined, email: string | null | undefined): string | null {
  const p = normalizePhone(phone);
  if (p) return p;
  const e = (email ?? "").trim().toLowerCase();
  if (e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return e;
  return null;
}
