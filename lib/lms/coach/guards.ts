// Reply-quality guards for the Coach, shared by the API route and the eval harness so both
// enforce exactly the same rules. Pure string checks + one regen-loop helper.
//
// Why these exist: Haiku sometimes (a) over-writes, (b) ends with BOTH a quoted sentence and a
// question, or (c) drifts into stricter "hold the line / consequence" language that contradicts
// the method. Each is cheap to detect and fix with one targeted regeneration.

// Banned words/phrases checked on the REPLY (never on the step text we feed in — the LMS body may
// say "held firmly", which is fine). This list is the report-v2 bargaining/label/voice bans
// (mirrors lib/report-v2/validator.ts BANNED) + the Coach drift words. Whole-word, case-insensitive.
// Note: we intentionally do NOT inherit report-v2's hedge (may/might/could) or clinical
// (diagnose/ADHD/disorder) bans — a conversational coach needs modal verbs, and the Coach's own
// Limits require it to name ADHD when redirecting a medical question to a paediatrician.
export const BANNED_PATTERNS: { label: string; re: RegExp }[] = [
  // ── report-v2 voice/label/bargaining bans (shared) ──
  { label: "fix/fixes", re: /\bfix(?:es)?\b/i },
  { label: "nothing is wrong", re: /\bnothing\s+is\s+wrong\b/i },
  { label: "type/pattern/trait/profile", re: /\b(?:types?|patterns?|traits?|profiles?)\b/i },
  { label: "worth it", re: /\bworth\s+it\b/i },
  { label: "stake", re: /\bstakes?\b/i },
  { label: "bet", re: /\bbets?\b/i },               // "bet"/"bets" — not "better"/"between"
  { label: "reward", re: /\brewards?\b/i },
  { label: "treat", re: /\btreats?\b/i },           // exception below: allowed when the parent said it
  { label: "deal", re: /\bdeals?\b/i },
  { label: "earn", re: /\bearn(?:ed|s|ing)?\b/i },  // not "learn"
  // ── Coach drift words (get-stricter) ──
  { label: "firm", re: /\bfirm\b/i },               // "firm"/"Firm edge" — not "firmly"/"confirm"
  { label: "no negotiation", re: /\bno\s+negotiation\b/i },
  { label: "no debate", re: /\bno\s+debate\b/i },
  { label: "hold the line", re: /\bhold\s+the\s+line\b/i },
  { label: "hold it", re: /\bhold\s+it\b/i },
  { label: "testing you", re: /\btesting\s+you\b/i },
  { label: "consequence", re: /\bconsequences?\b/i },
  { label: "punish", re: /\bpunish\w*/i },
  // ── Metaphors / jargon — plain language only (grade-6). A coach reply never literally needs these,
  // so a whole-word ban is safe; the regen instruction asks for a concrete, literal rewrite. ──
  { label: "locks into", re: /\block(?:s|ed|ing)?\s+(?:in|into)\b/i },
  { label: "plant", re: /\bplant(?:s|ed|ing)?\b/i },        // "plant the idea/seed"
  { label: "anchor", re: /\banchor(?:s|ed|ing)?\b/i },      // "anchor the habit"
  { label: "lean into", re: /\blean(?:s|ed|ing)?\s+into\b/i },
  { label: "audience", re: /\baudiences?\b/i },             // "give her an audience"
  // ── Idioms a parent with basic English may not follow (from a real transcript). "call" meaning a
  //    DECISION is banned; "call with our team" (a phone call) is NOT matched by these. ──
  { label: "your/the call (decision)", re: /\b(your|his|her|their|one real|a real|the real)\s+call\b/i },
  { label: "make the call", re: /\b(makes?|made|making)\s+the\s+call\b/i },
  { label: "own it", re: /\bown\s+it\b/i },
  { label: "switch on/off", re: /\bswitch(?:es|ed|ing)?\s+(?:on|off)\b/i },
  { label: "step back", re: /\bstep(?:s|ped|ping)?\s+back\b/i },   // use "go to another room" instead
  { label: "drive (metaphor)", re: /\bdrive\b/i },                 // "her drive" — not driveway
];

