// Reply-quality guards for the Coach, shared by the API route and the eval harness so both
// enforce exactly the same rules. Pure string checks + one regen-loop helper.
//
// Why these exist: Haiku sometimes (a) over-writes, (b) ends with BOTH a quoted sentence and a
// question, or (c) drifts into stricter "hold the line / consequence" language that contradicts
// the method. Each is cheap to detect and fix with one targeted regeneration.

// Words/phrases that signal the method-violating drift ("get stricter"). Checked on the REPLY,
// never on the step text we feed in (the LMS body may say "held firmly", which is fine).
export const BANNED_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "firm", re: /\bfirm\b/i },               // "firm", "Firm edge" — not "firmly"/"confirm"
  { label: "no negotiation", re: /\bno negotiation\b/i },
  { label: "no debate", re: /\bno debate\b/i },
  { label: "hold the line", re: /\bhold the line\b/i },
  { label: "hold it", re: /\bhold it\b/i },
  { label: "testing you", re: /\btesting you\b/i },
  { label: "consequence", re: /\bconsequences?\b/i },
  { label: "punish", re: /\bpunish\w*/i },
  { label: "make him/her", re: /\bmake (?:him|her|them)\b/i },
];

export function bannedPhrase(text: string): string | null {
  for (const b of BANNED_PATTERNS) if (b.re.test(text)) return b.label;
  return null;
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

export type GuardFired = { long: number; question: number; banned: number; repeat: number; group: number };

// Run the reply guards. `regenerate(correction)` must produce a fresh reply built on the previous
// one + the correction, returning its text ("" on failure keeps the current text). `priorQuotes`
// are the "say this" sentences already given earlier in this chat (so we don't repeat one).
// Each guard fires at most once; order: length → dangling question → banned phrase → repeat.
export async function enforceReplyQuality(
  firstText: string,
  regenerate: (correction: string) => Promise<string>,
  log: (m: string) => void = () => {},
  priorQuotes: string[] = [],
): Promise<{ text: string; fired: GuardFired }> {
  let text = firstText;
  const fired: GuardFired = { long: 0, question: 0, banned: 0, repeat: 0, group: 0 };

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
  const bp = bannedPhrase(text);
  if (bp) {
    fired.banned++;
    log(`[coach-guard] banned phrase "${bp}" — regenerating`);
    const t = await regenerate(`Remove the phrase "${bp}". Our method never gets stricter — change HOW you offer the step (more choice, less talk, a different moment), not the pressure.`);
    if (t) text = t;
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
  return { text, fired };
}
