// Repro harness (DEV DB only) — reproduces the "Coach gets stuck after a few exchanges" report with
// per-turn timing. Drives the REAL engine (runCoachTurn) and the REAL stream (streamCoachTurn) with a
// controlled conversation whose turns 3–5 are short non-answers ("ok"/"theek hai"/"hmm") — exactly the
// turns that flip the no-repeat backstop into its BUFFERED path. Measures: time-to-first-delta, total,
// #deltas, repeatGuard mode, and (for the stream path) whether {done} arrived.
//
// Run: TARGET=dev npx tsx scripts/coach-repro-timing.mts   (uses DATABASE_URL = dev ep-wild-paper)
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { assembleCoachContext, type CoachSubjectInput } from "@/lib/coach/context";
import { runCoachTurn } from "@/lib/coach/engine";
import { streamCoachTurn } from "@/lib/coach/runtime";
import { isShortNonAnswer } from "@/lib/coach/lang";
import type { CoachTurn } from "@/lib/lms/coach/llm";

const host = new URL(process.env.DATABASE_URL ?? "").hostname;
if (!host.includes("ep-wild-paper")) { console.error("REFUSING: DATABASE_URL is not the dev branch (ep-wild-paper). host=" + host); process.exit(1); }
console.log("dev DB host:", host, "\n");

const subject: CoachSubjectInput = {
  kind: "trial", subjectId: "fd5d006a-8905-45b3-ad58-2383bc31ca06", assessmentId: null,
  mode: "trial", parentFirst: "Sneha", child: "Diya", childGender: "girl",
  ageBand: "6-8", archetype: "The Inventor", worryKey: "focus", worryLabel: "staying focused",
  parentPattern: null, hardPartRaw: "She starts, then drifts within a minute.",
  archetypeDescRaw: "Diya is an Inventor — full of ideas, hard to pin to one task.",
  stepSourceRaw: "Sit beside her and say: 'Let's do just the first line together.'",
  stepTitleRaw: "One line together", supportEmail: "help@example.com", week: 1, day: 1,
};

// Mirror of the route's repeatGuardFor: previous assistant reply + short-non-answer detection.
function guardFor(history: CoachTurn[], msg: string) {
  return { previousReply: [...history].reverse().find((h) => h.role === "assistant")?.content, guardRepeat: isShortNonAnswer(msg) };
}

const turns = [
  "She won't sit down to start homework, just keeps wandering off.",
  "I've tried sitting with her but she still gets up after a minute.",
  "ok",            // turn 3 — short non-answer
  "theek hai",     // turn 4 — short non-answer
  "hmm",           // turn 5 — short non-answer
];

const history: CoachTurn[] = [];
const rows: Array<Record<string, unknown>> = [];

for (let i = 0; i < turns.length; i++) {
  const msg = turns[i];
  const ctx = await assembleCoachContext(subject, msg, history);
  const g = guardFor(history, msg);
  const t0 = Date.now();
  let firstDeltaAt = -1, nDeltas = 0;
  const res = await runCoachTurn({
    system: ctx.system, history: ctx.history, userMessage: msg, tools: ctx.tools,
    toolSubject: ctx.toolSubject, language: ctx.language,
    onDelta: () => { if (firstDeltaAt < 0) firstDeltaAt = Date.now() - t0; nDeltas++; },
    previousReply: g.previousReply, guardRepeat: g.guardRepeat,
  });
  const total = Date.now() - t0;
  rows.push({
    turn: i + 1, msg, short: g.guardRepeat, mode: g.guardRepeat && g.previousReply ? "BUFFERED" : "live",
    ttfb_ms: firstDeltaAt, total_ms: total, deltas: nDeltas, repeatGuard: res.repeatGuard ?? "-",
    errored: res.errored, replyLen: res.text.length, reply: res.text.slice(0, 60),
  });
  history.push({ role: "user", content: msg }, { role: "assistant", content: res.text });
  console.log(`turn ${i + 1} (${g.guardRepeat ? "short" : "subst"}): ttfb=${firstDeltaAt}ms total=${total}ms deltas=${nDeltas} mode=${rows[i].mode} repeatGuard=${res.repeatGuard ?? "-"} errored=${res.errored}`);
}

console.log("\n=== TIMING TABLE ===");
console.table(rows.map((r) => ({ turn: r.turn, short: r.short, mode: r.mode, ttfb_ms: r.ttfb_ms, total_ms: r.total_ms, deltas: r.deltas, repeatGuard: r.repeatGuard, errored: r.errored })));

// End-to-end stream path for one short turn: does {done} arrive, and when?
console.log("\n=== STREAM PATH (full streamCoachTurn, short non-answer) — does {done} arrive? ===");
const sctx = await assembleCoachContext(subject, "ok", history);
const resp = streamCoachTurn({ ctx: sctx, subject, userMessage: "ok", key: { kind: "trial", userId: "repro", trialId: subject.subjectId, day: 1 } });
const reader = resp.body!.getReader();
const dec = new TextDecoder();
const s0 = Date.now(); let firstLineAt = -1, doneAt = -1, sawDone = false, buf = "";
for (;;) {
  const { value, done } = await reader.read();
  if (done) break;
  buf += dec.decode(value, { stream: true });
  let nl; while ((nl = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
    if (!line.trim()) continue;
    if (firstLineAt < 0) firstLineAt = Date.now() - s0;
    const obj = JSON.parse(line);
    if (obj.done) { sawDone = true; doneAt = Date.now() - s0; }
  }
}
console.log(`stream: time-to-first-line=${firstLineAt}ms  done-arrived=${sawDone}  done-at=${doneAt}ms`);
process.exit(0);
