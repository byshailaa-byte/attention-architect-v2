// Coherence judge for Report v2. After a candidate passes the mechanical validator, one
// short LLM call (same model) checks that the explanation actually follows from the 3
// evidence answers + the archetype mechanism, AND that the switch matches the Week 1 move.
// FAIL → the caller retries once with the reason, then falls back to static copy.
import Anthropic from "@anthropic-ai/sdk";
import { reportsApiKey } from "@/lib/ai/anthropic-keys";
import type { ReportV2Generated } from "./types";
import type { ProgramAnchor } from "./program";

const MODEL = "claude-sonnet-4-6";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: reportsApiKey() });
  }
  return _client;
}

export type JudgeVerdict = { verdict: "PASS" | "FAIL"; reason: string; failed: string[]; inTok: number; outTok: number };

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
- seenIt (card 1, meant to show focusing WELL): ${generated.seenIt}
- hardPart: ${generated.hardPart}
- why (short): ${generated.shortWhy}
- why (para 1): ${generated.whyParas[0]}
- why (para 2): ${generated.whyParas[1]}
- switch — instead: ${generated.switch.instead}
- switch — try: ${generated.switch.try}
- switch — after: ${generated.switch.after}
- tonight 1: ${generated.tonight[0]}
- tonight 2: ${generated.tonight[1]}
- tonight 3: ${generated.tonight[2]}

Answer FOUR questions. ALL must pass. Reply on exactly four lines:
Q1: <PASS or FAIL> — <short reason>
Q2: <PASS or FAIL> — <short reason>
Q3: <PASS or FAIL> — <short reason>
Q4: <PASS or FAIL> — <short reason>

Q1 (coherence): Does the explanation follow from these 3 answers and this archetype mechanism, AND does the switch match the Week 1 core move, AND do the switch and tonight's steps take place at ${moment}, AND is tonight's THIRD step a "Notice:" check of the worry's outcome? FAIL if it drifts to generic advice, contradicts the answers, the switch is not the Week 1 move, the switch/tonight do not happen at ${moment}, or the third tonight step is not a Notice check.
Q2 (usability): Could a busy parent picture exactly what to do and say, in one read? FAIL if it is vague, abstract, or needs re-reading to act on.
Q3 (seenIt): Does seenIt show the child FOCUSING WELL, not struggling? FAIL if it mentions the worry, the problem, reminders, fights, quitting, or anything the child does badly.
Q4 (no parent-blame): FAIL if anything implies the parent–child relationship, or something "off between you", is the problem. ALSO FAIL if any line makes the PARENT the cause — e.g. "you push", "every reminder you give", "because you…". The child's wiring is the reason, never the parent.`;

  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  const q = (n: number) => /FAIL/i.test((text.match(new RegExp(`Q${n}[^\\n]*`, "i")) || [""])[0]) ? "FAIL"
    : /PASS/i.test((text.match(new RegExp(`Q${n}[^\\n]*`, "i")) || [""])[0]) ? "PASS" : "FAIL";
  const names = ["coherence", "usability", "seenIt", "relationship"];
  const failed = [1, 2, 3, 4].filter((n) => q(n) === "FAIL").map((n) => names[n - 1]);
  const verdict: "PASS" | "FAIL" = failed.length === 0 ? "PASS" : "FAIL";
  const reason = verdict === "PASS" ? "all four PASS"
    : failed.join(", ") + " FAIL — " + text.replace(/\s+/g, " ").slice(0, 240);
  return { verdict, reason, failed, inTok: res.usage?.input_tokens ?? 0, outTok: res.usage?.output_tokens ?? 0 };
}
