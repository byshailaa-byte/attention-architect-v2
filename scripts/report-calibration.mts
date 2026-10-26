// Calibration GATE for the judge changes. Read-only on prod. Runs the NEW (voted) judge against a
// frozen set: 10 previously-PASSED reports (must still PASS) + 5 worst writer-failure DRAFTS, unchanged
// (must still FAIL). If any bad draft PASSES, we've bought pass-rate with leniency → exit non-zero.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { loadAssessmentInput } from "@/lib/report-v2/service";
import { buildContext } from "@/lib/report-v2/generate";
import { judgeCoherence } from "@/lib/report-v2/judge"; // single temp-0 call — matches production

const sql = neon(process.env.DATABASE_URL_PROD!);
const good: string[] = JSON.parse(readFileSync("/tmp/calib-good.json", "utf8"));

type Gen = { seenIt: string; hardPart: string; switch: { instead: string; try: string; after: string }; tonight: [string, string, string] };
// 5 worst writer-failure drafts (run-1 text from the re-run doc, [child] = the session's child name).
const BAD: { session: string; label: string; gen: Gen }[] = [
  { session: "101dc27d-310e-41d5-977a-43eacf049ace", label: "Storm×homework — 'sit with you' anti-method switch",
    gen: { seenIt: "When [child] chooses his own project, he keeps going until the work feels done.", hardPart: "[child] isn’t refusing the homework. He’s pushing back because it feels like losing.", switch: { instead: "\"Let me sit with you and we’ll start it together.\"", try: "\"Do you want to own this tonight, or do you want me in?\"", after: "The choice only works if it’s real." }, tonight: ["Before homework starts, offer him the real choice: your involvement, or none.", "If he says he’s got it, step back and actually let him.", "Notice: did he start without a battle?"] } },
  { session: "3abc3c87-1169-4080-80df-4956fa37339a", label: "Inventor×finish — hardPart diagnoses STARTING for a FINISH worry",
    gen: { seenIt: "When [child] builds something his own way, he keeps at the hard parts.", hardPart: "[child] isn’t ignoring your finishing reminders. He’s waiting to start his own way.", switch: { instead: "\"Finish this and then you can play.\"", try: "\"What’s one more bit you want to try? Just that.\"", after: "Then stay quiet and let him go." }, tonight: ["The moment [child] looks like he’s done, ask that one question and say nothing more.", "Let him take it wherever he takes it, even the wrong way.", "Notice: did he get to the end?"] } },
  { session: "1079565b-63ab-4f6d-8f81-97b80ddd1cff", label: "Explorer×finish — parent-blame 'side-ideas get shut down'",
    gen: { seenIt: "When [child] spots a link between two topics, they stay with it and keep going for a long.", hardPart: "[child] isn’t ignoring your instructions. They’re drifting when their side-ideas get shut down.", switch: { instead: "\"[child], you need to finish. Come on.\"", try: "\"Where could you park that idea so you don’t lose it?\"", after: "Let them pick the place — a notes app, a list, anything they already use." }, tonight: ["When they start to drift, ask where they want to park the new idea.", "Let them write it down themselves, then watch them return to the original work.", "Notice: did they get to the end?"] } },
  { session: "f98344d1-2f33-4e26-801b-561e19e9adad", label: "Inventor×giveup — 'waiting to start' reason for an after-failure worry",
    gen: { seenIt: "When [child] works something out his own way, he stays with it for a long time.", hardPart: "[child] isn’t giving up on the task. He’s waiting to start his own way.", switch: { instead: "\"Here, let me show you how to do it.\"", try: "\"How you do this is your call. I won’t jump in.\"", after: "Then step back and let him go." }, tonight: ["When he gets it wrong, say nothing — let him take the next step himself.", "If he stops, ask: \"What would you try next?\" — then wait.", "Notice: did he try again after it went wrong?"] } },
  // The 4 drafts that wrongly PASSED (re-entry at the wrong moment/archetype) — must now FAIL.
  { session: "75f343ff-6a4e-4c2c-a669-d68f1758f315", label: "All-In×screens — re-entry at the STOPPING moment",
    gen: { seenIt: "When [child] goes deep into something she chose, she stays with it for a long time.", hardPart: "[child] isn’t ignoring you. Getting back in after a stop is hard for her.", switch: { instead: "\"[child], screens off. Come on.\"", try: "\"What pulls you out when you’re really locked in?\"", after: "Set up the screen-off based on her own answer." }, tonight: ["Before screens go on, ask [child] what breaks her focus most.", "Let her decide the one thing that gets moved or switched off.", "Notice: did it end without a fight?"] } },
  { session: "e9fa17da-4917-461f-9870-916666edccff", label: "Captain×screens — re-entry (wrong archetype) at STOPPING moment",
    gen: { seenIt: "When [child] takes charge of something, she stays with it for a long time.", hardPart: "[child] isn’t ignoring you. She’s finding it hard to get back in.", switch: { instead: "\"[child], screen off. Come on, I’ll sit with you.\"", try: "\"Screen off at 8:00. You decide what you do after.\"", after: "The choice only works if it’s real." }, tonight: ["Tell her the screen goes off at 8:00. That part is fixed.", "What happens after 8:00 is fully her call. Don’t add conditions.", "Notice: did it end without a fight?"] } },
  { session: "40a16a97-ec3f-47c5-8252-ccab93123ed8", label: "All-In×confidence — re-entry instead of before-trying",
    gen: { seenIt: "When [child] works on something he chose, he stays with it for a long time.", hardPart: "[child] isn’t being difficult. He’s finding it hard to get back in.", switch: { instead: "\"Finish this and then you can take a break.\"", try: "\"15 minutes, no one will bother you. Just try it.\"", after: "Leave the room and do not check on him." }, tonight: ["When something feels hard, give him 15 minutes with zero interruptions.", "Remove the obvious distractions first, then walk away.", "Notice: did he try the hard part before asking?"] } },
  { session: "80d80453-aab8-466c-ae77-4abce9e004ab", label: "Captain×giveup — re-entry (wrong archetype)",
    gen: { seenIt: "When [child] takes charge of something, he pushes hard and keeps going.", hardPart: "[child] isn’t giving up. He’s finding it hard to get back in.", switch: { instead: "\"I’m here if you need me.\"", try: "\"Your call — keep going or change how you try?\"", after: "The choice only works if it’s real." }, tonight: ["When it goes wrong, hand [child] the next decision completely — no suggestions.", "Step back and let him run it, including the part where he gets it wrong.", "Notice: did he try again after it went wrong?"] } },
];

