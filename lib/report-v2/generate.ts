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
import { WRITING_ENGINE_SYSTEM_PROMPT } from "@/lib/narrative/system-prompt";
import { QUESTIONS_BY_ID, ALL_QUESTIONS } from "@/lib/engine/questions";
import { displayChildName, type Gender } from "@/lib/report/pronouns";
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
import type { ReportV2Content, ReportV2Generated, EvidenceItem } from "./types";

const MODEL = "claude-sonnet-4-6";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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
};

export function answeredFromAssessment(a: AssessmentInput): AnsweredQuestion[] {
  const out: AnsweredQuestion[] = [];
  for (const q of ALL_QUESTIONS) {
    const val = a.answers[q.id];
    if (val === undefined) continue;
    const opt = q.options.find((o) => o.value === val);
    if (!opt) continue;
    out.push({ id: q.id, dimension: q.dimension, label: opt.label });
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
  evidenceTie: string; disclaimer: string;
};

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
  return {
    gender, name, concern, worryLabel, moment, notice, archetype, archDesc, headline, goal, program,
    evidence, evidenceQuotes: evidence.map((e) => e.quote),
    evidenceTie: `Put together, these three answers are what pointed us to ${name}’s pattern.`,
    disclaimer:
      "Attention Architect is an educational tool for parents. It is not a medical or clinical assessment, and not a substitute for professional advice.",
  };
}

