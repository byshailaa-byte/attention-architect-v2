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
import { extractOutcome, recordTrialOutcome } from "../lib/lms/coach/outcomes.ts";
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
  expect?: (tools: ToolCallRecord[], nums: { min: number; max: number }[], transcript: string) => { name: string; pass: boolean; detail: string }[];
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
  {
    id: "cant_not_wont",
    day: 2,
    turns: ["Diya just sits at maths and won't start. She's being lazy.", "I asked — she said she doesn't get how to do the division.", "ok"],
    expect: () => [],
  },
  {
    id: "bored_repetitive",
    day: 2,
    turns: ["She won't do her spellings, says it's boring doing the same thing again and again.", "ok what should I do"],
    expect: () => [],
  },
  {
    id: "upset_child",
    day: 2,
    turns: ["She saw the red cross on her book and burst into tears. Homework is over now.", "ok"],
    expect: () => [],
  },
  {
    id: "worked_twice",
    day: 3,
    turns: ["Sitting beside her while she starts has worked two days running — she starts calmly now.", "yes that's right", "ok will do"],
    expect: (tools) => [
      { name: "records a positive outcome", pass: outcomeOf(tools).some((v) => v === "tried_worked" || v === "tried_partly"), detail: outcomeOf(tools).join(",") },
    ],
  },
  {
    id: "not_tried_yet",
    day: 2,
    turns: ["Kal time hi nahi mila, bahut kaam tha.", "theek hai"],
    expect: (tools) => [
      { name: "NOT recorded as didnt_work", pass: !outcomeOf(tools).includes("tried_didnt_work"), detail: outcomeOf(tools).join(",") },
      { name: "recorded as not_tried (or left unrecorded)", pass: outcomeOf(tools).every((v) => v === "not_tried") , detail: outcomeOf(tools).join(",") },
    ],
  },
  {
    id: "father_hindi",
    day: 2,
    // A father writing in Hindi about a problem unlike any gold example (won't write, hides the book).
    turns: ["Beta likhne se bachta hai, kal usne copy hi chhupa di thi.", "pata nahi kyun karta hai", "accha batao"],
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
  const sys = `You are a strict evaluator of a parenting Coach's side of a chat with an Indian parent. Judge ONLY the Coach's messages against this method. Return JSON {"listened_first":bool,"explained_why":bool,"one_plain_step":bool,"followed_up":bool,"no_repeats":bool,"no_idioms":bool,"right_language":bool,"correct_escalation":bool,"no_unconfirmed_cause":bool,"asks_why_before_step":bool,"step_matches_reason":bool,"no_causation_claim":bool,"notes":"<=20 words"}.
- no_unconfirmed_cause: FALSE only if the Coach asserts a SITUATIONAL/circumstantial cause — something in the environment or that day (e.g. "the TV was on", "her brother interrupted", "she was tired") — that the parent did NOT say. Explaining the CHILD'S general temperament/pattern (e.g. "she likes to feel in charge", "being corrected can feel like losing") is the coaching method and is ALWAYS allowed = TRUE. A cause-independent step = TRUE.
- asks_why_before_step: when the child stopped/refused/gave up, the Coach found out WHY (hard / boring / didn't-know / upset) BEFORE giving a step — UNLESS the parent already said why. TRUE if no give-up/refusal in the chat, or the reason was known.
- step_matches_reason: the step fits the reason — a "didn't know how" child gets help with the first bit together (NOT persistence/try-harder advice); "boring" keeps the task but adds a choice; "upset" settles first. TRUE if N/A.
- no_causation_claim: the Coach did NOT claim it or the plan CAUSED the change (saying what changed is fine). TRUE if no such claim.
- listened_first: engaged with what the parent actually said before advising. If the parent already described the situation in their message, reflecting it back counts — it need NOT ask a redundant question. Only fail this if the Coach ignored the parent and jumped to a step with no engagement.
- explained_why: gave a plain reason tied to THIS child at least once.
- one_plain_step: when it gave a step, it was ONE concrete thing with exact words to say.
- followed_up: acknowledged the parent's last message before moving on.
- no_repeats: did not re-ask a question already ANSWERED, and did not restate the same step or exact quoted words. Asking a question ONE more time briefly, right after the parent switches language (they may not have understood), is acceptable — not a repeat. Fail only for the same unanswered question asked twice in the SAME language, or a step/quote repeated verbatim.
- no_idioms: avoided hard idioms like ${IDIOMS_TO_AVOID.slice(0, 8).map((s) => `"${s}"`).join(", ")} (plain literal language only).
- right_language: replied in the parent's language (English/Hindi/Hinglish) and switched when asked.
- correct_escalation: for medical/safety worries it said to see a professional; for mere frustration it did NOT over-escalate.
Be realistic, not pedantic. A clear question counts as a valid turn.`;
  try {
    const r = await callCoach(sys, [{ role: "user", content: `Persona: ${persona}\n\n${transcript}` }], 220, undefined, 0); // temperature 0 = stable judge
    const m = r.text.match(/\{[\s\S]*\}/);
    const o = JSON.parse(m ? m[0] : r.text);
    const keys = ["listened_first", "explained_why", "one_plain_step", "followed_up", "no_repeats", "no_idioms", "right_language", "correct_escalation", "no_unconfirmed_cause", "asks_why_before_step", "step_matches_reason", "no_causation_claim"];
    const scores: Record<string, boolean> = {};
    for (const k of keys) scores[k] = !!o[k];
    return { scores, notes: String(o.notes ?? "").slice(0, 120) };
  } catch (e) { return { scores: {}, notes: "judge error: " + (e as Error).message }; }
}

