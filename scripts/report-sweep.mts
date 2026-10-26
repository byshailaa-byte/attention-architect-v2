// Measurement sweep for the writer+judge fix. Read-only on prod; generates locally (no prod writes).
// 25 known-fallback sessions ×3 (flip + after-rate) + 30 fresh recent sessions ×1 (representative rate).
// Hard cost cap ₹800 — stop and report if exceeded. Writes docs/evidence/report-fallback-sweep-<date>.md.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { readFileSync, writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { loadAssessmentInput } from "@/lib/report-v2/service";
import { generateReportV2 } from "@/lib/report-v2/generate";
import { canonicalConcern } from "@/lib/report-v2/goal-mapping";

const sql = neon(process.env.DATABASE_URL_PROD!);
const CAP_PAISE = 80_000; // ₹800
const fallback: string[] = JSON.parse(readFileSync("/tmp/fallback-sessions.json", "utf8")).map((x: { sessionId: string }) => x.sessionId);
const fresh: string[] = JSON.parse(readFileSync("/tmp/fresh-sessions.json", "utf8"));

let paise = 0, gens = 0, capped = false;
type Run = { session: string; arch: string; worry: string; outcomes: string[] };

async function genOnce(session: string): Promise<{ outcome: string; arch: string; worry: string } | null> {
  if (paise >= CAP_PAISE) { capped = true; return null; }
  const input = await loadAssessmentInput(sql as never, session);
  if (!input) return null;
  const res = await generateReportV2(input);
  paise += res.cost.costPaise; gens++;
  return { outcome: res.cost.outcome, arch: input.archetype ?? "?", worry: canonicalConcern(input.concerns?.[0]) };
}

async function pool<T>(items: T[], n: number, fn: (t: T, i: number) => Promise<void>) {
  let idx = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    for (;;) { const i = idx++; if (i >= items.length || capped) break; await fn(items[i], i); }
  }));
}

const FRESH_ONLY = process.env.FRESH_ONLY === "1";
const fbRuns: Run[] = [];
await pool(FRESH_ONLY ? [] : fallback, 4, async (s, i) => {
  const outs: string[] = []; let arch = "?", worry = "?";
  for (let r = 0; r < 3; r++) { const g = await genOnce(s); if (g) { outs.push(g.outcome); arch = g.arch; worry = g.worry; } }
  fbRuns.push({ session: s, arch, worry, outcomes: outs });
  console.log(`[fb ${i + 1}/25] ${arch}×${worry} → ${outs.join(",")}  (₹${(paise / 100).toFixed(0)})`);
});

const freshRuns: Run[] = [];
await pool(fresh, 4, async (s, i) => {
  const g = await genOnce(s);
  if (g) { freshRuns.push({ session: s, arch: g.arch, worry: g.worry, outcomes: [g.outcome] }); console.log(`[fresh ${i + 1}/30] ${g.arch}×${g.worry} → ${g.outcome}  (₹${(paise / 100).toFixed(0)})`); }
});

// ---- tallies ----
const fbTotal = fbRuns.flatMap((r) => r.outcomes);
const fbFallback = fbTotal.filter((o) => o === "fallback").length;
const flips = fbRuns.filter((r) => r.outcomes.length === 3 && !(r.outcomes[0] === r.outcomes[1] && r.outcomes[1] === r.outcomes[2])).length;
const freshFallback = freshRuns.filter((r) => r.outcomes[0] === "fallback").length;

// per archetype×worry (fresh, the representative sample) + combined
const byCombo: Record<string, { n: number; fb: number }> = {};
for (const r of [...fbRuns.flatMap((x) => x.outcomes.map((o) => ({ arch: x.arch, worry: x.worry, o }))), ...freshRuns.map((x) => ({ arch: x.arch, worry: x.worry, o: x.outcomes[0] }))]) {
  const k = `${r.arch} × ${r.worry}`; (byCombo[k] ||= { n: 0, fb: 0 }); byCombo[k].n++; if (r.o === "fallback") byCombo[k].fb++;
}

const L: string[] = ["# Report fallback — measurement sweep (2026-10-26, fix/report-fallback)", ""];
if (capped) L.push(`> ⚠️ STOPPED at the ₹800 cap after ${gens} generations.`, "");
L.push(`Model spend: **₹${(paise / 100).toFixed(2)}** over ${gens} generations → **₹${(paise / gens / 100).toFixed(2)}/report** (single temp-0 judge).`, `Majority-of-3 was removed (Q1 single-call flip rate 0%); it would have added ~₹1.25/report.`, "");
L.push(`## Fallback rate`, `- **Known-fallback set (25×3):** before = 100% (all were fallbacks) → **after = ${fbFallback}/${fbTotal.length} = ${Math.round((fbFallback / fbTotal.length) * 100)}%**.`, `- **Fresh representative sample (30×1):** baseline ~40% → **after = ${freshFallback}/${freshRuns.length} = ${Math.round((freshFallback / freshRuns.length) * 100)}%** (target <15%).`, `- **Judge flip rate on identical drafts (25×3):** ${flips}/${fbRuns.length} sessions flipped.`, "");
L.push(`## Per archetype × worry (fallback / total)`);
for (const k of Object.keys(byCombo).sort()) { const v = byCombo[k]; L.push(`- ${k}: ${v.fb}/${v.n}${v.fb ? "  ⚠️" : ""}`); }
writeFileSync("docs/evidence/report-fallback-sweep-2026-10-26.md", L.join("\n"));
console.log("\n" + L.slice(2).join("\n"));
process.exit(0);
