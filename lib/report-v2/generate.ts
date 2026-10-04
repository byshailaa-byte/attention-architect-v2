// Report v2 content generator. Deterministic parts (goal, evidence, headline, archetype
// card) are assembled from stored data; the free-text parts are GENERATED, anchored in the
// paid programme (content/lms Week 1), then checked two ways before they ship:
//   1. mechanical validator (plain words, bans, length caps, quoted switch lines)
//   2. an LLM coherence judge (does it follow from the 3 answers + mechanism; is the
//      switch the Week 1 move?)
// A validator OR judge failure feeds its reason into one retry; a second failure falls back
// to static archetype × worry copy built from the same Week 1 moves. Only runs for ?report=v2.
import Anthropic from "@anthropic-ai/sdk";
import { WRITING_ENGINE_SYSTEM_PROMPT } from "@/lib/narrative/system-prompt";
import { QUESTIONS_BY_ID, ALL_QUESTIONS } from "@/lib/engine/questions";
import { displayChildName, type Gender } from "@/lib/report/pronouns";
import {
  canonicalConcern, goalForConcern, headlineForConcern, worryLabelFor, GOLD_LINE,
} from "./goal-mapping";
import {
  selectEvidence, rankDimensions, type AnsweredQuestion, type DimScore,
} from "./evidence";
import { validateGenerated } from "./validator";
import { programFor, type ProgramAnchor } from "./program";
import { judgeCoherence, type JudgeVerdict } from "./judge";
import { composeFallback, archetypeDesc } from "@/content/report-v2/fallbacks";
import type { ReportV2Content, ReportV2Generated } from "./types";

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
  // v2 goal override ONLY (the parent changing the goal inside v2). Legacy report goal
  // fields (goal_skill/goal_key/goal_text) are deliberately ignored in v2.
  v2Goal?: string | null;
};

// Ordered list of answered questions (verbatim option labels + dimension), canonical order.
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
    dimension,
    winning_votes: d?.winning_votes ?? 0,
  }));
}

function buildPrompt(ctx: {
  name: string; worryLabel: string; goal: string; archetype: string; program: ProgramAnchor | null;
  evidenceQuotes: string[]; priorFeedback?: string[];
}): string {
  const p = ctx.program;
  const retry = ctx.priorFeedback?.length
    ? `\n\nYour previous attempt was REJECTED. Fix every point, keep everything else:\n- ${ctx.priorFeedback.join("\n- ")}\n`
    : "";
  return `You are writing a short attention report for a parent of a child called ${ctx.name}.
It must read as a true preview of our paid programme — use OUR method below, not generic advice.

WHAT THE PARENT WORRIES ABOUT MOST: ${ctx.worryLabel}
THE CHILD'S PATTERN (${ctx.archetype}):
- mechanism: ${p?.mechanismLine ?? ""}
- how it shows up: ${p?.patternLine ?? ""}
${(p?.meaning ?? []).map((m) => `  • ${m}`).join("\n")}
THE PARENT'S OWN 3 ANSWERS (use their ideas, do not invent others):
${ctx.evidenceQuotes.map((q, i) => `${i + 1}. "${q}"`).join("\n")}
OUR WEEK 1 CORE MOVE (the "switch" MUST be this move, written for the ${ctx.worryLabel} worry):
${p?.coreMove || "(use the mechanism above)"}
OUR WEEK 1 DAY 2 MOVE (the "tonight" steps MUST be this move, adapted to the ${ctx.worryLabel} worry):
${p?.day2Move || "(use the mechanism above)"}
THE GOAL WE ARE WORKING TOWARD: "${ctx.goal}"

Write JSON ONLY, exactly these keys:
{
  "shortGood": "one line — a real strength of ${ctx.name}, as capability",
  "shortWhy": "one line — why the ${ctx.worryLabel} happens, THROUGH the mechanism above",
  "shortFix": "one line — the single change that helps",
  "whyParas": ["two short sentences explaining the worry through the mechanism, referencing at least one of the 3 answers", "two short sentences"],
  "switch": { "instead": "the exact words a parent says now, IN QUOTES", "try": "the exact words a parent says instead — this is the Week 1 move — IN QUOTES", "after": "one sentence on what the parent does next" },
  "tonight": ["step 1 (the Day 2 move, adapted)", "step 2", "step 3"]
}

HARD RULES (rejected otherwise):
- The explanation MUST follow from the 3 answers and the mechanism. Reference at least one answer's idea. No generic advice.
- "switch" MUST be our Week 1 core move for this worry. "tonight" MUST be our Day 2 move, adapted.
- switch.instead and switch.try are WORDS A PARENT SAYS, each wrapped in double quotes, to ${ctx.name} or "you".
- Plain, warm words only. Reading age ~11. Every sentence 20 words or fewer.
- BANNED words: system, re-entry, brain, neuro, exile, dopamine, regulate, diagnose, ADHD, disorder, may, might, could.
- No comparisons to other children: no "rare", "most kids", "most children", "few children", "unlike other children".
- Never blame the parent. No invented numbers, stats, or testimonials.
- Length: shortGood/shortWhy/shortFix ≤ 90 chars; switch.instead/try ≤ 72 chars.${retry}`;
}

