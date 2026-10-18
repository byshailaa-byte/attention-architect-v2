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
import { runCoachTurn, tooSimilar } from "../lib/coach/engine.ts";
import { finalCheck } from "../lib/coach/final-check.ts";
import { readTrackedNumbers } from "../lib/coach/numbers.ts";
import { callCoach } from "../lib/lms/coach/llm.ts";
import { detectLanguage, isShortNonAnswer } from "../lib/coach/lang.ts";
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
  await sql`DELETE FROM coach_messages WHERE trial_id=${EVAL_TRIAL}::uuid`;
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
    const r = await callCoach(sys, [{ role: "user", content: `Persona: ${persona}\n\n${transcript}` }], 220, undefined, 0); // temperature 0 = stable judge
    const m = r.text.match(/\{[\s\S]*\}/);
    const o = JSON.parse(m ? m[0] : r.text);
    const keys = ["listened_first", "explained_why", "one_plain_step", "followed_up", "no_repeats", "no_idioms", "right_language", "correct_escalation"];
    const scores: Record<string, boolean> = {};
    for (const k of keys) scores[k] = !!o[k];
    return { scores, notes: String(o.notes ?? "").slice(0, 120) };
  } catch (e) { return { scores: {}, notes: "judge error: " + (e as Error).message }; }
}

