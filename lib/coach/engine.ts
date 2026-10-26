// Runtime for the conversational Coach: an Anthropic tool-use loop with token streaming, a graceful
// fallback, and a no-repeat backstop. The model's text streams to the parent as it's generated
// (onDelta); tool calls run server-side and never delay the visible text.
//
// NO-REPEAT BACKSTOP (method-level fix is primary; this is the safety net): on a short non-answer
// turn ("ok"/"theek hai"/"tell me what to do") — exactly where the Coach tends to repeat itself — we
// used to BUFFER the reply (generate fully, compare, regenerate, maybe fall back to a canned line)
// before streaming. That showed DEAD AIR while buffering and could loop on the canned line. We now
// handle repeats the way Hindi is handled on a streamed turn: a preventive in-context directive (give
// the next step, or on a repeated acknowledgement ask ONE genuinely new question), streamed LIVE, then
// a check-AFTER for logging. No parent-facing turn is ever buffered. Buffering survives only for the
// non-visible, non-streamed paths (opener / paid JSON), where a Hindi regenerate is free.
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
  repeatGuard?: "ok" | "detected"; // what the no-repeat check-after observed on the FINAL reply (for logging)
  hindiIssues?: string[]; // deterministic Hindi-language violations found on the FINAL reply (for logging)
};

export function fallbackReply(language: Language): string {
  if (language === "hi") return "Maaf kijiye, abhi mujhe jawab dene mein thodi dikkat ho rahi hai. Kripya ek minute baad phir se bhejiye.";
  if (language === "hinglish") return "Sorry, abhi reply karne mein thodi dikkat ho rahi hai. Ek minute baad phir try kijiye.";
  return "Sorry — I had trouble answering just now. Please try again in a minute.";
}

// Preventive, in-context anti-repeat directive for a short-acknowledgement turn. Streamed live (no
// buffering). On the 2nd+ consecutive acknowledgement it forbids restating and demands a NEW question,
// so the Coach can never loop the same line.
function repeatDirective(streak: number): string {
  return streak >= 2
    ? `\n\n## This turn\nThe parent has only briefly acknowledged you again ("ok"/"theek hai"/"hmm"). Do NOT restate or rephrase your last message in any form. Ask ONE short, genuinely NEW question that moves things forward.`
    : `\n\n## This turn\nThe parent gave a brief acknowledgement ("ok"/"theek hai"/"hmm"). Do NOT repeat or rephrase your last message — give the single next concrete action in one line with the exact words to say; or, if you already gave that step, ask ONE new, different question.`;
}

// Separator between text from different tool-use rounds — used BOTH in the buffered join and in the
// live stream, so what the parent sees matches what is persisted.
export const ROUND_SEP = " ";

