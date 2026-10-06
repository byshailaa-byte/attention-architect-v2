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
// Is the reply written in Hindi/Hinglish (so the aap rule applies)? Devanagari, or ≥2 Hindi markers.
const HINDI_MARKERS = /\b(?:hai|hain|ho|hoga|kya|kyun|nahi|nahin|karo|kariye|karna|karein|kaam|aaj|kal|phir|bas|raha|rahi|rahe|lagta|lagti|uska|usko|woh|wo|yeh|ye|aap|apne|apna|kuch|sab|theek|acha|accha|mat|abhi|thoda|zyada|samay|waqt)\b/gi;
export function looksHindi(text: string): boolean {
  if (hasDevanagari(text)) return true;
  return (text.match(HINDI_MARKERS) ?? []).length >= 2;
}

export function wordCount(s: string): number {
  return (s || "").trim().split(/\s+/).filter(Boolean).length;
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

export type GuardFired = { long: number; question: number; banned: number; repeat: number; group: number; script: number; aap: number };

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
): Promise<{ text: string; fired: GuardFired }> {
  let text = firstText;
  const fired: GuardFired = { long: 0, question: 0, banned: 0, repeat: 0, group: 0, script: 0, aap: 0 };

  if (wordCount(text) > 90) {
    fired.long++;
    log(`[coach-guard] reply ${wordCount(text)} words > 90 — regenerating shorter`);
    const t = await regenerate("Shorter: max 60 words. Keep tonight's step and the one sentence to say.");
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
  // Script: match the parent's script. Parent in Devanagari → reply must contain Devanagari.
  // Parent in Roman (Hinglish/English) → reply must be Latin-only (no Devanagari/other scripts).
  const parentDeva = hasDevanagari(parentMessage);
  if (parentDeva) {
    if (!hasDevanagari(text)) {
      fired.script++;
      log(`[coach-guard] parent wrote Devanagari but reply had none — regenerating`);
      const t = await regenerate("Reply fully in Devanagari (Hindi script), matching how the parent wrote.");
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
  // Respectful address: a Hindi/Hinglish reply must address the parent with "aap" forms — never
  // tum/tu, and never the informal "karo/do" imperative without an aap form present.
  if (looksHindi(text) && (usesTumTu(text) || !aapForm(text))) {
    fired.aap++;
    log(`[coach-guard] parent not addressed as aap — regenerating`);
    const t = await regenerate("Address the parent respectfully as 'aap', using aap-verb forms (aap, aapka, kariye/karein/dijiye) — never the informal 'tum'/'tu' or 'karo/do' forms. The sentence the parent SAYS to the child may stay informal.");
    if (t) text = t;
  }
  return { text, fired };
}
