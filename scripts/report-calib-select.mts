// One-off: judge a pool of clean v3 llm reports with the NEW judge and freeze the first 10 that PASS
// (or q3-override) as the calibration "good" set — confirmed-clean reports a human is happy to send.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { loadAssessmentInput } from "@/lib/report-v2/service";
import { buildContext } from "@/lib/report-v2/generate";
import { judgeCoherenceVoted } from "@/lib/report-v2/judge";

const sql = neon(process.env.DATABASE_URL_PROD!);
const rows = await sql`
  SELECT DISTINCT ON (content->>'archetype', content->>'concern') session_id, content
  FROM report_v2_content
  WHERE source='llm' AND content->>'layout'='v3' AND coalesce(content->>'hardPart','') <> ''
    AND content->>'hardPart' NOT ILIKE '%shut down%' AND content->>'hardPart' NOT ILIKE '%gets corrected%'
    AND content->>'hardPart' NOT ILIKE '%being handed%' AND content->>'hardPart' NOT ILIKE '%waiting to start%'
  ORDER BY content->>'archetype', content->>'concern', created_at DESC` as unknown as { session_id: string; content: Record<string, unknown> }[];

const passers: string[] = [];
for (const r of rows) {
  if (passers.length >= 10) break;
  const input = await loadAssessmentInput(sql as never, r.session_id);
  if (!input) continue;
  const ctx = buildContext(input);
  const c = r.content;
  const v = await judgeCoherenceVoted({ childName: ctx.name, worryLabel: ctx.worryLabel, moment: ctx.moment, archetype: ctx.archetype, program: ctx.program, evidenceQuotes: ctx.evidenceQuotes, generated: { seenIt: c.seenIt, hardPart: c.hardPart, switch: c.switch, tonight: c.tonight } as never });
  const ok = v.verdict === "PASS" || (v.failed.length === 1 && v.failed[0] === "seenIt");
  console.log(`  ${r.session_id.slice(0, 8)} ${ctx.archetype}×${ctx.concern} → ${v.verdict}${v.failed.length ? " (" + v.failed.join(",") + ")" : ""}${ok ? " ✓keep" : ""}`);
  if (ok) passers.push(r.session_id);
}
writeFileSync("/tmp/calib-good.json", JSON.stringify(passers));
console.log(`\nfroze ${passers.length} confirmed-clean good reports`);
process.exit(0);