function assemble(ctx: Context, generated: ReportV2Generated, source: "llm" | "fallback"): ReportV2Content {
  return {
    ...generated, source,
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
- "Instead of" = what a tired parent really says today. "Try" = the exact new words, said out loud to the child.
- The PARENT answered the questions, never the child. Say "You told us…", never "the child told us/you".`;

const GOLD_EXAMPLES = `GOLD REFERENCE OUTPUTS — match their voice, length and concreteness. DO NOT copy them.

GOLD 1 — Inventor · reminders · boy (name Dhrish):
shortGood: "Nothing is wrong with Dhrish. He focuses deeply and likes doing things his own way."
shortWhy: "Reminders feel like someone else's plan, so he waits them out."
shortFix: "Let him choose how to start. 5 minutes a day."
whyParas: ["Dhrish runs on doing things his way. A reminder is someone else's plan for his time, so it feels like pressure and he waits it out.", "When the start is his idea, the second reminder stops being needed."]
switch: instead "Dhrish, start your homework. I've told you twice." / try "Maths or reading first? And 5:00 or 5:15? Your call." / after "Then step back, even if his order looks slower."
tonight: ["Before the usual reminder, offer two ways to start.", "Let him pick. Say nothing about the choice.", "Notice: did he start without a second reminder?"]

GOLD 2 — Storm · screens · girl (name Meera):
shortGood: "Nothing is wrong with Meera. She has big energy and knows her own mind."
shortWhy: "“Screens off now” feels like losing, so she fights it."
shortFix: "Let her choose when it ends. 5 minutes a day."
whyParas: ["Meera goes all in when something is her idea. When the decision is made for her, that same energy turns into a fight.", "“Screens off now” is a decision made for her. That's why it becomes a battle every evening."]
switch: instead "Meera, screen off. Now." / try "Off at 6, or after this episode? You pick." / after "Then let her choice stand, even if it's ten minutes later than you'd like."
tonight: ["Before the screen goes on, offer two stop times.", "Let her pick. Write it where she can see it.", "When the time comes, just point to what she chose."]

GOLD 3 — Magnet · homework · boy (name Kabir):
shortGood: "Nothing is wrong with Kabir. He works best with people around him."
shortWhy: "Homework alone in his room feels lonely, so he drifts."
shortFix: "Sit near him with your own work. 5 minutes a day."
whyParas: ["Kabir lights up around people. Alone, his attention goes looking for them.", "So “go do your homework in your room” is the hardest version of homework for him."]
switch: instead "Go do your homework in your room. Call me if you're stuck." / try "I've got some work too. Shall we both sit at the table?" / after "Then do your own thing. Don't check his work."
tonight: ["Sit at the table with something of your own: bills, a book, anything.", "Don't help and don't check. Just be there.", "Notice how long he keeps going."]`;

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

Write JSON ONLY, exactly these keys:
{
  "shortGood": "Nothing is wrong with ${ctx.name}. <one concrete strength>.",
  "shortWhy": "one line — why the ${ctx.worryLabel} happens, in plain concrete words",
  "shortFix": "one short instruction a parent can picture, then '5 minutes a day.'",
  "whyParas": ["two short sentences, concrete, using at least one of the 3 answers (\\"you told us…\\")", "one or two short sentences"],
  "switch": { "instead": "what a tired parent really says today, IN QUOTES", "try": "the exact new words, said to ${ctx.name}, AT ${ctx.moment}, IN QUOTES", "after": "ONE short sentence on what the parent does next" },
  "tonight": ["step 1 — ONE short sentence (two at most), the Day 2 principle done AT ${ctx.moment}", "step 2 — another concrete step", "${ctx.notice}"]
}
The THIRD tonight step must be exactly this Notice check of the outcome: "${ctx.notice}"

HARD RULES (rejected otherwise):
- Match the GOLD voice: concrete, warm, short. EVERY sentence 14 words or fewer. Count them.
- Each tonight step is ONE short sentence, TWO at most. whyParas: two or three short sentences, none over 14 words.
- The explanation MUST follow from the 3 answers and the mechanism. Say "you told us…", never "${ctx.name} told".
- The switch AND tonight MUST take place at ${ctx.moment}, using our Week 1 principle there — NOT re-skinned homework advice.
- switch.instead and switch.try are WORDS A PARENT SAYS, each wrapped in double quotes.
- NO abstract nouns: method, ownership, process, transition, thread, approach, autonomy, structure, engagement, belongs.
- BANNED words: system, re-entry, brain, neuro, exile, dopamine, regulate, off-ramp, upstairs, diagnose, ADHD, disorder, may, might, could.
- NEVER BARGAIN with the child. The stop time is fixed and stated plainly. Offer a choice about what comes NEXT, never about whether it happens. BANNED bargaining words: worth it, stake, stakes, reward, treat, treats, deal, earn, earned.
- No comparisons to other children (rare, most kids, etc). No invented numbers, stats, testimonials. Never blame the parent.
- Length: shortWhy/shortFix ≤ 90 chars; switch.instead/try ≤ 72 chars.
Before you answer, re-read every line: each sentence ≤14 words, each tonight step ≤2 sentences, switch.instead/try in quotes.${retry}`;
}

// ---- field get/set for the targeted repair call ----
function getField(g: ReportV2Generated, path: string): string {
  if (path === "shortGood") return g.shortGood;
  if (path === "shortWhy") return g.shortWhy;
  if (path === "shortFix") return g.shortFix;
  if (path === "switch.instead") return g.switch.instead;
  if (path === "switch.try") return g.switch.try;
  if (path === "switch.after") return g.switch.after;
  const wp = path.match(/^whyParas\[(\d)\]$/); if (wp) return g.whyParas[+wp[1]];
  const tn = path.match(/^tonight\[(\d)\]$/); if (tn) return g.tonight[+tn[1]];
  return "";
}
function setField(g: ReportV2Generated, path: string, val: string) {
  if (path === "shortGood") { g.shortGood = val; return; }
  if (path === "shortWhy") { g.shortWhy = val; return; }
  if (path === "shortFix") { g.shortFix = val; return; }
  if (path === "switch.instead") { g.switch.instead = val; return; }
  if (path === "switch.try") { g.switch.try = val; return; }
  if (path === "switch.after") { g.switch.after = val; return; }
  const wp = path.match(/^whyParas\[(\d)\]$/); if (wp) { g.whyParas[+wp[1]] = val; return; }
  const tn = path.match(/^tonight\[(\d)\]$/); if (tn) { g.tonight[+tn[1]] = val; return; }
}

function parseJson(text: string): ReportV2Generated {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{"); const end = raw.lastIndexOf("}");
  const obj = JSON.parse(raw.slice(start, end + 1));
  return {
    shortGood: String(obj.shortGood ?? ""),
    shortWhy: String(obj.shortWhy ?? ""),
    shortFix: String(obj.shortFix ?? ""),
    whyParas: [String(obj.whyParas?.[0] ?? ""), String(obj.whyParas?.[1] ?? "")],
    switch: {
      instead: String(obj.switch?.instead ?? ""),
      try: String(obj.switch?.try ?? ""),
      after: String(obj.switch?.after ?? ""),
    },
    tonight: [String(obj.tonight?.[0] ?? ""), String(obj.tonight?.[1] ?? ""), String(obj.tonight?.[2] ?? "")],
  };
}

async function callLLM(prompt: string): Promise<ReportV2Generated> {
  const res = await getClient().messages.create({
    model: MODEL, max_tokens: 1024, system: WRITING_ENGINE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  return parseJson(text);
}

// Cheap targeted repair: shorten ONLY the failing fields to satisfy the exact rule each one
// broke, keeping meaning + voice. Merges the returned fields back into g. Used when the only
// problems are length/readability.
async function repairFields(g: ReportV2Generated, errors: string[], ctx: Context): Promise<ReportV2Generated> {
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
  const out: ReportV2Generated = { ...g, switch: { ...g.switch }, whyParas: [...g.whyParas] as [string, string], tonight: [...g.tonight] as [string, string, string] };
  for (const f of fields) if (typeof obj[f] === "string" && obj[f].trim()) setField(out, f, String(obj[f]));
  return out;
}

export type GenerateResult = {
  content: ReportV2Content;
  attempts: number;       // full LLM generations (1 + full retries)
  repairs: number;        // targeted repair calls used
  judges: JudgeVerdict[];
  rejections: string[];   // every validator error + judge-FAIL reason, across attempts
};

export function fallbackContentFor(a: AssessmentInput): ReportV2Content {
  const ctx = buildContext(a);
  return assemble(ctx, composeFallback(ctx.archetype, ctx.concern, a.childName ?? "", ctx.gender), "fallback");
}

export async function generateReportV2(a: AssessmentInput): Promise<GenerateResult> {
  const ctx = buildContext(a);
  const vopts = { childName: ctx.name };

  let g: ReportV2Generated | null = null;
  let source: "llm" | "fallback" = "fallback";
  let attempts = 0, repairs = 0, retries = 0;
  const judges: JudgeVerdict[] = [];
  const rejections: string[] = [];

  try {
    let current = await callLLM(buildPrompt(ctx)); attempts = 1;
    current.tonight[2] = ctx.notice; // tonight's 3rd step is always the deterministic Notice check
    // Budget: 2 repairs + 1 full retry.
    for (;;) {
      const v = validateGenerated(current, vopts);
      if (!v.ok) {
        rejections.push(...v.errors);
        if (isRepairable(v.errors) && repairs < 2) {
          repairs++;
          console.log(`[report-v2] repair (length-only): ${fieldsFromErrors(v.errors).join(", ")}`);
          current = await repairFields(current, v.errors, ctx);
          current.tonight[2] = ctx.notice;
          continue;
        }
        if (retries < 1) {
          retries++; attempts++;
          console.log(`[report-v2] full retry: ${v.errors.join("; ")}`);
          current = await callLLM(buildPrompt(ctx, v.errors));
          current.tonight[2] = ctx.notice;
          continue;
        }
        break; // → fallback
      }
      const j = await judgeCoherence({
        childName: ctx.name, worryLabel: ctx.worryLabel, moment: ctx.moment,
        archetype: ctx.archetype, program: ctx.program, evidenceQuotes: ctx.evidenceQuotes, generated: current,
      });
      judges.push(j);
      console.log(`[report-v2] judge ${j.verdict}: ${j.reason}`);
      if (j.verdict === "PASS") { g = current; source = "llm"; break; }
      rejections.push(`judge: ${j.reason}`);
      if (retries < 1) {
        retries++; attempts++;
        current = await callLLM(buildPrompt(ctx, [`Coherence/usability judge FAILED: ${j.reason}`]));
        current.tonight[2] = ctx.notice;
        continue;
      }
      break; // → fallback
    }
  } catch (e) {
    rejections.push(`error: ${(e as Error).message}`);
    console.log(`[report-v2] error:`, (e as Error).message);
  }

  if (!g) {
    g = composeFallback(ctx.archetype, ctx.concern, a.childName ?? "", ctx.gender);
    source = "fallback";
    console.log(`[report-v2] using static fallback (${ctx.archetype} × ${ctx.concern})`);
  }

  return { content: assemble(ctx, g, source), attempts, repairs, judges, rejections };
}
