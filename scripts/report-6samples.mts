// 6 full reports for human reading (step 5), anonymised. Read-only on prod; no prod writes.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
import { loadAssessmentInput } from "@/lib/report-v2/service";
import { generateReportV2 } from "@/lib/report-v2/generate";

const sql = neon(process.env.DATABASE_URL_PROD!);
const COMBOS: [string, string][] = [
  ["The All-In Kid", "screens"], ["The Captain", "screens"], ["The All-In Kid", "confidence"],
  ["The Captain", "giveup"], ["The Inventor", "giveup"], ["The Live Wire", "giveup"],
];
const scrub = (s: string, name: string | null) => {
  const f = (name ?? "").trim().split(/\s+/)[0]; let t = s ?? "";
  if (f && f.length >= 2) t = t.replace(new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "[child]");
  return t.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]").replace(/\+?\d[\d\s-]{6,}\d/g, "[number]");
};
for (const [arch, worry] of COMBOS) {
  const row = (await sql`SELECT session_id::text sid FROM assessments WHERE archetype=${arch} AND concerns[1]=${worry} AND answers IS NOT NULL AND dimensions IS NOT NULL ORDER BY created_at DESC LIMIT 1` as unknown as { sid: string }[])[0];
  if (!row) { console.log(`\n### ${arch} × ${worry} — (no session)`); continue; }
  const input = await loadAssessmentInput(sql as never, row.sid);
  if (!input) { console.log(`\n### ${arch} × ${worry} — (no input)`); continue; }
  const res = await generateReportV2(input);
  const c = res.content as unknown as { seenIt: string; hardPart: string; switch: { instead: string; try: string; after: string }; tonight: string[] };
  console.log(`\n### ${arch} × ${worry} — ${res.cost.outcome}${res.cost.reason ? ` (${res.cost.reason})` : ""}`);
  console.log(scrub([
    `  seenIt:   ${c.seenIt}`, `  hardPart: ${c.hardPart}`,
    `  switch:   instead ${c.switch.instead}  /  try ${c.switch.try}  /  after ${c.switch.after}`,
    `  tonight:  ${JSON.stringify(c.tonight)}`,
  ].join("\n"), input.childName));
}
process.exit(0);
