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

export type JudgeVerdict = { verdict: "PASS" | "FAIL"; reason: string; failed: string[]; raw: string; inTok: number; outTok: number };

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

Q1 (coherence): Judge FOUR things — (a) hardPart's SECOND sentence (the real reason) follows from the archetype mechanism AS IT SHOWS AT ${moment}; (b) switch.try IS the Week 1 core move (not generic encouragement); (c) switch + tonight 1–2 happen AT ${moment}; (d) tonight's THIRD step is a "Notice:" check of the worry's outcome.
IMPORTANT: the hardPart MUST use the format "{Name} isn't <wrong read>. <real reason>." Do NOT fail it for "reframing the worry away" or for saying "isn't giving up / isn't refusing" — that contrast is REQUIRED and correct. Judge ONLY whether the SECOND sentence is coherent at the moment; never penalise the mandated "isn't X" shape itself.
PASS examples (these are COHERENT — Q1 PASS):
 • "Riya isn't giving up. She's fighting being told." + try "Table or floor? Easy bit or hard bit first?" (a real small choice = the Week 1 move), at the moment after a mistake.
 • "Kai isn't giving up. He drifts to the next idea." + try "Put that idea on the pad, then come back to this."
 • "Aria isn't giving up. Getting back in after a stumble is hard." + try "25 minutes, no interruptions."
FAIL examples (these are INCOHERENT — Q1 FAIL):
 • try "Let me sit with you and we'll start it together" for a child whose method is a real say → contradicts the Week 1 autonomy move.
 • "He's waiting to start his own way" for a FINISHING worry → diagnoses starting; the worry is finishing (mismatch of reason and moment).
 • "She's drifting when her side-ideas get shut down" → blames the parent, not the child's own wiring, and contradicts the mechanism.
Otherwise FAIL only if it genuinely drifts to generic advice, contradicts the mechanism, the switch is not the Week 1 move, the switch/tonight do not happen at ${moment}, or the third tonight step is not a Notice check.
Q2 (usability): Could a busy parent picture exactly what to do and say, in one read? FAIL if it is vague, abstract, or needs re-reading to act on.
Q3 (seenIt): Does seenIt show the child FOCUSING WELL, not struggling? FAIL if it mentions the worry, the problem, reminders, fights, quitting, or anything the child does badly.
Q4 (no parent-blame): FAIL if anything implies the parent–child relationship, or something "off between you", is the problem. ALSO FAIL if any line makes the PARENT the cause — e.g. "you push", "every reminder you give", "because you…". The child's wiring is the reason, never the parent.`;

  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 400,
    temperature: 0, // deterministic verdicts — stop the PASS↔FAIL flips on identical drafts
    messages: [{ role: "user", content: prompt }],
  });
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  // Read ONLY the verdict token immediately after "Qn:" — not /FAIL/i across the whole line, which
  // matched the word "failure" in a reason like "…after the first failure…" and wrongly failed giveup
  // reports (the worry's moment literally contains "failure"). Default to FAIL if the token is missing.
  const q = (n: number): "PASS" | "FAIL" => {
    const m = text.match(new RegExp(`Q${n}\\s*[:：\\-]?\\s*\\*{0,2}\\s*(PASS|FAIL)`, "i"));
    return m ? (m[1].toUpperCase() as "PASS" | "FAIL") : "FAIL";
  };
  const names = ["coherence", "usability", "seenIt", "relationship"];
  const failed = [1, 2, 3, 4].filter((n) => q(n) === "FAIL").map((n) => names[n - 1]);
  const verdict: "PASS" | "FAIL" = failed.length === 0 ? "PASS" : "FAIL";
  const reason = verdict === "PASS" ? "all four PASS"
    : failed.join(", ") + " FAIL — " + text.replace(/\s+/g, " ").slice(0, 240);
  // raw = the judge's full four-line verdict (per-question PASS/FAIL + reason) for diagnostics/instrumentation.
  return { verdict, reason, failed, raw: text, inTok: res.usage?.input_tokens ?? 0, outTok: res.usage?.output_tokens ?? 0 };
}

// Q1 majority-of-3: run the judge three times (temperature 0) and take a 2-of-3 majority FOR Q1
// (coherence) ONLY — the question that flipped on identical drafts. Q2/Q3/Q4 come from run 1 (temp 0
// keeps them stable). Costs 2 extra judge calls per generation; tokens are summed. (All-four majority
// is free given the 3 calls and would further stabilise Q3/Q4 — left off per the Q1-only spec.)
export async function judgeCoherenceVoted(args: Parameters<typeof judgeCoherence>[0]): Promise<JudgeVerdict> {
  const runs = await Promise.all([judgeCoherence(args), judgeCoherence(args), judgeCoherence(args)]);
  const q1Fails = runs.filter((r) => r.failed.includes("coherence")).length;
  const base = runs[0];
  const failed = [...(q1Fails >= 2 ? ["coherence"] : []), ...base.failed.filter((f) => f !== "coherence")];
  const verdict: "PASS" | "FAIL" = failed.length === 0 ? "PASS" : "FAIL";
  const inTok = runs.reduce((s, r) => s + r.inTok, 0);
  const outTok = runs.reduce((s, r) => s + r.outTok, 0);
  const reason = verdict === "PASS" ? `all pass (Q1 ${q1Fails}/3 FAIL)` : `${failed.join(", ")} FAIL — Q1 ${q1Fails}/3; ${base.raw.replace(/\s+/g, " ").slice(0, 200)}`;
  return { verdict, reason, failed, raw: `[Q1 votes ${q1Fails}/3 FAIL]\n${base.raw}`, inTok, outTok };
}
