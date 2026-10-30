// Context assembler for the conversational Coach. Builds the whole system prompt server-side:
// the method (lib/coach/method.ts) + a dynamic block the model uses SILENTLY — child profile, the
// plain "why", parent_memory (read FIRST), tonight's step as SOURCE MATERIAL (never pasted), recent
// outcomes + the tracked baseline, 2–3 similar gold examples, and (flag-gated OFF in prod) what works
// for similar children. All report/archetype/step text is run through plainText() so the Coach is
// never fed an internal term or idiom to parrot (condition 8).
import { getSql } from "@/lib/db/client";
import { buildMethodPrompt, type CoachMode, type Language } from "@/lib/coach/method";
import { COACH_TOOLS, type ToolSubject } from "@/lib/coach/tools";
import { readParentMemory, getLanguagePref } from "@/lib/coach/memory";
import { retrieveGold, situationSignals, formatGoldForPrompt } from "@/lib/coach/gold";
import { whatWorksFor, formatWorksStat } from "@/lib/coach/stats";
import { readTrackedNumbers, getBaseline, fmtRange } from "@/lib/coach/numbers";
import { readOutcomes } from "@/lib/lms/coach/outcomes";
import { resolveReplyLanguage } from "@/lib/coach/lang";
import type { CoachTurn } from "@/lib/lms/coach/llm";
import type { Gender } from "@/lib/report/pronouns";

export function coachPronoun(gender: Gender): "he" | "she" | "they" {
  return gender === "boy" ? "he" : gender === "girl" ? "she" : "they";
}

// Replace known internal terms / idioms with plain words so nothing jargon-y is fed to the model.
// This is belt-and-braces: the method prompt also tells the Coach to explain in its own plain words.
const PLAIN_MAP: [RegExp, string][] = [
  [/\brunning the call\b/gi, "being in charge"],
  [/\brun the call\b/gi, "be in charge"],
  [/\b(your|her|his|their) call\b/gi, "$1 decision"],
  [/\bmake the call\b/gi, "decide"],
  [/\bswitch(es)?\s+(her|his|their)\s+drive\s+off\b/gi, "makes $2 stop wanting to try"],
  [/\bdrive\s+off\b/gi, "lose interest"],
  [/\bstep back\b/gi, "give space"],
  [/\bstep in\b/gi, "help"],
  [/\bown it\b/gi, "take charge"],
  [/\bswitch(es)? on\b/gi, "get going"],
  [/\bswitch(es)? off\b/gi, "shut down"],
  [/\bhold the line\b/gi, "stay calm and steady"],
  [/\blean into\b/gi, "use"],
];
export function plainText(s: string | null | undefined): string {
  let t = (s ?? "").replace(/[*_]/g, "").trim();
  for (const [re, rep] of PLAIN_MAP) t = t.replace(re, rep);
  return t;
}

// Everything a route has resolved about this parent/child, normalised across trial + paid.
export type CoachSubjectInput = {
  kind: "paid" | "trial";
  subjectId: string;          // user_id (paid) or trial_id (trial)
  assessmentId: string | null;
  mode: CoachMode;            // 'trial' | 'paid'
  parentFirst: string;
  child: string;
  childGender: Gender;
  ageBand: string;
  archetype: string;
  worryKey: string | null;
  worryLabel: string;
  parentPattern: string | null;
  hardPartRaw: string;        // report hardPart (raw; sanitised here)
  archetypeDescRaw: string;   // archetype description (raw; sanitised here)
  stepSourceRaw: string;      // tonight's step idea (raw; sanitised here) — SOURCE MATERIAL
  stepTitleRaw?: string;
  supportEmail: string;
  week: number;               // paid week (1 for trial)
  day: number;                // current day (trial 1..4; paid day)
};

export type AssembledContext = {
  system: string;
  history: CoachTurn[];
  tools: typeof COACH_TOOLS;
  toolSubject: ToolSubject;
  language: Language;
};

async function loadHistory(kind: "paid" | "trial", subjectId: string, limit = 16): Promise<CoachTurn[]> {
  const sql = getSql();
  const rows = kind === "trial"
    ? (await sql`SELECT role, content FROM coach_messages WHERE trial_id=${subjectId}::uuid AND role IN ('parent','coach') ORDER BY created_at DESC LIMIT ${limit}`)
    : (await sql`SELECT role, content FROM coach_messages WHERE user_id=${subjectId} AND trial_id IS NULL AND role IN ('parent','coach') ORDER BY created_at DESC LIMIT ${limit}`);
  return (rows as unknown as { role: string; content: string }[]).reverse().map((r) => ({ role: r.role === "parent" ? "user" : "assistant", content: r.content }));
}

