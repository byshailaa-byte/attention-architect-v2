// Runtime for the conversational Coach: an Anthropic tool-use loop with token streaming and a
// graceful fallback. The model's text streams to the parent as it's generated (onDelta); tool calls
// are executed server-side and never delay the visible text (the model is told to speak first, and
// tool side-effects are fast DB writes). If the model errors or times out, we return a short, kind
// fallback in the parent's language instead of a 500.
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/lib/coach/client";
import { COACH_REPLY_MODEL, costPaise } from "@/lib/lms/coach/llm";
import { runCoachTool, type ToolSubject, type ToolCallRecord } from "@/lib/coach/tools";
import type { CoachTurn } from "@/lib/lms/coach/llm";
import type { Language } from "@/lib/coach/method";

const MAX_ROUNDS = 3;
const DEFAULT_MAX_TOKENS = 520;
const TURN_TIMEOUT_MS = 45_000;

export type RunResult = {
  text: string;
  toolCalls: ToolCallRecord[];
  inputTokens: number;
  outputTokens: number;
  model: string;
  costPaise: number;
  latencyMs: number;
  errored: boolean;
};

export function fallbackReply(language: Language): string {
  if (language === "hi") return "Maaf kijiye, abhi mujhe jawab dene mein thodi dikkat ho rahi hai. Kripya ek minute baad phir se bhejiye.";
  if (language === "hinglish") return "Sorry, abhi reply karne mein thodi dikkat ho rahi hai. Ek minute baad phir try kijiye.";
  return "Sorry — I had trouble answering just now. Please try again in a minute.";
}

type MsgParam = Anthropic.MessageParam;

export async function runCoachTurn(opts: {
  system: string;
  history: CoachTurn[];
  userMessage: string;
  tools: Anthropic.Tool[];
  toolSubject: ToolSubject;
  language: Language;
  model?: string;
  maxTokens?: number;
  onDelta?: (text: string) => void;
}): Promise<RunResult> {
  const t0 = Date.now();
  const model = opts.model ?? COACH_REPLY_MODEL;
  const maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS;
  const messages: MsgParam[] = [
    ...opts.history.map((h) => ({ role: h.role, content: h.content } as MsgParam)),
    { role: "user", content: opts.userMessage },
  ];

  let fullText = "";
  const toolCalls: ToolCallRecord[] = [];
  let inputTokens = 0, outputTokens = 0;
  let streamed = false;

  try {
    await withTimeout(TURN_TIMEOUT_MS, (async () => {
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const stream = anthropic().messages.stream({
          model, max_tokens: maxTokens, system: opts.system, messages,
          ...(opts.tools.length ? { tools: opts.tools } : {}),
        });
        stream.on("text", (t) => { if (opts.onDelta) { opts.onDelta(t); streamed = true; } });
        const msg = await stream.finalMessage();
        inputTokens += msg.usage?.input_tokens ?? 0;
        outputTokens += msg.usage?.output_tokens ?? 0;

        const textBlocks = msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text");
        const toolUses = msg.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
        const roundText = textBlocks.map((b) => b.text).join("").trim();
        if (roundText) fullText = fullText ? `${fullText} ${roundText}` : roundText;

        if (msg.stop_reason !== "tool_use" || toolUses.length === 0) break;

        // Execute tools, feed results back so the model can finish its turn.
        messages.push({ role: "assistant", content: msg.content });
        const results: Anthropic.ToolResultBlockParam[] = [];
        for (const tu of toolUses) {
          const rec = await runCoachTool(opts.toolSubject, tu.name, (tu.input ?? {}) as Record<string, unknown>);
          toolCalls.push(rec);
          results.push({ type: "tool_result", tool_use_id: tu.id, content: rec.detail, ...(rec.ok ? {} : { is_error: true }) });
        }
        messages.push({ role: "user", content: results });
      }
    })());
  } catch (e) {
    console.error("[coach/engine] turn failed:", (e as Error).message);
    if (!fullText) {
      fullText = fallbackReply(opts.language);
      if (opts.onDelta && !streamed) opts.onDelta(fullText);
    }
    return { text: fullText, toolCalls, inputTokens, outputTokens, model, costPaise: costPaise(model, inputTokens, outputTokens), latencyMs: Date.now() - t0, errored: true };
  }

  if (!fullText) fullText = fallbackReply(opts.language);
  return { text: fullText.trim(), toolCalls, inputTokens, outputTokens, model, costPaise: costPaise(model, inputTokens, outputTokens), latencyMs: Date.now() - t0, errored: false };
}

function withTimeout<T>(ms: number, p: Promise<T>): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
}
