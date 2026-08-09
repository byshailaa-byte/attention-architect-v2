/**
 * Decision-determining test: does splitting friction_response by trigger window
 * reveal archetype-level clustering that the collapsed value hides?
 *
 * For each of D3.1, D3.2, D3.3 separately, within the 139 noLoop families:
 *   For each archetype, compute the distribution of raw choice values.
 *   Flag any value that reaches ≥60% of an archetype (same threshold used for
 *   attention_shape/reward_driver — a "real signal" bar, not borderline).
 *
 * Dedup: session_id → content-fingerprint (same as loop-coverage-production.ts).
 * Production branch read-only via ANALYTICS_DB_URL.
 */

import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { buildHdg } from "../lib/graph/hdg";
import { buildBehaviourGraph } from "../lib/graph/behaviour-graph";
import { buildBehaviourSignature } from "../lib/graph/signature";
import { buildFamilyAttentionLoop } from "../lib/graph/loop";

const ANALYTICS_DB_URL = process.env.ANALYTICS_DB_URL;
if (!ANALYTICS_DB_URL) { console.error("ANALYTICS_DB_URL required"); process.exit(1); }
const sql = neon(ANALYTICS_DB_URL);

const ARCHETYPES = [
  "The All-In Kid","The Inventor","The Explorer","The Magnet",
  "The Glue","The Captain","The Live Wire","The Storm",
];
const SIGNAL_THRESHOLD = 0.60;

function pct(n: number, d: number) {
  return d === 0 ? " n/a" : `${(n / d * 100).toFixed(0).padStart(3)}%`;
}

