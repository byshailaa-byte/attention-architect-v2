// LIVE multi-turn Coach-quality eval (gated by COACH_EVAL_LIVE — needs ANTHROPIC_API_KEY + network).
// Runs every conversation through the real paid Coach prompt TWICE — "after" (behaviour rules on) and
// "before" (behaviour rules off) — applies the deterministic scorers, and prints a pass table plus
// Parent M's full before/after transcripts.
//
//   COACH_EVAL_LIVE=1 npx tsx scripts/coach-quality-eval.mts
import * as dotenv from "dotenv";
import path from "node:path";
import { CONVERSATIONS, scoreCheck, parentMConvo, type Convo } from "../lib/lms/coach/conversation-evals.ts";
import { buildSystemPrompt, coachPronoun } from "../lib/lms/coach/prompt.ts";
import { callCoach, type CoachTurn } from "../lib/lms/coach/llm.ts";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
if (!process.env.COACH_EVAL_LIVE) { console.log("set COACH_EVAL_LIVE=1 to run the live eval"); process.exit(0); }

const BOYS = new Set(["Aarav", "Reyan", "Kabir", "Veer", "Dev"]);
const genderOf = (child: string): "boy" | "girl" => (BOYS.has(child) ? "boy" : "girl");

function sysFor(child: string, behaviour: boolean): string {
  const gender = genderOf(child);
  return buildSystemPrompt({
    parent: "there", child, age_band: "10-11", archetype: "The Live Wire", week: 1,
    pronoun: coachPronoun(gender === "boy" ? "boy" : "girl"),
    support_email: "team@thehumandecision.in",
    archetype_description: `${child} moves fast and starts strong, then loses the thread when a task feels long or dull.`,
    day_title: "Offer two ways to begin, then step back",
    day_body: "Before homework, offer one small real choice about how to start, then let the choice stand and step back.",
    week_goal: "Week 1 — starting without being told twice",
    hard_part: "being told how to start before it feels like their own idea",
    language: "en",
  }, { behaviour });
}

async function runConvo(c: Convo, behaviour: boolean) {
  const history: CoachTurn[] = [];
  const replies: string[] = [];
  const results: { turn: number; check: string; pass: boolean; reason: string }[] = [];
  for (let i = 0; i < c.turns.length; i++) {
    const turn = c.turns[i];
    history.push({ role: "user", content: turn.parent });
    let reply = "";
    try { reply = (await callCoach(sysFor(c.child, behaviour), history)).text; }
    catch (e) { reply = ""; console.warn(`[eval] ${c.id} t${i} call failed: ${(e as Error).message}`); }
    history.push({ role: "assistant", content: reply });
    replies.push(reply);
    for (const check of turn.expect) {
      const s = scoreCheck(check, reply, { child: c.child, stepDelivery: turn.stepDelivery });
      results.push({ turn: i, check, pass: s.pass, reason: s.reason });
    }
  }
  return { replies, results };
}

const tally = { before: { pass: 0, total: 0 }, after: { pass: 0, total: 0 } };

for (const c of CONVERSATIONS) {
  for (const mode of ["before", "after"] as const) {
    const { results } = await runConvo(c, mode === "after");
    const pass = results.filter((r) => r.pass).length;
    tally[mode].pass += pass; tally[mode].total += results.length;
    const fails = results.filter((r) => !r.pass).map((r) => `t${r.turn}:${r.check}(${r.reason})`).join("  ");
    console.log(`[${mode.padEnd(6)}] ${c.id.padEnd(22)} ${pass}/${results.length}  ${fails}`);
  }
}

console.log(`\nAFTER : ${tally.after.pass}/${tally.after.total} checks passed`);
console.log(`BEFORE: ${tally.before.pass}/${tally.before.total} checks passed`);

// Parent M before/after transcripts
const pm = parentMConvo();
for (const mode of ["before", "after"] as const) {
  console.log(`\n===== PARENT M — ${mode.toUpperCase()} =====`);
  const { replies } = await runConvo(pm, mode === "after");
  pm.turns.forEach((t, i) => {
    console.log(`\nParent M: ${t.parent}`);
    console.log(`Coach:    ${replies[i]}`);
  });
}

const afterPct = tally.after.pass / tally.after.total;
console.log(`\nGATE: after=${(afterPct * 100).toFixed(0)}% (need ≥85% and > before)`);
if (afterPct < 0.85 || tally.after.pass <= tally.before.pass) { console.error("GATE FAILED"); process.exit(1); }
console.log("GATE PASSED");
