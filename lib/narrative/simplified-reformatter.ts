// simplified-reformatter.ts — condensing/reformatting passes for shared moments.
//
// m_01_simplified: takes the existing m_01 prose for a session and extracts 3-4 concrete
//   observations as short checklist bullets. Input is the already-generated m_01 content;
//   no new evidence is introduced.
//
// m_02_simplified: takes the existing m_02 prose and condenses it to a two-part shape:
//   main (2 specific sentences) + remember (1 generic reassurance sentence).
//
// These are reformatting tasks, not fresh generation. Content must trace only to what
// is already in the source moment. Nothing new is invented.

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

function getText(response: Anthropic.Message): string {
  return response.content
    .filter(b => b.type === "text")
    .map(b => (b as { type: "text"; text: string }).text)
    .join("")
    .trim();
}

// ── m_01_simplified ───────────────────────────────────────────────────────────
//
// Output: string[] — 3-4 bullet texts (without the ✓ prefix; render layer adds it).
// Each: 8-14 words, third person, one observation only, no elaboration.

export async function reformatM01(m01Content: string): Promise<string[]> {
  const client = getClient();

  const userPrompt = `You are reformatting an existing narrative paragraph about a child's attention pattern into a short checklist. The checklist will be read by a parent as a quick summary of what the assessment found.

SOURCE TEXT (the real narrative, already written for this family):
${m01Content}

TASK: Extract exactly 3–4 of the most concrete, specific observations already present in the source text. Restate each as one short checklist line.

RULES:
• 3–4 lines only
• Each line: one clause, 8–14 words, no elaboration
• Third person: "Gets absorbed", "Tends to", "Pushes through", "Once distracted..."
• Do NOT use the child's name — use "they/their/them"
• Do NOT invent new observations — every line must be directly traceable to something in the source above
• No titles, no headings, no explanations
• Output format: each line starts with "✓ " followed by the observation, nothing else
• No punctuation at end of lines`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 180,
    messages: [{ role: "user", content: userPrompt }],
    system: [{ type: "text", text: WRITING_ENGINE_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
  });

  const raw = getText(response);
  return raw
    .split(/\n/)
    .map(l => l.trim())
    .filter(l => l.startsWith("✓"))
    .map(l => l.replace(/^✓\s*/, "").trim())
    .slice(0, 4);
}

// ── m_02_simplified ───────────────────────────────────────────────────────────
//
// Output: { main: string; remember: string }
//   main — 2 sentences specific to this child (drawn only from source m_02 content)
//   remember — 1 reassurance sentence (can be near-generic across sessions)

export interface SimplifiedBehaviourPattern {
  main: string;
  remember: string;
}

export async function reformatM02(
  m02Content: string,
  childName: string,
): Promise<SimplifiedBehaviourPattern> {
  const client = getClient();

  const userPrompt = `You are condensing an existing explanation of a child's attention mechanism into a shorter two-part format.

Child's name: ${childName}

SOURCE TEXT (the real explanation, already written for this family):
${m02Content}

TASK: Produce exactly this two-part output:

MAIN: [Two sentences. The first: name the attention mechanism — what conditions bring focus in and what doesn't hold it. The second: name the practical everyday implication. Be specific to this child; do not use generic language. Draw only from what's in the source above. May use the child's name.]

REMEMBER: [One sentence. General and reassuring — reframe the difficulty as a condition to work with, not a fault. Its job is not new information but perspective. Can be similar across sessions.]

OUTPUT: Only the MAIN: and REMEMBER: lines. No preamble, no explanation, no headings.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    messages: [{ role: "user", content: userPrompt }],
    system: [{ type: "text", text: WRITING_ENGINE_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
  });

  const raw = getText(response);
  const rememberIdx = raw.indexOf("REMEMBER:");
  const mainRaw = rememberIdx > -1 ? raw.slice(0, rememberIdx) : raw;
  const rememberRaw = rememberIdx > -1 ? raw.slice(rememberIdx) : "";

  return {
    main: mainRaw.replace(/^MAIN:\s*/i, "").trim(),
    remember: rememberRaw.replace(/^REMEMBER:\s*/i, "").trim(),
  };
}
