// Report v2 content generator. Deterministic parts (goal, evidence, headline, archetype
// card) are assembled from stored data; the free-text parts are GENERATED in a fixed voice
// (warm friend, concrete, short), anchored in the paid programme (content/lms Week 1), then
// checked three ways before they ship:
//   1. mechanical validator (plain words, ≤16-word sentences, Flesch ≥70, quoted switch, caps)
//   2. an LLM coherence+usability judge (two questions, both must PASS)
//   3. if the ONLY failures are length/readability, a cheap targeted REPAIR call shortens the
//      specific failing lines before we spend a full retry.
// Budget: 1 repair + 1 full retry, then static fallback. Only runs for ?report=v2.
import Anthropic from "@anthropic-ai/sdk";
import { reportsApiKey } from "@/lib/ai/anthropic-keys";
import { WRITING_ENGINE_SYSTEM_PROMPT } from "@/lib/narrative/system-prompt";
import { QUESTIONS_BY_ID, ALL_QUESTIONS } from "@/lib/engine/questions";
import { displayChildName, reportV2Pronouns, pluralizeThey, type Gender } from "@/lib/report/pronouns";
import { strengthsFor } from "@/content/report-v2/archetype-extras";
import {
  canonicalConcern, goalForConcern, headlineForConcern, worryLabelFor, worryMomentFor, noticeFor, GOLD_LINE,
} from "./goal-mapping";
import {
  selectEvidence, rankDimensions, type AnsweredQuestion, type DimScore,
} from "./evidence";
import { validateGenerated, isRepairable, fieldsFromErrors } from "./validator";
import { programFor, type ProgramAnchor } from "./program";
import { judgeCoherence, type JudgeVerdict } from "./judge";
import { composeFallback, archetypeDesc } from "@/content/report-v2/fallbacks";
import { WHY_BOXES, bareArchetype } from "./v3-copy";
import { REPORT_V2_VERSION, type ReportV2Content, type ReportV2Generated, type EvidenceItem } from "./types";

// Card 5 — the parent's instinct (assessments.parent_pattern) → its usual move at the worry's
// moment, in the parent's voice. switch.instead is written FROM this. The instinct's name is
// never shown. Null → the generator uses its default "tired parent" line.
const INSTINCT_MOVE: Record<string, string> = {
  "The Quick Fixer": "doing the first bit for {them}, or sitting down to help",
  "The Pusher":      "the second or third reminder",
  "The Negotiator":  "offering “finish this and then you can…”",
  "The Steady Hand": "waiting it out in silence",
};

const MODEL = "claude-sonnet-4-6";

// Per-call token usage, accumulated across one generation for report_generation_log (phase 52).
type Usage = { inTok: number; outTok: number };
const usageOf = (res: { usage?: { input_tokens?: number; output_tokens?: number } | null }): Usage =>
  ({ inTok: res.usage?.input_tokens ?? 0, outTok: res.usage?.output_tokens ?? 0 });
// Report tier price: Sonnet $3 / $15 per 1M tokens, USD→INR 84.
export function reportCostPaise(inTok: number, outTok: number): number {
  return Math.round(((inTok / 1_000_000) * 3 + (outTok / 1_000_000) * 15) * 84 * 100);
}
// Map the judge's failed questions to the reason enum (Q1 coherence, Q2 usability, Q3 seenIt, Q4 parent-blame).
function judgeReason(failed: string[]): string {
  const Q: Record<string, string> = { coherence: "q1", usability: "q2", seenIt: "q3", relationship: "q4" };
  const qs = failed.map((n) => Q[n]).filter(Boolean);
  return "judge_" + (qs.length ? qs.join("_") : "unknown");
}
export type ReportCost = { model: string; calls: number; inputTokens: number; outputTokens: number; costPaise: number; outcome: "llm" | "fallback"; reason: string | null };

// v3 hardPart shape — two sentences, each ≤12 words, in EITHER shape:
//   (a) "{Name} isn't <wrong read>. {He}'s/'re/is <real reason>."
//   (b) "It isn't <wrong read>. It's/It is <real reason>."
// The real reason matches WHY_BOXES[archetype] red line. Mirrors the validator's HARD_PART_RE:
// first subject = a Capitalised name (1-3 words), "It", or the null-name "your child"; second
// subject = He/She/They/It + ’s/’re/is.
const HARD_PART_RE = /^(?:It|[Yy]our child|[A-Z][A-Za-z’'-]*(?:\s[A-Z][A-Za-z’'-]*){0,2}) isn[’']t [^.]+\. (?:(?:He|She|They|It)[’'](?:s|re)|(?:He|She|They|It) is) [^.]+\.$/;

// Two GOLD hardPart examples PER ARCHETYPE (bare key), in the exact v3 shape and ≤12 words a
// sentence, each consistent with that archetype's WHY_BOXES red line (the "real reason"). Fed
// into the hardPart repair prompt so the model mimics the shape AND the right mechanism. The
// examples use a stand-in name ("Aarav"); the repair prompt tells the model to use ${Name}.
const HARD_PART_EXAMPLES: Record<string, [string, string]> = {
  // Storm red line: "It feels like losing, so {he} pushes back."
  "Storm": [
    "Aarav isn’t fighting the task. He’s fighting being told.",
    "Aarav isn’t being difficult. He’s pushing back on losing the say.",
  ],
  // Explorer red line: "{He} drifts off completely."
  "Explorer": [
    "Aarav isn’t losing interest. He’s drifting when his side-ideas get shut down.",
    "Aarav isn’t being lazy. He’s wandering off with nowhere to park an idea.",
  ],
  // Captain red line: "{His} drive switches off."
  "Captain": [
    "Aarav isn’t ignoring you. He’s switched off from being handed instructions.",
    "Aarav isn’t refusing. He’s lost his drive now it isn’t his to run.",
  ],
  // Inventor red line: "{He} loses interest fast."
  "Inventor": [
    "Aarav isn’t ignoring you. He’s waiting to start his own way.",
    "Aarav isn’t being stubborn. He’s losing interest when his way gets corrected.",
  ],
  // All-In Kid red line: "It's hard for {him} to get back in."
  "All-In Kid": [
    "Aarav isn’t refusing. He’s finding it hard to get back in.",
    "Aarav isn’t being slow. He’s lost the thread after being pulled out.",
  ],
  // Live Wire red line: "{His} attention wanders off."
  "Live Wire": [
    "Aarav isn’t being careless. He’s drifting when nothing is happening.",
    "Aarav isn’t ignoring you. He’s wandering with nothing going on.",
  ],
  // Magnet red line: "{His} focus fades."
  "Magnet": [
    "Aarav isn’t dodging the work. He’s dodging an empty room.",
    "Aarav isn’t being difficult. He’s losing focus when he’s left alone.",
  ],
  // Glue red line: "{His} focus drops, even on easy things."
  "Glue": [
    "Aarav isn’t being lazy. He’s thrown off when the air feels tense.",
    "Aarav isn’t refusing. He’s losing focus when something feels off at home.",
  ],
};
const HARD_PART_EXAMPLES_FALLBACK = HARD_PART_EXAMPLES["All-In Kid"];

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: reportsApiKey() });
  }
  return _client;
}

