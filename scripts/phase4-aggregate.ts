/**
 * Phase 4 Prep — Empirical aggregation from real assessment data.
 *
 * Run:  npx tsx scripts/phase4-aggregate.ts
 *
 * Queries all completed assessments, runs each row's answers through the
 * current HDG/BG/Signature engine, then aggregates dimension signals by
 * archetype and parent_instinct. Outputs structured data only — no
 * interpretation, no drafted rules.
 */

import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import path from "path";
import { buildHdg } from "../lib/graph/hdg";
import { buildBehaviourGraph } from "../lib/graph/behaviour-graph";
import { buildBehaviourSignature } from "../lib/graph/signature";
import type { EvidenceTier } from "../lib/graph/types";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const sql = neon(process.env.DATABASE_URL!);

// ── Types ─────────────────────────────────────────────────────────────────────

interface DbRow {
  id: string;
  archetype: string;
  parent_pattern: string;
  answers: Record<string, string>;
}

interface DimResult {
  value: string | null;   // dominant signal value, null = insufficient
  tier: EvidenceTier;
  hasTension: boolean;    // contradiction_flag from Signature
}

interface ComputedRow {
  id: string;
  archetype: string;
  parent_pattern: string;         // raw DB value e.g. "The Negotiator"
  parent_instinct: string;        // BG signal enum: "negotiator", "quick-fixer", etc.
  parent_instinct_tier: string;
  dims: Record<string, DimResult>;
  ok: boolean;
  error?: string;
}

// ── DB query ──────────────────────────────────────────────────────────────────

const ALL_DIMS = [
  "attention_shape",
  "reward_driver",
  "friction_response",
  "parent_instinct",
  "attention_competition",
  "recharge_type",
] as const;

async function fetchRows(): Promise<DbRow[]> {
  return (await sql`
    SELECT id, archetype, parent_pattern, answers
    FROM assessments
    WHERE archetype IS NOT NULL
      AND answers IS NOT NULL
      AND answers::text != '{}'
    ORDER BY created_at
  `) as DbRow[];
}

// ── Engine run ────────────────────────────────────────────────────────────────

function computeRow(row: DbRow): ComputedRow {
  try {
    const hdg = buildHdg(row.answers);
    const bg = buildBehaviourGraph(hdg);
    const sig = buildBehaviourSignature(hdg, bg);

    const dims: Record<string, DimResult> = {};
    for (const d of sig.dimensions) {
      const raw = d.expression.value;
      dims[d.dimension] = {
        value: Array.isArray(raw) ? (raw[0] ?? null) : raw,
        tier: d.evidence_tier,
        hasTension: d.contradiction_flag,
      };
    }

    // Use BG signal value (enum: "negotiator", "quick-fixer", …) for grouping —
    // not the Signature expression value, which is the HDG choice text.
    const piSignal = bg.signal_nodes.find((n) => n.dimension === "parent_instinct");
    const piEnum = piSignal?.value ?? "insufficient";
    const piTier = piSignal?.evidence_tier ?? "insufficient_evidence";

    return {
      id: row.id,
      archetype: row.archetype,
      parent_pattern: row.parent_pattern ?? "(none)",
      parent_instinct: piEnum,
      parent_instinct_tier: piTier,
      dims,
      ok: true,
    };
  } catch (e) {
    return {
      id: row.id,
      archetype: row.archetype,
      parent_pattern: row.parent_pattern ?? "(none)",
      parent_instinct: "error",
      parent_instinct_tier: "error",
      dims: {},
      ok: false,
      error: String(e),
    };
  }
}

// ── Aggregation helpers ───────────────────────────────────────────────────────

function pct(n: number, total: number): string {
  return total === 0 ? "—" : `${Math.round((n / total) * 100)}%`;
}

interface DimAgg {
  valueCounts: Record<string, number>;
  tierCounts: Record<string, number>;
  tensionCount: number;
  total: number;
}

function emptyDimAgg(): DimAgg {
  return { valueCounts: {}, tierCounts: {}, tensionCount: 0, total: 0 };
}

function accumulateDim(agg: DimAgg, d: DimResult) {
  const v = d.value ?? "insufficient";
  agg.valueCounts[v] = (agg.valueCounts[v] ?? 0) + 1;
  agg.tierCounts[d.tier] = (agg.tierCounts[d.tier] ?? 0) + 1;
  if (d.hasTension) agg.tensionCount++;
  agg.total++;
}

function dimAggFromRows(rows: ComputedRow[], dim: string): DimAgg {
  const agg = emptyDimAgg();
  for (const r of rows) {
    if (!r.ok) continue;
    const d = r.dims[dim];
    if (!d) continue;
    accumulateDim(agg, d);
  }
  return agg;
}

