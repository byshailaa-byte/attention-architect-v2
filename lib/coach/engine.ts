// Runtime for the conversational Coach: an Anthropic tool-use loop with token streaming, a graceful
// fallback, and a no-repeat backstop. The model's text streams to the parent as it's generated
// (onDelta); tool calls run server-side and never delay the visible text.
//
// NO-REPEAT BACKSTOP (method-level fix is primary; this is the safety net): on a short non-answer
// turn ("ok"/"theek hai"/"tell me what to do") — exactly where the Coach tends to repeat itself — we
// BUFFER the reply instead of streaming live, compare it to the Coach's previous reply, regenerate
// once with a nudge if it's too similar, and fall back to a short line if it's still similar. All six
// tools are idempotent/upsert/dedup, so a regenerated attempt re-running them is harmless.
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, coachReplyModel } from "@/lib/coach/client";
import { costPaise } from "@/lib/lms/coach/llm";
import { runCoachTool, type ToolSubject, type ToolCallRecord } from "@/lib/coach/tools";
import { hindiReplyIssues } from "@/lib/coach/hindi-check";
import type { CoachTurn } from "@/lib/lms/coach/llm";
import type { Language } from "@/lib/coach/method";
import type { Gender } from "@/lib/report/pronouns";

const MAX_ROUNDS = 3;
const DEFAULT_MAX_TOKENS = 520;
const TURN_TIMEOUT_MS = 45_000;
const SIMILAR_JACCARD = 0.6;

export type RunResult = {
  text: string;
  toolCalls: ToolCallRecord[];
  inputTokens: number;
  outputTokens: number;
  model: string;
  costPaise: number;
  latencyMs: number;
  errored: boolean;
  repeatGuard?: "ok" | "regenerated" | "fallback"; // what the no-repeat backstop did (when it ran)
  hindiIssues?: string[]; // deterministic Hindi-language violations found on the FINAL reply (for logging)
};

export function fallbackReply(language: Language): string {
  if (language === "hi") return "Maaf kijiye, abhi mujhe jawab dene mein thodi dikkat ho rahi hai. Kripya ek minute baad phir se bhejiye.";
  if (language === "hinglish") return "Sorry, abhi reply karne mein thodi dikkat ho rahi hai. Ek minute baad phir try kijiye.";
  return "Sorry — I had trouble answering just now. Please try again in a minute.";
}
// Last-resort line when a non-answer turn keeps producing a near-repeat.
function fallbackStepReply(language: Language): string {
  if (language === "hi") return "Theek hai — chaliye simple rakhte hain. Aaj bas woh ek line bol kar dekhiye jo humne tay ki thi, aur kal bataiye kya hua.";
  if (language === "hinglish") return "Theek hai — simple rakhte hain. Aaj bas woh ek line try kijiye jo humne decide ki thi, aur kal bataiye kya hua.";
  return "Okay — let's keep it simple. Tonight, just try the one line we agreed on, and tell me tomorrow what she did.";
}
const NUDGE =
  "(Your reply was too similar to your previous message. Do NOT repeat or rephrase it. Either give the single next concrete action in one line with the exact words to say, or ask ONE genuinely new, different question.)";