export type AssessmentInput = {
  childName: string | null;
  childGender: string | null;
  ageBand: string | null;
  archetype: string | null;
  concerns: string[] | null;
  answers: Record<string, string>;
  dimensions: Record<string, { value: string; winning_votes: number; data_points: number }>;
  v2Goal?: string | null; // v2 override only; legacy goal_skill/goal_key/goal_text ignored
  parentPattern?: string | null; // card 5 instinct
};

export function answeredFromAssessment(a: AssessmentInput): AnsweredQuestion[] {
  const out: AnsweredQuestion[] = [];
  for (const q of ALL_QUESTIONS) {
    const val = a.answers[q.id];
    if (val === undefined) continue;
    const opt = q.options.find((o) => o.value === val);
    if (!opt) continue;
    out.push({ id: q.id, dimension: q.dimension, label: opt.label, value: opt.value });
  }
  return out;
}

function dimScores(a: AssessmentInput): DimScore[] {
  return Object.entries(a.dimensions ?? {}).map(([dimension, d]) => ({
    dimension, winning_votes: d?.winning_votes ?? 0,
  }));
}

type Context = {
  gender: Gender; name: string; concern: string; worryLabel: string; moment: string; notice: string;
  archetype: string; archDesc: string; headline: string; goal: string;
  program: ProgramAnchor | null; evidence: EvidenceItem[]; evidenceQuotes: string[];
  evidenceTie: string; disclaimer: string; instinctMove: string | null; archStrengths: string;
  // v3: the WHY_BOXES[archetype] red line, filled — the "real reason" hardPart's 2nd sentence must match.
  realReason: string;
  // v3: bare archetype key ("Storm", "All-In Kid", …) for per-archetype gold hardPart examples.
  bareArch: string;
};

function fillTokens(tmpl: string, name: string, gender: Gender): string {
  const nm = name.trim() ? displayChildName(name) : "your child";
  const p = reportV2Pronouns(gender);
  return tmpl
    .replace(/\{Name\}/g, nm)
    .replace(/\{them\}/g, p.obj)
    .replace(/\{their\}/g, p.poss)
    .replace(/\{they\}/g, p.subj);
}

// Full token filler for v3 fixed copy (WHY_BOXES etc.), covering the {he}/{He}/{his}/{His}/{him}
// token set and unset-gender they-plural verb agreement. Mirrors cards-copy.ts makeFiller.
function fillV3(tmpl: string, name: string, gender: Gender): string {
  const nm = name.trim() ? displayChildName(name) : "Your child";
  const p = reportV2Pronouns(gender);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const they = p.subj === "they";
  const out = tmpl
    .replace(/\{Name\}/g, nm)
    .replace(/\{he\}’s/g, they ? "they’re" : `${p.subj}’s`)
    .replace(/\{He\}/g, cap(p.subj)).replace(/\{They\}/g, cap(p.subj))
    .replace(/\{His\}/g, cap(p.poss))
    .replace(/\{he\}/g, p.subj).replace(/\{they\}/g, p.subj)
    .replace(/\{him\}/g, p.obj).replace(/\{them\}/g, p.obj)
    .replace(/\{theirs\}/g, p.possPred)
    .replace(/\{his\}/g, p.poss).replace(/\{their\}/g, p.poss)
    .replace(/\{himself\}/g, p.reflexive).replace(/\{themselves\}/g, p.reflexive);
  return they ? pluralizeThey(out) : out;
}

