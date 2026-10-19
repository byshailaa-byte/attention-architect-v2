// Deterministic Hindi/Hinglish language checks for a Coach reply. Catches the things that slipped
// past the loose regexes in the live test:
//   - PARENT must get aap-imperatives (kahiye/kijiye/baithiye/bataiye), never informal (baitho/karo/
//     batao/mat kehna). Checked OUTSIDE quotes (child scripts legitimately use tum + informal).
//   - the Coach must never gender ITSELF (samajh gayi/gaya, rahi hoon/raha hoon, -ungi/-unga).
//   - the child's verbs must agree with the profile gender (girl → sunti/karti/ruki; never sunta/karta).
//   - child scripts use "tum" by default; "tu" only if the parent used "tu" first (checked INSIDE quotes).
//   - no English words inside a Devanagari reply (beyond common loanwords); no emoji unless the parent
//     used one; the "ushe"→"use" typo.
// Returns a list of violation strings (empty = clean). Used by the eval, the unit test, and the engine's
// Hindi backstop.
import type { Gender } from "@/lib/report/pronouns";

const QUOTE_RE = /[“"][^”"]*[”"]/g;
const stripQuotes = (s: string) => s.replace(QUOTE_RE, " ");
const quotedSpans = (s: string) => [...s.matchAll(QUOTE_RE)].map((m) => m[0]);

// Informal imperatives addressed to the PARENT (aap-form is required). Word-boundary matched.
const INFORMAL_PARENT = [
  "baitho", "baith\\b", "karo\\b", "kar lo", "kar do", "mat karo", "mat karna", "mat kehna", "mat kaho",
  "batao", "batana", "bata do", "kehna\\b", "keh dena", "keh do", "suno", "sun lo", "dekho", "dekh lo",
  "de do", "le lo", "rakho", "rakh do", "jao", "aao", "maano", "maan lo", "padho", "likho", "bolo", "poochho",
];
// The Coach gendering itself (first person). Never allowed — use neutral ("samajh aa gaya", "poochhna tha").
const COACH_SELF_GENDER = [
  "samajh gayi", "samajh gaya", "rahi hoon", "raha hoon", "rahi hun", "raha hun",
  "karungi", "karunga", "dungi", "dunga", "sakungi", "sakunga", "chahungi", "chahunga", "paungi", "paunga", "bataungi", "bataunga",
];
// Child action verbs by gender — flag the WRONG gender for the profile child.
const CHILD_VERBS: Record<"masc" | "fem", string[]> = {
  masc: ["sunta", "karta", "padhta", "likhta", "baithta", "rukta", "ruka\\b", "karega", "sunega", "aayega", "padhega", "likhega", "uthega", "kar raha", "ho raha"],
  fem: ["sunti", "karti", "padhti", "likhti", "baithti", "rukti", "ruki\\b", "karegi", "sunegi", "aayegi", "padhegi", "likhegi", "uthegi", "kar rahi", "ho rahi"],
};
const LOANWORDS = new Set(["homework", "screen", "tv", "ok", "okay", "phone", "minute", "minutes", "test", "exam", "subject", "maths", "math", "english", "hindi", "book", "books", "tablet", "app", "class", "break", "pencil", "copy", "page"]);

const has = (text: string, words: string[]) => words.filter((w) => new RegExp(`(^|[^a-z])${w}`, "i").test(text));

export function hindiReplyIssues(reply: string, opts: { childGender: Gender; parentUsedTu: boolean; parentUsedEmoji: boolean }): string[] {
  const out: string[] = [];
  const text = reply || "";
  const outside = stripQuotes(text).toLowerCase();

  const informal = has(outside, INFORMAL_PARENT);
  if (informal.length) out.push(`informal parent-imperative (use aap-form): ${[...new Set(informal.map((s) => s.replace("\\b", "")))].join(", ")}`);

  const selfGender = has(outside, COACH_SELF_GENDER);
  if (selfGender.length) out.push(`coach genders itself: ${[...new Set(selfGender)].join(", ")}`);

  if (opts.childGender === "boy" || opts.childGender === "girl") {
    const wrong = opts.childGender === "girl" ? CHILD_VERBS.masc : CHILD_VERBS.fem;
    const hit = has(outside, wrong);
    if (hit.length) out.push(`child verb wrong gender (child is ${opts.childGender}): ${[...new Set(hit.map((s) => s.replace("\\b", "")))].join(", ")}`);
  }

  // Child scripts (inside quotes): "tu" only if the parent used it first.
  if (!opts.parentUsedTu) {
    const tuInScript = quotedSpans(text).filter((q) => /(^|[^a-z])(tu|tujhe|tera|teri|tere)([^a-z]|$)/i.test(q));
    if (tuInScript.length) out.push(`child script uses "tu" (default to "tum"): ${tuInScript[0].slice(0, 40)}`);
  }

  // English words inside a Devanagari reply (beyond loanwords).
  if (/[ऀ-ॿ]/.test(text)) {
    const eng = [...stripQuotes(text).matchAll(/[A-Za-z][A-Za-z']{2,}/g)].map((m) => m[0].toLowerCase()).filter((w) => !LOANWORDS.has(w));
    if (eng.length) out.push(`English word(s) in a Devanagari reply: ${[...new Set(eng)].slice(0, 4).join(", ")}`);
  }

  if (!opts.parentUsedEmoji && /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/u.test(text)) out.push("emoji without the parent using one");
  if (/(^|[^a-z])ushe([^a-z]|$)/i.test(text)) out.push(`typo "ushe" (→ "use")`);

  return out;
}