async function main() {
  // ── Pull all production rows ───────────────────────────────────────────────
  const raw = (await sql`
    SELECT id, session_id, child_name, parent_name, archetype, parent_pattern, answers
    FROM assessments
    WHERE archetype IS NOT NULL AND parent_pattern IS NOT NULL
    ORDER BY created_at
  `) as unknown as {
    id: string; session_id: string;
    child_name: string|null; parent_name: string;
    archetype: string; parent_pattern: string;
    answers: Record<string, string>;
  }[];

  console.log(`Raw rows: ${raw.length}`);

  // ── Deduplicate ───────────────────────────────────────────────────────────
  const bySession = new Map<string, typeof raw[0]>();
  for (const r of raw) if (!bySession.has(r.session_id)) bySession.set(r.session_id, r);
  const afterS1 = [...bySession.values()];

  const byFp = new Map<string, typeof raw[0]>();
  for (const r of afterS1) {
    const fp = JSON.stringify(Object.entries(r.answers ?? {}).sort());
    if (!byFp.has(fp)) byFp.set(fp, r);
  }
  const distinct = [...byFp.values()];
  console.log(`Distinct after dedup: ${distinct.length} (−${raw.length - distinct.length})\n`);

  // ── Run loop detection, collect per-family window choices ─────────────────
  type FamilyData = {
    archetype: string;
    parentPattern: string;
    d31: string | null;  // raw choice text from HDG node
    d32: string | null;
    d33: string | null;
    loopFired: boolean;
  };

  const families: FamilyData[] = [];

  for (const row of distinct) {
    let loopFired = false;
    let d31: string|null = null;
    let d32: string|null = null;
    let d33: string|null = null;

    try {
      const hdg  = buildHdg(row.answers ?? {});
      const bg   = buildBehaviourGraph(hdg);
      const sig  = buildBehaviourSignature(hdg, bg);
      const loop = buildFamilyAttentionLoop(hdg, bg, sig);
      loopFired = loop.detected;

      for (const node of hdg.nodes) {
        if (node.source_question === "D3.1") d31 = node.choice ?? null;
        if (node.source_question === "D3.2") d32 = node.choice ?? null;
        if (node.source_question === "D3.3") d33 = node.choice ?? null;
      }
    } catch { /* skip */ }

    families.push({ archetype: row.archetype, parentPattern: row.parent_pattern, d31, d32, d33, loopFired });
  }

  const loop   = families.filter(f => f.loopFired);
  const noLoop = families.filter(f => !f.loopFired);

  console.log(`Loop: ${loop.length}  NoLoop: ${noLoop.length}\n`);

  // ── Helper: for a window, compute per-archetype distribution + signal check ─
  type WindowKey = "d31" | "d32" | "d33";

  function analyzeWindow(
    label: string,
    windowKey: WindowKey,
    pop: FamilyData[],
  ) {
    console.log("═".repeat(78));
    console.log(`WINDOW: ${label}  (n of noLoop families with a value: ${pop.filter(f => f[windowKey] !== null).length}/${pop.length})\n`);

    // Global value distribution (collapse across archetypes) — for baseline
    const globalCounts = new Map<string, number>();
    for (const f of pop) {
      const v = f[windowKey];
      if (v) globalCounts.set(v, (globalCounts.get(v) ?? 0) + 1);
    }
    const globalTotal = [...globalCounts.values()].reduce((a, b) => a + b, 0);
    console.log(`  Global distribution (n=${globalTotal}):`);
    for (const [v, n] of [...globalCounts.entries()].sort(([,a],[,b]) => b-a)) {
      console.log(`    ${pct(n, globalTotal)}  ${v}`);
    }
    console.log();

    // Per-archetype distribution + signal check
    let anySignal = false;
    const signalRows: string[] = [];

    for (const arch of ARCHETYPES) {
      const archPop = pop.filter(f => f.archetype === arch);
      const withValue = archPop.filter(f => f[windowKey] !== null);
      if (withValue.length === 0) continue;

      const counts = new Map<string, number>();
      for (const f of withValue) {
        const v = f[windowKey]!;
        counts.set(v, (counts.get(v) ?? 0) + 1);
      }

      const n = withValue.length;
      const top = [...counts.entries()].sort(([,a],[,b]) => b-a);
      const [topVal, topCount] = top[0];
      const topPctNum = topCount / n;
      const isSignal = topPctNum >= SIGNAL_THRESHOLD;

      if (isSignal) anySignal = true;

      const marker = isSignal ? "  ✓SIGNAL" : "";
      const shortVal = topVal.length > 55 ? topVal.slice(0, 55) + "…" : topVal;
      console.log(`  ${arch.padEnd(20)} n=${String(n).padStart(3)}  top="${shortVal}" ${pct(topCount, n)}${marker}`);

      // Show second value if relevant (≥25%)
      if (top.length > 1) {
        const [v2, c2] = top[1];
        if (c2 / n >= 0.25) {
          const short2 = v2.length > 55 ? v2.slice(0, 55) + "…" : v2;
          console.log(`  ${"".padEnd(20)}      2nd="${short2}" ${pct(c2, n)}`);
        }
      }

      if (isSignal) {
        signalRows.push(`  ${arch} — "${topVal}" at ${(topPctNum * 100).toFixed(0)}% (${topCount}/${n})`);
      }
    }

    if (!anySignal) {
      console.log(`\n  OUTCOME: No archetype reaches ≥${(SIGNAL_THRESHOLD*100).toFixed(0)}% on any single value. No clustering signal.\n`);
    } else {
      console.log(`\n  OUTCOME: ✓ Signal found at ≥${(SIGNAL_THRESHOLD*100).toFixed(0)}% in:`);
      for (const r of signalRows) console.log(r);
      console.log();
    }
  }

  // ── Run three windows ─────────────────────────────────────────────────────
  analyzeWindow("D3.1 — initial contact (\"at the moment of hitting something really hard\")", "d31", noLoop);
  analyzeWindow("D3.2 — general coping tendency (\"when facing hard tasks, generally\")", "d32", noLoop);
  analyzeWindow("D3.3 — post-failure (\"after a frustrating failure\")", "d33", noLoop);

  // ── Cross-window consistency check for individual families ─────────────────
  // If a family has values for all 3 windows, do they typically give the same answer,
  // or do they mix? This tests whether the "diffuse" reading is real incoherence or
  // just the same underlying preference described differently.
  console.log("═".repeat(78));
  console.log("CROSS-WINDOW CONSISTENCY (noLoop families with all 3 windows present)\n");

  const allThree = noLoop.filter(f => f.d31 !== null && f.d32 !== null && f.d33 !== null);
  console.log(`Families with all three D3 windows answered: ${allThree.length}/${noLoop.length}\n`);

  // Classify consistency: all same, two same / one different, all different
  let allSame = 0, twoSame = 0, allDiff = 0;
  const valuePatterns = new Map<string, number>();
  for (const f of allThree) {
    const vals = new Set([f.d31, f.d32, f.d33]);
    if (vals.size === 1) allSame++;
    else if (vals.size === 2) twoSame++;
    else allDiff++;
    // Track frequency of each value appearing across all windows in this family
    const pattern = [f.d31, f.d32, f.d33]
      .map(v => (v ?? "").split("—")[0].trim().slice(0, 25))
      .join(" | ");
    valuePatterns.set(pattern, (valuePatterns.get(pattern) ?? 0) + 1);
  }

  console.log(`  All 3 windows same answer:          ${allSame}  (${pct(allSame, allThree.length)})`);
  console.log(`  2 windows same, 1 different:        ${twoSame}  (${pct(twoSame, allThree.length)})`);
  console.log(`  All 3 windows different:            ${allDiff}  (${pct(allDiff, allThree.length)})\n`);

  // Most common patterns
  const topPatterns = [...valuePatterns.entries()].sort(([,a],[,b]) => b-a).slice(0, 8);
  if (topPatterns.length > 0) {
    console.log(`  Most common [D3.1 | D3.2 | D3.3] patterns (top 8, truncated to 25 chars each):`);
    for (const [pat, n] of topPatterns) {
      console.log(`    n=${n}  [${pat}]`);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(78)}`);
  console.log(`DECISION SUMMARY\n`);
  console.log(`  noLoop families analyzed: ${noLoop.length}`);
  console.log(`  Signal threshold: ≥${(SIGNAL_THRESHOLD * 100).toFixed(0)}% on a single value within an archetype\n`);
  console.log(`  D3.1 (initial contact):    check output above`);
  console.log(`  D3.2 (general coping):     check output above`);
  console.log(`  D3.3 (post-failure):       check output above`);
  console.log(`\n  Cross-window consistency:`);
  console.log(`    all-same: ${allSame} (${pct(allSame, allThree.length)})   two-same: ${twoSame} (${pct(twoSame, allThree.length)})   all-diff: ${allDiff} (${pct(allDiff, allThree.length)})`);
}

main().catch(e => { console.error(e); process.exit(1); });