function norm(s: string): string[] {
  return (s || "").toLowerCase().replace(/[^a-z0-9ऀ-ॿ\s]/g, " ").split(/\s+/).filter(Boolean);
}
// True when two replies are near-duplicates (word-set Jaccard, or same opening) — the repeat signal.
export function tooSimilar(a: string, b: string): boolean {
  const wa = norm(a), wb = norm(b);
  if (wa.length < 6 || wb.length < 6) return false;
  const sa = new Set(wa), sb = new Set(wb);
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter++;
  const jaccard = inter / (sa.size + sb.size - inter);
  if (jaccard >= SIMILAR_JACCARD) return true;
  return wa.slice(0, 8).join(" ") === wb.slice(0, 8).join(" ");
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
  previousReply?: string;   // the Coach's last reply (for the no-repeat backstop)
  guardRepeat?: boolean;    // true on short non-answer turns → buffer + backstop
  hindiGuard?: { childGender: Gender; parentUsedTu: boolean; parentUsedEmoji: boolean; childName?: string }; // Hindi-language backstop
}): Promise<RunResult> {
  const t0 = Date.now();
  const model = opts.model ?? coachReplyModel();
  const maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS;
  const baseMessages: MsgParam[] = [
    ...opts.history.map((h) => ({ role: h.role, content: h.content } as MsgParam)),
    { role: "user", content: opts.userMessage },
  ];

  const toolCalls: ToolCallRecord[] = [];
  let inputTokens = 0, outputTokens = 0, streamed = false, fullText = "";
  let repeatGuard: RunResult["repeatGuard"];
  let hindiIssues: string[] | undefined;

  // One generation = the full tool-use loop. emit=onDelta streams live; omit it to buffer.
  async function generate(seed: MsgParam[], emit?: (t: string) => void): Promise<string> {
    const messages = [...seed];
    let text = "";
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const stream = anthropic().messages.stream({
        model, max_tokens: maxTokens, system: opts.system, messages,
        ...(opts.tools.length ? { tools: opts.tools } : {}),
      });
      if (emit) stream.on("text", (t) => { emit(t); streamed = true; });
      const msg = await stream.finalMessage();
      inputTokens += msg.usage?.input_tokens ?? 0;
      outputTokens += msg.usage?.output_tokens ?? 0;
      const roundText = msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("").trim();
      if (roundText) text = text ? `${text} ${roundText}` : roundText;
      const toolUses = msg.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      if (msg.stop_reason !== "tool_use" || toolUses.length === 0) break;
      messages.push({ role: "assistant", content: msg.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        const rec = await runCoachTool(opts.toolSubject, tu.name, (tu.input ?? {}) as Record<string, unknown>);
        toolCalls.push(rec);
        results.push({ type: "tool_result", tool_use_id: tu.id, content: rec.detail, ...(rec.ok ? {} : { is_error: true }) });
      }
      messages.push({ role: "user", content: results });
    }
    return text.trim();
  }

  try {
    await withTimeout(TURN_TIMEOUT_MS, (async () => {
      const hindiOn = !!opts.hindiGuard && (opts.language === "hi" || opts.language === "hinglish");
      const streaming = !!opts.onDelta;
      // Buffer ONLY for the no-repeat backstop, or for Hindi on a NON-streamed turn (opener / paid JSON
      // — cached or non-visible, so a regenerate is free). On a STREAMED Hindi turn we stream live and
      // check AFTER (logging violations), because buffering added ~6s to time-to-first-text at p50.
      const needBuffer = (opts.guardRepeat && !!opts.previousReply) || (hindiOn && !streaming);
      if (needBuffer) {
        let text = await generate(baseMessages);
        if (opts.guardRepeat && opts.previousReply && tooSimilar(text, opts.previousReply)) {
          const retry = await generate([...baseMessages, { role: "assistant", content: text }, { role: "user", content: NUDGE }]);
          const stillDup = tooSimilar(retry, opts.previousReply);
          text = stillDup ? fallbackStepReply(opts.language) : retry;
          repeatGuard = stillDup ? "fallback" : "regenerated";
        }
        if (hindiOn) {
          const issues = hindiReplyIssues(text, opts.hindiGuard!);
          if (issues.length) {
            const nudge = `(Your Hindi reply had problems: ${issues.join("; ")}. Rewrite the SAME message fixing ONLY these — use aap-imperatives for the parent (kahiye/kijiye/baithiye), keep "tum" in the child's quoted words, never gender yourself, use the child's correct gender verbs, no emoji, no English words, spell "use".)`;
            const retry = await generate([...baseMessages, { role: "assistant", content: text }, { role: "user", content: nudge }]);
            if (hindiReplyIssues(retry, opts.hindiGuard!).length < issues.length) text = retry;
          }
          hindiIssues = hindiReplyIssues(text, opts.hindiGuard!);
        }
        fullText = text;
        if (opts.onDelta && text) emitChunked(text, opts.onDelta); // simulate streaming for the client
      } else {
        fullText = await generate(baseMessages, opts.onDelta); // live stream, no buffering
        if (hindiOn) hindiIssues = hindiReplyIssues(fullText, opts.hindiGuard!); // check-after, log (no regen)
      }
    })());
  } catch (e) {
    console.error("[coach/engine] turn failed:", (e as Error).message);
    if (!fullText) {
      fullText = fallbackReply(opts.language);
      if (opts.onDelta && !streamed) opts.onDelta(fullText);
    }
    return { text: fullText, toolCalls, inputTokens, outputTokens, model, costPaise: costPaise(model, inputTokens, outputTokens), latencyMs: Date.now() - t0, errored: true, repeatGuard, hindiIssues };
  }

  if (!fullText) fullText = fallbackReply(opts.language);
  return { text: fullText.trim(), toolCalls, inputTokens, outputTokens, model, costPaise: costPaise(model, inputTokens, outputTokens), latencyMs: Date.now() - t0, errored: false, repeatGuard, hindiIssues };
}

function emitChunked(text: string, onDelta: (t: string) => void) {
  for (let i = 0; i < text.length; i += 24) onDelta(text.slice(i, i + 24));
}

function withTimeout<T>(ms: number, p: Promise<T>): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
}
