// LIVE multi-turn Coach-quality eval (gated by COACH_EVAL_LIVE — needs ANTHROPIC_API_KEY + network).
// Runs every conversation through the real paid Coach prompt TWICE — "after" (behaviour rules on) and
// "before" (behaviour rules off) — applies the deterministic scorers, and prints a pass table plus
// Parent M's full before/after transcripts.
//
//   COACH_EVAL_LIVE=1 npx tsx scripts/coach-quality-eval.mts
import * as dotenv from "dotenv";
import path from "node:path";
import { CONVERSATIONS, scoreCheck, parentMConvo, realTranscriptConvo, type Convo } from "../lib/lms/coach/conversation-evals.ts";
import { buildSystemPrompt, coachPronoun } from "../lib/lms/coach/prompt.ts";
import { callCoach, type CoachTurn } from "../lib/lms/coach/llm.ts";
import { enforceReplyQuality, primarySayThis, looksLikeStepRequest, isCheckinTrigger, REPLY_MAX_WORDS, STEP_DELIVERY_MAX_WORDS } from "../lib/lms/coach/guards.ts";
import { hasOutcomeAnswer } from "../lib/lms/coach/outcomes.ts";

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

const isBareQuestion = (t: string) => (t || "").trim().endsWith("?") && !primarySayThis(t);
const isNewDayOpener = (m: string) => /\b(good morning|i'?m here|here for today|ready for today|back for)\b/i.test(m || "");

// LLM "plain language" judge — would an Indian parent with basic English understand exactly what to
// do tonight? Fail on idioms, long sentences, or no clear action. Returns {pass, reason}.
async function plainLanguageJudge(reply: string): Promise<{ pass: boolean; reason: string }> {
  const sys = `You judge whether a parenting-coach reply is in PLAIN ENGLISH for an Indian parent who reads English as a second language. PASS only if ALL are true: everyday simple words; short sentences; NO idioms or figures of speech (e.g. "your call", "own it", "step back", "switch on", "drive", "anchor"); and it is clear exactly what the parent should DO tonight (a concrete action, often exact words to say). Otherwise FAIL. Reply with exactly: "PASS" or "FAIL: <≤10-word reason>".`;
  try {
    const out = (await callCoach(sys, [{ role: "user", content: reply }], 40)).text.trim();
    return { pass: /^pass\b/i.test(out), reason: out.slice(0, 80) };
  } catch (e) { return { pass: false, reason: "judge error: " + (e as Error).message }; }
}

async function runConvo(c: Convo, behaviour: boolean) {
  const history: CoachTurn[] = [];
  const replies: string[] = [];
  const results: { turn: number; check: string; pass: boolean; reason: string }[] = [];
  for (let i = 0; i < c.turns.length; i++) {
    const turn = c.turns[i];
    const system = sysFor(c.child, behaviour);
    history.push({ role: "user", content: turn.parent });
    let reply = "";
    try { reply = (await callCoach(system, history)).text; }
    catch (e) { reply = ""; console.warn(`[eval] ${c.id} t${i} call failed: ${(e as Error).message}`); }

    // PRODUCTION PATH: the "after" reply goes through the real guard/regen loop (requireCheckin +
    // mustAdvise computed exactly as the routes do). "before" stays raw so the contrast is real.
    if (behaviour && reply) {
      const requireCheckin = (isCheckinTrigger(turn.parent) || isNewDayOpener(turn.parent)) && !hasOutcomeAnswer(turn.parent);
      const mustAdvise = replies.filter(isBareQuestion).length >= 2;
      const priorQuotes = history.filter((h) => h.role === "assistant").map((h) => primarySayThis(h.content)).filter((q): q is string => !!q);
      const out = await enforceReplyQuality(
        reply,
        async (correction) => {
          try { const r = await callCoach(system, [...history, { role: "assistant", content: reply }, { role: "user", content: correction }]); return r.text || ""; }
          catch { return ""; }
        },
        () => {}, priorQuotes, turn.parent, "en",
        looksLikeStepRequest(turn.parent) ? STEP_DELIVERY_MAX_WORDS : REPLY_MAX_WORDS,
        requireCheckin, mustAdvise,
      );
      reply = out.text;
    }
    const priorReplies = [...replies];
    history.push({ role: "assistant", content: reply });
    replies.push(reply);
    for (const check of turn.expect) {
      const s = scoreCheck(check, reply, { child: c.child, stepDelivery: turn.stepDelivery, priorReplies });
      results.push({ turn: i, check, pass: s.pass, reason: s.reason });
    }
    // LLM plain-language judge on every turn that expects plain language (after-mode only).
    if (behaviour && reply && turn.expect.includes("plain_language")) {
      const j = await plainLanguageJudge(reply);
      results.push({ turn: i, check: "plain_language_llm", pass: j.pass, reason: j.reason });
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

// Before/after transcripts for the two key cases.
for (const [label, convo] of [["REAL TRANSCRIPT (it did not work → complicated language)", realTranscriptConvo()], ["PARENT M", parentMConvo()]] as const) {
  for (const mode of ["before", "after"] as const) {
    console.log(`\n===== ${label} — ${mode.toUpperCase()} =====`);
    const { replies } = await runConvo(convo, mode === "after");
    convo.turns.forEach((t, i) => {
      console.log(`\nParent: ${t.parent}`);
      console.log(`Coach:  ${replies[i]}`);
    });
  }
}

const afterPct = tally.after.pass / tally.after.total;
console.log(`\nGATE: after=${(afterPct * 100).toFixed(0)}% (need ≥85% and > before)`);
if (afterPct < 0.85 || tally.after.pass <= tally.before.pass) { console.error("GATE FAILED"); process.exit(1); }
console.log("GATE PASSED");
