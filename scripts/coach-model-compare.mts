// Model comparison for the Coach reply tier: claude-sonnet-4-6 vs claude-opus-4-8. Runs the same
// scenarios through both via the PRODUCTION path, scores quality with the LLM judge (always on
// Sonnet so the judge is constant), and measures ₹ cost/turn from real token usage → ₹/parent/day
// and ₹/paid-parent/week. Prints a recommendation.
//
//   COACH_EVAL_LIVE=1 npx tsx scripts/coach-model-compare.mts
import * as dotenv from "dotenv";
import path from "node:path";
import { getSql } from "../lib/db/client.ts";
import { assembleCoachContext, type CoachSubjectInput } from "../lib/coach/context.ts";
import { runCoachTurn } from "../lib/coach/engine.ts";
import { callCoach } from "../lib/lms/coach/llm.ts";
import type { CoachTurn } from "../lib/lms/coach/llm.ts";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
if (!process.env.COACH_EVAL_LIVE) { console.log("set COACH_EVAL_LIVE=1"); process.exit(0); }
const sql = getSql();
const EVAL_TRIAL = "fd5d006a-8905-45b3-ad58-2383bc31ca06";
const EVAL_ASSESS = "e56b39b6-22db-4582-b79f-bb5465c15e05";
const USD_TO_INR = 88;

// Stated per-1M-token rates (USD). Sonnet 4.x = $3/$15. Opus 4.8 assumed $15/$75 (ASSUMPTION — confirm).
const RATES: Record<string, { in: number; out: number }> = {
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-opus-4-8": { in: 15, out: 75 },
};
const paiseFor = (model: string, i: number, o: number) => ((i / 1e6) * RATES[model].in + (o / 1e6) * RATES[model].out) * USD_TO_INR * 100;

const base: CoachSubjectInput = {
  kind: "trial", subjectId: EVAL_TRIAL, assessmentId: EVAL_ASSESS, mode: "trial",
  parentFirst: "Sneha", child: "Diya", childGender: "girl", ageBand: "10-11", archetype: "The Captain",
  worryKey: "reminders", worryLabel: "reminders before homework", parentPattern: "The Quick Fixer",
  hardPartRaw: "Diya isn't refusing the homework. Being told what to do switches her drive off.",
  archetypeDescRaw: "Likes to lead. Diya does best running the call.",
  stepSourceRaw: "Before homework, hand Diya one real choice about what to do first and how; let her choice stand; notice if she starts without a fight.",
  stepTitleRaw: "Give her the first move", supportEmail: "team@thehumandecision.in", week: 1, day: 1,
};
const SCENARIOS: { id: string; day?: number; turns: string[] }[] = [
  { id: "baseline", turns: ["I remind her once and she starts. But then she argues about everything.", "Maybe 4 or 5 times.", "Ok I will try tonight."] },
  { id: "didnt_work", day: 2, turns: ["It didn't work. She ignored me.", "She kept watching TV.", "ok"] },
  { id: "frustrated", day: 2, turns: ["Honestly nothing works with this child. I'm tired.", "She cried and threw her pencil when I said it's wrong."] },
  { id: "medical", day: 2, turns: ["She has been very sad for weeks and doesn't want to go to school.", "ok thank you"] },
];

async function clean() {
  await sql`DELETE FROM coach_trial_day_outcome WHERE trial_id=${EVAL_TRIAL}::uuid`;
  await sql`DELETE FROM coach_tracked_number WHERE subject_id=${EVAL_TRIAL}`;
  await sql`DELETE FROM parent_memory WHERE subject_id=${EVAL_TRIAL}`;
  await sql`DELETE FROM coach_call_request WHERE subject_id=${EVAL_TRIAL}`;
}
async function judge(transcript: string): Promise<number> {
  const sys = `Score this parenting Coach's side 0-8 on: listened, explained why, one plain step, followed up, no repeats, no idioms, right language, correct escalation. Return ONLY a JSON object {"score": <0-8 integer>}.`;
  try { const r = await callCoach(sys, [{ role: "user", content: transcript }], 40); const m = r.text.match(/\d+/); return m ? Math.min(8, parseInt(m[0], 10)) : 0; } catch { return 0; }
}

