// m_simplified_strengths — DETAIL 05 strengths list for simplified funnel.
//
// Generates 2–3 capability-framed strength statements specific to the child's
// archetype + dimension profile. Evidence scope: archetype name + top 3 dimensions
// (prioritised by evidence tier). Returns parsed items ready to render as an icon list.
//
// Key quality constraint: avoid-type friction_response (disengagement) must never be
// asserted as productive internal processing. If no honest framing is available for a
// dimension, generate 2 strong bullets rather than stretching a third.

import Anthropic from "@anthropic-ai/sdk";
import { WRITING_ENGINE_SYSTEM_PROMPT } from "./system-prompt";

const MODEL = "claude-sonnet-4-6";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

// Human-readable labels for dimension slugs used in the generation prompt.
const DIM_LABEL: Record<string, string> = {
  attention_shape:       "what draws this child's attention in",
  friction_response:     "how this child responds to difficulty",
  reward_driver:         "what motivates and energises this child",
  recharge_type:         "how this child recharges",
  attention_competition: "what pulls this child's attention away",
};

// Priority order for picking the most strength-relevant dimensions.
const STRENGTH_DIM_PRIORITY = [
  "attention_shape",
  "reward_driver",
  "friction_response",
  "recharge_type",
  "attention_competition",
];

// Friction response expressions that indicate avoidance / disengagement under difficulty.
// These must NOT be asserted as productive internal processing in a strength bullet.
const AVOID_SIGNALS = /\bavoid\b|\bstep back\b|\bdraining\b/i;

export interface StrengthDimension {
  dimension: string;
  expression: string;
  evidenceTier: string;
  validated: boolean;
  isAvoidType: boolean; // true when friction_response expression signals avoidance
}

export interface StrengthsInput {
  childName: string;
  ageBand: string;
  archetype: string;
  dimensions: StrengthDimension[];
}

export interface Strength {
  emoji: string;
  text: string;
}

// Select up to 3 dimensions from behaviour_signature in priority order.
// Flags avoid-type friction_response so the generation prompt can apply the right constraint.
export function selectStrengthDimensions(
  sigDimensions: {
    dimension: string;
    validated: boolean;
    evidence_tier: string;
    expression: { type?: string; value?: string } | null;
  }[],
): StrengthDimension[] {
  const result: StrengthDimension[] = [];
  for (const key of STRENGTH_DIM_PRIORITY) {
    if (result.length >= 3) break;
    const dim = sigDimensions.find(d => d.dimension === key);
    if (!dim || !dim.expression?.value) continue;
    const isAvoidType =
      dim.dimension === "friction_response" &&
      AVOID_SIGNALS.test(dim.expression.value);
    result.push({
      dimension: dim.dimension,
      expression: dim.expression.value,
      evidenceTier: dim.evidence_tier,
      validated: dim.validated,
      isAvoidType,
    });
  }
  return result;
}

// Parse "emoji text" lines from LLM output. Handles Unicode emoji at start of each line.
function parseStrengthLines(raw: string): Strength[] {
  const EMOJI_RE = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})️?\s+(.+)$/u;
  return raw
    .split(/\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      const m = line.match(EMOJI_RE);
      if (!m) return null;
      return { emoji: m[1], text: m[2].trim() };
    })
    .filter((x): x is Strength => x !== null)
    .slice(0, 3);
}

export async function generateSimplifiedStrengths(
  input: StrengthsInput,
): Promise<Strength[]> {
  const client = getClient();
  const { childName, ageBand, archetype, dimensions } = input;
  const hasAvoidFriction = dimensions.some(d => d.isAvoidType);

  const dimEvidence = dimensions
    .map(d => {
      const label = DIM_LABEL[d.dimension] ?? d.dimension;
      const hedge = !d.validated || d.evidenceTier === "framework_interpretation"
        ? " (inferred)"
        : "";
      const avoidNote = d.isAvoidType ? " [AVOID-TYPE — see constraint below]" : "";
      return `  • ${label}: "${d.expression}"${hedge}${avoidNote}`;
    })
    .join("\n");

  const avoidBlock = hasAvoidFriction
    ? `
AVOID-TYPE FRICTION RESPONSE CONSTRAINT:
One of the dimensions above is flagged [AVOID-TYPE]. The evidence for how this child responds to difficulty includes avoidance or disengagement. Do NOT generate a strength bullet that asserts this is productive internal processing — that is an interpretation the evidence does not confirm.
Two options:
  (a) Use a different angle entirely — draw on a subtlety of their focus pattern, motivation, or recharge evidence not yet captured in another bullet
  (b) If you reference the friction dimension at all, hedge honestly: "may be working through it quietly rather than checking out — worth watching which one it is"
If neither option produces an honest, genuinely strong bullet, generate only 2 bullets.
Two strong, honest bullets are better than three where one is stretched.`
    : "";

  const userPrompt = `FAMILY CONTEXT:
Child: ${childName}, age band ${ageBand}
Child's archetype: ${archetype}

EVIDENCE — draw ONLY on these sources, nothing else:
${dimEvidence}
${avoidBlock}

GENERATE: m_simplified_strengths
SECTION: "${childName}'s strengths"

PURPOSE: Give the parent 2–3 specific, capability-framed strengths that are genuinely true of this child's attention pattern. Each strength should feel like something the parent can recognise — not generic praise.

FORMAT (strict):
Return 2 or 3 lines (2 if a third can't be made honestly — see constraint above, if present). Each line: one emoji, one space, then the strength in one short sentence, roughly 12–18 words, third person, no full stop at the end. Do not add a second clause explaining or elaborating — one observation, stated once.

Good example shape (do NOT copy these — generate from the evidence above):
🎯 Goes deep into whatever captures their attention — surface-level was never an option
🌱 Comes back to hard things on their own, without being prompted
⚡ Lights up when a problem is genuinely difficult to crack

HARD RULES — any violation triggers regeneration:
• Each strength must be meaningfully different — do not rephrase the same underlying trait
• No generic filler: avoid "is creative", "tries hard", "is kind", "works well with others", "is imaginative", "is smart"
• Strengths describe what this child already does — not aspirational ("will be able to") or conditional ("can if they want")
• Third person only — no "your child", no "they can learn to"
• No clinical labels, no diagnostic framing, no "ADHD-like", no "neurodivergent"
• Do NOT fabricate traits not supported by the evidence above
• No introductory text, no headings, no explanations — ONLY the 2 or 3 lines`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    messages: [{ role: "user", content: userPrompt }],
    system: [{ type: "text", text: WRITING_ENGINE_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
  });

  const raw = response.content
    .filter(b => b.type === "text")
    .map(b => (b as { type: "text"; text: string }).text)
    .join("")
    .trim();

  return parseStrengthLines(raw);
}
