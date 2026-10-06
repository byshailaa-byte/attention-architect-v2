// Coach LLM client — reuses the report-v2 Anthropic SDK + ANTHROPIC_API_KEY, on the FAST tier
// (Haiku 4.5) because the Coach is a high-volume, short-turn chat.
import Anthropic from "@anthropic-ai/sdk";

// Fast/cheap tier (the report-v2 generator uses sonnet-4-6; the Coach uses the fast model).
export const COACH_MODEL = "claude-haiku-4-5-20251001";

// Stated per-token rates for cost_paise. Haiku 4.5 tier: $1.00 / 1M input, $5.00 / 1M output.
// USD→INR at 88. cost_paise = round(usd * 88 * 100).
const USD_PER_MTOK_IN = 1.0;
const USD_PER_MTOK_OUT = 5.0;
const USD_TO_INR = 88;

export function costPaise(inputTokens: number, outputTokens: number): number {
  const usd = (inputTokens / 1_000_000) * USD_PER_MTOK_IN + (outputTokens / 1_000_000) * USD_PER_MTOK_OUT;
  return Math.round(usd * USD_TO_INR * 100);
}

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export type CoachTurn = { role: "user" | "assistant"; content: string };
export type CoachResult = { text: string; inputTokens: number; outputTokens: number; model: string; costPaise: number };

export async function callCoach(system: string, messages: CoachTurn[], maxTokens = 400): Promise<CoachResult> {
  const res = await client().messages.create({
    model: COACH_MODEL,
    max_tokens: maxTokens,
    system,
    messages,
  });
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  const inputTokens = res.usage?.input_tokens ?? 0;
  const outputTokens = res.usage?.output_tokens ?? 0;
  return { text, inputTokens, outputTokens, model: COACH_MODEL, costPaise: costPaise(inputTokens, outputTokens) };
}
