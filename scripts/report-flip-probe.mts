// Measure the Q1 (coherence) flip rate of a SINGLE judge call at temperature 0 on IDENTICAL drafts.
// If flips are ~0, the Q1 majority-of-3 adds cost without value and should be removed. Read-only on prod.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { loadAssessmentInput } from "@/lib/report-v2/service";
import { buildContext } from "@/lib/report-v2/generate";
import { judgeCoherence } from "@/lib/report-v2/judge";

const sql = neon(process.env.DATABASE_URL_PROD!);
const good: string[] = JSON.parse(readFileSync("/tmp/calib-good.json", "utf8"));

let flips = 0, total = 0, paise = 0;
const reportCost = (inTok: number, outTok: number) => Math.round(((inTok / 1e6) * 3 + (outTok / 1e6) * 15) * 84 * 100);
for (const s of good) {
  const input = await loadAssessmentInput(sql as never, s);
  if (!input) continue;
  const ctx = buildContext(input);
  const content = (await sql`SELECT content FROM report_v2_content WHERE session_id=${s}::uuid LIMIT 1` as unknown as { content: Record<string, unknown> }[])[0]?.content;
  if (!content) continue;
  const gen = { seenIt: content.seenIt, hardPart: content.hardPart, switch: content.switch, tonight: content.tonight } as never;
  const q1: boolean[] = [];
  for (let i = 0; i < 3; i++) {
    const v = await judgeCoherence({ childName: ctx.name, worryLabel: ctx.worryLabel, moment: ctx.moment, archetype: ctx.archetype, program: ctx.program, evidenceQuotes: ctx.evidenceQuotes, generated: gen });
    q1.push(v.failed.includes("coherence"));
    paise += reportCost(v.inTok, v.outTok);
  }
  const flipped = !(q1[0] === q1[1] && q1[1] === q1[2]);
  if (flipped) flips++;
  total++;
  console.log(`  ${s.slice(0, 8)} ${ctx.archetype}×${ctx.concern}: Q1-fail=[${q1.map((b) => (b ? "F" : "P")).join("")}]${flipped ? "  ← FLIP" : ""}`);
}
console.log(`\nQ1 single-call flip rate: ${flips}/${total} = ${total ? Math.round((flips / total) * 100) : 0}%`);
console.log(`single-judge-call cost: ₹${(paise / 3 / total / 100).toFixed(3)}/call → majority adds 2 calls ≈ ₹${(paise / 3 / total / 100 * 2).toFixed(3)}/report`);
process.exit(0);
