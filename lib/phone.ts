// Phone normalisation for lead matching. Indian mobile numbers.
// normalizePhone(raw) -> "+91" + 10 digits, or null when it can't be resolved.
// Used in QUERIES ONLY (to merge leads across tables); we never rewrite stored rows.
//
// Formats seen in prod (ep-green-truth-aqxygaj2): 10-digit local, "+91XXXXXXXXXX",
// plus null/empty and junk (24-char, 9-digit) which resolve to null.

export function normalizePhone(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 10) return "+91" + digits;                       // 9876543210
  if (digits.length === 12 && digits.startsWith("91")) return "+91" + digits.slice(2); // 91XXXXXXXXXX / +91XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith("0")) return "+91" + digits.slice(1);  // 0XXXXXXXXXX
  return null;
}

// Masked display for the leads LIST: "+91 98••• ••210". Full number only on the detail page.
export function maskPhone(normalized: string | null): string {
  if (!normalized) return "—";
  const d = normalized.replace(/\D/g, "");
  if (d.length !== 12 || !d.startsWith("91")) return "•••";
  const n = d.slice(2); // 10 digits
  return `+91 ${n.slice(0, 2)}••• ••${n.slice(7, 10)}`;
}
