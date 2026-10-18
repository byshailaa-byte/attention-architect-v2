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
