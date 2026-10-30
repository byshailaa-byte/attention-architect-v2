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
  pronoun: string;        // "he/him/his" | "she/her/her" | "they/them/their" — so pronouns agree
  patternPlain: string;   // the child's pattern in plain, NAME-FREE words (strength + pull), never "Storm"
  worryLabel: string;     // plain worry ("starting homework")
  week: number;
  day: number;
  baseTitle: string;      // token-filled
  baseText: string;       // token-filled base day prose
  priorOutcome: PlanOutcome;
  priorNote: string | null;
  directive: string;      // from planTomorrow()
  limitTopic?: boolean;   // the step SETS a limit (screens/time/money) → negotiate, don't rubber-stamp
};

export type GenResult = {
  step: AdjustedStep;
  source: AdjustSource;   // 'llm' when the model's step passed; 'fallback' when it didn't
  validatorOk: boolean;
  retryUsed: boolean;
  firstIssues: string[];  // why the first attempt was rejected (empty if it passed first time)
  model: string;
  inputTokens: number;
  outputTokens: number;
  costPaise: number;
};

export type ModelCall = (system: string, user: string) => Promise<{ step: AdjustedStep | null; inputTokens: number; outputTokens: number; model: string }>;

const EMIT_TOOL: Anthropic.Tool = {
  name: "emit_step",
  description: "Emit the opening line AND the single adjusted step for this day.",
  input_schema: {
    type: "object",
    properties: {
      opening: { type: "string", description: "one short sentence to the PARENT above the step: agree with how yesterday went and name what today does. NEVER mention the Coach here." },
      title: { type: "string", description: "short action title, same skill as the base day" },
      moment: { type: "string", description: "the everyday moment it slots into, e.g. 'when homework starts'" },
      exact_words: { type: "array", items: { type: "string" }, description: "1–2 lines the parent says TO the child, verbatim, second person — no names, no he/she, no observations, no brackets, no Coach" },
      notice: { type: "string", description: "what to watch for afterwards (this is an observation, so he/she is fine here)" },
      minutes: { type: "number", description: "1 to 5" },
      banner: { type: "string", description: "leave EMPTY unless told to add a Coach nudge (two didn't-work days in a row). The ONLY place the Coach may be mentioned." },
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
    banner: typeof inp.banner === "string" && inp.banner.trim() ? inp.banner.trim() : undefined,
  } : null;
  return { step, inputTokens: res.usage?.input_tokens ?? 0, outputTokens: res.usage?.output_tokens ?? 0, model: res.model };
};

function buildSystem(i: GenInput): string {
  return [
    "You adjust ONE day of a 5-minute-a-day attention plan for a parent to do with their child.",
    "You are given the base step for today and how yesterday went. Emit, via the emit_step tool, an opening + the adjusted step.",
    "Keep the SAME skill and SAME week as the base step; 5 minutes or less.",
    "LENGTHS — stay within these (they are hard limits, keep headroom):",
    "- opening ≤ 40 words · title ≤ 10 words · moment ≤ 15 words · notice ≤ 25 words · each spoken line ≤ 25 words.",
    "",
    "EXACT WORDS = the words the parent literally SAYS TO the child. They must be:",
    "- second person ('you…'), spoken straight to the child",
    "- NO child's name, NO he/she/they about the child",
    "- NO Coach, NO 'yourself', NO 'you might'",
    "- NO brackets, parentheses, or stage directions",
    "Observations and what-to-watch go in `notice` (the child's pronoun is fine there). The opening speaks to the parent.",
    `The PARENT is always addressed as "you" — never give the parent a pronoun (no "she"/"he" for the parent).`,
    "",
    "GOOD exact words:",
    '  "You pick which one to start with."',
    '  "Two minutes, then we switch off — I\'ll say it once."',
    "BAD exact words (never do these):",
    '  "Watch whether he settles." (that is an observation → put it in notice)',
    '  "Sit with him, then step away. (meaning stay close)" (third person + stage direction)',
    "",
    i.limitTopic ? "This step SETS a limit (screens/time/money): negotiate honestly — do NOT rubber-stamp whatever the child names ('ok, let's go with that' / 'whatever you want'). Land on something together." : "",
    i.priorOutcome === "didnt_land" ? "Yesterday did not land → make today MEASURABLY smaller: at most TWO short spoken lines and ≤3 minutes." : "",
    "The opening NEVER mentions the Coach. If told to add a Coach nudge, put it ONLY in `banner`.",
    "NUMBERS: write any number in words ('two minutes', not '2'; 'thirty seconds', not '30'), and never introduce a count or duration that isn't already in the base step. The `minutes` field is the only numeral.",
    "Never: clinical/diagnostic/severity words; promises or guarantees; price or selling; the child's 'type'/pattern name. Never blame the parent.",
  ].filter(Boolean).join("\n");
}

function buildUser(i: GenInput): string {
  return [
    `Child: ${i.childName}, age ${i.ageBand}. Use these pronouns for ${i.childName}: ${i.pronoun}.`,
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
  const firstIssues = v.ok ? [] : [...v.issues];

  if (!v.ok) {
    retryUsed = true;
    const retryUser = buildUser(i) + `\n\nYour previous attempt was rejected for: ${v.issues.join("; ")}. Fix ONLY these and emit the step again.`;
    const r2 = await modelCall(system, retryUser).catch(() => ({ step: null as AdjustedStep | null, inputTokens: 0, outputTokens: 0, model: MODEL }));
    inputTokens += r2.inputTokens; outputTokens += r2.outputTokens; model = r2.model || model;
    const v2 = r2.step ? validateStep(r2.step, i.baseText, vctx) : { ok: false, issues: ["model emitted no step"] };
    if (v2.ok && r2.step) { r = r2; v = v2; }
    else {
      const step = fallbackStep(i.baseTitle, i.baseText, i.priorOutcome, i.childName);
      const paise = costPaise(model, inputTokens, outputTokens);
      log(i, "fallback", false, true, inputTokens, outputTokens, paise);
      return { step, source: "fallback", validatorOk: false, retryUsed, firstIssues, model, inputTokens, outputTokens, costPaise: paise };
    }
  }

  const paise = costPaise(model, inputTokens, outputTokens);
  log(i, "llm", true, retryUsed, inputTokens, outputTokens, paise);
  return { step: r.step!, source: "llm", validatorOk: true, retryUsed, firstIssues, model, inputTokens, outputTokens, costPaise: paise };
}

function log(i: GenInput, source: string, ok: boolean, retry: boolean, inTok: number, outTok: number, paise: number): void {
  console.log(`[spend] feature=plan_adjust week=${i.week} day=${i.day} outcome=${i.priorOutcome} source=${source} ok=${ok} retry=${retry} in=${inTok} out=${outTok} paise=${paise}`);
}
