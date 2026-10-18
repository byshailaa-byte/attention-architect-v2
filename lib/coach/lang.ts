// Minimal language detection to SEED the reply language on the first turn (before any stored
// preference exists). After that, the stored preference (set by the set_language tool) wins. Kept
// deliberately simple — Devanagari → hi; common Hinglish markers in Roman → hinglish; else en.
export type Language = "en" | "hinglish" | "hi";

const HINGLISH = /\b(aap|kya|nahi|nahin|kaise|karo|karna|karte|hai|hain|mujhe|batao|bataiye|theek|thik|kijiye|kijie|raha|rahi|acha|accha|beta|bacche|bachche|ghar|padh|padhai|homework nahi|kar(ta|ti)?|hoga|hogi|matlab|samajh|zyada|thoda)\b/i;

export function detectLanguage(text: string): Language {
  const t = (text || "").trim();
  if (!t) return "en";
  if (/[ऀ-ॿ]/.test(t)) return "hi";            // any Devanagari
  if (HINGLISH.test(t)) return "hinglish";
  return "en";
}

// A short non-answer ("ok", "theek hai", "hmm", "tell me what to do") — the high-risk turn for the
// Coach to repeat itself. On these turns the engine buffers + runs the no-repeat backstop.
export function isShortNonAnswer(text: string): boolean {
  const t = (text || "").trim().toLowerCase();
  if (!t) return false;
  const words = t.split(/\s+/).length;
  if (/^(ok(ay)?|k|hmm+|haan+|ha|yes|yep|sure|alright|right|fine|got it|theek hai|thik hai|thik|theek|achha|acha|ji|ji haan)[.!]*$/.test(t)) return true;
  if (words <= 6 && /\b(tell me what to do|just tell me|bas batao|batao kya kar(u|oon|na)|kya kar(u|oon)|aap hi batao|you tell)\b/.test(t)) return true;
  return false;
}
