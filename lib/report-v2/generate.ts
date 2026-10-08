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

// v3 hardPart shape — two sentences: "{Name} isn't <wrong read>. {He}'s <real reason>."
// Each ≤10 words; the real reason matches WHY_BOXES[archetype] red line. The subject of the
// first sentence is the child's name; the second starts with the (filled) subject pronoun.
// Mirrors the validator's HARD_PART_RE.
const HARD_PART_RE = /^[^.]+? isn[’']t [^.]+\. (He|She|They)[’'](s|re) [^.]+\.$/;

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
  const whyBox = WHY_BOXES[bareArchetype(archetype)];
  const realReason = whyBox ? fillV3(whyBox.redLine, a.childName ?? "", gender) : "";
  return {
    gender, name, concern, worryLabel, moment, notice, archetype, archDesc, headline, goal, program,
    evidence, evidenceQuotes: evidence.map((e) => e.quote), instinctMove, realReason,
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
  "seenIt": "When ${ctx.name} <does something concrete from the strengths / the 'what pulls in' and 'what lights up' answers>, ${pronounSubj(ctx.gender)} <focuses well, concretely>. ONE sentence, ≤16 words. NOT the worry.",
  "switch": { "instead": "what the parent really says today, IN QUOTES", "try": "the exact new words, said to ${ctx.name}, AT ${ctx.moment}, IN QUOTES", "after": "ONE short sentence on what the parent does next" },
  "hardPart": "${ctx.name} isn't <the wrong read of the worry>. ${capSubj(ctx.gender)}'s <the real reason, matching THE REAL REASON above>.",
  "tonight": ["step 1 — ONE short sentence (two at most), the Day 2 principle done AT ${ctx.moment}", "step 2 — another concrete step", "${ctx.notice}"]
}
The THIRD tonight step must be exactly this Notice check of the outcome: "${ctx.notice}"

VOICE RULES (rejected otherwise):
1. seenIt shows ${ctx.name} FOCUSING WELL (a strength moment). It is ONE sentence that STARTS with "When ${ctx.name}" and must NOT mention the worry, reminders, fights, quitting or any problem. Never the phrase "You've seen".
2. hardPart is EXACTLY two short sentences: "${ctx.name} isn't X. ${capSubj(ctx.gender)}'s Y." X = the wrong read (won't, can't, the task itself). Y = the real reason (THE REAL REASON above). Each sentence ≤10 words. No other full stops inside X or Y.
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
- Length: switch.instead/try ≤ 72 chars; seenIt/hardPart ≤ 170 chars.
Before you answer, re-read every line: each sentence ≤16 words, seenIt starts "When ${ctx.name}" and shows focus (not the worry), hardPart is "${ctx.name} isn't X. ${capSubj(ctx.gender)}'s Y." with each sentence ≤10 words, and pronouns are ${pronounRule(ctx.gender)}.${retry}`;
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
- A "tonight" step is ONE short sentence, TWO at most.
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
  const obj = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
  const out: ReportV2Generated = { ...g, switch: { ...g.switch }, tonight: [...g.tonight] as [string, string, string] };
  for (const f of fields) if (typeof obj[f] === "string" && obj[f].trim()) setField(out, f, String(obj[f]));
  return { gen: out, usage: usageOf(res) };
}

// Targeted seenIt repair (v3 shape): rewrite ONLY seenIt as ONE sentence showing the child
// FOCUSING WELL, starting "When ${Name}", ≤16 words. Used when the judge fails on seenIt alone.
async function repairSeenIt(seenIt: string, ctx: Context): Promise<{ text: string; usage: Usage }> {
  const prompt = `Rewrite this one line for a parent of ${ctx.name}. It must show ${ctx.name} FOCUSING WELL —
