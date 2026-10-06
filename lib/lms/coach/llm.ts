// Coach LLM client — reuses the report-v2 Anthropic SDK + ANTHROPIC_API_KEY.
// Reply tier: Sonnet 4.6 (upgraded from Haiku for answer quality). Memory extraction stays on the
// fast/cheap Haiku tier. Model is per-call so the two paths can differ.
import Anthropic from "@anthropic-ai/sdk";
import { coachApiKey } from "@/lib/ai/anthropic-keys";

// Reply tier (same Sonnet the report-v2 generator uses). Memory extractor stays on the fast tier.
export const COACH_REPLY_MODEL = "claude-sonnet-4-6";
export const COACH_MEMORY_MODEL = "claude-haiku-4-5-20251001";
// Back-compat default alias (reply tier).
export const COACH_MODEL = COACH_REPLY_MODEL;

// Per-model stated rates for cost_paise (USD per 1M tokens). USD→INR at 88.
// Sonnet 4.x: $3 in / $15 out. Haiku 4.5: $1 in / $5 out.
const RATES: Record<string, { in: number; out: number }> = {
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5-20251001": { in: 1, out: 5 },
};
const USD_TO_INR = 88;

export function costPaise(model: string, inputTokens: number, outputTokens: number): number {
  const r = RATES[model] ?? RATES[COACH_REPLY_MODEL];
  const usd = (inputTokens / 1_000_000) * r.in + (outputTokens / 1_000_000) * r.out;
  return Math.round(usd * USD_TO_INR * 100);
}

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: coachApiKey() });
  }
  return _client;
}

export type CoachTurn = { role: "user" | "assistant"; content: string };
export type CoachResult = { text: string; inputTokens: number; outputTokens: number; model: string; costPaise: number; latencyMs: number };

export async function callCoach(
  system: string,
  messages: CoachTurn[],
  maxTokens = 400,
  model: string = COACH_REPLY_MODEL,
): Promise<CoachResult> {
  const t0 = Date.now();
  const res = await client().messages.create({ model, max_tokens: maxTokens, system, messages });
  const latencyMs = Date.now() - t0;
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  const inputTokens = res.usage?.input_tokens ?? 0;
  const outputTokens = res.usage?.output_tokens ?? 0;
  return { text, inputTokens, outputTokens, model, costPaise: costPaise(model, inputTokens, outputTokens), latencyMs };
}
