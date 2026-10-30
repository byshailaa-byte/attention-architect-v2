// A2 — generate the adjusted step at unlock. Reads the base day + how yesterday went + the parent's
// note + the child's (name-free) pattern + age band + worry, and emits the top opening paragraph AND
// the structured step in ONE call (so they always agree). Validate → ONE retry with the issues →
// deterministic fallback. Caching + cost logging live in resolve.ts (model injectable for tests).
import Anthropic from "@anthropic-ai/sdk";
import { coachApiKey } from "@/lib/ai/anthropic-keys";
import { costPaise } from "@/lib/lms/coach/llm";
import type { AdjustedStep, AdjustSource, PlanOutcome } from "./types";
import { validateStep, normalizeExactWords } from "./validate";
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
  limitTopic?: boolean;   // the step is about a limit (screens/time/money) → negotiate, don't rubber-stamp
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

export type ModelCall = (system: string, user: string) => Promise<{ step: AdjustedStep | null; inputTokens: number; outputTokens: number; model: string }>;

const EMIT_TOOL: Anthropic.Tool = {
  name: "emit_step",
  description: "Emit the top opening line AND the single adjusted step for this day.",
  input_schema: {
    type: "object",
    properties: {
      opening: { type: "string", description: "one short sentence to the parent above the step, agreeing with how yesterday went and what today does" },
      title: { type: "string", description: "short action title, same skill as the base day" },
      moment: { type: "string", description: "the everyday moment it slots into, e.g. 'when homework starts'" },
      exact_words: { type: "array", items: { type: "string" }, description: "1–2 lines the parent says TO the child, verbatim — second person, no observations" },
      notice: { type: "string", description: "what to watch for afterwards" },
      minutes: { type: "number", description: "1 to 5" },
    },
    required: ["opening", "title", "moment", "exact_words", "notice", "minutes"],
  },
};

let _client: Anthropic | null = null;
const client = () => (_client ??= new Anthropic({ apiKey: coachApiKey() }));

const defaultModelCall: ModelCall = async (system, user) => {
  const res = await client().messages.create({
    model: MODEL, max_tokens: 800, system,
    tool_choice: { type: "tool", name: "emit_step" }, tools: [EMIT_TOOL],
    messages: [{ role: "user", content: user }],
  });
  const use = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "emit_step");
  const inp = (use?.input ?? {}) as Record<string, unknown>;
  const step = use ? {
    opening: String(inp.opening ?? "").trim(),
    title: String(inp.title ?? "").trim(),
    moment: String(inp.moment ?? "").trim(),
    exactWords: normalizeExactWords(Array.isArray(inp.exact_words) ? inp.exact_words.map(String) : []),
    notice: String(inp.notice ?? "").trim(),
    minutes: Number(inp.minutes ?? 5),
  } : null;
  return { step, inputTokens: res.usage?.input_tokens ?? 0, outputTokens: res.usage?.output_tokens ?? 0, model: res.model };
};

function buildSystem(i: GenInput): string {
  return [
    "You adjust ONE day of a 5-minute-a-day attention plan for a parent to do with their child.",
    "You are given the base step for this day and how yesterday actually went. Produce: (1) a one-sentence",
    "opening to the parent that agrees with yesterday's outcome and names what today does, and (2) the adjusted step.",
    "Keep the SAME skill and the SAME week as the base step. Keep it to 5 minutes or less.",
    "EXACT WORDS are what the parent literally SAYS TO the child — second person ('you…'). They must NOT:",
    "- mention the Coach, 'yourself', 'you might', or any observation ('watch whether…', 'notice if…')",
    "- contain parentheses or stage directions",
    "- refer to the child in the third person or by name (say it TO them).",
    "Put nudges and what-to-watch in the opening or the notice, never in the exact words.",
    i.limitTopic ? "This step touches a limit (screens/time/money): negotiate honestly — do NOT rubber-stamp whatever number the child names ('ok, let's go with that')." : "",
    i.priorOutcome === "didnt_land" ? "Yesterday did not land, so make today MEASURABLY smaller: at most two short spoken lines and ≤3 minutes." : "",
    "Never: clinical/diagnostic/severity words; promises or guarantees; price or selling; a number not in the base step; the child's 'type'/pattern name. Never blame the parent.",
    "Emit with the emit_step tool only.",
  ].filter(Boolean).join("\n");
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

export async function generateAdjustedStep(i: GenInput, modelCall: ModelCall = defaultModelCall): Promise<GenResult> {
  const system = buildSystem(i);
  const vctx = { week: i.week, childName: i.childName, priorOutcome: i.priorOutcome, limitTopic: i.limitTopic };
  let inputTokens = 0, outputTokens = 0, model = MODEL, retryUsed = false;

  let r = await modelCall(system, buildUser(i)).catch(() => ({ step: null as AdjustedStep | null, inputTokens: 0, outputTokens: 0, model: MODEL }));
  inputTokens += r.inputTokens; outputTokens += r.outputTokens; model = r.model || model;
  let v = r.step ? validateStep(r.step, i.baseText, vctx) : { ok: false, issues: ["model emitted no step"] };

  if (!v.ok) {
    retryUsed = true;
    const retryUser = buildUser(i) + `\n\nYour previous attempt was rejected for: ${v.issues.join("; ")}. Fix ONLY these and emit the step again.`;
    const r2 = await modelCall(system, retryUser).catch(() => ({ step: null as AdjustedStep | null, inputTokens: 0, outputTokens: 0, model: MODEL }));
    inputTokens += r2.inputTokens; outputTokens += r2.outputTokens; model = r2.model || model;
    const v2 = r2.step ? validateStep(r2.step, i.baseText, vctx) : { ok: false, issues: ["model emitted no step"] };
    if (v2.ok && r2.step) { r = r2; v = v2; }
    else {
      const step = fallbackStep(i.baseTitle, i.baseText, i.priorOutcome);
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
