// Pure CRM logic — no I/O, no React. Unit-tested in __tests__/crm-logic.test.ts.

export type ReplyWindow = { open: boolean; hoursLeft: number };

// WhatsApp reply window: 24h from the last INBOUND message. hoursLeft is clamped at 0 and
// rounded UP (so "23h left" shows while any part of that hour remains).
export function replyWindow(lastInboundAt: string | number | Date | null, now: Date = new Date()): ReplyWindow {
  if (lastInboundAt == null) return { open: false, hoursLeft: 0 };
  const last = new Date(lastInboundAt).getTime();
  if (Number.isNaN(last)) return { open: false, hoursLeft: 0 };
  const msLeft = last + 24 * 3600_000 - now.getTime();
  if (msLeft <= 0) return { open: false, hoursLeft: 0 };
  return { open: true, hoursLeft: Math.ceil(msLeft / 3600_000) };
}

// A3 composer: window open → free-text + Send; window closed → template picker only.
export function composerMode(w: ReplyWindow): "free" | "template" {
  return w.open ? "free" : "template";
}

export const COMPOSER_FREE_NOTE = "Sends from the business number · free (reply window open)";

export type RowPill = { label: string; kind: "open" | "closing" | "closed" };

// List-row reply-window pill. ≤3h left → "closing" (red); open → green; else grey "closed".
export function rowPill(w: ReplyWindow): RowPill {
  if (!w.open) return { label: "Window closed", kind: "closed" };
  if (w.hoursLeft <= 3) return { label: `Window closes in ${w.hoursLeft}h`, kind: "closing" };
  return { label: `Reply window ${w.hoursLeft}h`, kind: "open" };
}

function digits(phoneE164: string): string {
  return (phoneE164 || "").replace(/\D/g, "");
}

// wa.me link to Shashank's OWN number on A1/A2 is a different concern; this builds the link to
// the given number with a prefilled text. Used for the business↔parent click-to-chat.
export function waLink(phoneE164: string, text = ""): string {
  const d = digits(phoneE164);
  return text ? `https://wa.me/${d}?text=${encodeURIComponent(text)}` : `https://wa.me/${d}`;
}

export function telLink(phoneE164: string): string {
  const d = digits(phoneE164);
  return `tel:+${d}`;
}

// Mask for lists: "+91 98•• ••• 210". Full number only ever goes inside tel:/wa.me hrefs.
export function maskPhone(phoneE164: string): string {
  const d = digits(phoneE164);
  const ten = d.slice(-10);
  if (ten.length < 10) return phoneE164;
  return `+91 ${ten.slice(0, 2)}•• ••• ${ten.slice(-3)}`;
}

// "Save and next parent": the next lead id in the current tab's order, or null at the end.
export function nextLeadId(currentId: string, orderedIds: string[]): string | null {
  const i = orderedIds.indexOf(currentId);
  if (i < 0 || i >= orderedIds.length - 1) return null;
  return orderedIds[i + 1];
}

// ₹ formatting: ₹0.86, ₹4,999. Two decimals only when there's a fractional part.
export function formatInr(amount: number): string {
  const whole = Number.isInteger(amount);
  return "₹" + amount.toLocaleString("en-IN", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