// The subject pronoun we require, lower / capitalised — used to shape the hardPart second
// sentence ("He's …" / "She's …" / "They're …") and the seenIt focus clause in the prompt.
function pronounSubj(gender: Gender): string {
  return reportV2Pronouns(gender).subj;
}
function capSubj(gender: Gender): string {
  const s = reportV2Pronouns(gender).subj;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
// The exact capitalised subject + contraction the hardPart's 2nd sentence must start with:
// "He’s" / "She’s" / "They’re". (Singular "they" takes ’re, not ’s — matching HARD_PART_RE.)
function hardPartSubject(gender: Gender): string {
  return capSubj(gender) + (pronounSubj(gender) === "they" ? "’re" : "’s");
}
// Deterministically assemble a regex-valid hardPart from a wrong-read X and a real-reason Y:
//   "{Name} isn’t {X}. {He}’s {Y}."  (curly apostrophes, no stray full stops inside X/Y).
// X and Y are stripped of surrounding quotes and any internal periods. Crucially, Y often
// arrives with its own leading subject ("he's fighting…", "she drifts…", "his focus drops…",
// "it feels like losing, so he pushes back") — we strip that opener so we don't double it
// into "He's his focus drops". We also drop a leading contraction tail ("'s", "'re").
function buildHardPart(name: string, gender: Gender, x: string, y: string): string {
  // The gold examples are authored male ("his", "he", "him"); swap those to the child's gender
  // so an unset child never leaks "his" (→ "their") and a girl never leaks "his" (→ "her").
  const p = reportV2Pronouns(gender);
  const genderSwap = (s: string): string => {
    if (gender === "boy") return s;
    return s
      .replace(/\bhimself\b/gi, p.reflexive).replace(/\bhis\b/gi, p.poss)
      .replace(/\bhim\b/gi, p.obj).replace(/\bhe\b/gi, p.subj);
  };
  const clean = (s: string) => genderSwap(curly(s).replace(/[.!?]+/g, " ").replace(/\s+/g, " ").trim()
    .replace(/^["“']|["”']$/g, "").trim());
  // Strip a leading subject + contraction/verb from Y so it reads after "He’s / She’s / They’re".
  const stripY = (s: string): string => {
    let t = clean(s);
    // "It feels like losing, so he pushes back" → keep the clause after "so <subj> ".
    const soM = t.match(/\bso\s+(?:he|she|they|it)\s+(.+)$/i);
    if (soM) t = soM[1];
    // Drop a leading SUBJECT pronoun + optional contraction ("she drifts", "he's fighting",
    // "they're losing"). Possessive openers (his/her/their) are left intact.
    t = t.replace(/^(?:he|she|they|it)\b['’]?(?:s|re)?\s+/i, "").trim();
    return t || clean(s);
  };
  return `${name} isn’t ${clean(x)}. ${hardPartSubject(gender)} ${stripY(y)}.`;
}

// Human label for the pronoun set we require in the copy (shown to the model + judge).
function pronounRule(gender: Gender): string {
  if (gender === "boy") return "he/him/his/himself (never she/her)";
  if (gender === "girl") return "she/her/her/herself (never he/him)";
  return "singular they — they/them/their/themselves, with plural verbs (they start, they do). NEVER he/she, never the word themself, and never repeat the name in place of a pronoun";
}

function buildContext(a: AssessmentInput): Context {
  const gender = (a.childGender ?? null) as Gender;
  const name = a.childName?.trim() ? displayChildName(a.childName) : "your child";
  const concern = canonicalConcern(a.concerns?.[0]);
  const worryLabel = worryLabelFor(concern);
  const moment = worryMomentFor(concern);
  const notice = noticeFor(concern, a.childName ?? "", gender);
  const archetype = a.archetype ?? "The All-In Kid";
  const archDesc = archetypeDesc(archetype, a.childName ?? "", gender);
  const headline = headlineForConcern(concern, a.childName ?? "", gender);
  const goal = a.v2Goal?.trim() ? a.v2Goal.trim() : goalForConcern(concern, a.childName ?? "", gender);
  const program = programFor(archetype, a.ageBand, a.childName ?? "", gender);
  const evidence = selectEvidence(answeredFromAssessment(a), rankDimensions(dimScores(a)), a.childName ?? "", gender);
  const moveTmpl = a.parentPattern ? INSTINCT_MOVE[a.parentPattern] ?? null : null;
  const instinctMove = moveTmpl ? fillTokens(moveTmpl, name, gender) : null;
  const bareArch = bareArchetype(archetype);
  const whyBox = WHY_BOXES[bareArch];
  const realReason = whyBox ? fillV3(whyBox.redLine, a.childName ?? "", gender) : "";
  return {
    gender, name, concern, worryLabel, moment, notice, archetype, archDesc, headline, goal, program,
    evidence, evidenceQuotes: evidence.map((e) => e.quote), instinctMove, realReason, bareArch,
    archStrengths: strengthsFor(archetype).join(" "),
    evidenceTie: `Put together, these three answers are what pointed us to ${name}’s pattern.`,
    disclaimer:
      "Attention Architect is an educational tool for parents. It is not a medical or clinical assessment, and not a substitute for professional advice.",
  };
}

function assemble(ctx: Context, generated: ReportV2Generated, source: "llm" | "fallback"): ReportV2Content {
  return {
    ...generated, v: REPORT_V2_VERSION, layout: "v3", source,
    childName: ctx.name, concern: ctx.concern, worryLabel: ctx.worryLabel,
    headline: ctx.headline, goldLine: GOLD_LINE, goal: ctx.goal,
    evidence: ctx.evidence, evidenceTie: ctx.evidenceTie,
    archetype: ctx.archetype, archetypeDesc: ctx.archDesc, disclaimer: ctx.disclaimer,
  };
}

const VOICE_GUIDE = `VOICE — write like this:
- A warm friend who knows children, talking to a busy Indian parent on their phone.
- Every line is something you could SEE happen at home: a real subject (maths, reading), a real time (5:00, after this episode), a real place (the dining table, his room).
- NO abstract nouns: method, ownership, process, transition, thread, approach, autonomy, structure, engagement, belongs. Say what actually happens instead.
- Short sentences. Aim 14 words or fewer. One idea each.
- Write so a 10-year-old could follow it. Everyday words only. If you use a word a parent might not know, don't.
- "Instead of" = what a tired parent really says today. "Try" = the exact new words, said out loud to the child.
- The PARENT answered the questions, never the child. Say "You told us…", never "the child told us/you".`;

const GOLD_EXAMPLES = `GOLD REFERENCE OUTPUTS — match their voice, length and concreteness. DO NOT copy them.

GOLD 1 — Storm · screens · boy (name Aarav):
seenIt: "When Aarav picks what to watch, he is happy and focused for a long time."
hardPart: "Aarav isn't fighting the screen. He's fighting being told."
switch: instead "Aarav, screen off. Now." / try "Off at 6, or after this episode? You pick." / after "The choice only works if it’s real."
tonight: ["Before the screen goes on, offer two stop times.", "Let him pick. Write it where he can see it.", "When the time comes, just point to what he chose."]

GOLD 2 — Inventor · reminders · boy (name Dhrish):
seenIt: "When Dhrish works something out his own way, he stays with it for ages."
hardPart: "Dhrish isn't ignoring you. He's waiting to start his own way."
switch: instead "Dhrish, start your homework. I've told you twice." / try "Maths or reading first? And 5:00 or 5:15? Your call." / after "The choice only works if it’s real."
tonight: ["Before the usual reminder, offer two ways to start.", "Let him pick. Say nothing about the choice.", "Notice: did he start without a second reminder?"]

GOLD 3 — Magnet · homework · girl (name Meera):
seenIt: "With someone beside her, Meera can work for a long stretch."
hardPart: "Meera isn't dodging the homework. She's dodging an empty room."
switch: instead "Go do your homework in your room. Call me if you're stuck." / try "I've got some work too. Shall we both sit at the table?" / after "Then do your own thing. Don't check her work."
tonight: ["Sit at the table with something of your own: bills, a book, anything.", "Don't help and don't check. Just be there.", "Notice how long she keeps going."]`;

function buildPrompt(ctx: Context, priorFeedback?: string[]): string {
  const p = ctx.program;
  const retry = priorFeedback?.length
    ? `\n\nYour previous attempt was REJECTED. Fix every point, keep everything else:\n- ${priorFeedback.join("\n- ")}\n`
    : "";
  return `You are writing a short attention report for a parent of a child called ${ctx.name}.
It must read as a true preview of our paid programme — use OUR method below, not generic advice.

${VOICE_GUIDE}

${GOLD_EXAMPLES}

NOW WRITE FOR THIS CHILD:
WHAT THE PARENT WORRIES ABOUT MOST: ${ctx.worryLabel}
THE WORRY'S MOMENT (the switch + tonight MUST happen here): ${ctx.moment}
THE CHILD'S PATTERN (${ctx.archetype}):
- mechanism: ${p?.mechanismLine ?? ""}
- how it shows up: ${p?.patternLine ?? ""}
${(p?.meaning ?? []).map((m) => `  • ${m}`).join("\n")}
THE PARENT'S OWN 3 ANSWERS (these came from the PARENT; refer to them as "you told us"):
${ctx.evidenceQuotes.map((q, i) => `${i + 1}. "${q}"`).join("\n")}
OUR WEEK 1 CORE MOVE — take its PRINCIPLE, said at ${ctx.moment}, not its homework wording:
${p?.coreMove || "(use the mechanism above)"}
OUR WEEK 1 DAY 2 MOVE — take its PRINCIPLE, done at ${ctx.moment}, not its homework wording:
${p?.day2Move || "(use the mechanism above)"}
THE GOAL WE ARE WORKING TOWARD: "${ctx.goal}"
${ctx.name}'S STRENGTHS (seenIt draws on these — a moment of FOCUSING WELL): ${ctx.archStrengths}
PRONOUNS — use ONLY: ${pronounRule(ctx.gender)}
${ctx.instinctMove ? `THE PARENT'S USUAL MOVE AT THIS MOMENT (write switch.instead FROM this, in the parent's voice; NEVER name it): ${ctx.instinctMove}` : ""}

THE REAL REASON (hardPart's SECOND sentence must say this, in your own words): ${ctx.realReason}

Write JSON ONLY, exactly these keys:
{
  "seenIt": "When ${ctx.name} <does something concrete from the strengths / the 'what pulls in' and 'what lights up' answers>, ${pronounSubj(ctx.gender)} <focuses well, concretely>. ONE sentence, ≤18 words. NOT the worry.",
  "switch": { "instead": "what the parent really says today, IN QUOTES", "try": "the exact new words, said to ${ctx.name}, AT ${ctx.moment}, IN QUOTES", "after": "ONE short sentence on what the parent does next" },
  "hardPart": "${ctx.name} isn't <the wrong read of the worry>. ${hardPartSubject(ctx.gender)} <the real reason, matching THE REAL REASON above>.",
  "tonight": ["step 1 — ONE short sentence (two at most), the Day 2 principle done AT ${ctx.moment}", "step 2 — another concrete step", "${ctx.notice}"]
}
The THIRD tonight step must be exactly this Notice check of the outcome: "${ctx.notice}"

VOICE RULES (rejected otherwise):
1. seenIt shows ${ctx.name} FOCUSING WELL (a strength moment). It is ONE sentence that STARTS with "When ${ctx.name}", ≤18 words, and must NOT mention the worry, reminders, fights, quitting or any problem. Never the phrase "You've seen". Use plainly POSITIVE focus words ("stays with it for a long time", "keeps going", "sticks with it"). AVOID phrasings that can sound like a loss even when they mean focus — do NOT write "loses track of time", "forgets everything else", "shuts the world out".
2. hardPart is EXACTLY two short sentences: "${ctx.name} isn't X. ${hardPartSubject(ctx.gender)} Y." X = the wrong read (won't, can't, the task itself). Y = the real reason (THE REAL REASON above). Each sentence ≤12 words. No other full stops inside X or Y.
3. Use ${ctx.name}. NEVER the words type, pattern, trait or profile, and never name the attention type — that appears elsewhere.
4. Quotation marks ONLY around the parent's own stored answers or the exact words a parent/child says. Not around your own phrases.
5. Never blame the parent. Never bargain. Never promise an outcome. Never imply the parent–child relationship, or something being "off between you", is the problem. BANNED: fix, fixes, "nothing is wrong".
6. PRONOUNS: use ONLY ${pronounRule(ctx.gender)}.
7. EVERY sentence 16 words or fewer. One idea each.

MORE HARD RULES:
- Each tonight step is ONE short sentence, TWO at most.
- Never make the PARENT the cause of the problem. Do NOT write "you push", "every reminder you give", "because you…". Describe what happens for the child, not what the parent does wrong.
- The switch AND tonight MUST take place at ${ctx.moment}, using our Week 1 principle there — NOT re-skinned homework advice.
- switch.try IS our Week 1 core move above, put into the parent's exact words at ${ctx.moment}. It must BE that move — not a generic nudge ("keep going", "five more minutes", "you can do it"). If switch.try is not our core move, it is wrong.
- switch.instead and switch.try are WORDS A PARENT SAYS, each wrapped in double quotes.${ctx.instinctMove ? ` switch.instead must be the parent's usual move above, said out loud.` : ""}
- If switch.try offers a real choice, switch.after must be exactly: "The choice only works if it’s real."
- NO abstract nouns: method, ownership, process, transition, thread, approach, autonomy, structure, engagement, belongs.
- BANNED words: system, re-entry, brain, neuro, exile, dopamine, regulate, off-ramp, upstairs, diagnose, ADHD, disorder, may, might, could.
- NEVER BARGAIN. The stop time is fixed and stated plainly. BANNED bargaining words: stakes, bet, consequence, punish, firm, worth it, stake, reward, treat, treats, deal, earn, earned.
- No comparisons to other children (rare, most kids, etc). No invented numbers, stats, testimonials.
- LENGTH (hard limits — count them): switch.instead and switch.try must each be ≤ 70 characters INCLUDING the quotes. Keep the spoken line short and natural; if a choice is long, trim it (e.g. "5:00 or 5:15? You pick."). seenIt/hardPart ≤ 170 chars.
- Each tonight step is ONE sentence of ≤ 14 words. Never two sentences. If it runs long, cut it.
Before you answer, re-read every line: each sentence ≤16 words (seenIt ≤18), seenIt starts "When ${ctx.name}" and shows focus (not the worry), hardPart is "${ctx.name} isn't X. ${hardPartSubject(ctx.gender)} Y." with each sentence ≤12 words, and pronouns are ${pronounRule(ctx.gender)}.${retry}`;
}

// ---- field get/set for the targeted repair call (v3 generates only these fields) ----
function getField(g: ReportV2Generated, path: string): string {
  if (path === "seenIt") return g.seenIt;
  if (path === "hardPart") return g.hardPart;
  if (path === "switch.instead") return g.switch.instead;
  if (path === "switch.try") return g.switch.try;
  if (path === "switch.after") return g.switch.after;
  const tn = path.match(/^tonight\[(\d)\]$/); if (tn) return g.tonight[+tn[1]];
  return "";
}
function setField(g: ReportV2Generated, path: string, val: string) {
  if (path === "seenIt") { g.seenIt = val; return; }
  if (path === "hardPart") { g.hardPart = val; return; }
  if (path === "switch.instead") { g.switch.instead = val; return; }
  if (path === "switch.try") { g.switch.try = val; return; }
  if (path === "switch.after") { g.switch.after = val; return; }
  const tn = path.match(/^tonight\[(\d)\]$/); if (tn) { g.tonight[+tn[1]] = val; return; }
}

// Models often emit a straight apostrophe; our fixed-format rules (seenIt prefix, hardPart
// regex) and gold voice use the typographic ’. Normalise so compliant content isn't rejected
// on punctuation alone.
const curly = (s: string): string => s.replace(/'/g, "’");

function parseJson(text: string): ReportV2Generated {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{"); const end = raw.lastIndexOf("}");
  const obj = JSON.parse(raw.slice(start, end + 1));
  return {
    // v3 generates only seenIt, hardPart, switch.*, tonight[]. shortGood/shortWhy/shortFix/
    // whyParas are no longer requested (card 2 is fixed per archetype) and so are omitted.
    seenIt: curly(String(obj.seenIt ?? "")),
    hardPart: curly(String(obj.hardPart ?? "")),
    switch: {
      instead: curly(String(obj.switch?.instead ?? "")),
      try: curly(String(obj.switch?.try ?? "")),
      after: curly(String(obj.switch?.after ?? "")),
    },
    tonight: [curly(String(obj.tonight?.[0] ?? "")), curly(String(obj.tonight?.[1] ?? "")), curly(String(obj.tonight?.[2] ?? ""))],
  };
}

async function callLLM(prompt: string): Promise<{ gen: ReportV2Generated; usage: Usage }> {
  // Retry the SAME call once on malformed JSON before it becomes an api_error fallback — the model
  // occasionally returns truncated/invalid JSON. Usage accrues across both attempts.
  let usage: Usage = { inTok: 0, outTok: 0 };
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await getClient().messages.create({
      model: MODEL, max_tokens: 1024, system: WRITING_ENGINE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });
    const u = usageOf(res);
    usage = { inTok: usage.inTok + u.inTok, outTok: usage.outTok + u.outTok };
    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    try { return { gen: parseJson(text), usage }; }
    catch (e) { lastErr = e; if (attempt === 0) console.log("[report-v2] malformed JSON — retrying the call once"); }
  }
  throw lastErr;
}

// Cheap targeted repair: shorten ONLY the failing fields to satisfy the exact rule each one
// broke, keeping meaning + voice. Merges the returned fields back into g. Used when the only
// problems are length/readability.
async function repairFields(g: ReportV2Generated, errors: string[], ctx: Context): Promise<{ gen: ReportV2Generated; usage: Usage }> {
  const fields = fieldsFromErrors(errors);
  const rulesByField = (f: string) => errors.filter((e) => e.startsWith(`${f}:`)).map((e) => e.split(":").slice(1).join(":").trim());
  const lines = fields.map((f) => `"${f}": ${JSON.stringify(getField(g, f))}    // fix: ${rulesByField(f).join("; ")}`).join("\n");
  const prompt = `These lines in a parent's report are too long or too hard to read. Rewrite ONLY them so each
one obeys the rule in its comment. Keep the exact meaning and this warm, concrete voice (a friend talking to
a busy parent on their phone, about ${ctx.name}).

Rules when you rewrite:
- If a line is flagged "bargaining", remove that word. State the stop time plainly; offer a choice about what comes next, never about whether it happens.
- Split or CUT. Never merge sentences to hit a word count.
- Every sentence 14 words or fewer. One idea per sentence.
- Use short, everyday words (one or two syllables) so it reads very easily.
- A "tonight" step is EXACTLY ONE short sentence (≤14 words). Never two sentences — if there are two, cut to the one that matters.
- A switch.instead / switch.try line is ONE short quoted sentence, ≤70 characters INCLUDING the quotes. Trim the choice if needed (e.g. "5:00 or 5:15? You pick.").
- Keep the quote marks on any spoken line. No abstract nouns (method, process, approach, etc).

Here are the lines to fix (keep these exact keys):
${lines}

Return JSON ONLY with exactly those keys and the rewritten values, nothing else.`;
  const res = await getClient().messages.create({
    model: MODEL, max_tokens: 500, messages: [{ role: "user", content: prompt }],
  });
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const out: ReportV2Generated = { ...g, switch: { ...g.switch }, tonight: [...g.tonight] as [string, string, string] };
  // Guard the parse: a malformed repair response must not abort the whole generation (api_error
  // → fallback). On failure we return g unchanged so the loop can still take its full retry.
  try {
    const obj = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    for (const f of fields) if (typeof obj[f] === "string" && obj[f].trim()) setField(out, f, String(obj[f]));
  } catch { /* keep g's current fields */ }
  return { gen: out, usage: usageOf(res) };
}

const SEEN_IT_MAX_WORDS = 18;

// Deterministic tidy-up for a seenIt line: strip a leading "You've seen it yourself." opener
// (and any other sentence before the "When …" clause), drop everything after the first
// sentence, and trim to ≤18 words. Returns a line that satisfies the start/one-sentence/word
// rules WITHOUT an LLM call where the raw line already carries a usable "When …" clause.
function tidySeenIt(raw: string): string {
  let s = curly(raw.trim().replace(/^["“]|["”]$/g, "").trim());
  // Keep only from the first "When " onward (drops "You've seen it yourself." and similar openers).
  const whenAt = s.search(/\bWhen\s/i);
  if (whenAt > 0) s = s.slice(whenAt);
  // One sentence only: keep up to and including the first terminal punctuation.
  const firstStop = s.search(/[.!?]/);
  if (firstStop >= 0) s = s.slice(0, firstStop + 1);
  s = s.trim();
  // Trim to ≤18 words, preserving a trailing full stop.
  const hadStop = /[.!?]$/.test(s);
  const toks = s.replace(/[.!?]+$/, "").split(/\s+/).filter(Boolean);
  if (toks.length > SEEN_IT_MAX_WORDS) s = toks.slice(0, SEEN_IT_MAX_WORDS).join(" ") + ".";
  else if (hadStop && !/[.!?]$/.test(s)) s = s + ".";
  else if (!hadStop) s = s + ".";
  return s;
}

// Problem/worry words a seenIt must NOT contain — mirrors the validator's SEEN_IT_PROBLEM_RE.
// The deterministic tidy must NOT short-circuit when the original line still carries one of
// these (tidying can't remove a worry word baked into the clause — only a rewrite can).
const SEEN_IT_PROBLEM_RE = /\b(worr\w*|struggl\w*|can['’]?t|won['’]?t|fight\w*|argu\w*|sulk\w*|remind\w*|quit\w*|distract\w*|refus\w*|nag\w*|avoid\w*|stuck|meltdown|tantrum|gives?\s+up|problem|hard\s+time|drift\w*|halfway)\b/i;
const seenItClean = (s: string): boolean =>
  /^When\s/i.test(s) && !SEEN_IT_PROBLEM_RE.test(s) && !/you['’]?ve\s+seen/i.test(s)
  && s.replace(/[.!?]+$/, "").split(/\s+/).filter(Boolean).length <= SEEN_IT_MAX_WORDS;

// Targeted seenIt repair (v3 shape): return ONE sentence showing the child FOCUSING WELL,
// starting "When ${Name}", ≤18 words, free of worry/problem words. First tries a DETERMINISTIC
// tidy (strip the "You've seen it yourself." opener, keep the first sentence, trim to ≤18
// words) — but ONLY accepts it if the tidied line is also worry-free. Otherwise it spends an
// LLM rewrite from the strengths; if even that leaks, it uses the hand-written fallback seenIt.
// Used for the validator "must start"/"must not mention" failures and the judge seenIt failure.
async function repairSeenIt(seenIt: string, ctx: Context, force = false): Promise<{ text: string; usage: Usage }> {
  // 1) Deterministic path: accept the tidied line only if it is a clean "When …" strength line.
  // Skipped when `force` is set (judge disliked a validator-clean line — only a rewrite helps).
  const tidied = tidySeenIt(seenIt);
  if (!force && seenItClean(tidied) && tidied.replace(/[.!?]+$/, "").split(/\s+/).filter(Boolean).length >= 4) {
    return { text: tidied, usage: { inTok: 0, outTok: 0 } };
  }
  // The hand-written fallback seenIt for this archetype — guaranteed clean — as a last resort.
  const fbName = /^your child$/i.test(ctx.name) ? "" : ctx.name;
  const fallbackSeenIt = composeFallback(ctx.archetype, ctx.concern, fbName, ctx.gender).seenIt;
  // 2) Otherwise, an LLM rewrite from the strengths.
  const prompt = `Rewrite this one line for a parent of ${ctx.name}. It must show ${ctx.name} FOCUSING WELL —
a real moment of deep or happy focus — NOT the worry, not a problem, not reminders or fights.
Draw on these strengths: ${ctx.archStrengths}
Rules: ONE sentence, ≤18 words, starting EXACTLY with "When ${ctx.name}". Shape: "When ${ctx.name} <does something>, ${pronounSubj(ctx.gender)} <focuses well>." Use only these
pronouns: ${pronounRule(ctx.gender)}. Plain, concrete words. Use plainly POSITIVE focus words ("stays with it for a long time", "keeps going"); AVOID "loses track of time", "forgets everything", "shuts the world out" — they can read as a loss. Never the phrase "You've seen". Return ONLY the rewritten line, nothing else.
Current (wrong): ${JSON.stringify(seenIt)}`;
  try {
    const res = await getClient().messages.create({ model: MODEL, max_tokens: 120, messages: [{ role: "user", content: prompt }] });
    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim().replace(/^["“]|["”]$/g, "");
    const line = tidySeenIt(text.split("\n")[0]);
    // Accept the rewrite only if it is a clean "When …" strength line; else use the fallback.
    return { text: seenItClean(line) ? line : fallbackSeenIt, usage: usageOf(res) };
  } catch { return { text: fallbackSeenIt, usage: { inTok: 0, outTok: 0 } }; }
}

// Derive the wrong-read X and real-reason Y from a gold example line ("Aarav isn’t X. He’s Y.").
function splitGold(line: string): { x: string; y: string } | null {
  const m = line.match(/isn['’]t (.+?)\.\s+(?:He|She|They|It)['’](?:s|re)\s+(.+?)\.$/);
  return m ? { x: m[1], y: m[2] } : null;
}
// A hardPart is valid iff it matches the shape, each sentence is ≤12 words, AND the word right
// after the 2nd-sentence contraction is NOT a finite verb ("He’s drifts" / "She’s loses" are
// broken — a leftover subject+verb clause). Predicates after "He’s" read as gerunds/adjectives/
// nouns (fighting, lost, calm, an empty room), which don't end in "s". So reject an "…’s <word>s".
function hardPartValid(line: string): boolean {
  if (!HARD_PART_RE.test(line)) return false;
  const wc = (s: string) => s.split(/\s+/).map((w) => w.replace(/[^A-Za-z]/g, "")).filter(Boolean).length;
  if (!line.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).every((s) => wc(s) <= 12)) return false;
  // Broken-copula guard: "(He|She|They|It)’s/’re <verb-ending-in-s>" → leftover finite verb.
  const m = line.match(/(?:He|She|They|It)['’](?:s|re)\s+([A-Za-z’']+)/);
  if (m && /s$/i.test(m[1]) && !/(ss|ous|ness|less)$/i.test(m[1])) return false;
  return true;
}
// The hand-written archetype seenIt (strength moment), fully token-filled for this child —
// a guaranteed-clean "When …" focus line, used as the last-resort seenIt on a judge q3 failure.
function fallbackSeenItFor(ctx: Context): string {
  const fbName = /^your child$/i.test(ctx.name) ? "" : ctx.name;
  return composeFallback(ctx.archetype, ctx.concern, fbName, ctx.gender).seenIt;
}
// The deterministic hardPart fallback: take the archetype's first gold example parts and
// assemble a regex-valid line for THIS child (correct name + He’s/She’s/They’re).
function goldHardPart(ctx: Context): string {
  const ex = HARD_PART_EXAMPLES[ctx.bareArch] ?? HARD_PART_EXAMPLES_FALLBACK;
  const parts = splitGold(ex[0]) ?? { x: "being difficult", y: "finding it hard to get back in" };
  return buildHardPart(ctx.name, ctx.gender, parts.x, parts.y);
}

// Targeted hardPart repair (v3 shape): produce a regex-valid "{Name} isn’t X. {He}’s Y."
// Two sentences, each ≤12 words, Y matching the real reason. The model is asked ONLY for the
// X (wrong read) and Y (real reason) parts; we assemble the exact shape ourselves (correct
// name + He’s/She’s/They’re contraction) so punctuation/contraction mistakes can't fail it.
// Two per-archetype GOLD examples anchor the right mechanism. Any failure (bad JSON,
// non-matching) falls back to the deterministic gold line — it never returns an invalid line.
async function repairHardPart(hardPart: string, ctx: Context): Promise<{ text: string; usage: Usage }> {
  const examples = HARD_PART_EXAMPLES[ctx.bareArch] ?? HARD_PART_EXAMPLES_FALLBACK;
  // The real reason Y is FIXED to the archetype's gold copula predicate (always reads cleanly
  // after "{He}’s …" and already matches WHY_BOXES). We ask the model only for X — the wrong
  // read of THIS worry — then assemble deterministically. X is the only personalised half.
  const goldParts = splitGold((HARD_PART_EXAMPLES[ctx.bareArch] ?? HARD_PART_EXAMPLES_FALLBACK)[0]);
  const goldY = goldParts?.y ?? "finding it hard to get back in";
  const prompt = `For a parent of ${ctx.name}, give ONLY the "wrong read" half of a hard-part line.
The full line is: "${ctx.name} isn’t <X>. ${hardPartSubject(ctx.gender)} ${goldY}."
X = the WRONG read of the worry a parent assumes about ${ctx.worryLabel} — e.g. "ignoring you",
"being lazy", "fighting the task", "giving up". ≤6 words, plain, a noun/gerund phrase, NO verb
subject, NO full stop, no quotes.

Two GOLD examples of the right voice (they use "Aarav"; copy the STYLE of the FIRST sentence):
1. ${JSON.stringify(examples[0])}
2. ${JSON.stringify(examples[1])}

Return JSON ONLY: {"x": "<X>"}`;
  try {
    const res = await getClient().messages.create({ model: MODEL, max_tokens: 120, messages: [{ role: "user", content: prompt }] });
    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const raw = text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? text;
    let mx = "";
    try {
      const obj = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
      if (typeof obj.x === "string") mx = obj.x.trim();
    } catch { /* fall through */ }
    // Mine X from a full-line response as a backstop.
    if (!mx) { const mined = splitGold(curly(text.trim())); if (mined) mx = mined.x; }
    const candidate = mx ? buildHardPart(ctx.name, ctx.gender, mx, goldY) : "";
    const out = hardPartValid(candidate) ? candidate : goldHardPart(ctx);
    return { text: out, usage: usageOf(res) };
  } catch { return { text: goldHardPart(ctx), usage: { inTok: 0, outTok: 0 } }; }
}

export type GenerateResult = {
  content: ReportV2Content;
  attempts: number;       // full LLM generations (1 + full retries)
  repairs: number;        // targeted repair calls used
  judges: JudgeVerdict[];
  rejections: string[];   // every validator error + judge-FAIL reason, across attempts
  cost: ReportCost;       // phase 52: tokens/cost/outcome/reason for report_generation_log
};

export function fallbackContentFor(a: AssessmentInput): ReportV2Content {
  const ctx = buildContext(a);
  return assemble(ctx, composeFallback(ctx.archetype, ctx.concern, a.childName ?? "", ctx.gender), "fallback");
}

export async function generateReportV2(a: AssessmentInput): Promise<GenerateResult> {
  const ctx = buildContext(a);
  const vopts = { childName: ctx.name, gender: ctx.gender };

  let g: ReportV2Generated | null = null;
  let source: "llm" | "fallback" = "fallback";
  let attempts = 0, repairs = 0, retries = 0;
  let seenItSwapped = false; // judge-q3 seenIt swap is done at most once per generation
  let calls = 0, inTok = 0, outTok = 0, reason: string | null = null;
  const acc = (u: Usage) => { calls++; inTok += u.inTok; outTok += u.outTok; };
  const judges: JudgeVerdict[] = [];
  const rejections: string[] = [];

  try {
    const first = await callLLM(buildPrompt(ctx)); acc(first.usage);
    let current = first.gen; attempts = 1;
    current.tonight[2] = ctx.notice; // tonight's 3rd step is always the deterministic Notice check
    // Budget: 6 repairs (length + targeted seenIt/hardPart format, which can co-occur) + 1 full retry.
    for (;;) {
      const v = validateGenerated(current, vopts);
      if (!v.ok) {
        rejections.push(...v.errors);
        // Targeted FORMAT repairs first (one field each), counting toward the budget — these aren't
        // length-only so repairFields can't touch them, but a dedicated rewrite fixes them cheaply.
        if (v.errors.some((e) => e.startsWith("hardPart: must match") || e.startsWith("hardPart: sentence over")) && repairs < 6) {
          repairs++;
          console.log(`[report-v2] repair (hardPart format)`);
          const rh = await repairHardPart(current.hardPart, ctx); acc(rh.usage); current.hardPart = rh.text;
          continue;
        }
        // seenIt FORMAT repairs: wrong opener ("must start"), the worry/problem leak, over the
        // ≤18-word cap, or more than one sentence — all routed to the strength-moment rewrite
        // (which also deterministically strips a "You've seen it yourself." opener and trims).
        if (v.errors.some((e) => /^seenIt: (must start|must not mention|sentence over|must be one sentence|must not say)/.test(e)) && repairs < 6) {
          repairs++;
          console.log(`[report-v2] repair (seenIt format → strength moment)`);
          const rs = await repairSeenIt(current.seenIt, ctx); acc(rs.usage); current.seenIt = rs.text;
          continue;
        }
        if (isRepairable(v.errors) && repairs < 6) {
          repairs++;
          console.log(`[report-v2] repair (length-only): ${fieldsFromErrors(v.errors).join(", ")}`);
          const rp = await repairFields(current, v.errors, ctx); acc(rp.usage); current = rp.gen;
          current.tonight[2] = ctx.notice;
          continue;
        }
        if (retries < 1) {
          retries++; attempts++;
          console.log(`[report-v2] full retry: ${v.errors.join("; ")}`);
          const rt = await callLLM(buildPrompt(ctx, v.errors)); acc(rt.usage); current = rt.gen;
          current.tonight[2] = ctx.notice;
          continue;
        }
        reason = isRepairable(v.errors) ? "repair_exhausted" : "validator";
        if (reason === "validator") console.log(`[report-v2] FALLBACK (validator, non-repairable after budget): ${v.errors.join("; ")}`);
        break; // → fallback
      }
      const j = await judgeCoherence({
        childName: ctx.name, worryLabel: ctx.worryLabel, moment: ctx.moment,
        archetype: ctx.archetype, program: ctx.program, evidenceQuotes: ctx.evidenceQuotes, generated: current,
      });
      acc({ inTok: j.inTok, outTok: j.outTok });
      judges.push(j);
      console.log(`[report-v2] judge ${j.verdict}: ${j.reason}`);
      if (j.verdict === "PASS") { g = current; source = "llm"; reason = null; break; }
      rejections.push(`judge: ${j.reason}`);
      // seenIt judge failure (whether alone OR bundled with q1/q4) → fix seenIt in place before
      // spending the one full retry. First a strength-moment rewrite; if that still isn't a
      // clean "When …" focus line, fall back to the hand-written archetype seenIt (guaranteed
      // clean). Done at most once per generation, then re-judge. This targets the dominant
      // judge-q3 rejection without a full regeneration.
      if (j.failed.includes("seenIt") && !seenItSwapped && repairs < 6) {
        repairs++; seenItSwapped = true;
        console.log(`[report-v2] repair (seenIt strength moment, judge q3)`);
        const rs = await repairSeenIt(current.seenIt, ctx, true); acc(rs.usage);
        current.seenIt = seenItClean(rs.text) ? rs.text : fallbackSeenItFor(ctx);
        continue;
      }
      // Trust the deterministic seenIt check over a noisy judge on seenIt ALONE: if the ONLY
      // remaining failure is q3 (seenIt), AND we have already run the seenIt strength-moment
      // repair, AND the current seenIt passes seenItClean() — i.e. it structurally starts
      // "When …", is ≤18 words, and carries NO worry/problem word (the exact rules the validator
      // + grammar tests enforce) — then the judge is contradicting a deterministic guarantee on
      // one field. Accept as LLM rather than discard good q1/q2/q4 content. The banned list and
      // every other rule still apply; only the judge's inconsistent q3 is overridden here.
      if (j.failed.length === 1 && j.failed[0] === "seenIt" && seenItSwapped && seenItClean(current.seenIt)) {
        console.log(`[report-v2] accept: judge q3-only on a deterministically-clean seenIt (trusted over judge)`);
        g = current; source = "llm"; reason = null; break;
      }
      if (retries < 1) {
        retries++; attempts++;
        // Carry a clean, already-swapped seenIt forward so the retry only needs to fix the
        // OTHER failed questions (q1 coherence / q4 parent-blame), not re-roll a good seenIt.
        const keepSeenIt = seenItSwapped && seenItClean(current.seenIt) ? current.seenIt : null;
        const jr = await callLLM(buildPrompt(ctx, [`Judge FAILED (${j.failed.join(", ")}): ${j.reason}`])); acc(jr.usage); current = jr.gen;
        if (keepSeenIt) current.seenIt = keepSeenIt;
        current.tonight[2] = ctx.notice;
        continue;
      }
      reason = judgeReason(j.failed);
      break; // → fallback
    }
  } catch (e) {
    rejections.push(`error: ${(e as Error).message}`);
    reason = "api_error";
    console.log(`[report-v2] error:`, (e as Error).message);
  }

  if (!g) {
    g = composeFallback(ctx.archetype, ctx.concern, a.childName ?? "", ctx.gender);
    source = "fallback";
    console.log(`[report-v2] using static fallback (${ctx.archetype} × ${ctx.concern})`);
  }

  const cost: ReportCost = {
    model: MODEL, calls, inputTokens: inTok, outputTokens: outTok,
    costPaise: reportCostPaise(inTok, outTok),
    outcome: source, reason: source === "llm" ? null : (reason ?? "unknown"),
  };
  return { content: assemble(ctx, g, source), attempts, repairs, judges, rejections, cost };
}
