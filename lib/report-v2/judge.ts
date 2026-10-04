// Coherence judge for Report v2. After a candidate passes the mechanical validator, one
// short LLM call (same model) checks that the explanation actually follows from the 3
// evidence answers + the archetype mechanism, AND that the switch matches the Week 1 move.
// FAIL → the caller retries once with the reason, then falls back to static copy.
import Anthropic from "@anthropic-ai/sdk";
import type { ReportV2Generated } from "./types";
import type { ProgramAnchor } from "./program";

const MODEL = "claude-sonnet-4-6";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export type JudgeVerdict = { verdict: "PASS" | "FAIL"; reason: string };

export async function judgeCoherence(args: {
  childName: string;
  worryLabel: string;
  moment: string;
  archetype: string;
  program: ProgramAnchor | null;
  evidenceQuotes: string[];
  generated: ReportV2Generated;
}): Promise<JudgeVerdict> {
  const { childName, worryLabel, moment, archetype, program, evidenceQuotes, generated } = args;
  const prompt = `You are checking one short parenting report for coherence. Be strict.

CHILD: ${childName}
WORRY THE PARENT RAISED: ${worryLabel}
THE WORRY'S MOMENT (the switch + tonight must happen here): ${moment}
ARCHETYPE: ${archetype}
ARCHETYPE MECHANISM: ${program?.mechanismLine ?? ""} ${program?.patternLine ?? ""}
WEEK 1 CORE MOVE (the paid programme): ${program?.coreMove || "(unavailable)"}
THE PARENT'S OWN 3 ANSWERS:
${evidenceQuotes.map((q, i) => `${i + 1}. "${q}"`).join("\n")}

THE REPORT:
- why (short): ${generated.shortWhy}
- why (para 1): ${generated.whyParas[0]}
- why (para 2): ${generated.whyParas[1]}
- switch — instead: ${generated.switch.instead}
- switch — try: ${generated.switch.try}
- switch — after: ${generated.switch.after}
- tonight 1: ${generated.tonight[0]}
- tonight 2: ${generated.tonight[1]}
- tonight 3: ${generated.tonight[2]}

Answer this on ONE line, starting with PASS or FAIL, then one short reason:
Does the explanation follow from these 3 answers and this archetype mechanism, AND does the switch match the Week 1 core move, AND do the switch and tonight's steps take place at ${moment}? If the explanation drifts to generic advice, contradicts the answers, the switch is not the Week 1 move, or the switch/tonight do not happen at ${moment}, answer FAIL.`;

  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  const verdict: "PASS" | "FAIL" = /^\s*FAIL/i.test(text) ? "FAIL" : /^\s*PASS/i.test(text) ? "PASS" : "FAIL";
  const reason = text.replace(/^\s*(PASS|FAIL)[\s:.\-—]*/i, "").trim() || text;
  return { verdict, reason };
}
