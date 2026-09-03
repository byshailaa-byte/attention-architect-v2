// m_simplified_actions — DETAIL 06 ("What you can do next") + Try Tonight box.
//
// Evidence scope: archetype + top 3 dimensions + parent instinct mechanism.
// Actions are parent behaviors, not child behaviors. They should calibrate to both
// the child's pattern and the parent's natural instinct.
//
// "Don't stretch" rule is explicit in the spec: 2–4 action items; 1 Try Tonight ACTION line.
// If only 2–3 action items are genuinely grounded, generate 2–3. If Try Tonight can't
// be specifically grounded, generate a simpler observation task — do not manufacture steps.

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

const DIM_LABEL: Record<string, string> = {
  attention_shape:       "what draws this child's attention in",
  friction_response:     "how this child responds to difficulty",
  reward_driver:         "what motivates and energises this child",
  recharge_type:         "how this child recharges",
  attention_competition: "what pulls this child's attention away",
};

const ACTION_DIM_PRIORITY = [
  "attention_shape",
  "friction_response",
  "reward_driver",
  "recharge_type",
  "attention_competition",
];

const INSTINCT_MECHANISM: Record<string, string> = {
  "quick-fixer": "When something isn't working, you move fast to find a new approach — offer an alternative, redirect, or step in to solve it.",
  "pusher":      "When a child hesitates, slows down, or shows signs of stopping, your instinct fires to push: stay with it, keep going, don't quit.",
  "negotiator":  "When resistance builds, your instinct is to look for a deal or compromise — find what makes the thing acceptable to the child.",
  "steady-hand": "Your instinct is to hold the space and wait — stay consistent and present without applying pressure or redirecting.",
};

export interface ActionDimension {
  dimension: string;
  expression: string;
  evidenceTier: string;
  validated: boolean;
}

export interface ActionsInput {
  childName: string;
  ageBand: string;
  archetype: string;
  parentInstinct: string;        // slug e.g. "quick-fixer"
  parentInstinctDisplay: string; // e.g. "The Quick Fixer"
  dimensions: ActionDimension[];
}

export interface ActionItem {
  emoji: string;
  label: string;
  description: string;
}

export interface TryTonight {
  title: string;
  steps: string[];
}

export interface ActionsOutput {
  actions: ActionItem[];
  tryTonight: TryTonight | null;
}

export function selectActionDimensions(
  sigDimensions: {
    dimension: string;
    validated: boolean;
    evidence_tier: string;
    expression: { type?: string; value?: string } | null;
  }[],
): ActionDimension[] {
  const result: ActionDimension[] = [];
  for (const key of ACTION_DIM_PRIORITY) {
    if (result.length >= 3) break;
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

// Parse structured text output. Expected format:
//
// ACTIONS:
// 🎯 **Label** — description text.
// ⏱ **Label** — description text.
//
// TRY TONIGHT:
// TITLE: Ten quiet minutes
// ACTION: The complete thing the parent does, one sentence.
//
// Legacy format (cached sessions before 2026-09-03) used STEP: lines.
// Parser accepts both; ACTION: takes precedence.
function parseActionsOutput(raw: string): ActionsOutput {
  const actionsSection = raw.split(/TRY TONIGHT:/i)[0] ?? "";
  const tonightSection = raw.split(/TRY TONIGHT:/i)[1] ?? "";

  // Parse action items: lines starting with an emoji followed by **label** — description
  // ️ is the Unicode variation selector-16 that follows some emoji codepoints.
const ACTION_LINE_RE = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})️?\s+\*\*(.+?)\*\*\s*[—–-]\s*(.+)$/u;
  const actions: ActionItem[] = actionsSection
    .split(/\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      const m = line.match(ACTION_LINE_RE);
      if (!m) return null;
      return { emoji: m[1], label: m[2].trim(), description: m[3].trim() };
    })
    .filter((x): x is ActionItem => x !== null)
    .slice(0, 4);

  // Parse Try Tonight — ACTION: (new) or STEP: (legacy)
  let tryTonight: TryTonight | null = null;
  if (tonightSection.trim()) {
    const titleMatch = tonightSection.match(/TITLE:\s*(.+)/i);
    const actionMatch = tonightSection.match(/ACTION:\s*(.+)/i);
    const steps = actionMatch
      ? [actionMatch[1].trim()]
      : (tonightSection.match(/STEP:\s*(.+)/gi) ?? [])
          .map(s => s.replace(/^STEP:\s*/i, "").trim())
          .slice(0, 3);
    if (titleMatch && steps.length >= 1) {
      tryTonight = { title: titleMatch[1].trim(), steps };
    }
  }

  return { actions, tryTonight };
}

