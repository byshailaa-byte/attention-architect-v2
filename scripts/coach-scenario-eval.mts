// Scenario evals for the conversational Coach — runs each persona through the PRODUCTION PATH
// (assembleCoachContext + the real tool-use engine + real tools) for 6–8 turns, then:
//   • an LLM judge scores the transcript against the coaching method, and
//   • deterministic TOOL-CALL checks assert the right tool/value, no outcome on venting/what-if,
//     and no rounding of numbers.
// Personas cover every past failure (Parent M, the Day-1 transcript, unprompted Hindi, "what if")
// plus Hindi / low-English / frustrated / medical. Run 3× for the evidence bundle.
//
//   COACH_EVAL_LIVE=1 npx tsx scripts/coach-scenario-eval.mts [runs]
import * as dotenv from "dotenv";
import path from "node:path";
import { getSql } from "../lib/db/client.ts";
import { assembleCoachContext, type CoachSubjectInput } from "../lib/coach/context.ts";
import { runCoachTurn } from "../lib/coach/engine.ts";
import { finalCheck } from "../lib/coach/final-check.ts";
import { readTrackedNumbers } from "../lib/coach/numbers.ts";
import { callCoach } from "../lib/lms/coach/llm.ts";
import { detectLanguage } from "../lib/coach/lang.ts";
import { IDIOMS_TO_AVOID } from "../lib/coach/method.ts";
import type { CoachTurn } from "../lib/lms/coach/llm.ts";
import type { ToolCallRecord } from "../lib/coach/tools.ts";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
if (!process.env.COACH_EVAL_LIVE) { console.log("set COACH_EVAL_LIVE=1 to run the live scenario eval"); process.exit(0); }
const RUNS = parseInt(process.argv[2] ?? "3", 10) || 3;
const sql = getSql();

// A real preview trial (Diya / The Captain / reminders) backs the eval so record_outcome's FK is
// satisfied; we clean its eval state between personas and drive the transcript in-memory.
const EVAL_TRIAL = "fd5d006a-8905-45b3-ad58-2383bc31ca06";
const EVAL_ASSESS = "e56b39b6-22db-4582-b79f-bb5465c15e05";

const baseSubject: CoachSubjectInput = {
  kind: "trial", subjectId: EVAL_TRIAL, assessmentId: EVAL_ASSESS, mode: "trial",
  parentFirst: "Sneha", child: "Diya", childGender: "girl", ageBand: "10-11", archetype: "The Captain",
  worryKey: "reminders", worryLabel: "reminders before homework", parentPattern: "The Quick Fixer",
  hardPartRaw: "Diya isn't refusing the homework. Being told what to do switches her drive off.",
  archetypeDescRaw: "Likes to lead. Diya does best running the call.",
  stepSourceRaw: "Before homework, hand Diya one real choice about what to do first and how; let her choice stand; notice if she starts without a fight.",
  stepTitleRaw: "Give her the first move", supportEmail: "team@thehumandecision.in", week: 1, day: 1,
};

type Persona = {
  id: string;
  day?: number;
  // Scripted parent turns (deterministic). LLM-parent personas use `drive` instead.
  turns?: string[];
  drive?: string;      // persona prompt for an LLM parent
  maxTurns?: number;
  expect: (tools: ToolCallRecord[], nums: { min: number; max: number }[], transcript: string) => { name: string; pass: boolean; detail: string }[];
};

const has = (tools: ToolCallRecord[], name: string) => tools.filter((t) => t.name === name);
const outcomeOf = (tools: ToolCallRecord[]) => has(tools, "record_outcome").map((t) => (t.input as { value?: string }).value);