function printDimAgg(dim: string, agg: DimAgg, clearThreshold = 0.60) {
  if (agg.total === 0) { console.log(`    ${dim}: no data`); return; }

  const sorted = Object.entries(agg.valueCounts).sort((a, b) => b[1] - a[1]);
  const topValue = sorted[0];
  const topPct = topValue ? topValue[1] / agg.total : 0;
  const clear = topPct >= clearThreshold ? " ✓SIGNAL" : " ~scattered";

  const valStr = sorted.map(([v, n]) => `${v}=${pct(n, agg.total)}(${n})`).join("  ");

  const tierOrder: EvidenceTier[] = ["direct_evidence", "framework_interpretation", "hypothesis", "insufficient_evidence"];
  const tierStr = tierOrder
    .filter(t => agg.tierCounts[t])
    .map(t => `${t.replace("_", "-").replace("_", "-")}=${pct(agg.tierCounts[t]!, agg.total)}`)
    .join(" ");

  const tensionStr = agg.tensionCount > 0
    ? `  tension=${pct(agg.tensionCount, agg.total)}(${agg.tensionCount})`
    : "";

  console.log(`    ${dim}${clear}`);
  console.log(`      values: ${valStr}`);
  console.log(`      tiers:  ${tierStr}${tensionStr}`);
}

// ── Main output ───────────────────────────────────────────────────────────────