type DetCheck = { name: string; pass: boolean; detail: string };
// Approximate regex/tool checks (reported separately from the LLM judge). Only "applicable" ones score.
function deterministicChecks(id: string, coachText: string, allTools: ToolCallRecord[]): DetCheck[] {
  const out: DetCheck[] = [];
  const outVals = allTools.filter((t) => t.name === "record_outcome").map((t) => (t.input as { value?: string; via?: string }));
  const modelPositive = outVals.some((o) => (o.value === "tried_worked" || o.value === "tried_partly") && o.via !== "backstop");
  const hindi = /[ऀ-ॿ]/.test(coachText) || /\b(aap|kijiye|poochiye|dekhiye|kahiye|karna|rahega)\b/i.test(coachText);
  const hasStep = /["“][^"”]{6,}["”]/.test(coachText); // a quoted exact-words line = a step was given
  const noticeMarker = /\b(notice|watch|dhyaan|dekhiye|gaur)\b/i.test(coachText);
  const screenReward = /\b(screen|tv|phone|tablet|youtube|cartoon)\b/i.test(coachText) && /\b(reward|treat|inaam|baad mein de|if .*(finish|done)|as a reward)\b/i.test(coachText);
  // Strip quoted spans first — the exact words to say TO THE CHILD legitimately use "tum" + gendered
  // child verbs; the register/gender rules are about how the Coach addresses the PARENT (outside quotes).
  const outsideQuotes = coachText.replace(/["“][^"”]*["”]/g, " ");
  const genderedParent = /\b(aap[^.?!]{0,30}(kar sakti hain|kar sakte hain|karenge|kijiyega|sakti ho|sakte ho))\b/i.test(outsideQuotes);
  const tumForms = /\b(tumhe|tumhara|tum (karo|kijiye|chuno|batao|dekho)|^tum|\btu\b|kar do yaar)\b/i.test(outsideQuotes);

  if (hasStep) out.push({ name: "what_to_notice_present", pass: noticeMarker, detail: noticeMarker ? "" : "step given without a 'notice' line" });
  if (id === "worked_twice") {
    out.push({ name: "hand_back_offered", pass: /\b(check on you|check in|10 minute|a little less|step out|another room|thodi der baad)\b/i.test(coachText), detail: "" });
    out.push({ name: "positive_outcome_recorded_by_model", pass: modelPositive, detail: modelPositive ? "model" : "not by model" });
  }
  if (id === "not_tried_yet") out.push({ name: "not_tried_recorded", pass: !outVals.some((o) => o.value === "tried_didnt_work"), detail: outVals.map((o) => o.value).join(",") });
  out.push({ name: "no_screen_reward", pass: !screenReward, detail: screenReward ? "screen-as-reward phrasing" : "" });
  if (hindi) {
    out.push({ name: "no_gender_assumption", pass: !genderedParent, detail: genderedParent ? "gendered parent verb" : "" });
    out.push({ name: "parent_register_consistent", pass: !tumForms, detail: tumForms ? "tum/tu form" : "" });
  }
  return out;
}

// guard=false disables the engine's no-repeat backstop (for the BEFORE/AFTER comparison).
// path 'trial' streams (onDelta sink); path 'paid' buffers (no onDelta) — same engine + backstop.
async function runPersona(p: Persona, run: number, guard = true, path: "trial" | "paid" = "trial") {
  await cleanEvalState();
  const subject = { ...baseSubject, day: p.day ?? 1 };
  const history: CoachTurn[] = [];
  const allTools: ToolCallRecord[] = [];
  const coachReplies: string[] = [];
  let transcript = "", repeats = 0;
  const recordedDays = new Set<number>();
  const maxTurns = p.turns ? p.turns.length : (p.maxTurns ?? 4);

  for (let i = 0; i < maxTurns; i++) {
    const parentMsg = p.turns ? p.turns[i] : await parentLLM(p.drive!, transcript);
    const ctx = await assembleCoachContext(subject, parentMsg, history);
    const previousReply = [...history].reverse().find((h) => h.role === "assistant")?.content;
    const res = await runCoachTurn({
      system: ctx.system, history, userMessage: parentMsg, tools: ctx.tools,
      toolSubject: ctx.toolSubject, language: ctx.language,
      previousReply, guardRepeat: guard && isShortNonAnswer(parentMsg),
      ...(path === "trial" ? { onDelta: () => {} } : {}),
    });
    if (previousReply && tooSimilar(res.text, previousReply)) repeats++;
    coachReplies.push(res.text);
    history.push({ role: "user", content: parentMsg }, { role: "assistant", content: res.text });
    allTools.push(...res.toolCalls);
    // Mirror production's deterministic outcome backstop (runtime.ts): negatives/missed/not_tried; positives
    // only from clear words with no venting markers.
    if (res.toolCalls.some((t) => t.name === "record_outcome" && t.ok)) recordedDays.add(subject.day);
    else {
      const ex = extractOutcome(parentMsg);
      const positive = ex && (ex.outcome === "tried_worked" || ex.outcome === "tried_partly");
      const venting = /\b(cried|crying|tired|exhausted|nothing works|threw|upset|can'?t cope|fed up)\b/i.test(parentMsg);
      if (ex && !(positive && venting) && !recordedDays.has(subject.day)) {
        await recordTrialOutcome(EVAL_TRIAL, subject.day, ex.outcome, ex.note, "backstop");
        allTools.push({ name: "record_outcome", input: { value: ex.outcome, via: "backstop" }, ok: true, detail: "backstop" });
        recordedDays.add(subject.day);
      }
    }
    transcript += `Parent: ${parentMsg}\nCoach: ${res.text}\n`;
  }

  const nums = await readTrackedNumbers("trial", EVAL_TRIAL);
  const recordedNums = nums.map((n) => ({ min: n.min, max: n.max }));
  const toolChecks = p.expect?.(allTools, recordedNums, transcript) ?? [];
  const coachLines = coachReplies.join("\n"); // FULL coach replies (multi-line), not just first lines
  const detChecks = deterministicChecks(p.id, coachLines, allTools);
  const j = await judge(transcript, p.id);
  const fc = finalCheck(transcript, { language: detectLanguage(coachLines), recordedNumbers: nums.flatMap((n) => [n.min, n.max]) });

  return { id: p.id, run, transcript, allTools, toolChecks, detChecks, judge: j, finalCheck: fc, repeats };
}

const CRITERIA = ["listened_first", "explained_why", "one_plain_step", "followed_up", "no_repeats", "no_idioms", "right_language", "correct_escalation", "no_unconfirmed_cause", "asks_why_before_step", "step_matches_reason", "no_causation_claim"];
const CRIT_MAX = CRITERIA.length; // judge criteria per persona-run

const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

async function main() {
  console.log(`\n######## CONVERSATIONAL COACH — SCENARIO EVAL (${RUNS} runs, trial + paid paths) ########`);
  console.log("Anonymised: all parents/children are fictional (sandbox preview trial); no real names, phones or parent data used.\n");
  const toolTally: Record<string, { pass: number; total: number }> = {};
  const critFail: Record<string, number> = Object.fromEntries(CRITERIA.map((c) => [c, 0]));
  const critExample: Record<string, string> = {};
  const detTally: Record<string, { pass: number; total: number }> = {};
  const trialScores: Record<string, number[]> = {};
  const paidScores: Record<string, number[]> = {};
  let afterRepeats = 0, trialMean = { pass: 0, total: 0 };
  let posHits = 0, posOpportunities = 0; // model-recorded positive outcomes (worked_twice persona)

  // ── TRIAL PATH (full detail: transcripts, tool + deterministic checks, per-criterion) ──
  for (let run = 1; run <= RUNS; run++) {
    console.log(`\n========================= TRIAL PATH · RUN ${run} =========================`);
    for (const p of PERSONAS) {
      const r = await runPersona(p, run, true, "trial");
      afterRepeats += r.repeats;
      const jPass = Object.values(r.judge.scores).filter(Boolean).length;
      trialMean.pass += jPass; trialMean.total += Object.keys(r.judge.scores).length;
      (trialScores[p.id] ??= []).push(jPass);
      const t = (toolTally[p.id] ??= { pass: 0, total: 0 });
      t.pass += r.toolChecks.filter((c) => c.pass).length; t.total += r.toolChecks.length;
      for (const [k, v] of Object.entries(r.judge.scores)) if (!v) { critFail[k] = (critFail[k] ?? 0) + 1; if (!critExample[k]) critExample[k] = `${p.id}: ${r.judge.notes}`; }
      for (const d of r.detChecks) { const dt = (detTally[d.name] ??= { pass: 0, total: 0 }); dt.pass += d.pass ? 1 : 0; dt.total++; if (d.name === "positive_outcome_recorded_by_model") { posOpportunities++; if (d.pass) posHits++; } }

      console.log(`\n--- ${p.id} ---`);
      if (run === 1) console.log(r.transcript.trim());
      console.log(`TOOLS: ${r.allTools.map((x) => `${x.name}${x.ok ? "" : "✗"}`).join(", ") || "(none)"} | repeats=${r.repeats}`);
      for (const c of r.toolChecks) console.log(`  [${c.pass ? "PASS" : "FAIL"}] ${c.name}${c.pass ? "" : "  — " + c.detail}`);
      for (const d of r.detChecks) console.log(`  {${d.pass ? "ok" : "X"}} ${d.name}${d.pass ? "" : "  — " + d.detail}`);
      console.log(`  judge: ${jPass}/${CRIT_MAX}  ${Object.entries(r.judge.scores).filter(([, v]) => !v).map(([k]) => "✗" + k).join(" ")}  "${r.judge.notes}"`);
      if (!r.finalCheck.ok) console.log(`  final-check: ${r.finalCheck.detail.join("; ")}`);
    }
  }

  // ── BEFORE pass (guard OFF, trial) — no-repeat contrast ──
  console.log(`\n========================= BEFORE (guard OFF, 1 pass) =========================`);
  let beforeRepeats = 0, beforeNoRepFails = 0;
  for (const p of PERSONAS) {
    const r = await runPersona(p, 0, false, "trial");
    beforeRepeats += r.repeats;
    if (r.judge.scores.no_repeats === false) beforeNoRepFails++;
    console.log(`  ${p.id.padEnd(28)} repeats=${r.repeats}  judge.no_repeats=${r.judge.scores.no_repeats === false ? "FAIL" : "ok"}`);
  }

  // ── PAID JSON PATH (same engine, no streaming): 3x, judge median only ──
  console.log(`\n========================= PAID JSON PATH · ${RUNS} runs (judge only) =========================`);
  let paidMean = { pass: 0, total: 0 };
  for (let run = 1; run <= RUNS; run++) {
    for (const p of PERSONAS) {
      const r = await runPersona(p, run, true, "paid");
      const jPass = Object.values(r.judge.scores).filter(Boolean).length;
      paidMean.pass += jPass; paidMean.total += Object.keys(r.judge.scores).length;
      (paidScores[p.id] ??= []).push(jPass);
    }
    console.log(`  paid run ${run} done`);
  }

  // ── SUMMARY ──
  console.log(`\n######## SUMMARY (${RUNS} runs each, trial + paid) ########`);
  let allToolPass = 0, allToolTotal = 0;
  for (const [, t] of Object.entries(toolTally)) { allToolPass += t.pass; allToolTotal += t.total; }
  console.log(`  TOOL-CALL CHECKS (trial): ${allToolPass}/${allToolTotal}`);
  console.log(`  TRIAL judge mean: ${trialMean.pass}/${trialMean.total} = ${Math.round((trialMean.pass / trialMean.total) * 100)}%  |  PAID judge mean: ${paidMean.pass}/${paidMean.total} = ${Math.round((paidMean.pass / paidMean.total) * 100)}%`);

  console.log(`\n  PER-PERSONA JUDGE MEDIAN (of ${RUNS} runs, out of ${CRIT_MAX}) — trial vs paid:`);
  let trialMed = 0, paidMed = 0; const nP = PERSONAS.length;
  for (const p of PERSONAS) {
    const tm = median(trialScores[p.id] ?? [0]); const pm = median(paidScores[p.id] ?? [0]);
    trialMed += tm; paidMed += pm;
    console.log(`    ${p.id.padEnd(28)} trial ${tm}/${CRIT_MAX} [${(trialScores[p.id] ?? []).join(",")}]   paid ${pm}/${CRIT_MAX} [${(paidScores[p.id] ?? []).join(",")}]`);
  }
  console.log(`  OVERALL median: trial ${trialMed}/${nP * CRIT_MAX} = ${Math.round((trialMed / (nP * CRIT_MAX)) * 100)}%  |  paid ${paidMed}/${nP * CRIT_MAX} = ${Math.round((paidMed / (nP * CRIT_MAX)) * 100)}%`);

  console.log(`\n  PER-CRITERION FAILURE TABLE (trial, out of ${RUNS * nP} persona-runs):`);
  for (const c of CRITERIA) console.log(`  ${c.padEnd(22)} ${String(critFail[c]).padEnd(4)}  ${critFail[c] ? critExample[c] : "—"}`);

  console.log(`\n  DETERMINISTIC CHECKS (trial, approximate regex/tool):`);
  for (const [name, t] of Object.entries(detTally)) console.log(`  ${name.padEnd(32)} ${t.pass}/${t.total}`);

  console.log(`\n  MODEL-MISSED POSITIVE OUTCOMES: model recorded a positive on ${posHits}/${posOpportunities} worked_twice runs (missed ${posOpportunities - posHits}). Positive backstop is ON (from the parent's words, blocked on venting).`);
  console.log(`\n  NO_REPEATS (deterministic near-duplicate count across all turns):`);
  console.log(`    BEFORE (guard off, 1 pass): ${beforeRepeats} repeats, ${beforeNoRepFails} judge no_repeats fails`);
  console.log(`    AFTER  (guard on, ${RUNS} passes): ${afterRepeats} repeats, ${critFail.no_repeats} judge no_repeats fails`);
  await cleanEvalState();
  console.log("\n[eval state cleaned] — all data anonymised (fictional families; no real PII)");
}
main().catch((e) => { console.error("EVAL ERROR:", e); process.exit(1); });