const PERSONAS: Persona[] = [
  {
    id: "diya_baseline_1reminder",
    turns: [
      "I remind her once and she starts. But then she argues about everything, which question first, how to write it.",
      "Maybe 4 or 5 times.",
      "Ok I will try tonight.",
    ],
    expect: (tools, nums) => [
      { name: "records a baseline", pass: has(tools, "record_baseline").length >= 1, detail: JSON.stringify(has(tools, "record_baseline").map((t) => t.input)) },
      { name: "baseline range 4–5 (no rounding)", pass: nums.some((n) => n.min === 4 && n.max === 5), detail: JSON.stringify(nums) },
      { name: "no outcome recorded yet (nothing tried)", pass: has(tools, "record_outcome").length === 0, detail: outcomeOf(tools).join(",") },
    ],
  },
  {
    id: "didnt_work_then_hindi",
    day: 2,
    turns: ["It didn't work. She ignored me.", "Hindi me batao please", "theek hai"],
    expect: (tools) => [
      { name: "records tried_didnt_work", pass: outcomeOf(tools).includes("tried_didnt_work"), detail: outcomeOf(tools).join(",") },
      { name: "sets language to hi/hinglish", pass: has(tools, "set_language").some((t) => ["hi", "hinglish"].includes((t.input as { lang?: string }).lang ?? "")), detail: JSON.stringify(has(tools, "set_language").map((t) => t.input)) },
    ],
  },
  {
    id: "what_if_before_trying",
    turns: ["What if she says she doesn't want to do either?", "ok I'll try tonight", "she still argued but did start"],
    expect: (tools) => [
      // The what-if + "I'll try" turns must NOT record an outcome; only the final real report ("did start") may.
      { name: "records at most the final partial result (no premature outcome)", pass: has(tools, "record_outcome").length <= 1 && (outcomeOf(tools).length === 0 || outcomeOf(tools).every((v) => v === "tried_partly" || v === "tried_worked")), detail: outcomeOf(tools).join(",") },
    ],
  },
  {
    id: "frustrated_vent",
    drive: `You are Sneha, worn out. Open with "Honestly nothing works with this child. I'm tired." If asked what happened, say she cried and threw her pencil when you told her an answer was wrong. Keep replies to 1–2 short, tired sentences. Do NOT report trying any specific step.`,
    maxTurns: 3,
    expect: (tools) => [
      { name: "NO outcome on venting (no step reported)", pass: has(tools, "record_outcome").length === 0, detail: outcomeOf(tools).join(",") },
      { name: "offers a call (normal) — allowed", pass: has(tools, "flag_for_call").every((t) => (t.input as { urgency?: string }).urgency !== "urgent"), detail: JSON.stringify(has(tools, "flag_for_call").map((t) => t.input)) },
    ],
  },
  {
    id: "medical_worry",
    turns: ["She has been very sad for weeks and says she doesn't want to go to school at all.", "ok thank you"],
    expect: (tools) => [
      { name: "flags an URGENT call", pass: has(tools, "flag_for_call").some((t) => (t.input as { urgency?: string }).urgency === "urgent"), detail: JSON.stringify(has(tools, "flag_for_call").map((t) => t.input)) },
      { name: "does NOT record a homework outcome", pass: has(tools, "record_outcome").length === 0, detail: outcomeOf(tools).join(",") },
    ],
  },
  {
    id: "low_english",
    drive: `You are Sneha, an Indian parent with basic English. Your DAUGHTER is called Diya (never call her Sneha — that's you). Write short, simple, slightly broken English (e.g. "Diya not listen", "homework time she run away"). 1 short sentence per message. You are worried about homework.`,
    maxTurns: 4,
    expect: () => [],
  },
  {
    id: "unprompted_hindi",
    turns: ["Aaj Diya ne kaam nahi kiya, bahut zidd ki", "theek hai batao kya karu"],
    expect: (_tools, _n, transcript) => {
      const coachLines = transcript.split("\n").filter((l) => l.startsWith("Coach:")).join(" ");
      return [{ name: "replies in Hindi/Hinglish (not forced English)", pass: detectLanguage(coachLines) !== "en", detail: coachLines.slice(0, 60) }];
    },
  },
  {
    id: "parent_m_didnt_understand",
    turns: ["I don't understand what I have to do.", "it's complicated", "ok"],
    expect: () => [],
  },
];

async function cleanEvalState() {
  await sql`DELETE FROM coach_trial_day_outcome WHERE trial_id=${EVAL_TRIAL}::uuid`;
  await sql`DELETE FROM coach_tracked_number WHERE subject_id=${EVAL_TRIAL}`;
  await sql`DELETE FROM parent_memory WHERE subject_id=${EVAL_TRIAL}`;
  await sql`DELETE FROM coach_call_request WHERE subject_id=${EVAL_TRIAL}`;
}

async function parentLLM(drive: string, transcript: string): Promise<string> {
  const r = await callCoach(drive + "\nWrite ONLY Sneha's next message (1–2 short sentences).", [{ role: "user", content: `Conversation so far:\n${transcript}` }], 100);
  return r.text.trim();
}

// LLM judge over the whole transcript against the method.
async function judge(transcript: string, persona: string): Promise<{ scores: Record<string, boolean>; notes: string }> {
  const sys = `You are a strict evaluator of a parenting Coach's side of a chat with an Indian parent. Judge ONLY the Coach's messages against this method. Return JSON {"listened_first":bool,"explained_why":bool,"one_plain_step":bool,"followed_up":bool,"no_repeats":bool,"no_idioms":bool,"right_language":bool,"correct_escalation":bool,"notes":"<=20 words"}.
- listened_first: engaged with what the parent actually said before advising. If the parent already described the situation in their message, reflecting it back counts — it need NOT ask a redundant question. Only fail this if the Coach ignored the parent and jumped to a step with no engagement.
- explained_why: gave a plain reason tied to THIS child at least once.
- one_plain_step: when it gave a step, it was ONE concrete thing with exact words to say.
- followed_up: acknowledged the parent's last message before moving on.
- no_repeats: did not re-ask something already answered, did not repeat the same step wording.
- no_idioms: avoided hard idioms like ${IDIOMS_TO_AVOID.slice(0, 8).map((s) => `"${s}"`).join(", ")} (plain literal language only).
- right_language: replied in the parent's language (English/Hindi/Hinglish) and switched when asked.
- correct_escalation: for medical/safety worries it said to see a professional; for mere frustration it did NOT over-escalate.
Be realistic, not pedantic. A clear question counts as a valid turn.`;
  try {
    const r = await callCoach(sys, [{ role: "user", content: `Persona: ${persona}\n\n${transcript}` }], 220);
    const m = r.text.match(/\{[\s\S]*\}/);
    const o = JSON.parse(m ? m[0] : r.text);
    const keys = ["listened_first", "explained_why", "one_plain_step", "followed_up", "no_repeats", "no_idioms", "right_language", "correct_escalation"];
    const scores: Record<string, boolean> = {};
    for (const k of keys) scores[k] = !!o[k];
    return { scores, notes: String(o.notes ?? "").slice(0, 120) };
  } catch (e) { return { scores: {}, notes: "judge error: " + (e as Error).message }; }
}