// Wraps the per-round onDelta so the first text token of any round AFTER text has already streamed is
// prefixed with ROUND_SEP. Prevents "…without a fight?" + "Let me know…" streaming as one run-on word.
export function makeRoundEmitter(emit: (t: string) => void) {
  let streamedAny = false; // any text emitted in a prior round
  let roundHasText = false; // text emitted in the current round yet
  return {
    startRound() { roundHasText = false; },
    emit(t: string) {
      if (!t) return;
      if (streamedAny && !roundHasText) emit(ROUND_SEP);
      roundHasText = true;
      streamedAny = true;
      emit(t);
    },
  };
}

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
  previousReply?: string;   // the Coach's last reply (for the no-repeat check-after)
  guardRepeat?: boolean;    // true on short non-answer turns → preventive directive + check-after
  repeatStreak?: number;    // # of consecutive short non-answers ending at this turn (for escalation)
  hindiGuard?: { childGender: Gender; parentUsedTu: boolean; parentUsedEmoji: boolean; childName?: string }; // Hindi-language backstop
}): Promise<RunResult> {
  const t0 = Date.now();
  const model = opts.model ?? coachReplyModel();
  const maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS;
  const baseMessages: MsgParam[] = [
    ...opts.history.map((h) => ({ role: h.role, content: h.content } as MsgParam)),
    { role: "user", content: opts.userMessage },
  ];

  const repeatRisk = !!opts.guardRepeat && !!opts.previousReply;
  const streak = opts.repeatStreak ?? (repeatRisk ? 1 : 0);
  // Preventive directive goes in the SYSTEM prompt for this turn only — streamed live, never buffered.
  const systemForTurn = repeatRisk ? opts.system + repeatDirective(streak) : opts.system;

  const toolCalls: ToolCallRecord[] = [];
  let inputTokens = 0, outputTokens = 0, streamed = false, fullText = "";
  let repeatGuard: RunResult["repeatGuard"];
  let hindiIssues: string[] | undefined;

  // One generation = the full tool-use loop. emit=onDelta streams live; omit it to buffer.
  async function generate(seed: MsgParam[], emit?: (t: string) => void, sys: string = systemForTurn): Promise<string> {
    const messages = [...seed];
    let text = "";
    // When text spans more than one tool-use round, the rounds are joined with ROUND_SEP in `text`.
    // The emitter injects the SAME separator into the live stream before a later round's first token,
    // so the streamed text matches the final text exactly (no "…fight?Let me know…" join).
    const roundEmitter = emit ? makeRoundEmitter(emit) : null;
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const stream = anthropic().messages.stream({
        model, max_tokens: maxTokens, system: sys, messages,
        ...(opts.tools.length ? { tools: opts.tools } : {}),
      });
      roundEmitter?.startRound();
      if (roundEmitter) stream.on("text", (t) => { roundEmitter.emit(t); streamed = true; });
      const msg = await stream.finalMessage();
      inputTokens += msg.usage?.input_tokens ?? 0;
      outputTokens += msg.usage?.output_tokens ?? 0;
      const roundText = msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("").trim();
      if (roundText) text = text ? `${text}${ROUND_SEP}${roundText}` : roundText;
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
      // Buffer ONLY to repair Hindi on a NON-streamed turn (opener / paid JSON — not visible live, so a
      // regenerate is free). A live parent turn is NEVER buffered: short non-answers stream live with the
      // preventive directive and are checked AFTER (log only), exactly like the streamed Hindi path.
      const needBuffer = hindiOn && !streaming;
      if (needBuffer) {
        let text = await generate(baseMessages);
        const issues = hindiReplyIssues(text, opts.hindiGuard!);
        if (issues.length) {
          const nudge = `(Your Hindi reply had problems: ${issues.join("; ")}. Rewrite the SAME message fixing ONLY these — use aap-imperatives for the parent (kahiye/kijiye/baithiye), keep "tum" in the child's quoted words, never gender yourself, use the child's correct gender verbs, no emoji, no English words, spell "use".)`;
          const retry = await generate([...baseMessages, { role: "assistant", content: text }, { role: "user", content: nudge }]);
          if (hindiReplyIssues(retry, opts.hindiGuard!).length < issues.length) text = retry;
        }
        hindiIssues = hindiReplyIssues(text, opts.hindiGuard!);
        fullText = text;
        if (opts.onDelta && text) opts.onDelta(text); // (unreached for live turns; kept for a non-streamed caller that still passes onDelta)
      } else {
        fullText = await generate(baseMessages, opts.onDelta); // live stream (or JSON buffer-return) — no dead air
        if (hindiOn) hindiIssues = hindiReplyIssues(fullText, opts.hindiGuard!);   // check-after, log
        if (repeatRisk && tooSimilar(fullText, opts.previousReply!)) repeatGuard = "detected"; // check-after, log
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

export function withTimeout<T>(ms: number, p: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((_, rej) => { timer = setTimeout(() => rej(new Error("timeout")), ms); });
  // p.finally clears the timer when p settles, so the timeout promise never rejects late (no dangling
  // timer, no unhandled rejection). If p hangs, the timer fires and the race rejects with "timeout".
  return Promise.race([p.finally(() => clearTimeout(timer)), timeout]);
}