a real moment of deep or happy focus — NOT the worry, not a problem, not reminders or fights.
Draw on these strengths: ${ctx.archStrengths}
Rules: ONE sentence, ≤16 words, starting EXACTLY with "When ${ctx.name}". Shape: "When ${ctx.name} <does something>, ${pronounSubj(ctx.gender)} <focuses well>." Use only these
pronouns: ${pronounRule(ctx.gender)}. Plain, concrete words. Never the phrase "You've seen". Return ONLY the rewritten line, nothing else.
Current (wrong): ${JSON.stringify(seenIt)}`;
  try {
    const res = await getClient().messages.create({ model: MODEL, max_tokens: 120, messages: [{ role: "user", content: prompt }] });
    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim().replace(/^["“]|["”]$/g, "");
    const line = curly(text.split("\n")[0].trim());
    return { text: /^When /i.test(line) ? line : seenIt, usage: usageOf(res) };
  } catch { return { text: seenIt, usage: { inTok: 0, outTok: 0 } }; }
}

// Targeted hardPart repair (v3 shape): rewrite ONLY hardPart into "${Name} isn't X. ${He}'s Y."
// two sentences, each ≤10 words, Y matching the real reason. Flagged by the validator's format.
async function repairHardPart(hardPart: string, ctx: Context): Promise<{ text: string; usage: Usage }> {
  const prompt = `Rewrite this one line into EXACTLY this shape: "${ctx.name} isn't X. ${capSubj(ctx.gender)}'s Y." — two sentences. X = the wrong read of the worry (won't, can't, or the task itself). Y = the real reason: ${JSON.stringify(ctx.realReason)}. Each sentence ≤10 words. No other full stops inside X or Y. Plain words, ≤170 chars total. For a parent of ${ctx.name}. Return ONLY the rewritten line.
Current (wrong shape): ${JSON.stringify(hardPart)}`;
  try {
    const res = await getClient().messages.create({ model: MODEL, max_tokens: 120, messages: [{ role: "user", content: prompt }] });
    const line = curly(res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim().replace(/^["“]|["”]$/g, "").split("\n")[0].trim());
    return { text: HARD_PART_RE.test(line) ? line : hardPart, usage: usageOf(res) };
  } catch { return { text: hardPart, usage: { inTok: 0, outTok: 0 } }; }
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
  let calls = 0, inTok = 0, outTok = 0, reason: string | null = null;
  const acc = (u: Usage) => { calls++; inTok += u.inTok; outTok += u.outTok; };
  const judges: JudgeVerdict[] = [];
  const rejections: string[] = [];

  try {
    const first = await callLLM(buildPrompt(ctx)); acc(first.usage);
    let current = first.gen; attempts = 1;
    current.tonight[2] = ctx.notice; // tonight's 3rd step is always the deterministic Notice check
    // Budget: 4 repairs (length + targeted seenIt/hardPart format) + 1 full retry.
    for (;;) {
      const v = validateGenerated(current, vopts);
      if (!v.ok) {
        rejections.push(...v.errors);
        // Targeted FORMAT repairs first (one field each), counting toward the budget — these aren't
        // length-only so repairFields can't touch them, but a dedicated rewrite fixes them cheaply.
        if (v.errors.some((e) => e.startsWith("hardPart: must match")) && repairs < 4) {
          repairs++;
          console.log(`[report-v2] repair (hardPart format)`);
          const rh = await repairHardPart(current.hardPart, ctx); acc(rh.usage); current.hardPart = rh.text;
          continue;
        }
        if (v.errors.some((e) => e.startsWith("seenIt: must start")) && repairs < 4) {
          repairs++;
          console.log(`[report-v2] repair (seenIt format → strength moment)`);
          const rs = await repairSeenIt(current.seenIt, ctx); acc(rs.usage); current.seenIt = rs.text;
          continue;
        }
        if (isRepairable(v.errors) && repairs < 4) {
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
      // seenIt-only failure → cheap targeted repair of seenIt (strength moment), not a full retry.
      if (j.failed.length === 1 && j.failed[0] === "seenIt" && repairs < 4) {
        repairs++;
        console.log(`[report-v2] repair (seenIt strength moment)`);
        const rs = await repairSeenIt(current.seenIt, ctx); acc(rs.usage); current.seenIt = rs.text;
        continue;
      }
      if (retries < 1) {
        retries++; attempts++;
        const jr = await callLLM(buildPrompt(ctx, [`Judge FAILED (${j.failed.join(", ")}): ${j.reason}`])); acc(jr.usage); current = jr.gen;
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