async function runModel(model: string) {
  let inTok = 0, outTok = 0, turns = 0, judgeSum = 0, judgeN = 0, latSum = 0;
  for (const sc of SCENARIOS) {
    await clean();
    const subject = { ...base, day: sc.day ?? 1 };
    const history: CoachTurn[] = [];
    let transcript = "";
    for (const msg of sc.turns) {
      const ctx = await assembleCoachContext(subject, msg);
      const res = await runCoachTurn({ system: ctx.system, history, userMessage: msg, tools: ctx.tools, toolSubject: ctx.toolSubject, language: ctx.language, model });
      history.push({ role: "user", content: msg }, { role: "assistant", content: res.text });
      transcript += `Parent: ${msg}\nCoach: ${res.text}\n`;
      inTok += res.inputTokens; outTok += res.outputTokens; turns++; latSum += res.latencyMs;
    }
    judgeSum += await judge(transcript); judgeN++;
  }
  const paisePerTurn = paiseFor(model, inTok / turns, outTok / turns);
  return { model, turns, avgIn: Math.round(inTok / turns), avgOut: Math.round(outTok / turns), paisePerTurn, avgLatency: Math.round(latSum / turns), judgePct: Math.round((judgeSum / (judgeN * 8)) * 100) };
}

async function main() {
  const results = [];
  for (const model of ["claude-sonnet-4-6", "claude-opus-4-8"]) results.push(await runModel(model));
  await clean();

  console.log("\n######## MODEL COMPARISON (Coach reply tier) ########\n");
  console.log("model                 quality  avg-in  avg-out  ₹/turn  avg-latency");
  for (const r of results) console.log(`${r.model.padEnd(20)}  ${String(r.judgePct + "%").padEnd(7)}  ${String(r.avgIn).padEnd(6)}  ${String(r.avgOut).padEnd(7)}  ₹${(r.paisePerTurn / 100).toFixed(2).padEnd(5)}  ${r.avgLatency}ms`);

  // Cost extrapolation. Realistic usage (not the daily caps): a trial parent ~6 Coach turns/day over
  // 4 days; a paid parent ~8 turns/week. (Caps are 20/day trial, 30/day paid.)
  const TRIAL_TURNS_PER_DAY = 6, PAID_TURNS_PER_WEEK = 8;
  console.log("\n  ₹/parent extrapolation (realistic usage, not the daily caps):");
  for (const r of results) {
    const perTrialParent4Days = (r.paisePerTurn * TRIAL_TURNS_PER_DAY * 4) / 100;
    const perPaidParentWeek = (r.paisePerTurn * PAID_TURNS_PER_WEEK) / 100;
    console.log(`  ${r.model.padEnd(20)}  trial(4 days @ ${TRIAL_TURNS_PER_DAY}/day) ≈ ₹${perTrialParent4Days.toFixed(2)}   paid(${PAID_TURNS_PER_WEEK}/week) ≈ ₹${perPaidParentWeek.toFixed(2)}/week`);
  }
  const [s, o] = results;
  console.log(`\n  Opus is ${(o.paisePerTurn / s.paisePerTurn).toFixed(1)}× the cost of Sonnet per turn; quality ${o.judgePct}% vs ${s.judgePct}%.`);
  console.log(`  RECOMMENDATION: ${o.judgePct - s.judgePct >= 10 ? "Opus — the quality gap justifies the cost." : "Sonnet 4.6 — near-equal quality at a fraction of the cost."}`);
}
main().catch((e) => { console.error("COMPARE ERROR:", e); process.exit(1); });
