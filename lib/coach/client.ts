// Shared Anthropic client for the conversational Coach (streaming + tool use). Reuses the coach API
// key. Lazy singleton so a missing key only throws when actually used.
import Anthropic from "@anthropic-ai/sdk";
import { coachApiKey } from "@/lib/ai/anthropic-keys";

let _client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: coachApiKey() });
  return _client;
}

// Reply model for ALL parents: Sonnet 4.6. Opus stays behind a config flag, OFF by default —
// set COACH_MODEL_OPUS=1 to switch (not set in any environment).
export function coachReplyModel(): string {
  return process.env.COACH_MODEL_OPUS === "1" ? "claude-opus-4-8" : "claude-sonnet-4-6";
}