// A compact, explicit record of the live thread so the Coach carries it across a language switch or
// a non-answer and never re-asks. Built from the SAME history the model sees.
function conversationSoFar(history: CoachTurn[], parent: string): string {
  const parentMsgs = history.filter((h) => h.role === "user").map((h) => h.content.trim()).filter(Boolean).slice(-5);
  const coachQs: string[] = [];
  for (const h of history.filter((h) => h.role === "assistant")) {
    for (const s of h.content.split(/(?<=[.?!])\s+/)) {
      const t = s.trim().replace(/\s+/g, " ");
      if (t.endsWith("?") && t.length > 8) coachQs.push(t);
    }
  }
  const uniqQs = [...new Set(coachQs)].slice(-5);
  // Exact quoted lines already suggested (so the Coach doesn't repeat a step/quote verbatim).
  const quoted: string[] = [];
  for (const h of history.filter((h) => h.role === "assistant")) {
    for (const m of h.content.matchAll(/[“"]([^”"]{6,})[”"]/g)) quoted.push(m[1].trim());
  }
  const uniqQuoted = [...new Set(quoted)].slice(-4);
  if (!parentMsgs.length && !uniqQs.length && !uniqQuoted.length) return "";
  const out = ["\n\n## This conversation so far (carry it forward; NEVER re-ask or start over)"];
  if (parentMsgs.length) out.push(`${parent} has told you (oldest first): ${parentMsgs.map((m) => `"${m.slice(0, 140)}"`).join("  |  ")}`);
  if (uniqQs.length) out.push(`You have ALREADY asked these — do NOT ask any of them again: ${uniqQs.map((q) => `"${q}"`).join("  ")}`);
  if (uniqQuoted.length) out.push(`Lines/steps you ALREADY gave — do NOT repeat these words; refer back briefly if the step still stands: ${uniqQuoted.map((q) => `"${q}"`).join("  ")}`);
  out.push(`If something you asked is still unanswered after one try — including when ${parent} only switches language or says "ok"/"theek hai" — stop asking and give the single next step with its why, in ${parent}'s language. Do not assume a cause ${parent} didn't state.`);
  return out.join("\n");
}

export async function assembleCoachContext(input: CoachSubjectInput, latestMessage = "", historyOverride?: CoachTurn[]): Promise<AssembledContext> {
  const pronoun = coachPronoun(input.childGender);
  const history = historyOverride ?? await loadHistory(input.kind, input.subjectId);

  // Language: the parent's LATEST message wins (its language + script); a stored preference only seeds
  // the opener. So English after a Hindi preference gets an English reply. (See resolveReplyLanguage.)
  const stored = await getLanguagePref(input.kind, input.subjectId);
  const language: Language = resolveReplyLanguage(stored, latestMessage);

  const system0 = buildMethodPrompt({
    mode: input.mode, parent: input.parentFirst, child: input.child, pronoun, language, supportEmail: input.supportEmail,
  });

  const mem = await readParentMemory(input.kind, input.subjectId);
  const outcomes = (await readOutcomes(input.kind, input.subjectId)).slice(-3);
  const nums = await readTrackedNumbers(input.kind, input.subjectId);
  const baselines = [...new Set(nums.filter((n) => n.phase === "baseline").map((n) => n.metric))]
    .map((m) => getBaseline(nums, m)).filter(Boolean);
  const gold = await retrieveGold({
    worry: input.worryKey, archetype: input.archetype, ageBand: input.ageBand, language,
    signals: situationSignals(latestMessage), limit: 3,
  });
  const stat = await whatWorksFor(input.archetype, input.worryKey, input.ageBand).catch(() => null);

  const whyPlain = plainText(input.hardPartRaw);
  const archetypeHuman = plainText(input.archetypeDescRaw);
  const stepSource = plainText(input.stepSourceRaw);
  const stepTitle = plainText(input.stepTitleRaw ?? "");

  const positionLine = input.mode === "trial"
    ? `This is Day ${input.day} of the 4-day quick start.`
    : `Right now: Week ${input.week}, Day ${input.day}.`;

  const lines: string[] = [
    `\n\n## What you know about this family (use silently; never name these fields or labels)`,
    `Child: ${input.child} (${pronoun}), age ${input.ageBand}. How ${pronoun} tends to be: ${archetypeHuman}`,
    input.parentPattern ? `The parent's usual instinct: ${plainText(input.parentPattern)}.` : "",
    `What ${input.parentFirst} came worried about: ${plainText(input.worryLabel)}.`,
    whyPlain ? `Why it's hard for ${input.child} (your private understanding — say it in your OWN plain words, never these): ${whyPlain}` : "",
    positionLine,
    stepSource ? `Tonight's step idea you can draw on (SOURCE MATERIAL — explain it plainly in your own words, adapt it to what ${input.parentFirst} tells you, and NEVER paste it): ${stepTitle ? stepTitle + " — " : ""}${stepSource}` : "",
    mem.summary ? `What you remember about them (read this first): ${mem.summary}` : "",
    mem.facts.length ? `Remembered facts: ${mem.facts.join("; ")}.` : "",
    outcomes.length ? `Recent step outcomes: ${outcomes.map((o) => `D${o.day}=${o.outcome}`).join(", ")}.` : "",
    baselines.length ? `Numbers ${input.parentFirst} gave you (use ONLY these, never round): ${baselines.map((b) => `${b!.metric} started at ${fmtRange(b!.min, b!.max)}${b!.parentWords ? ` ("${b!.parentWords}")` : ""}`).join("; ")}.` : "",
  ].filter(Boolean);

  const system = system0 + lines.join("\n") + conversationSoFar(history, input.parentFirst) + formatGoldForPrompt(gold) + formatWorksStat(stat, input.child);

  // adjust_next_step is paid-only (the trial has a fixed 4-day quick start, not the adjustable plan).
  const tools = input.kind === "paid" ? COACH_TOOLS : COACH_TOOLS.filter((t) => t.name !== "adjust_next_step");

  return {
    system,
    history,
    tools,
    toolSubject: {
      kind: input.kind, subjectId: input.subjectId, assessmentId: input.assessmentId,
      week: input.week, day: input.day,
      archetype: input.archetype, ageBand: input.ageBand, childName: input.child, childGender: input.childGender,
    },
    language,
  };
}