function parseJson(text: string): ReportV2Generated {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
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
    tonight: [
      String(obj.tonight?.[0] ?? ""),
      String(obj.tonight?.[1] ?? ""),
      String(obj.tonight?.[2] ?? ""),
    ],
  };
}

async function callLLM(prompt: string): Promise<ReportV2Generated> {
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: WRITING_ENGINE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  return parseJson(text);
}

export type GenerateResult = {
  content: ReportV2Content;
  attempts: number;
  judges: JudgeVerdict[];      // one per LLM attempt that reached the judge
};

export async function generateReportV2(a: AssessmentInput): Promise<GenerateResult> {
  const gender = (a.childGender ?? null) as Gender;
  const name = a.childName?.trim() ? displayChildName(a.childName) : "your child";
  const concern = canonicalConcern(a.concerns?.[0]);
  const worryLabel = worryLabelFor(concern);
  const archetype = a.archetype ?? "The All-In Kid";
  const archDesc = archetypeDesc(archetype, a.childName ?? "", gender);
  const headline = headlineForConcern(concern, a.childName ?? "", gender);
  // v2 goal: parent's v2 override if set, else the worry mapping. Legacy goal fields ignored.
  const goal = a.v2Goal?.trim() ? a.v2Goal.trim() : goalForConcern(concern, a.childName ?? "", gender);
  const program = programFor(archetype, a.ageBand, a.childName ?? "", gender);

  const answered = answeredFromAssessment(a);
  const evidence = selectEvidence(answered, rankDimensions(dimScores(a)), a.childName ?? "", gender);
  const evidenceQuotes = evidence.map((e) => e.quote);
  const evidenceTie = `Put together, these three answers are what pointed us to ${name}’s pattern.`;
  const disclaimer =
    "Attention Architect is an educational tool for parents. It is not a medical or clinical assessment, and not a substitute for professional advice.";

  let generated: ReportV2Generated | null = null;
  let source: "llm" | "fallback" = "fallback";
  let attempts = 0;
  const judges: JudgeVerdict[] = [];
  let priorFeedback: string[] | undefined;

  for (let i = 0; i < 2; i++) {
    attempts++;
    try {
      const g = await callLLM(buildPrompt({ name, worryLabel, goal, archetype, program, evidenceQuotes, priorFeedback }));
      const v = validateGenerated(g);
      if (!v.ok) {
        console.log(`[report-v2] attempt ${attempts} validator FAIL:`, v.errors.join("; "));
        priorFeedback = v.errors;
        continue;
      }
      const j = await judgeCoherence({ childName: name, worryLabel, archetype, program, evidenceQuotes, generated: g });
      judges.push(j);
      console.log(`[report-v2] attempt ${attempts} judge ${j.verdict}: ${j.reason}`);
      if (j.verdict === "PASS") { generated = g; source = "llm"; break; }
      priorFeedback = [`Coherence judge FAILED: ${j.reason}`];
    } catch (e) {
      console.log(`[report-v2] attempt ${attempts} error:`, (e as Error).message);
      // Hard error (no key / API down) — no point retrying; fall back now.
      break;
    }
  }

  if (!generated) {
    generated = composeFallback(archetype, concern, a.childName ?? "", gender);
    source = "fallback";
    console.log(`[report-v2] using static fallback (${archetype} × ${concern})`);
  }

  const content: ReportV2Content = {
    ...generated,
    source,
    childName: name,
    concern,
    worryLabel,
    headline,
    goldLine: GOLD_LINE,
    goal,
    evidence,
    evidenceTie,
    archetype,
    archetypeDesc: archDesc,
    disclaimer,
  };
  return { content, attempts, judges };
}
