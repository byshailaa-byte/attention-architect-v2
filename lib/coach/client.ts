// Shared Anthropic client for the conversational Coach (streaming + tool use). Reuses the coach API
// key. Lazy singleton so a missing key only throws when actually used.
import Anthropic from "@anthropic-ai/sdk";
import { coachApiKey } from "@/lib/ai/anthropic-keys";

let _client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: coachApiKey() });
  return _client;
}