// Returns the first banned label in `text`, or null. "treat" is allowed ONLY when the parent's own
// message used it (the coach is echoing the parent, not proposing a treat).
export function bannedPhrase(text: string, parentMessage = ""): string | null {
  const parentSaidTreat = /\btreats?\b/i.test(parentMessage);
  for (const b of BANNED_PATTERNS) {
    if (!b.re.test(text)) continue;
    if (b.label === "treat" && parentSaidTreat) continue; // quoting the parent — allowed
    return b.label;
  }
  return null;
}

// ── Script enforcement ──
// A "foreign script" char = any letter that is NOT Latin (Devanagari, Arabic, CJK, Cyrillic…).
// Currency (₹), digits, punctuation and emoji are not letters, so they're always allowed.
export function firstForeignScriptChar(s: string): string | null {
  for (const ch of s) {
    if (/\p{L}/u.test(ch) && !/\p{Script=Latin}/u.test(ch)) return ch;
  }
  return null;
}
export function hasDevanagari(s: string): boolean {
  return /\p{Script=Devanagari}/u.test(s);
}
// Disrespectful 2nd-person address in Hindi/Hinglish — the Coach must address the PARENT with "aap",
// never tum/tu. Quoted "say this" spans are ignored: those are the parent speaking TO the child,
// where "tum" to one's own child is normal and correct.
const TUM_TU_RE = /\b(?:tum|tumhe|tumhein|tumhara|tumhari|tumhare|tumko|tujhe|tujhko|tu|tera|teri|tere)\b/i;
export function usesTumTu(text: string): boolean {
  const narration = (text || "").replace(/["“][^"”]*["”]/g, " "); // drop quoted parent→child lines
  return TUM_TU_RE.test(narration);
}

// Respectful aap-form markers: the pronoun (aap/aapka…) or an aap imperative/subjunctive
// (kariye/kijiye/dijiye/sochiye…, or karein/dein/len/rahein). Used to require aap in Hindi replies.
const AAP_RE = /\b(?:aap|aapk[aeiou]|aapko|aapse)\b|\b\w+(?:iye|iyega)\b|\b(?:karein|karenge|dein|lein|len|rahein|chaahein|chahein)\b/i;
export function aapForm(text: string): boolean {
  return AAP_RE.test((text || "").replace(/["“][^"”]*["”]/g, " ")); // ignore quoted child-lines
}
// Tum-form VERBS aimed at the parent (verb agreement): informal imperatives ("karo", "raho",
// "dekho"…) and 2nd-person "ho" ("kar rahe ho", "sahi raah par ho"). The aap forms are
// kariye/karein, rahiye, "kar rahe hain", hain. Quoted parent→child lines are ignored, and the
// "ho" clause excludes impersonal perfective/modal continuations ("theek ho gaya", "ho sakta hai").
const TUM_VERB_RE = /\b(?:karo|karho|raho|rahho|socho|sochho|suno|sunno|dekho|dikhao|batao|bolo|jao|jaao|aao|khao|piyo|padho|padhho|likho|rakho|chhodo|chodo|utho|baitho|chalo|samjho|samajho|karlo|kardo|dedo|lelo|lagao|banao|hatao|puchho|poochho|maano|aazmao)\b/i;
const TUM_BE_RE = /\brah[ei]\s+ho\b|\b(?:par|theek|thik|sahi|tayaar|taiyaar|ready|khush|pareshaan)\s+ho\b(?!\s+(?:gaya|gayi|gaye|gae|sakta|sakti|sakte|raha|rahi|rahe|jaa|jaaye|jaye|jaega|paye|paaye|paa))/i;
export function usesTumVerb(text: string): boolean {
  const narration = (text || "").replace(/["“][^"”]*["”]/g, " "); // drop quoted parent→child lines
  return TUM_VERB_RE.test(narration) || TUM_BE_RE.test(narration);
}
// Is the reply written in Hindi/Hinglish (so the aap rule applies)? Devanagari, or ≥2 Hindi markers.
const HINDI_MARKERS = /\b(?:hai|hain|ho|hoga|kya|kyun|nahi|nahin|karo|kariye|karna|karein|kaam|aaj|kal|phir|bas|raha|rahi|rahe|lagta|lagti|uska|usko|woh|wo|yeh|ye|aap|apne|apna|kuch|sab|theek|acha|accha|mat|abhi|thoda|zyada|samay|waqt)\b/gi;
export function looksHindi(text: string): boolean {
  if (hasDevanagari(text)) return true;
  return (text.match(HINDI_MARKERS) ?? []).length >= 2;
}

// Distinctive Hindi/Hinglish function words for language DECISION (avoid English-ambiguous short
// words like to/me/par). Used to classify the parent's message and to detect Hinglish leaking into
// an English reply.
const HINDI_FN = /\b(?:hai|hain|hoga|hogi|kya|kyun|nahi|nahin|karo|kariye|kijiye|karna|karni|karein|kaam|aaj|kal|phir|raha|rahi|rahe|lagta|lagti|uska|uski|usko|unko|woh|wo|yeh|ye|aap|aapko|aapka|aapki|apne|apna|kuch|theek|thik|accha|acha|mat|abhi|thoda|zyada|samay|waqt|matlab|bata|batao|batana|chahiye|samajh|samjha|band|shuru|dobara|inaam|khud|ki|ka|ke|ko|mein|usne|maine|hota|hoti|hote|kaise|bahut|agar|mana|kar|kare|karu|karun|karoge|karega|karegi|de|le|lo|diya|liya|ya|aur|toh|lekin|kyunki|bhi|hona|gaya|gayi|gaye|mila|saath|sath|baad|pehle|bina|bilkul|sirf|zaroor|wala|wali|wale|nakhre|ghoom)\b/gi;
export function hindiMarkerCount(text: string): number {
  return (text.match(HINDI_FN) ?? []).length;
}
export type Language = "en" | "hinglish" | "hi";
// Decide the reply language from the parent's LATEST message, using recent parent messages only as a
// tie-break when the latest is ambiguous. Devanagari → "hi"; ≥2 Hindi markers → "hinglish"; else "en".
export function decideLanguage(latest: string, recent: string[] = []): Language {
  if (hasDevanagari(latest)) return "hi";
  if (hindiMarkerCount(latest) >= 2) return "hinglish";
  const recentText = recent.join(" ");
  if (hasDevanagari(recentText)) return "hi";
  if (hindiMarkerCount(latest) >= 1 && hindiMarkerCount(recentText) >= 2) return "hinglish";
  return "en";
}

export function wordCount(s: string): number {
  return (s || "").trim().split(/\s+/).filter(Boolean).length;
}

// Does the parent's message ask us to GIVE/explain the step? Those turns are a 5-part step delivery,
// which is allowed to run longer than a normal conversational reply (the length cap is raised).
const STEP_REQUEST_RE = /\b(step|what\s+(?:do|should|can)\s+i|what'?s\s+(?:today|the\s+step)|how\s+do\s+i\s+(?:start|begin|do)|walk\s+me\s+through|give\s+me\s+(?:the|today)|remind\s+me|explain\s+(?:it|the\s+step|again))\b/i;
export function looksLikeStepRequest(message: string): boolean {
  return STEP_REQUEST_RE.test(message || "");
}
// Normal conversational cap vs a 5-part step-delivery cap.
export const REPLY_MAX_WORDS = 90;
export const STEP_DELIVERY_MAX_WORDS = 160;

// ── Check-in-first ──
// Does the reply ask what happened (the required check-in question)? Shared by the guard AND the eval
// scorer so they stay aligned.
const ASKS_WHAT_HAPPENED_RE = /\b(did you (get (a )?(chance|to)|get to)? ?try|were you able to try|what happened|how did (it|that|yesterday|the step|last night) go|what got in the way|what stopped|did you get to it)\b/i;
export function asksWhatHappened(text: string): boolean {
  return ASKS_WHAT_HAPPENED_RE.test(text || "");
}
// Is the parent's message a check-in trigger — they're reporting on (or skipping) the last step:
// missed / didn't work / partly worked / "I tried…". The caller also requires that the day's outcome
// isn't recorded yet before forcing the check-in.
const CHECKIN_TRIGGER_RE = /\b(missed|didn'?t (get|try|work|manage)|did not (work|try)|couldn'?t (try|get)|forgot|no time|skipped|it (didn'?t|did not) work|sort of|kind of|partly|half( way)?|started but|began but|i tried|we tried|tried it|gave up|still (wouldn'?t|won'?t|didn'?t)|no change|nothing changed)\b/i;
export function isCheckinTrigger(message: string): boolean {
  return CHECKIN_TRIGGER_RE.test(message || "");
}
// Deterministic fallback check-in line, per language, if regeneration can't produce one.
export const CHECKIN_FALLBACK: Record<Language, string> = {
  en: "Did you get a chance to try it? What happened?",
  hinglish: "Aap ise try kar paaye? Kya huaa?",
  hi: "क्या आप इसे आज़मा पाए? क्या हुआ?",
};

// ── Plain language: short sentences + "offer Hindi" when the parent says the language is hard ──
export function longestSentenceWords(text: string): number {
  const sentences = (text || "").split(/(?<=[.!?])\s+/).map((s) => wordCount(s));
  return sentences.length ? Math.max(...sentences) : 0;
}
export const MAX_SENTENCE_WORDS = 22;
// Did the parent complain that the LANGUAGE is hard (so the reply should offer Hindi)?
export function isLanguageComplaint(message: string): boolean {
  return /\b(complicated|difficult|hard|tough|confusing)\s+(language|words|english|to understand)\b|too\s+complicated|can'?t understand the (words|language)|\bin hindi\b|samajh nahi/i.test(message || "");
}

// All quoted spans (straight or curly quotes), length ≥2, trimmed.
export function extractQuotes(text: string): string[] {
  const out: string[] = [];
  const re = /["“]([^"“”]{2,}?)["”]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push((m[1] ?? "").trim());
  return out;
}

export function hasQuotedSentence(text: string): boolean {
  return extractQuotes(text).length > 0;
}

// A real "say this" sentence (≥3 words) — so short quoted interjections, especially ones quoted as
// things to AVOID (e.g. "jaldi karo"), don't count as a repeated suggestion.
export function isSayThisQuote(q: string): boolean {
  return q.trim().split(/\s+/).filter(Boolean).length >= 3;
}

// THE suggested sentence in a reply = the longest quoted say-this. Short secondary cues ("Time ho
// gaya") aren't the suggestion, so repeating one across turns isn't a repeated "say this".
export function primarySayThis(text: string): string | null {
  const qs = extractQuotes(text).filter(isSayThisQuote).sort((a, b) => b.length - a.length);
  return qs[0] ?? null;
}

// The violation of "end with ONE thing": the reply has a quoted sentence AND a trailing question
// mark that sits AFTER the final closing quote (i.e. a separate dangling question). A reply that
// simply ends with a quoted question is fine — that's one thing, the quoted sentence.
export function quotePlusQuestion(text: string): boolean {
  const t = (text || "").trim();
  if (!t.endsWith("?")) return false;
  if (!hasQuotedSentence(t)) return false;
  // A comprehension RE-ASK ("Which part is still unclear?", "Does that make sense?") is the INTENDED
  // ending of a concrete-scene / step-delivery reply — it's not the "two asks" violation, even when
  // the reply also quotes a line. Don't fire on it.
  if (/(which part|still unclear|any part unclear|does that make sense|is any part|make sense)[^?]*\?\s*$/i.test(t)) return false;
  const lastClose = Math.max(t.lastIndexOf('"'), t.lastIndexOf("”"));
  return t.lastIndexOf("?") > lastClose;
}

// Normalise a quoted sentence so near-identical repeats collapse (case/space/punctuation).
export function normalizeQuote(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9ऀ-ॿ]+/g, " ").trim();
}

// Grouping the child with a type/cohort ("kids like…", "inventors…", "live wires…"). The prompt
// forbids this; we also flag any bare use of an archetype label.
const GROUP_RE = /\b(kids?|children|boys?|girls?|students?|inventors?|explorers?|storms?|magnets?|captains?|live[\s-]?wires?|all[\s-]?in[\s-]?kids?)\b\s+(?:like|who|that|tend|often|usually|are|can)\b/i;
const TYPE_WORDS = /\b(inventors?|explorers?|storms?|magnets?|captains?|live[\s-]?wires?|all[\s-]?in[\s-]?kids?)\b/i;

export function groupsChild(text: string): boolean {
  return GROUP_RE.test(text) || TYPE_WORDS.test(text);
}

export type GuardFired = { long: number; question: number; banned: number; repeat: number; group: number; script: number; aap: number; lang: number; checkin: number; advise: number; sentence: number; hindi: number };

// Run the reply guards. `regenerate(correction)` must produce a fresh reply built on the previous
// one + the correction, returning its text ("" on failure keeps the current text). `priorQuotes`
// are the "say this" sentences already given earlier in this chat. `parentMessage` is what the
// parent wrote this turn (used for the "treat" exception and to pick the reply's script).
// Each guard fires at most once; order: length → question → banned → repeat → group → script → aap.
export async function enforceReplyQuality(
  firstText: string,
  regenerate: (correction: string) => Promise<string>,
  log: (m: string) => void = () => {},
  priorQuotes: string[] = [],
  parentMessage = "",
  language?: Language,
  maxWords: number = REPLY_MAX_WORDS,
  requireCheckin = false,
  mustAdvise = false,
  requireHindiOffer = false,
): Promise<{ text: string; fired: GuardFired }> {
  let text = firstText;
  const lang: Language = language ?? decideLanguage(parentMessage);
  const fired: GuardFired = { long: 0, question: 0, banned: 0, repeat: 0, group: 0, script: 0, aap: 0, lang: 0, checkin: 0, advise: 0, sentence: 0, hindi: 0 };

  // CHECK-IN FIRST (runs before everything): on a check-in turn, the reply MUST ask what happened and
  // MUST NOT hand over a new technique (a "say this" quote). Regenerate up to twice; if it still
  // fails, fall back to the fixed line so this is deterministic, never prompt-dependent.
  if (requireCheckin) {
    for (let attempt = 0; attempt < 2 && (!asksWhatHappened(text) || !!primarySayThis(text)); attempt++) {
      fired.checkin++;
      log(`[coach-guard] check-in-first: reply must ask what happened and give NO new technique — regenerating`);
      const t = await regenerate('First ask ONLY what happened — e.g. "Did you get a chance to try it? What happened?" Do NOT give any new step, technique, or sentence-to-say this turn. One short question, nothing else.');
      if (!t) break;
      text = t;
    }
    if (!asksWhatHappened(text) || primarySayThis(text)) {
      fired.checkin++;
      log(`[coach-guard] check-in-first: regeneration still off — using the fixed check-in line`);
      text = CHECKIN_FALLBACK[lang];
    }
  }

  // MUST ADVISE: after enough diagnostic questions, the Coach has to GIVE the adjusted step (exact
  // words in quotes), not ask yet another question. Regenerate until the reply has a concrete step.
  // No deterministic fallback (we can't fabricate the step), so this is best-effort over 2 retries.
  if (mustAdvise && !requireCheckin) {
    for (let attempt = 0; attempt < 2 && !primarySayThis(text); attempt++) {
      fired.advise++;
      log(`[coach-guard] max diagnostic questions reached — reply must give the adjusted step now`);
      const t = await regenerate("Stop asking questions — you have enough to help. Give the adjusted step now, in short plain parts: when to do it, the exact words to say in quotes, how long it takes, one short line on why, what you might see, then end with \"Does that make sense?\" No new question before the step.");
      if (!t) break;
      text = t;
    }
  }

  if (wordCount(text) > maxWords) {
    fired.long++;
    const target = Math.round(maxWords * 0.67);
    log(`[coach-guard] reply ${wordCount(text)} words > ${maxWords} — regenerating shorter`);
    const t = await regenerate(`Shorter: max ${target} words. Keep tonight's step and the one sentence to say.`);
    if (t) text = t;
  }
  // Short sentences (plain English for a second-language reader): no sentence over MAX_SENTENCE_WORDS.
  for (let attempt = 0; attempt < 2 && longestSentenceWords(text) > MAX_SENTENCE_WORDS; attempt++) {
    fired.sentence++;
    log(`[coach-guard] a sentence is ${longestSentenceWords(text)} words — regenerating with shorter sentences`);
    const t = await regenerate("Use short sentences — about 10 words each, never more than 18. Split any long sentence into two. Keep the exact words to say.");
    if (!t) break;
    text = t;
  }
  // Offer Hindi when the parent said the language is hard.
  if (requireHindiOffer && !/\bhindi\b/i.test(text)) {
    fired.hindi++;
    log(`[coach-guard] parent said the language is hard — regenerating to offer Hindi`);
    const t = await regenerate('Keep it simple, then add one line offering Hindi: "Would you like this in Hindi?"');
    if (t) text = t;
  }
  if (quotePlusQuestion(text)) {
    fired.question++;
    log(`[coach-guard] quoted sentence + trailing question — regenerating`);
    const t = await regenerate("End with the sentence to say only. No question.");
    if (t) text = t;
  }
  // Banned words get up to two regenerations — the model often reintroduces one (e.g. "not a
  // reward") or echoes a word from the day's text ("a small bet"), so one pass isn't always enough.
  let bp = bannedPhrase(text, parentMessage);
  for (let attempt = 0; bp && attempt < 2; attempt++) {
    fired.banned++;
    log(`[coach-guard] banned word "${bp}" — regenerating`);
    const t = await regenerate(`Rewrite WITHOUT the word/phrase "${bp}" anywhere — do not even negate it (no "not a ${bp}"). Say only what TO do. Never suggest rewards, treats, bets, prizes or getting stricter — change HOW you offer the step (more choice, less talk, a different moment), not the pressure.`);
    if (!t) break;
    text = t;
    bp = bannedPhrase(text, parentMessage);
  }
  if (priorQuotes.length) {
    const used = new Set(priorQuotes.filter(isSayThisQuote).map(normalizeQuote));
    const primary = primarySayThis(text);
    const rep = primary && used.has(normalizeQuote(primary)) ? primary : undefined;
    if (rep) {
      fired.repeat++;
      log(`[coach-guard] repeated "say this" sentence — regenerating with a new angle`);
      const t = await regenerate("You already gave that exact sentence to say earlier in this chat. Offer a DIFFERENT sentence, a new angle — don't reuse one you've already given.");
      if (t) text = t;
    }
  }
  if (groupsChild(text)) {
    fired.group++;
    log(`[coach-guard] names a type/group of children — regenerating`);
    const t = await regenerate("Don't name a child 'type' or group (no 'Live Wires', 'Inventors', 'kids like him'). Talk only about this one child, by name.");
    if (t) text = t;
  }
  // Script matches the decided language: hi → Devanagari; en/hinglish → Latin only.
  if (lang === "hi") {
    if (!hasDevanagari(text)) {
      fired.script++;
      log(`[coach-guard] Hindi thread but reply has no Devanagari — regenerating`);
      const t = await regenerate("Reply fully in Devanagari (Hindi script).");
      if (t) text = t;
    }
  } else {
    const foreign = firstForeignScriptChar(text);
    if (foreign) {
      fired.script++;
      log(`[coach-guard] non-Latin script char "${foreign}" in a Roman reply — regenerating`);
      const t = await regenerate("Reply in Roman (Latin) script only — write Hinglish in English letters. No Devanagari or other scripts (₹, punctuation and emoji are fine).");
      if (t) text = t;
    }
  }
  // English thread: the whole reply (including the sentence the parent says to the child) must be
  // English. The model sometimes slips a Hinglish "say this" to an English-speaking parent.
  for (let attempt = 0; lang === "en" && attempt < 2 && (hasDevanagari(text) || hindiMarkerCount(text) >= 2); attempt++) {
    fired.lang++;
    log(`[coach-guard] Hindi/Hinglish in an English reply — regenerating English-only`);
    const t = await regenerate("Reply ONLY in English — including the exact sentence the parent says to the child. No Hindi or Hinglish words.");
    if (!t) break;
    text = t;
  }
  // Respectful address + verb agreement — ONLY for a Hindi/Hinglish thread. A Hinglish/Hindi reply
  // must address the parent with "aap" forms — never tum/tu, never a tum-form verb aimed at the
  // parent (karo/raho/ho/do…), and must contain an aap form. Quoted parent→child lines may stay
  // informal. Up to three attempts — "mat bolo" / "kar rahe ho" are stubborn.
  for (let attempt = 0; lang !== "en" && attempt < 3 && looksHindi(text) && (usesTumTu(text) || usesTumVerb(text) || !aapForm(text)); attempt++) {
    fired.aap++;
    log(`[coach-guard] parent not addressed in aap form — regenerating`);
    const t = await regenerate(`Address the parent ONLY in the respectful 'aap' form. Re-read your draft and fix EVERY verb aimed at the parent: any command ending in "-o" becomes "-iye" (bolo→boliye, karo→kariye, dekho→dekhiye, suno→suniye, socho→sochiye), raho→rahiye, do→dijiye, and "...ho"→"...hain" ("kar rahe ho"→"kar rahe hain"). Never tum/tu. The sentence the parent SAYS to the child (inside quotes) may stay informal.`);
    if (!t) break;
    text = t;
  }
  return { text, fired };
}
