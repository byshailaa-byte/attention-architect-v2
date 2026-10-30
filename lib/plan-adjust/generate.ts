// A2 — generate the adjusted step at unlock. Reads the base day + how yesterday went + the parent's
// note + the child's (name-free) pattern + age band + worry, and emits the structured step via a
// forced tool call. Validate → ONE retry with the issues → deterministic fallback. Caching + cost
// logging live in resolve.ts; this module is the pure generator (model injectable for tests).
import Anthropic from "@anthropic-ai/sdk";
import { coachApiKey } from "@/lib/ai/anthropic-keys";
import { costPaise } from "@/lib/lms/coach/llm";
import type { AdjustedStep, AdjustSource, PlanOutcome } from "./types";
import { validateStep } from "./validate";
import { fallbackStep } from "./fallback";

const MODEL = "claude-sonnet-4-6";

export type GenInput = {
  childName: string;
  ageBand: string;
  patternPlain: string;   // the child's pattern in plain, NAME-FREE words (strength + pull), never "Storm"
  worryLabel: string;     // plain worry ("starting homework")
  week: number;
  day: number;
  baseTitle: string;      // token-filled
  baseText: string;       // token-filled base day prose
  priorOutcome: PlanOutcome;
  priorNote: string | null;
  directive: string;      // from planTomorrow()
};

export type GenResult = {
  step: AdjustedStep;
  source: AdjustSource;   // 'llm' when the model's step passed; 'fallback' when it didn't
  validatorOk: boolean;
  retryUsed: boolean;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costPaise: number;
};

// Injectable model call — returns a parsed step (or null if the model didn't emit one) + usage.
export type ModelCall = (system: string, user: string) => Promise<{ step: AdjustedStep | null; inputTokens: number; outputTokens: number; model: string }>;

const EMIT_TOOL: Anthropic.Tool = {
  name: "emit_step",
  description: "Emit the single adjusted step for this day.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "short action title, same skill as the base day" },
      moment: { type: "string", description: "the everyday moment it slots into, e.g. 'when homework starts'" },
      exact_words: { type: "array", items: { type: "string" }, description: "1–2 lines the parent says, verbatim" },
      notice: { type: "string", description: "what to watch for afterwards" },
      minutes: { type: "number", description: "1 to 5" },
    },
    required: ["title", "moment", "exact_words", "notice", "minutes"],
  },
};

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: coachApiKey() });
  return _client;
}

// Real model call: force the emit_step tool so we always get structured output.
const defaultModelCall: ModelCall = async (system, user) => {
  const res = await client().messages.create({
    model: MODEL, max_tokens: 700, system,
    tool_choice: { type: "tool", name: "emit_step" },
    tools: [EMIT_TOOL],
    messages: [{ role: "user", content: user }],
  });
  const use = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "emit_step");
  const inp = (use?.input ?? {}) as Record<string, unknown>;
  const step = use
    ? {
        title: String(inp.title ?? "").trim(),
        moment: String(inp.moment ?? "").trim(),
        exactWords: Array.isArray(inp.exact_words) ? inp.exact_words.map((w) => String(w).trim()).filter(Boolean) : [],
        notice: String(inp.notice ?? "").trim(),
        minutes: Number(inp.minutes ?? 5),
      }
    : null;
  return { step, inputTokens: res.usage?.input_tokens ?? 0, outputTokens: res.usage?.output_tokens ?? 0, model: res.model };
};

function buildSystem(): string {
  return [
    "You adjust ONE day of a 5-minute-a-day attention plan for a parent to do with their child.",
    "You are given the base step for this day and how yesterday actually went. Produce the adjusted step for today.",
    "Keep the SAME skill and the SAME week as the base step. Keep it to 5 minutes or less.",
    "Give the parent the EXACT words to say, as short verbatim lines (what they literally say to the child).",
    "Rules you must never break:",
    "- No clinical, diagnostic or severity words (no adhd/autism/disorder/mild/moderate/severe/etc.).",
    "- No promises or guarantees, no price or selling language.",
    "- Never invent a number that isn't in the base step.",
    "- Never name the child's 'type' or pattern; describe behaviour in plain words only.",
    "- Never blame the parent. Warm, plain, specific.",
    "Emit the step with the emit_step tool only.",
  ].join("\n");
}

function buildUser(i: GenInput): string {
  return [
    `Child: ${i.childName}, age ${i.ageBand}.`,
    `How ${i.childName}'s attention tends to work (plain, for you — never repeat a label): ${i.patternPlain}`,
    `What the parent came worried about: ${i.worryLabel}.`,
    `This is Week ${i.week}, Day ${i.day}.`,
    `BASE STEP for today — "${i.baseTitle}": ${i.baseText}`,
    `Yesterday's outcome: ${i.priorOutcome}.`,
    i.priorNote ? `The parent's note about yesterday (their words): "${i.priorNote}".` : "",
    `HOW TO ADJUST: ${i.directive}`,
  ].filter(Boolean).join("\n");
}

// Generate + validate + one retry + fallback. Pure given a ModelCall (default hits Anthropic).
export async function generateAdjustedStep(i: GenInput, modelCall: ModelCall = defaultModelCall): Promise<GenResult> {
  const system = buildSystem();
  let inputTokens = 0, outputTokens = 0, model = MODEL, retryUsed = false;

  // Attempt 1
  let r = await modelCall(system, buildUser(i)).catch(() => ({ step: null as AdjustedStep | null, inputTokens: 0, outputTokens: 0, model: MODEL }));
  inputTokens += r.inputTokens; outputTokens += r.outputTokens; model = r.model || model;
  let v = r.step ? validateStep(r.step, i.baseText, { week: i.week }) : { ok: false, issues: ["model emitted no step"] };

  // One retry, feeding back the exact issues.
  if (!v.ok) {
    retryUsed = true;
    const retryUser = buildUser(i) + `\n\nYour previous attempt was rejected for: ${v.issues.join("; ")}. Fix ONLY these and emit the step again.`;
    const r2 = await modelCall(system, retryUser).catch(() => ({ step: null as AdjustedStep | null, inputTokens: 0, outputTokens: 0, model: MODEL }));
    inputTokens += r2.inputTokens; outputTokens += r2.outputTokens; model = r2.model || model;
    const v2 = r2.step ? validateStep(r2.step, i.baseText, { week: i.week }) : { ok: false, issues: ["model emitted no step"] };
    if (v2.ok && r2.step) { r = r2; v = v2; }
    else {
      // Fall back to a deterministic structured version of the base step. Never an empty day.
      const step = fallbackStep(i.baseTitle, i.baseText);
      const paise = costPaise(model, inputTokens, outputTokens);
      log(i, "fallback", false, true, inputTokens, outputTokens, paise);
      return { step, source: "fallback", validatorOk: false, retryUsed, model, inputTokens, outputTokens, costPaise: paise };
    }
  }

  const paise = costPaise(model, inputTokens, outputTokens);
  log(i, "llm", true, retryUsed, inputTokens, outputTokens, paise);
  return { step: r.step!, source: "llm", validatorOk: true, retryUsed, model, inputTokens, outputTokens, costPaise: paise };
}

function log(i: GenInput, source: string, ok: boolean, retry: boolean, inTok: number, outTok: number, paise: number): void {
  console.log(`[spend] feature=plan_adjust week=${i.week} day=${i.day} outcome=${i.priorOutcome} source=${source} ok=${ok} retry=${retry} in=${inTok} out=${outTok} paise=${paise}`);
}
