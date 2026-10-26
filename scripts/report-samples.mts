// Generate sample reports for human reading. 5 giveup (one per archetype) + 5 random PASSED from fresh.
// Read-only on prod; no prod writes. Anonymised (child name → [child]). Shows the final report; for a
// fallback it also shows the rejected draft + judge reason.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { writeFileSync, readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { loadAssessmentInput } from "@/lib/report-v2/service";
import { generateReportV2 } from "@/lib/report-v2/generate";

const sql = neon(process.env.DATABASE_URL_PROD!);
const scrub = (s: string, name: string | null) => {
  const f = (name ?? "").trim().split(/\s+/)[0];
  let t = s ?? "";
  if (f && f.length >= 2) t = t.replace(new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "[child]");
  return t.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]").replace(/\+?\d[\d\s-]{6,}\d/g, "[number]");
};
const fmt = (c: Record<string, unknown>, name: string | null) => scrub([
  `  seenIt:   ${c.seenIt}`, `  hardPart: ${c.hardPart}`,
  `  switch:   instead ${(c.switch as Record<string, string>)?.instead}  /  try ${(c.switch as Record<string, string>)?.try}  /  after ${(c.switch as Record<string, string>)?.after}`,
  `  tonight:  ${JSON.stringify(c.tonight)}`,
].join("\n"), name);

async function one(session: string) {
  const input = await loadAssessmentInput(sql as never, session);
  if (!input) return null;
  const res = await generateReportV2(input);
  return { input, res };
}

const L: string[] = ["# Report samples (2026-10-26, fix/report-fallback) — anonymised", ""];

// 5 giveup, one per archetype
L.push("## 5 giveup reports (one per archetype)", "");
const giveupArch = ["The Inventor", "The All-In Kid", "The Live Wire", "The Storm", "The Explorer"];
for (const arch of giveupArch) {
  const row = (await sql`SELECT session_id::text sid FROM assessments WHERE archetype=${arch} AND concerns[1]='giveup' AND answers IS NOT NULL AND dimensions IS NOT NULL ORDER BY created_at DESC LIMIT 1` as unknown as { sid: string }[])[0];
  if (!row) { L.push(`### ${arch} × giveup — (no session found)`, ""); continue; }
  const r = await one(row.sid);
  if (!r) { L.push(`### ${arch} × giveup — (no input)`, ""); continue; }
  L.push(`### ${arch} × giveup — **${r.res.cost.outcome}**${r.res.cost.reason ? ` (${r.res.cost.reason})` : ""}`);
  L.push("```", fmt(r.res.content as unknown as Record<string, unknown>, r.input.childName), "```");
  if (r.res.cost.outcome === "fallback" && r.res.draft) {
    L.push("REJECTED DRAFT:", "```", fmt(r.res.draft as unknown as Record<string, unknown>, r.input.childName), "```");
    L.push("judge: " + scrub(r.res.judges[r.res.judges.length - 1]?.reason ?? "(validator)", r.input.childName), "");
  }
  L.push("");
}

// 5 random PASSED from the fresh sample
L.push("## 5 random PASSED reports from the fresh sample", "");
const fresh: string[] = JSON.parse(readFileSync("/tmp/fresh-sessions.json", "utf8"));
let shown = 0;
for (const s of fresh) {
  if (shown >= 5) break;
  const r = await one(s);
  if (!r || r.res.cost.outcome !== "llm") continue;
  shown++;
  L.push(`### ${r.input.archetype} × ${r.input.concerns?.[0]} — llm (PASSED)`);
  L.push("```", fmt(r.res.content as unknown as Record<string, unknown>, r.input.childName), "```", "");
}
writeFileSync("docs/evidence/report-samples-2026-10-26.md", L.join("\n"));
console.log(L.join("\n"));
process.exit(0);
