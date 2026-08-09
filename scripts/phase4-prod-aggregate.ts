/**
 * Phase 4 Production Aggregation — runs against an analytics branch.
 *
 * Run:  ANALYTICS_DB_URL="..." npx tsx scripts/phase4-prod-aggregate.ts
 *
 * Key corrections vs phase4-aggregate.ts:
 *   1. ALL dimension values use BG signal enum (not Signature expression choice text).
 *   2. Full-corpus deduplication by session_id (keep latest per session).
 *   3. Reports raw count, deduped count, and duplicate-row drop separately.
 */

import { neon } from "@neondatabase/serverless";
import { buildHdg } from "../lib/graph/hdg";
import { buildBehaviourGraph } from "../lib/graph/behaviour-graph";
import { buildBehaviourSignature } from "../lib/graph/signature";
import type { EvidenceTier } from "../lib/graph/types";

const DB_URL = process.env.ANALYTICS_DB_URL;
if (!DB_URL) {
  console.error("ANALYTICS_DB_URL env var required");
  process.exit(1);
}
const sql = neon(DB_URL);

// ── Types ─────────────────────────────────────────────────────────────────────

interface DbRow {
  id: string;
  session_id: string | null;
  archetype: string;
  parent_pattern: string;
  answers: Record<string, string>;
  created_at: string;
}

interface DimResult {
  value: string | null;   // BG signal enum value
  tier: EvidenceTier;
  hasTension: boolean;
}

interface ComputedRow {
  id: string;
  archetype: string;
  parent_pattern: string;
  parent_instinct: string;    // BG signal enum
  parent_instinct_tier: string;
  dims: Record<string, DimResult>;
  ok: boolean;
  error?: string;
}

const ALL_DIMS = [
  "attention_shape",
  "reward_driver",
  "friction_response",
  "parent_instinct",
  "attention_competition",
  "recharge_type",
] as const;

// ── DB query with dedup ───────────────────────────────────────────────────────

async function fetchRows(): Promise<{ raw: DbRow[]; deduped: DbRow[]; dupCount: number }> {
  const raw = (await sql`
    SELECT id, session_id, archetype, parent_pattern, answers, created_at
    FROM assessments
    WHERE archetype IS NOT NULL
      AND answers IS NOT NULL
      AND answers::text != '{}'
    ORDER BY created_at
  `) as DbRow[];

  // Dedup by session_id: for each distinct session_id, keep the most recent row.
  // NULLs are treated as distinct (cannot correlate).
  const sessionMap = new Map<string, DbRow>();
  const noSession: DbRow[] = [];

  for (const row of raw) {
    if (!row.session_id) {
      noSession.push(row);
    } else {
      const existing = sessionMap.get(row.session_id);
      if (!existing || row.created_at > existing.created_at) {
        sessionMap.set(row.session_id, row);
      }
    }
  }

  const deduped = [...sessionMap.values(), ...noSession].sort(
    (a, b) => String(a.created_at).localeCompare(String(b.created_at))
  );

  return { raw, deduped, dupCount: raw.length - deduped.length };
}

// ── Engine run — BG signal enum values for all dims ──────────────────────────