export async function generateSimplifiedActions(
  input: ActionsInput,
): Promise<ActionsOutput> {
  const client = getClient();
  const { childName, ageBand, archetype, parentInstinct, parentInstinctDisplay, dimensions } = input;

  const instinctMechanism = INSTINCT_MECHANISM[parentInstinct]
    ?? `${parentInstinctDisplay} — your own way of responding when the child struggles.`;

  const dimEvidence = dimensions
    .map(d => {
      const label = DIM_LABEL[d.dimension] ?? d.dimension;
      const hedge = !d.validated || d.evidenceTier === "framework_interpretation"
        ? " (inferred)"
        : "";
      return `  • ${label}: "${d.expression}"${hedge}`;
    })
    .join("\n");

  const userPrompt = `FAMILY CONTEXT:
Child: ${childName}, age band ${ageBand}
Child's archetype: ${archetype}
Parent's instinct: ${parentInstinctDisplay}

EVIDENCE — draw ONLY on these two sources, nothing else:
1. Child's attention dimensions:
${dimEvidence}

2. Parent instinct mechanism (fixed):
  • ${parentInstinctDisplay}: ${instinctMechanism}

GENERATE: m_simplified_actions
SECTIONS: "What you can do next" + "Try Tonight"

PURPOSE:
(a) 2–4 concrete parent behaviors that work with this specific archetype × parent instinct combination. These should help the parent support the child's attention pattern rather than working against it. Calibrate to the parent instinct — if their instinct tends to create friction with this archetype, give them a lower-friction alternative. If the instinct aligns, tell them why it's working.

(b) One simple Try Tonight activity — a specific thing the parent can do this evening, grounded in at least one of the dimension items above. One sentence, the behaviour only. If the evidence only supports an observation task (parent watches without intervening), that's fine — name the observation as the action.

PLAIN ENGLISH RULE — mandatory:
Write in plain English a parent would use talking to a friend. No invented names for activities — describe what it is. Banned words: tangent, through-line, lapse in concentration, sustained, unprompted, calibration, internalise, absorbed, orbit, mechanism. Short sentences. Nothing that needs reading twice.

FORMAT (strict — do not deviate):
ACTIONS:
[emoji] **[Short label]** — [one sentence, under 15 words]
[emoji] **[Short label]** — [one sentence, under 15 words]
(repeat 2–4 times)

TRY TONIGHT:
TITLE: [Plain description of the activity — name what the parent does, don't brand it. "Ten quiet minutes" not "The Orbit Watch." "Leave it there" not "The Quiet Drop."]
ACTION: [What the parent does this evening. One complete sentence, under 15 words. The behaviour itself — not setup, not what to choose first. E.g. "Set a timer for ten minutes and leave the room."]

SAME-ROOT-DIFFERENT-SITUATION RULE:
If the parent instinct creates friction across multiple distinct situations, name each situation as its own action item even if they share the same underlying principle. For example: "don't step in when the child is stuck" and "don't offer alternatives mid-deep-focus" and "understand that stepping in removes the challenge itself" are three genuinely distinct behaviors — the parent needs to recognise each situation separately. Collapsing them into one loses the specific guidance for each. Count by situation, not by root principle.

HARD RULES — any violation triggers regeneration:
• Actions are parent behaviors, not child behaviors — "give a clear reason" not "encourage them to focus"
• 2–4 actions — do not pad to 4 with a generic item; but if multiple distinct situations are evident in the evidence, name them all separately even if they share a root
• Each action description: one sentence, under 15 words — the label carries the why; the description names the what only. No "when X" framing, no "because Y" clause.
• No generic parenting platitudes: "be patient", "spend quality time", "be consistent", "show interest", "validate their feelings"
• No aspirational parent framing: "try to", "aim to", "work on" — write as concrete present-tense behaviors
• Try Tonight: one ACTION line only — what the parent does, one complete sentence, under 15 words; do not describe what to pick or observe first — just the behaviour
• No clinical language, no diagnostic framing
• Do NOT fabricate traits not supported by the evidence above
• Write ONLY the structured output — no preamble, no commentary after`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    messages: [{ role: "user", content: userPrompt }],
    system: [{ type: "text", text: WRITING_ENGINE_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
  });

  const raw = response.content
    .filter(b => b.type === "text")
    .map(b => (b as { type: "text"; text: string }).text)
    .join("")
    .trim();

  return parseActionsOutput(raw);
}
