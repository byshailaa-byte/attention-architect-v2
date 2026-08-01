// Per-Moment LLM call — §6 of the Report Engine Architecture.
// Each Moment is one Claude API call. The system prompt (Writing Engine rules)
// is shared across every call. The user prompt carries family context + section spec.

import Anthropic from "@anthropic-ai/sdk";
import { WRITING_ENGINE_SYSTEM_PROMPT } from "./system-prompt";
import { serialiseContext, type NarrativeContext } from "./context";
import type { AttentionMoment, MomentType } from "./types";
import type { EvidenceTier } from "@/lib/graph/types";

const MODEL = "claude-sonnet-4-6";

// All generation goes through this singleton so callers don't manage auth.
let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export interface MomentSpec {
  momentId: string;
  momentType: MomentType;
  section: string;
  purpose: string;
  emotionalObjective: string;
  confidenceTier: EvidenceTier;
  // Node IDs for storage/Quality Engine — never appear in prose
  behaviourNodeRefs: string[];
  humanDecisionRefs: string[];
  // The trigger/choice text from the cited HDG nodes — what the LLM draws from
  evidenceText: string[];
  // Preceding moments' prose for continuity (summarised — not the full chain)
  priorContext?: string;
  // Section-specific additional instruction
  additionalInstruction?: string;
  // Target word count guidance
  wordTarget?: string;
}

export async function generateMoment(
  spec: MomentSpec,
  ctx: NarrativeContext,
): Promise<AttentionMoment> {
  const client = getClient();

  // Restrict ASSESSMENT DECISIONS to only the nodes scoped by this moment's relevantQ.
  // spec.humanDecisionRefs = hdgNodesForQuestions(ctx, relevantQ).map(n => n.id)
  // This makes relevantQ an actual restriction, not an additive suggestion.
  const familyContext = serialiseContext(ctx, new Set(spec.humanDecisionRefs));

  const evidenceBlock = spec.evidenceText.length > 0
    ? `EVIDENCE FOR THIS MOMENT (draw on these specific observations):\n${spec.evidenceText.map(e => `  - ${e}`).join("\n")}`
    : "EVIDENCE: Use the most relevant dimensions from the family context above.";

  const priorBlock = spec.priorContext
    ? `WHAT HAS BEEN WRITTEN SO FAR (maintain continuity — do not repeat):\n${spec.priorContext}`
    : "";

  const tierNote = spec.confidenceTier === "hypothesis"
    ? "\nIMPORTANT: This section draws on uncertain evidence. Use hedge language throughout (Rule 4). Do not state anything as direct fact."
    : spec.confidenceTier === "insufficient_evidence"
    ? "\nIMPORTANT: Evidence is thin here. Be honest about what is unknown — do not invent content."
    : "";

  const userPrompt = `${familyContext}

${evidenceBlock}
${priorBlock}
GENERATE A ${spec.momentType.toUpperCase()} MOMENT FOR SECTION: "${spec.section}"

Purpose: ${spec.purpose}
Emotional objective: ${spec.emotionalObjective}
${tierNote}
${spec.additionalInstruction ?? ""}
Word target: ${spec.wordTarget ?? "80–120 words — dense and specific, not padded."}

Write ONLY the prose. No headings, no JSON, no bullet points unless the section type is Roadmap (where a single numbered step is appropriate).`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    messages: [{ role: "user", content: userPrompt }],
    system: WRITING_ENGINE_SYSTEM_PROMPT,
  });

  const raw = response.content
    .filter(b => b.type === "text")
    .map(b => (b as { type: "text"; text: string }).text)
    .join("")
    .trim();

  // Extract optional TITLE: prefix (for sections that request an h2 title).
  // The LLM is instructed to begin its response with "TITLE: [title text]\n\n" for these sections.
  // If the prefix is absent the moment has no title — the UI falls back to a static label.
  let title: string | undefined;
  let content = raw;
  const titleMatch = raw.match(/^TITLE:\s*(.+)\n\n?/);
  if (titleMatch) {
    title = titleMatch[1].trim();
    content = raw.slice(titleMatch[0].length).trim();
  }

  return {
    moment_id: spec.momentId,
    moment_type: spec.momentType,
    section: spec.section,
    purpose: spec.purpose,
    evidence_source: spec.humanDecisionRefs,
    confidence_tier: spec.confidenceTier,
    emotional_objective: spec.emotionalObjective,
    behaviour_node_refs: spec.behaviourNodeRefs,
    human_decision_refs: spec.humanDecisionRefs,
    content,
    ...(title !== undefined ? { title } : {}),
  };
}