function computeRow(row: DbRow): ComputedRow {
  try {
    const hdg = buildHdg(row.answers);
    const bg = buildBehaviourGraph(hdg);
    const sig = buildBehaviourSignature(hdg, bg);

    // Use BG signal node .value (enum) for every dimension — NOT Signature expression text.
    const dims: Record<string, DimResult> = {};
    for (const dim of ALL_DIMS) {
      const sigDim = sig.dimensions.find(d => d.dimension === dim);
      const bgNode = bg.signal_nodes.find(n => n.dimension === dim);
      dims[dim] = {
        value: bgNode?.value ?? null,
        tier: sigDim?.evidence_tier ?? "insufficient_evidence",
        hasTension: sigDim?.contradiction_flag ?? false,
      };
    }

    const piNode = bg.signal_nodes.find(n => n.dimension === "parent_instinct");

    return {
      id: row.id,
      archetype: row.archetype,
      parent_pattern: row.parent_pattern ?? "(none)",
      parent_instinct: piNode?.value ?? "insufficient",
      parent_instinct_tier: piNode?.evidence_tier ?? "insufficient_evidence",
      dims,
      ok: true,
    };
  } catch (e) {
    return {
      id: row.id,
      archetype: row.archetype,
      parent_pattern: row.parent_pattern ?? "(none)",
      parent_instinct: "error",
      parent_instinct_tier: "insufficient_evidence",
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
    if (d) accumulateDim(agg, d);
  }
  return agg;
}

function printDimAgg(dim: string, agg: DimAgg, clearThreshold = 0.60) {
  if (agg.total === 0) { console.log(`    ${dim}: no data`); return; }

  const sorted = Object.entries(agg.valueCounts).sort((a, b) => b[1] - a[1]);
  const topPct = sorted[0] ? sorted[0][1] / agg.total : 0;
  const signal = topPct >= clearThreshold ? " ✓SIGNAL" : " ~scattered";

  const valStr = sorted.map(([v, n]) => `${v}=${pct(n, agg.total)}(${n})`).join("  ");
  const tierOrder: EvidenceTier[] = ["direct_evidence", "framework_interpretation", "hypothesis", "insufficient_evidence"];
  const tierStr = tierOrder
    .filter(t => agg.tierCounts[t])
    .map(t => `${t.replace(/_/g, "-")}=${pct(agg.tierCounts[t]!, agg.total)}`)
    .join(" ");
  const tensionStr = agg.tensionCount > 0
    ? `  tension=${pct(agg.tensionCount, agg.total)}(${agg.tensionCount})`
    : "";

  console.log(`    ${dim}${signal}`);
  console.log(`      values: ${valStr}`);
  console.log(`      tiers:  ${tierStr}${tensionStr}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { raw, deduped, dupCount } = await fetchRows();

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Phase 4 Production Aggregate — analytics branch (COW copy) ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
  console.log(`  Raw rows (archetype IS NOT NULL): ${raw.length}`);
  console.log(`  Duplicate rows dropped (same session_id, kept most recent): ${dupCount}`);
  console.log(`  Independent-family rows after dedup: ${deduped.length}\n`);

  const rows = deduped.map(computeRow);
  const okRows = rows.filter(r => r.ok);
  const errors = rows.filter(r => !r.ok);

  if (errors.length) {
    console.log(`Engine errors (${errors.length} rows skipped):`);
    for (const e of errors) console.log(`  ${e.id.slice(0, 8)}: ${e.error?.slice(0, 120)}`);
    console.log();
  }

  console.log(`  Valid rows for aggregation: ${okRows.length}\n`);

  const KNOWN_ARCHETYPES = [
    "The All-In Kid", "The Inventor", "The Explorer", "The Magnet",
    "The Glue", "The Captain", "The Live Wire", "The Storm",
  ];

  const archetypeGroups: Record<string, ComputedRow[]> = {};
  for (const r of okRows) {
    (archetypeGroups[r.archetype] ??= []).push(r);
  }

  // ── §1 Per-archetype dimension distributions ──────────────────────────────

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("§1  PER-ARCHETYPE DIMENSION DISTRIBUTIONS  [BG signal enum values]");
  console.log("═══════════════════════════════════════════════════════════════\n");
  console.log("  ✓SIGNAL = dominant value ≥60% of rows. ~scattered = no clear signal.\n");

  const zeroCount = KNOWN_ARCHETYPES.filter(a => !archetypeGroups[a]);
  if (zeroCount.length) {
    console.log(`  Zero-row archetypes: ${zeroCount.join(", ")}\n`);
  }

  const archetypeSorted = Object.entries(archetypeGroups).sort((a, b) => b[1].length - a[1].length);

  for (const [archetype, aRows] of archetypeSorted) {
    const stagingNote = ["The Storm", "The Explorer", "The Magnet", "The Live Wire"].includes(archetype) ? " ← thin in staging" : "";
    console.log(`┌─ ${archetype}  (n=${aRows.length})${stagingNote}`);

    const piCounts: Record<string, number> = {};
    for (const r of aRows) piCounts[r.parent_instinct] = (piCounts[r.parent_instinct] ?? 0) + 1;
    const piStr = Object.entries(piCounts).sort((a, b) => b[1] - a[1])
      .map(([v, n]) => `${v}=${pct(n, aRows.length)}(${n})`).join("  ");
    console.log(`│  parent_instinct [BG enum]: ${piStr}`);
    console.log("│");

    for (const dim of ALL_DIMS) {
      const agg = dimAggFromRows(aRows, dim);
      printDimAgg(dim, agg);
    }
    console.log();
  }

  // ── §2 Per-parent-instinct dimension distributions ────────────────────────

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("§2  PER-PARENT-INSTINCT DIMENSION DISTRIBUTIONS");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const piGroups: Record<string, ComputedRow[]> = {};
  for (const r of okRows) {
    (piGroups[r.parent_instinct] ??= []).push(r);
  }

  for (const [pi, pRows] of Object.entries(piGroups).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`┌─ parent_instinct=${pi}  (n=${pRows.length})`);

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

  // ── §3 Archetype × negotiator/steady-hand cross-tab (n≥3) ────────────────

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("§3  ARCHETYPE × NEGOTIATOR/STEADY-HAND CROSS-TAB  (min n=3)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const TARGET_PI = new Set(["negotiator", "steady-hand"]);
  const MIN_N = 3;

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

  const cells: Record<string, ComputedRow[]> = {};
  for (const r of okRows) {
    if (!TARGET_PI.has(r.parent_instinct)) continue;
    const key = `${r.archetype}||${r.parent_instinct}`;
    (cells[key] ??= []).push(r);
  }

  const qualifyingCells = Object.entries(cells)
    .filter(([, cRows]) => cRows.length >= MIN_N)
    .sort((a, b) => {
      const [, aPi] = a[0].split("||");
      const [, bPi] = b[0].split("||");
      if (aPi !== bPi) return (aPi ?? "") < (bPi ?? "") ? -1 : 1;
      return a[0] < b[0] ? -1 : 1;
    });

  if (qualifyingCells.length === 0) {
    console.log("  No cell has ≥3 rows.\n  Raw counts:");
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

        const cellTR = agg.tensionCount / agg.total;
        const cellHR = (agg.tierCounts["hypothesis"] ?? 0) / agg.total;
        const base = baseline[dim] ?? { tensionRate: 0, hypothesisRate: 0 };
        const tensionFlag = cellTR > 0.15 && cellTR > base.tensionRate + 0.10
          ? `  ⚑ tension elevated (cell=${pct(agg.tensionCount, agg.total)} vs base=${pct(Math.round(base.tensionRate * agg.total), agg.total)})`
          : "";
        const hypFlag = cellHR > 0.25 && cellHR > base.hypothesisRate + 0.15
          ? `  ⚑ hypothesis elevated (cell=${pct(agg.tierCounts["hypothesis"] ?? 0, agg.total)} vs base=${pct(Math.round(base.hypothesisRate * agg.total), agg.total)})`
          : "";

        const valStr = Object.entries(agg.valueCounts).sort((a, b) => b[1] - a[1])
          .map(([v, n]) => `${v}=${pct(n, agg.total)}(${n})`).join("  ");
        const tierOrder: EvidenceTier[] = ["direct_evidence", "framework_interpretation", "hypothesis", "insufficient_evidence"];
        const tierStr = tierOrder.filter(t => agg.tierCounts[t])
          .map(t => `${t.replace(/_/g, "-")}=${pct(agg.tierCounts[t]!, agg.total)}`).join(" ");

        console.log(`│  ${dim}`);
        console.log(`│    values: ${valStr}`);
        console.log(`│    tiers:  ${tierStr}${tensionFlag}${hypFlag}`);
      }
      console.log();
    }
  }

  // ── §4 All negotiator/steady-hand cells ───────────────────────────────────

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("§4  ALL NEGOTIATOR/STEADY-HAND CELLS (any n)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const allCellsSorted = Object.entries(cells).sort((a, b) => b[1].length - a[1].length);
  console.log("  " + "archetype".padEnd(28) + "parent_instinct".padEnd(16) + "n");
  console.log("  " + "─".repeat(52));
  for (const [key, cRows] of allCellsSorted) {
    const [arch, pi] = key.split("||");
    console.log("  " + (arch ?? "").padEnd(28) + (pi ?? "").padEnd(16) + cRows.length);
  }
  console.log();
}

main().catch(e => { console.error(e); process.exit(1); });