// guard=false disables the engine's no-repeat backstop (for the BEFORE/AFTER comparison).
async function runPersona(p: Persona, run: number, guard = true) {
  await cleanEvalState();
  const subject = { ...baseSubject, day: p.day ?? 1 };
  const history: CoachTurn[] = [];
  const allTools: ToolCallRecord[] = [];
  const coachReplies: string[] = [];
  let transcript = "", repeats = 0;
  const maxTurns = p.turns ? p.turns.length : (p.maxTurns ?? 4);

  for (let i = 0; i < maxTurns; i++) {
    const parentMsg = p.turns ? p.turns[i] : await parentLLM(p.drive!, transcript);
    const ctx = await assembleCoachContext(subject, parentMsg, history); // pass in-memory history so the "conversation so far" block is populated
    const previousReply = [...history].reverse().find((h) => h.role === "assistant")?.content;
    const res = await runCoachTurn({
      system: ctx.system, history, userMessage: parentMsg, tools: ctx.tools,
      toolSubject: ctx.toolSubject, language: ctx.language,
      previousReply, guardRepeat: guard && isShortNonAnswer(parentMsg),
    });
    // Deterministic repeat signal: is this reply a near-duplicate of the Coach's previous one?
    if (previousReply && tooSimilar(res.text, previousReply)) repeats++;
    coachReplies.push(res.text);
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

  return { id: p.id, run, transcript, allTools, toolChecks, judge: j, finalCheck: fc, repeats };
}

const CRITERIA = ["listened_first", "explained_why", "one_plain_step", "followed_up", "no_repeats", "no_idioms", "right_language", "correct_escalation"];

async function main() {
  console.log(`\n######## CONVERSATIONAL COACH — SCENARIO EVAL (${RUNS} runs) ########`);
  console.log("Anonymised: parent 'Sneha' + child 'Diya' are fictional (sandbox preview trial); no real names, phones or parent data used.\n");
  const toolTally: Record<string, { pass: number; total: number }> = {};
  const judgeTally = { pass: 0, total: 0 };
  const critFail: Record<string, number> = Object.fromEntries(CRITERIA.map((c) => [c, 0]));
  const critExample: Record<string, string> = {};
  const perPersonaScores: Record<string, number[]> = {}; // each persona's judge score (0-8) per run → median
  let afterRepeats = 0;

  for (let run = 1; run <= RUNS; run++) {
    console.log(`\n========================= RUN ${run} (guard ON) =========================`);
    for (const p of PERSONAS) {
      const r = await runPersona(p, run, true);
      afterRepeats += r.repeats;
      const tcPass = r.toolChecks.filter((c) => c.pass).length;
      const jPass = Object.values(r.judge.scores).filter(Boolean).length;
      const jTotal = Object.keys(r.judge.scores).length;
      judgeTally.pass += jPass; judgeTally.total += jTotal;
      (perPersonaScores[p.id] ??= []).push(jPass);
      const t = (toolTally[p.id] ??= { pass: 0, total: 0 });
      t.pass += tcPass; t.total += r.toolChecks.length;
      for (const [k, v] of Object.entries(r.judge.scores)) if (!v) { critFail[k] = (critFail[k] ?? 0) + 1; if (!critExample[k]) critExample[k] = `${p.id}: ${r.judge.notes}`; }

      console.log(`\n--- ${p.id} ---`);
      if (run === 1) console.log(r.transcript.trim());
      console.log(`TOOLS: ${r.allTools.map((x) => `${x.name}${x.ok ? "" : "✗"}`).join(", ") || "(none)"} | repeats=${r.repeats}`);
      for (const c of r.toolChecks) console.log(`  [${c.pass ? "PASS" : "FAIL"}] ${c.name}${c.pass ? "" : "  — " + c.detail}`);
      console.log(`  judge: ${jPass}/${jTotal}  ${Object.entries(r.judge.scores).filter(([, v]) => !v).map(([k]) => "✗" + k).join(" ")}  "${r.judge.notes}"`);
      if (!r.finalCheck.ok) console.log(`  final-check: ${r.finalCheck.detail.join("; ")}`);
    }
  }

  // BEFORE pass: identical scenarios with the no-repeat backstop OFF, to show the contrast.
  console.log(`\n========================= BEFORE (guard OFF, 1 pass) =========================`);
  let beforeRepeats = 0; const beforeCritFail: Record<string, number> = { no_repeats: 0 };
  for (const p of PERSONAS) {
    const r = await runPersona(p, 0, false);
    beforeRepeats += r.repeats;
    if (r.judge.scores.no_repeats === false) beforeCritFail.no_repeats++;
    console.log(`  ${p.id.padEnd(28)} repeats=${r.repeats}  judge.no_repeats=${r.judge.scores.no_repeats === false ? "FAIL" : "ok"}`);
  }

  // PAID JSON PATH: the paid route (CoachScreen) calls jsonCoachTurn, which runs this SAME engine
  // with NO onDelta (buffered, returned as JSON) — the paid route only adds buildPaidSubject + the
  // JSON wrapper. We exercise the non-streaming engine path + backstop here (jsonCoachTurn itself
  // can't be imported under tsx — it pulls Next 'server-only' via report-v2/service).
  console.log(`\n========================= PAID JSON PATH (non-streaming engine, same backstop) =========================`);
  let paidJudgePass = 0, paidJudgeTotal = 0;
  for (const p of [PERSONAS[0], PERSONAS[1], PERSONAS[7]]) { // baseline + didnt_work→Hindi + "I don't understand"
    await cleanEvalState();
    const subject = { ...baseSubject, day: p.day ?? 1 };
    const history: CoachTurn[] = [];
    let transcript = "";
    for (const parentMsg of p.turns!) {
      const ctx = await assembleCoachContext(subject, parentMsg, history);
      const previousReply = [...history].reverse().find((h) => h.role === "assistant")?.content;
      const res = await runCoachTurn({
        system: ctx.system, history, userMessage: parentMsg, tools: ctx.tools, toolSubject: ctx.toolSubject,
        language: ctx.language, previousReply, guardRepeat: isShortNonAnswer(parentMsg), // NO onDelta = JSON/buffered shape
      });
      history.push({ role: "user", content: parentMsg }, { role: "assistant", content: res.text });
      transcript += `Parent: ${parentMsg}\nCoach: ${res.text}\n`;
      console.log(`  [${p.id}] JSON ok=${!!res.text && !res.errored} replyLen=${res.text.length} tools=[${res.toolCalls.map((t) => t.name).join(",")}] guard=${res.repeatGuard ?? "-"} ₹${(res.costPaise / 100).toFixed(2)}`);
    }
    const pj = await judge(transcript, p.id);
    paidJudgePass += Object.values(pj.scores).filter(Boolean).length; paidJudgeTotal += Object.keys(pj.scores).length;
  }
  console.log(`  PAID PATH judge: ${paidJudgePass}/${paidJudgeTotal} = ${Math.round((paidJudgePass / paidJudgeTotal) * 100)}%`);

  console.log(`\n######## SUMMARY (${RUNS} guarded runs) ########`);
  let allToolPass = 0, allToolTotal = 0;
  for (const [id, t] of Object.entries(toolTally)) { console.log(`  tool-checks ${id.padEnd(28)} ${t.pass}/${t.total}`); allToolPass += t.pass; allToolTotal += t.total; }
  console.log(`\n  TOOL-CALL CHECKS: ${allToolPass}/${allToolTotal}`);
  console.log(`  LLM JUDGE (method criteria, mean over ${RUNS} runs): ${judgeTally.pass}/${judgeTally.total} = ${Math.round((judgeTally.pass / judgeTally.total) * 100)}%`);
  // Per-persona MEDIAN of the 3 run-scores (robust to a single off run), + overall from medians.
  const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  let medSum = 0; const nPersona = Object.keys(perPersonaScores).length;
  console.log(`\n  PER-PERSONA JUDGE MEDIAN (of ${RUNS} runs, out of 8):`);
  for (const [id, scores] of Object.entries(perPersonaScores)) { const m = median(scores); medSum += m; console.log(`    ${id.padEnd(28)} median ${m}/8   runs=[${scores.join(",")}]`); }
  console.log(`  OVERALL (sum of medians): ${medSum}/${nPersona * 8} = ${Math.round((medSum / (nPersona * 8)) * 100)}%`);
  console.log(`\n  PER-CRITERION FAILURE TABLE (out of ${RUNS * PERSONAS.length} persona-runs):`);
  console.log(`  criterion            fails  example`);
  for (const c of CRITERIA) console.log(`  ${c.padEnd(20)} ${String(critFail[c]).padEnd(5)}  ${critFail[c] ? critExample[c] : "—"}`);
  console.log(`\n  NO_REPEATS (deterministic near-duplicate count across all turns):`);
  console.log(`    BEFORE (guard off, 1 pass): ${beforeRepeats} repeats, ${beforeCritFail.no_repeats} judge no_repeats fails`);
  console.log(`    AFTER  (guard on, ${RUNS} passes): ${afterRepeats} repeats, ${critFail.no_repeats} judge no_repeats fails`);
  await cleanEvalState();
  console.log("\n[eval state cleaned] — all data anonymised (fictional Sneha/Diya; no real PII)");
}
main().catch((e) => { console.error("EVAL ERROR:", e); process.exit(1); });