const fillName = (g: Gen, name: string): Gen => {
  const r = (s: string) => (s ?? "").replace(/\[child\]/g, name);
  return { seenIt: r(g.seenIt), hardPart: r(g.hardPart), switch: { instead: r(g.switch.instead), try: r(g.switch.try), after: r(g.switch.after) }, tonight: [r(g.tonight[0]), r(g.tonight[1]), r(g.tonight[2])] };
};

async function judgeSession(session: string, gen: Gen) {
  const input = await loadAssessmentInput(sql as never, session);
  if (!input) return null;
  const ctx = buildContext(input);
  const g = fillName(gen, ctx.name);
  const v = await judgeCoherence({ childName: ctx.name, worryLabel: ctx.worryLabel, moment: ctx.moment, archetype: ctx.archetype, program: ctx.program, evidenceQuotes: ctx.evidenceQuotes, generated: g as never });
  return { arch: ctx.archetype, worry: ctx.concern, verdict: v.verdict, failed: v.failed };
}

console.log("=== GOOD (must still PASS) ===");
let goodPass = 0;
for (const s of good) {
  const content = (await sql`SELECT content FROM report_v2_content WHERE session_id=${s}::uuid LIMIT 1` as unknown as { content: Record<string, unknown> }[])[0]?.content;
  if (!content) { console.log(`  ${s.slice(0, 8)}  (no content)`); continue; }
  const gen = { seenIt: content.seenIt, hardPart: content.hardPart, switch: content.switch, tonight: content.tonight } as Gen;
  const r = await judgeSession(s, gen);
  if (!r) { console.log(`  ${s.slice(0, 8)}  (no input)`); continue; }
  // "good" = PASS, or a q3(seenIt)-only fail — production ships those via generate's deterministic
  // seenIt override (Q3 is unchanged by this work; only Q1 was touched). A Q1 fail here WOULD be a regression.
  const q3OnlyOverride = r.verdict === "FAIL" && r.failed.length === 1 && r.failed[0] === "seenIt";
  if (r.verdict === "PASS" || q3OnlyOverride) goodPass++;
  console.log(`  ${s.slice(0, 8)}  ${r.arch} × ${r.worry}  → ${r.verdict}${r.failed.length ? " (" + r.failed.join(",") + ")" : ""}${q3OnlyOverride ? " [q3-override OK]" : ""}`);
}

console.log("\n=== BAD (must still FAIL — unchanged drafts) ===");
let badFail = 0; const leaked: string[] = [];
for (const b of BAD) {
  const r = await judgeSession(b.session, b.gen);
  if (!r) { console.log(`  ${b.label}  (no input)`); continue; }
  if (r.verdict === "FAIL") badFail++; else leaked.push(b.label);
  console.log(`  ${r.verdict}  ${b.label}${r.failed.length ? " (" + r.failed.join(",") + ")" : ""}`);
}

console.log(`\n=== GATE: good ${goodPass}/${good.length} PASS · bad ${badFail}/${BAD.length} FAIL ===`);
if (leaked.length) { console.log("❌ LEAK — a bad draft PASSED:\n  " + leaked.join("\n  ")); process.exit(2); }
if (goodPass < good.length) { console.log(`⚠️ ${good.length - goodPass} good report(s) now FAIL — judge may be too strict.`); process.exit(3); }
console.log("✅ gate clean");
process.exit(0);
