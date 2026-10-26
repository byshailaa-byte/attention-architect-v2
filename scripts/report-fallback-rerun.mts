// OFFLINE re-run of the report-v2 fallback cases. READ-ONLY on prod (loadAssessmentInput = SELECT),
// generates locally with the PRODUCTION writer + judge (generateReportV2) 3× per session, capturing the
// draft + per-question judge verdict/reason + outcome. NO prod writes (never calls generateAndStore).
// Anonymised (child name scrubbed). Writes docs/evidence/report-fallback-rerun-<date>.md + reports ₹.
//   npx tsx scripts/report-fallback-rerun.mts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { readFileSync, writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { loadAssessmentInput } from "@/lib/report-v2/service";
import { generateReportV2, answeredFromAssessment } from "@/lib/report-v2/generate";
import { programFor } from "@/lib/report-v2/program";
import { canonicalConcern, worryLabelFor } from "@/lib/report-v2/goal-mapping";

const prodUrl = process.env.DATABASE_URL_PROD;
if (!prodUrl || !prodUrl.includes("ep-green-truth-aqxygaj2")) { console.error("Need DATABASE_URL_PROD (ep-green-truth)"); process.exit(1); }
const sql = neon(prodUrl);
const RUNS = Number(process.env.RUNS ?? 3);
const DATE = "2026-10-26";
let sessions: { sessionId: string; reason: string }[] = JSON.parse(readFileSync("/tmp/fallback-sessions.json", "utf8"));
if (process.env.LIMIT) sessions = sessions.slice(0, Number(process.env.LIMIT));

const scrub = (s: string, name: string | null) => {
  let t = s ?? "";
  const first = (name ?? "").trim().split(/\s+/)[0];
  if (first && first.length >= 2) t = t.replace(new RegExp(first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "[child]");
  return t.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]").replace(/\+?\d[\d\s-]{6,}\d/g, "[number]");
};
const draftStr = (d: Record<string, unknown> | null, name: string | null) => {
  if (!d) return "(no draft — writer/API error before any draft)";
  const g = d as { seenIt: string; hardPart: string; switch: { instead: string; try: string; after: string }; tonight: string[] };
  return scrub([
    `  seenIt:   ${g.seenIt}`,
    `  hardPart: ${g.hardPart}`,
    `  switch.instead: ${g.switch.instead}`,
    `  switch.try:     ${g.switch.try}`,
    `  switch.after:   ${g.switch.after}`,
    `  tonight: ${JSON.stringify(g.tonight)}`,
  ].join("\n"), name);
};

async function pool<T, R>(items: T[], n: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let idx = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    for (;;) { const i = idx++; if (i >= items.length) break; out[i] = await fn(items[i], i); }
  }));
  return out;
}

let totalPaise = 0;
const results = await pool(sessions, 4, async (s, i) => {
  const input = await loadAssessmentInput(sql, s.sessionId);
  if (!input) return { s, err: "no assessment input" };
  const concern = canonicalConcern(input.concerns?.[0]);
  const worry = worryLabelFor(concern);
  const prog = programFor(input.archetype ?? "", input.ageBand, input.childName ?? "", (input.childGender ?? null) as never);
  const answered = answeredFromAssessment(input).map((a) => a.label);
  const runs: { outcome: string; reason: string | null; failed: string[]; judgeRaw: string; draft: string; paise: number }[] = [];
  for (let r = 0; r < RUNS; r++) {
    const res = await generateReportV2(input);
    totalPaise += res.cost.costPaise;
    const lastJudge = res.judges[res.judges.length - 1];
    runs.push({
      outcome: res.cost.outcome, reason: res.cost.reason, failed: lastJudge?.failed ?? [],
      judgeRaw: lastJudge ? scrub(lastJudge.raw, input.childName) : "(no judge — validator/api fallback)",
      draft: draftStr(res.draft as Record<string, unknown> | null, input.childName), paise: res.cost.costPaise,
    });
  }
  console.log(`[${i + 1}/${sessions.length}] ${input.archetype} × ${concern} — prod:${s.reason} → runs:${runs.map((x) => x.outcome).join(",")}`);
  return { s, archetype: input.archetype, concern, worry, coreMove: prog?.coreMove ?? "(none)", answered, runs };
});

// ---- write anonymised markdown ----
const L: string[] = [];
L.push(`# Report v2 fallback — offline re-run (${DATE})`, "");
L.push(`Re-ran ${sessions.length} distinct fallback sessions (last 14 days) through the PRODUCTION writer + judge, ${RUNS}× each, locally. Read-only on prod; no prod writes. Child names scrubbed → [child].`, "");
L.push(`**Total model spend this re-run: ₹${(totalPaise / 100).toFixed(2)}** (${sessions.length} sessions × ${RUNS} runs).`, "");
for (const row of results) {
  if ("err" in row) { L.push(`## ${row.s.sessionId.slice(0, 8)} — ${row.err}`, ""); continue; }
  const r = row as Extract<typeof row, { runs: unknown }>;
  const fallN = r.runs.filter((x) => x.outcome === "fallback").length;
  L.push(`## ${r.s.sessionId.slice(0, 8)} · ${r.archetype} × ${r.concern} · prod-reason ${r.s.reason}`);
  L.push(`worry: ${r.worry} · fallback ${fallN}/${RUNS} on re-run`);
  L.push(`week-1 core move: ${scrub(r.coreMove, null)}`);
  L.push(`parent's answers (option labels): ${JSON.stringify(r.answered)}`, "");
  r.runs.forEach((run, k) => {
    L.push(`### run ${k + 1}: ${run.outcome}${run.reason ? ` (${run.reason})` : ""}${run.failed.length ? ` — failed: ${run.failed.join(", ")}` : ""}`);
    L.push("```");
    L.push("DRAFT:");
    L.push(run.draft);
    L.push("JUDGE:");
    L.push(run.judgeRaw);
    L.push("```", "");
  });
}
writeFileSync(`docs/evidence/report-fallback-rerun-${DATE}.md`, L.join("\n"));
console.log(`\n=== DONE. ₹${(totalPaise / 100).toFixed(2)} spent. Wrote docs/evidence/report-fallback-rerun-${DATE}.md ===`);
process.exit(0);