async function main() {
  const dbRows = await fetchRows();
  console.log(`\nFetched ${dbRows.length} completed assessment rows from DB.\n`);

  const rows = dbRows.map(computeRow);
  const okRows = rows.filter(r => r.ok);
  const errors = rows.filter(r => !r.ok);

  if (errors.length) {
    console.log(`Engine errors (${errors.length} rows skipped):`);
    for (const e of errors) console.log(`  ${e.id}: ${e.error}`);
    console.log();
  }

  console.log(`Valid rows for aggregation: ${okRows.length}\n`);

  // ── Section 1: Per-archetype dimension distributions ─────────────────────

  // From scorer.ts ARCHETYPE_GRID primary paths
  const KNOWN_ARCHETYPES = [
    "The All-In Kid", "The Inventor", "The Explorer", "The Magnet",
    "The Glue", "The Captain", "The Live Wire", "The Storm",
  ];

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("§1  PER-ARCHETYPE DIMENSION DISTRIBUTIONS");
  console.log("═══════════════════════════════════════════════════════════════\n");
  console.log("  Threshold for SIGNAL: dominant value ≥60% of rows in that archetype.");
  console.log("  ~scattered = no value reaches 60% — not a useful signal.\n");

  const archetypeGroups: Record<string, ComputedRow[]> = {};
  for (const r of okRows) {
    (archetypeGroups[r.archetype] ??= []).push(r);
  }

  // Flag archetypes with zero real-data rows
  const zeroCount = KNOWN_ARCHETYPES.filter(a => !archetypeGroups[a]);
  if (zeroCount.length) {
    console.log(`  Zero-row archetypes (no real-data yet): ${zeroCount.join(", ")}\n`);
  }

  const archetypeSorted = Object.entries(archetypeGroups).sort((a, b) => b[1].length - a[1].length);

  for (const [archetype, aRows] of archetypeSorted) {
    console.log(`┌─ ${archetype}  (n=${aRows.length})`);

    // Parent instinct distribution — BG enum values for clarity
    const piCounts: Record<string, number> = {};
    for (const r of aRows) piCounts[r.parent_instinct] = (piCounts[r.parent_instinct] ?? 0) + 1;
    const piStr = Object.entries(piCounts).sort((a, b) => b[1] - a[1])
      .map(([v, n]) => `${v}=${pct(n, aRows.length)}(${n})`).join("  ");
    console.log(`│  parent_instinct [BG enum]: ${piStr}`);
    console.log("│");

    // attention_shape and reward_driver: these define the archetype grid — show
    // them for sanity-check completeness but don't label SIGNAL since it's trivial
    for (const dim of ALL_DIMS) {
      const agg = dimAggFromRows(aRows, dim);
      printDimAgg(dim, agg);
    }
    console.log();
  }

  // ── Section 2: Per-parent-instinct dimension distributions ────────────────

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("§2  PER-PARENT-INSTINCT DIMENSION DISTRIBUTIONS");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const piGroups: Record<string, ComputedRow[]> = {};
  for (const r of okRows) {
    (piGroups[r.parent_instinct] ??= []).push(r);
  }

  for (const [pi, pRows] of Object.entries(piGroups).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`┌─ parent_instinct=${pi}  (n=${pRows.length})  [BG enum value]`);

    // Archetype distribution for this parent instinct
    const archCounts: Record<string, number> = {};
    for (const r of pRows) archCounts[r.archetype] = (archCounts[r.archetype] ?? 0) + 1;
    const archStr = Object.entries(archCounts).sort((a, b) => b[1] - a[1])
      .map(([v, n]) => `${v}=${pct(n, pRows.length)}(${n})`).join("  ");
    console.log(`│  archetype distribution: ${archStr}`);
    console.log("│");

    for (const dim of ["friction_response", "attention_competition", "recharge_type"] as const) {
      const agg = dimAggFromRows(pRows, dim);
      printDimAgg(dim, agg);
    }
    console.log();
  }

  // ── Section 3: Archetype × parent_instinct cross-tab ─────────────────────
  // Focus: negotiator and steady-hand. Min n=3 to report.

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("§3  ARCHETYPE × NEGOTIATOR/STEADY-HAND CROSS-TAB  (min n=3)");
  console.log("═══════════════════════════════════════════════════════════════\n");
  console.log("  Flagged: dims where tension rate or hypothesis rate is notably");
  console.log("  higher than the overall baseline for that (archetype) group.\n");

  const TARGET_PI = new Set(["negotiator", "steady-hand"]);
  const MIN_N = 3;

  // Compute overall baselines per archetype (for comparison)
  const archetypeBaselines: Record<string, Record<string, { tensionRate: number; hypothesisRate: number }>> = {};
  for (const [archetype, aRows] of Object.entries(archetypeGroups)) {
    archetypeBaselines[archetype] = {};
    for (const dim of ["friction_response", "attention_competition", "recharge_type"] as const) {
      const agg = dimAggFromRows(aRows, dim);
      archetypeBaselines[archetype][dim] = {
        tensionRate: agg.total > 0 ? agg.tensionCount / agg.total : 0,
        hypothesisRate: agg.total > 0 ? (agg.tierCounts["hypothesis"] ?? 0) / agg.total : 0,
      };
    }
  }

  // Build cross-tab cells
  const cells: Record<string, ComputedRow[]> = {};
  for (const r of okRows) {
    if (!TARGET_PI.has(r.parent_instinct)) continue;
    const key = `${r.archetype}||${r.parent_instinct}`;
    (cells[key] ??= []).push(r);
  }

  const qualifyingCells = Object.entries(cells)
    .filter(([, cRows]) => cRows.length >= MIN_N)
    .sort((a, b) => {
      // Sort by parent_instinct, then archetype
      const [aArch, aPi] = a[0].split("||");
      const [bArch, bPi] = b[0].split("||");
      if (aPi !== bPi) return aPi < bPi ? -1 : 1;
      return (aArch ?? "") < (bArch ?? "") ? -1 : 1;
    });

  if (qualifyingCells.length === 0) {
    console.log("  No (archetype × negotiator/steady-hand) cell has ≥3 rows.\n");
    console.log("  Raw counts:");
    for (const [key, cRows] of Object.entries(cells).sort((a, b) => b[1].length - a[1].length)) {
      const [arch, pi] = key.split("||");
      console.log(`    ${arch} × ${pi}: n=${cRows.length}`);
    }
  } else {
    for (const [key, cRows] of qualifyingCells) {
      const [archetype, pi] = key.split("||");
      const baseline = archetypeBaselines[archetype ?? ""] ?? {};
      console.log(`┌─ ${archetype} × ${pi}  (n=${cRows.length})`);

      for (const dim of ["friction_response", "attention_competition", "recharge_type"] as const) {
        const agg = dimAggFromRows(cRows, dim);
        if (agg.total === 0) continue;

        const cellTensionRate = agg.tensionCount / agg.total;
        const cellHypRate = (agg.tierCounts["hypothesis"] ?? 0) / agg.total;
        const base = baseline[dim] ?? { tensionRate: 0, hypothesisRate: 0 };

        const tensionFlag =
          cellTensionRate > 0.15 && cellTensionRate > base.tensionRate + 0.10
            ? `  ⚑ tension elevated (cell=${pct(agg.tensionCount, agg.total)} vs baseline=${pct(Math.round(base.tensionRate * agg.total), agg.total)})`
            : "";
        const hypFlag =
          cellHypRate > 0.25 && cellHypRate > base.hypothesisRate + 0.15
            ? `  ⚑ hypothesis elevated (cell=${pct(agg.tierCounts["hypothesis"] ?? 0, agg.total)} vs baseline=${pct(Math.round(base.hypothesisRate * agg.total), agg.total)})`
            : "";

        const sorted = Object.entries(agg.valueCounts).sort((a, b) => b[1] - a[1]);
        const valStr = sorted.map(([v, n]) => `${v}=${pct(n, agg.total)}(${n})`).join("  ");
        const tierOrder: EvidenceTier[] = ["direct_evidence", "framework_interpretation", "hypothesis", "insufficient_evidence"];
        const tierStr = tierOrder
          .filter(t => agg.tierCounts[t])
          .map(t => `${t.replace("_", "-").replace("_", "-")}=${pct(agg.tierCounts[t]!, agg.total)}`)
          .join(" ");

        console.log(`│  ${dim}`);
        console.log(`│    values: ${valStr}`);
        console.log(`│    tiers:  ${tierStr}${tensionFlag}${hypFlag}`);
      }
      console.log();
    }
  }

  // ── Section 4: All negotiator/steady-hand cells, any n ───────────────────

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("§4  ALL NEGOTIATOR/STEADY-HAND CELLS (any n, for completeness)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const allCellsSorted = Object.entries(cells).sort((a, b) => b[1].length - a[1].length);
  const header = "archetype".padEnd(28) + "parent_instinct".padEnd(16) + "n";
  console.log("  " + header);
  console.log("  " + "-".repeat(52));
  for (const [key, cRows] of allCellsSorted) {
    const [arch, pi] = key.split("||");
    console.log("  " + (arch ?? "").padEnd(28) + (pi ?? "").padEnd(16) + cRows.length);
  }
  console.log();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
