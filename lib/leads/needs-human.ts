// Keyword triggers that flag an inbound WhatsApp message as needing a human reply.
// The message text is matched (lower-cased) against this list, the matched word is
// stored as the reason, and THEN THE TEXT IS DISCARDED — we never persist message text
// (the privacy policy does not cover it).
//
// PLACEHOLDER — pending Shaily's safeguarding review.
export const NEEDS_HUMAN_KEYWORDS: readonly string[] = [
  "refund",
  "paid",
  "payment",
  "money back",
  "not received",
  "talk to",
  "call me",
  "speak to",
  "a person",
  "real person",
  "human",
  "doctor",
  "medicine",
  "medication",
  "adhd",
  "autism",
  "suicide",
  "kill",
  "hurt",
  "abuse",
  "beat",
  "harm",
];

// Returns the first matched keyword (the reason), or null. Caller must discard the text after.
export function matchNeedsHuman(text: string | null | undefined): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const kw of NEEDS_HUMAN_KEYWORDS) {
    if (lower.includes(kw)) return kw;
  }
  return null;
}
