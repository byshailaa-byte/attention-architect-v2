// m_instinct_interaction_fallback — DETAIL 03 generation for sessions where no
// Family Attention Loop was detected (~82% of families).
//
// Same job as m_03 (how your instinct meets their pattern), but the specific dynamic
// was NOT observed — this describes a tendency grounded in the archetype × instinct
// mechanism. Evidence scope is intentionally narrow: only the load-bearing archetype
// dimensions + the parent instinct's core mechanism. The distinction is the whole point;
// writing observed-fact language here fabricates a claim.
//
// A fixed closing line is appended in code at render time — never generated.

import Anthropic from "@anthropic-ai/sdk";
import { WRITING_ENGINE_SYSTEM_PROMPT } from "./system-prompt";
import type { AttentionMoment } from "./types";

const MODEL = "claude-sonnet-4-6";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

// Core mechanism of each parent instinct — static, not generated.
const INSTINCT_MECHANISM: Record<string, string> = {
  "quick-fixer":  "When something isn't working, you move fast to find a new approach — offer an alternative, redirect, or step in to solve it.",
  "pusher":       "When a child hesitates, slows down, or shows signs of stopping, your instinct fires to push: stay with it, keep going, don't quit.",
  "negotiator":   "When resistance builds, your instinct is to look for a deal or compromise — find what makes the thing acceptable to the child.",
  "steady-hand":  "Your instinct is to hold the space and wait — stay consistent and present without applying pressure or redirecting.",
};

// Display names for dimension slugs, used to label the evidence block.
const DIM_LABEL: Record<string, string> = {
  attention_shape:       "how this child focuses",
  friction_response:     "how this child responds to difficulty",
  attention_competition: "what pulls this child's attention away",
  reward_driver:         "what motivates this child",
  recharge_type:         "how this child recharges",
};

export interface FallbackGenerationInput {
  childName: string;
  ageBand: string;
  archetype: string;           // display name e.g. "The All-In Kid"
  archetypeFitTier: string;
  parentInstinct: string;      // raw slug e.g. "quick-fixer"
  parentInstinctDisplay: string; // display name e.g. "The Quick Fixer"
  parentInstinctFitTier: string;
  // Dimensions from behaviour_signature — include the 2-3 most load-bearing for the archetype.
  // Caller selects; this function trusts whatever is passed.
  dimensions: {
    dimension: string;
    expression: string; // qualitative_tendency value or best available string
    evidenceTier: string;
    validated: boolean;
  }[];
}

export async function generateInstinctInteractionFallback(
  input: FallbackGenerationInput,
): Promise<AttentionMoment> {
  const client = getClient();
  const { childName, ageBand, archetype, archetypeFitTier, parentInstinct,
          parentInstinctDisplay, parentInstinctFitTier, dimensions } = input;

  const instinctMechanism = INSTINCT_MECHANISM[parentInstinct]
    ?? `${parentInstinctDisplay} — their own way of responding when the child struggles.`;

  const dimEvidence = dimensions
    .map(d => {
      const label = DIM_LABEL[d.dimension] ?? d.dimension;
      const tierNote = !d.validated || d.evidenceTier === "framework_interpretation"
        ? " (inferred — hedge if needed)"
        : "";
      return `  • ${label}: "${d.expression}"${tierNote}`;
    })
    .join("\n");

  const userPrompt = `FAMILY CONTEXT:
Child: ${childName}, age band ${ageBand}
Child's archetype: ${archetype} (fit tier: ${archetypeFitTier})
Parent's instinct: ${parentInstinctDisplay} (fit tier: ${parentInstinctFitTier})

EVIDENCE FOR THIS MOMENT — draw ONLY on these two sources, nothing else:
1. Child's attention mechanism (from assessment):
${dimEvidence}

2. Parent instinct mechanism (fixed):
  • ${parentInstinctDisplay}: ${instinctMechanism}

GENERATE: m_instinct_interaction_fallback
SECTION: "How your instinct meets ${childName}'s pattern"

PURPOSE: Help the parent understand how their instinct tends to interact with this specific attention pattern. CRITICAL CONTEXT: No Family Attention Loop was detected for this family — the specific dynamic was NOT observed. This is a tendency description grounded in the archetype × instinct mechanism, NOT an account of something that happened in this household.

STRUCTURE — exactly 2 sentences, no more:
1. One sentence: a concrete ordinary scene — the child in a moment where the parent's instinct would naturally fire (homework, a task, a stuck moment, a transition). The instinct and the child's state both present. Keep it specific. Example shape: "Ten minutes into homework, Kabir stalls, and your instinct as a Negotiator is already looking for the angle that makes it workable."
2. One sentence: the structural tension — why that instinct's natural move tends to work against this specific pattern. Pull only from the dimension evidence above. State the mechanism plainly. No elaboration, no setup, no justification after. End there.
A fixed closing line is appended in code — do NOT write it or anything after sentence 2.

HARD RULES — any violation triggers regeneration:
• NEVER claim this specific dynamic was observed in this family. No loop was detected here. Use tendency language: "tends to," "the natural pull is toward," "with this pattern," "the kind of moment where," "can work against" — NEVER "you do this," "this is what happens," "you always."
• No clinical language. No guilt or blame. No urgency. No fabricated statistics.
• Exactly 2 sentences of generated prose. No closing sentence — the fixed line handles it.
• Write ONLY the prose. No headings, no labels, no JSON.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    messages: [{ role: "user", content: userPrompt }],
    system: [{ type: "text", text: WRITING_ENGINE_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
  });

  const content = response.content
    .filter(b => b.type === "text")
    .map(b => (b as { type: "text"; text: string }).text)
    .join("")
    .trim();

  return {
    moment_id: "m_instinct_interaction_fallback",
    moment_type: "insight",
    section: "How your instinct meets their pattern",
    purpose: "Describe the archetype × instinct tendency without claiming observed loop",
    evidence_source: [],
    confidence_tier: "framework_interpretation",
    emotional_objective: "understanding without guilt, possibility not promise",
    behaviour_node_refs: ["signal_attention_shape", "signal_friction_response"],
    human_decision_refs: [],
    content,
  };
}

// Select the 2-3 most load-bearing dimensions from a behaviour_signature.dimensions array.
// Always includes attention_shape. Adds friction_response if available; falls back to
// attention_competition if friction_response is absent.
export function selectFallbackDimensions(
  sigDimensions: {
    dimension: string;
    validated: boolean;
    evidence_tier: string;
    expression: { type?: string; value?: string } | null;
  }[],
): FallbackGenerationInput["dimensions"] {
  const PRIORITY = ["attention_shape", "friction_response", "attention_competition", "reward_driver"];
  const result: FallbackGenerationInput["dimensions"] = [];

  for (const key of PRIORITY) {
    if (result.length >= 2) break;
    const dim = sigDimensions.find(d => d.dimension === key);
    if (!dim || !dim.expression?.value) continue;
    result.push({
      dimension: dim.dimension,
      expression: dim.expression.value,
      evidenceTier: dim.evidence_tier,
      validated: dim.validated,
    });
  }

  return result;
}