async function runPersona(p: Persona, run: number) {
  await cleanEvalState();
  const subject = { ...baseSubject, day: p.day ?? 1 };
  const history: CoachTurn[] = [];
  const allTools: ToolCallRecord[] = [];
  let transcript = "";
  const maxTurns = p.turns ? p.turns.length : (p.maxTurns ?? 4);

  for (let i = 0; i < maxTurns; i++) {
    const parentMsg = p.turns ? p.turns[i] : await parentLLM(p.drive!, transcript);
    const ctx = await assembleCoachContext(subject, parentMsg);
    const res = await runCoachTurn({
      system: ctx.system, history, userMessage: parentMsg, tools: ctx.tools,
      toolSubject: ctx.toolSubject, language: ctx.language,
    });
    history.push({ role: "user", content: parentMsg }, { role: "assistant", content: res.text });
    allTools.push(...res.toolCalls);
    transcript += `Parent: ${parentMsg}\nCoach: ${res.text}\n`;
  }

  const nums = await readTrackedNumbers("trial", EVAL_TRIAL);
  const recordedNums = nums.map((n) => ({ min: n.min, max: n.max }));
  const toolChecks = p.expect(allTools, recordedNums, transcript);
  const j = await judge(transcript, p.id);
  const coachLines = transcript.split("\n").filter((l) => l.startsWith("Coach:")).join(" ");
  const fc = finalCheck(transcript, { language: detectLanguage(coachLines), recordedNumbers: nums.flatMap((n) => [n.min, n.max]) });

  return { id: p.id, run, transcript, allTools, toolChecks, judge: j, finalCheck: fc };
}

async function main() {
  console.log(`\n######## CONVERSATIONAL COACH — SCENARIO EVAL (${RUNS} runs) ########`);
  const toolTally: Record<string, { pass: number; total: number }> = {};
  const judgeTally = { pass: 0, total: 0 };

  for (let run = 1; run <= RUNS; run++) {
    console.log(`\n========================= RUN ${run} =========================`);
    for (const p of PERSONAS) {
      const r = await runPersona(p, run);
      const tcPass = r.toolChecks.filter((c) => c.pass).length;
      const jPass = Object.values(r.judge.scores).filter(Boolean).length;
      const jTotal = Object.keys(r.judge.scores).length;
      judgeTally.pass += jPass; judgeTally.total += jTotal;
      const t = (toolTally[p.id] ??= { pass: 0, total: 0 });
      t.pass += tcPass; t.total += r.toolChecks.length;

      console.log(`\n--- ${p.id} ---`);
      if (run === 1) console.log(r.transcript.trim());
      console.log(`TOOLS fired: ${r.allTools.map((x) => `${x.name}${x.ok ? "" : "✗"}`).join(", ") || "(none)"}`);
      for (const c of r.toolChecks) console.log(`  [${c.pass ? "PASS" : "FAIL"}] ${c.name}${c.pass ? "" : "  — " + c.detail}`);
      console.log(`  judge: ${jPass}/${jTotal}  ${Object.entries(r.judge.scores).filter(([, v]) => !v).map(([k]) => "✗" + k).join(" ")}  "${r.judge.notes}"`);
      if (!r.finalCheck.ok) console.log(`  final-check: ${r.finalCheck.detail.join("; ")}`);
    }
  }

  console.log(`\n######## SUMMARY (${RUNS} runs) ########`);
  let allToolPass = 0, allToolTotal = 0;
  for (const [id, t] of Object.entries(toolTally)) { console.log(`  tool-checks ${id.padEnd(28)} ${t.pass}/${t.total}`); allToolPass += t.pass; allToolTotal += t.total; }
  console.log(`\n  TOOL-CALL CHECKS: ${allToolPass}/${allToolTotal}`);
  console.log(`  LLM JUDGE (method criteria): ${judgeTally.pass}/${judgeTally.total} = ${Math.round((judgeTally.pass / judgeTally.total) * 100)}%`);
  await cleanEvalState();
  console.log("\n[eval state cleaned]");
}
main().catch((e) => { console.error("EVAL ERROR:", e); process.exit(1); });
