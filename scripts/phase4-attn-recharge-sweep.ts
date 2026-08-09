/**
 * Phase 4 — Attention/recharge cross-tab sweep for negotiator/steady-hand cells.
 *
 * Reports attention_competition and recharge_type distributions (BG enum values)
 * for every archetype × {negotiator, steady-hand} cell with n≥3.
 * For cells with elevation >1.5 rows above archetype baseline, pulls D5.x/D6.x answer patterns.
 * Confirms 9 Unknown/insufficient rows excluded from all denominators.
 *
 * Run: ANALYTICS_DB_URL="..." npx tsx scripts/phase4-attn-recharge-sweep.ts
 * Output: aggregate statistics only — no child_name, parent_name, email, or free-text answers.
 */

import { neon } from "@neondatabase/serverless";
import { buildHdg } from "../lib/graph/hdg";
import { buildBehaviourGraph } from "../lib/graph/behaviour-graph";
import { buildBehaviourSignature } from "../lib/graph/signature";

const DB_URL = process.env.ANALYTICS_DB_URL;
if (!DB_URL) { console.error("ANALYTICS_DB_URL required"); process.exit(1); }
const sql = neon(DB_URL);

interface DbRow {
  id: string;
  session_id: string | null;
  archetype: string;
  parent_pattern: string;
  answers: Record<string, string>;
  created_at: string;
}

const ALL_DIMS = ["attention_competition", "recharge_type"] as const;
const TARGET_PI = new Set(["negotiator", "steady-hand"]);
const MIN_N = 3;

// Archetype baselines (from corrected main aggregate, 183-row production corpus)
// Format: { attn_comp: {value: rate}, recharge: {value: rate} }
const BASELINES: Record<string, { attn: Record<string, number>; recharge: Record<string, number> }> = {
  "The All-In Kid":  { attn: { novelty: 0.50, internal: 0.24, external: 0.20, social: 0.03, "genuine-interest": 0.02, "task-escape": 0.02 }, recharge: { "sensory-quiet": 0.44, "cognitive-displacement": 0.29, "autonomous-unstructured": 0.15, "social-connection": 0.12 } },
  "The Inventor":    { attn: { internal: 0.53, external: 0.23, novelty: 0.17, social: 0.03, "genuine-interest": 0.03 }, recharge: { "autonomous-unstructured": 0.37, "cognitive-displacement": 0.33, "sensory-quiet": 0.17, "social-connection": 0.13 } },
  "The Explorer":    { attn: { novelty: 0.38, internal: 0.33, external: 0.24, social: 0.05 }, recharge: { "social-connection": 0.29, "sensory-quiet": 0.29, "cognitive-displacement": 0.29, "autonomous-unstructured": 0.14 } },
  "The Magnet":      { attn: { social: 0.50, external: 0.50 }, recharge: { "social-connection": 0.33, "sensory-quiet": 0.25, "cognitive-displacement": 0.17, "autonomous-unstructured": 0.25 } },
  "The Glue":        { attn: { social: 0.43, "genuine-interest": 0.29, external: 0.14, novelty: 0.14 }, recharge: { "social-connection": 0.57, "sensory-quiet": 0.29, "autonomous-unstructured": 0.14 } },
  "The Captain":     { attn: { internal: 0.67, novelty: 0.33 }, recharge: { "sensory-quiet": 0.67, "cognitive-displacement": 0.33 } },
  "The Live Wire":   { attn: { external: 0.58, internal: 0.32, novelty: 0.05, social: 0.05 }, recharge: { "autonomous-unstructured": 0.42, "cognitive-displacement": 0.32, "social-connection": 0.21, "sensory-quiet": 0.05 } },
  "The Storm":       { attn: { internal: 0.31, novelty: 0.25, social: 0.19, "genuine-interest": 0.13, external: 0.13 }, recharge: { "cognitive-displacement": 0.44, "autonomous-unstructured": 0.44, "sensory-quiet": 0.06, "social-connection": 0.06 } },
};

async function fetchRows(): Promise<{ deduped: DbRow[]; rawCount: number; dupCount: number; unknownCount: number }> {
  const raw = (await sql`
    SELECT id, session_id, archetype, parent_pattern, answers, created_at
    FROM assessments
    WHERE archetype IS NOT NULL
      AND answers IS NOT NULL
      AND answers::text != '{}'
    ORDER BY created_at
  `) as DbRow[];

  const sessionMap = new Map<string, DbRow>();
  const noSession: DbRow[] = [];

  for (const row of raw) {
    if (!row.session_id) {
      noSession.push(row);
    } else {
      const existing = sessionMap.get(row.session_id);
      if (!existing || String(row.created_at) > String(existing.created_at)) {
        sessionMap.set(row.session_id, row);
      }
    }
  }

  const deduped = [...sessionMap.values(), ...noSession];
  const unknownCount = deduped.filter(r => !r.archetype || r.archetype === "Unknown").length;
  // Exclude Unknown rows from the working set
  const filtered = deduped.filter(r => r.archetype && r.archetype !== "Unknown");

  return {
    deduped: filtered,
    rawCount: raw.length,
    dupCount: raw.length - deduped.length,
    unknownCount,
  };
}

type DimResult = {
  value: string | null;
  tier: string;
  hasTension: boolean;
};

function processDims(row: DbRow): { pi: string | null; dims: Record<string, DimResult>; g2: string | null } {
  const hdg = buildHdg(row.answers);
  const bg = buildBehaviourGraph(hdg);
  const sig = buildBehaviourSignature(hdg, bg);

  const piNode = bg.signal_nodes.find(n => n.dimension === "parent_instinct");
  const g2Node = bg.signal_nodes.find(n => n.dimension === "attention_competition"); // G2 gateway = attn_comp

  const dims: Record<string, DimResult> = {};
  for (const dim of ALL_DIMS) {
    const bgNode = bg.signal_nodes.find(n => n.dimension === dim);
    const sigDim = sig.dimensions.find(d => d.dimension === dim);
    dims[dim] = {
      value: bgNode?.value ?? null,
      tier: bgNode?.evidence_tier ?? sigDim?.evidence_tier ?? "insufficient_evidence",
      hasTension: sigDim?.contradiction_flag ?? false,
    };
  }

  return { pi: piNode?.value ?? null, dims, g2: g2Node?.value ?? null };
}

function pct(n: number, total: number): string {
  return total === 0 ? "0%" : `${Math.round((n / total) * 100)}%`;
}

function noiseCheck(value: string, obs: number, n: number, baseRate: number): string {
  const expected = baseRate * n;
  const delta = obs - expected;
  if (Math.abs(delta) < 1.5) return "";
  const sign = delta > 0 ? "+" : "";
  return `  ← ${sign}${delta.toFixed(1)} rows vs expected ${expected.toFixed(1)} at archetype baseline (${Math.round(baseRate * 100)}%)`;
}

async function main() {
  const { deduped, rawCount, dupCount, unknownCount } = await fetchRows();

  console.log(`\n=== Phase 4 — Attention/Recharge Cross-Tab Sweep ===`);
  console.log(`Raw rows: ${rawCount} | Duplicates dropped: ${dupCount} | Working corpus: ${deduped.length} real-archetype rows`);
  console.log(`Unknown/insufficient rows excluded from all denominators: ${unknownCount}`);
  console.log(`(9 expected)\n`);

  // Build per-archetype × PI cell data
  type CellData = {
    rows: Array<{ dims: Record<string, DimResult>; g2: string | null; answers: Record<string, string> }>;
    attnComp: Record<string, number>;
    recharge: Record<string, number>;
    attnTension: number;
    rechargeTension: number;
  };

  const cells: Record<string, Record<string, CellData>> = {};
  const archetypeTotals: Record<string, number> = {};

  // Also build archetype-wide totals for all families (including non-negotiator/steady-hand)
  // to confirm baselines
  for (const row of deduped) {
    archetypeTotals[row.archetype] = (archetypeTotals[row.archetype] ?? 0) + 1;
    const { pi, dims, g2 } = processDims(row);
    if (!pi || !TARGET_PI.has(pi)) continue;

    if (!cells[row.archetype]) cells[row.archetype] = {};
    if (!cells[row.archetype][pi]) {
      cells[row.archetype][pi] = { rows: [], attnComp: {}, recharge: {}, attnTension: 0, rechargeTension: 0 };
    }
    const cell = cells[row.archetype][pi];
    cell.rows.push({ dims, g2, answers: row.answers });

    const ac = dims["attention_competition"];
    if (ac.value) cell.attnComp[ac.value] = (cell.attnComp[ac.value] ?? 0) + 1;
    if (ac.hasTension) cell.attnTension++;

    const rc = dims["recharge_type"];
    if (rc.value) cell.recharge[rc.value] = (cell.recharge[rc.value] ?? 0) + 1;
    if (rc.hasTension) cell.rechargeTension++;
  }

  // Print per-archetype × PI cells with n>=MIN_N
  const ARCHETYPE_ORDER = [
    "The All-In Kid", "The Inventor", "The Explorer", "The Magnet",
    "The Glue", "The Captain", "The Live Wire", "The Storm",
  ];
  const PI_ORDER = ["negotiator", "steady-hand"];

  // Track cells that need D5.x/D6.x breakdown (>1.5 rows above expected)
  const breakdownCells: Array<{ archetype: string; pi: string; label: string }> = [];

  for (const arch of ARCHETYPE_ORDER) {
    const archN = archetypeTotals[arch] ?? 0;
    const base = BASELINES[arch] ?? { attn: {}, recharge: {} };
    if (!cells[arch]) continue;

    for (const pi of PI_ORDER) {
      const cell = cells[arch]?.[pi];
      if (!cell || cell.rows.length < MIN_N) continue;
      const n = cell.rows.length;

      console.log(`${"═".repeat(70)}`);
      console.log(`  ${arch} × ${pi}  (n=${n}, archetype total n=${archN})`);
      console.log(`${"═".repeat(70)}`);

      // attention_competition
      const acSorted = Object.entries(cell.attnComp).sort((a, b) => b[1] - a[1]);
      console.log(`\n  attention_competition:`);
      let needsBreakdownAC = false;
      for (const [val, cnt] of acSorted) {
        const noise = noiseCheck(val, cnt, n, base.attn[val] ?? 0);
        if (noise) needsBreakdownAC = true;
        console.log(`    ${val}=${pct(cnt, n)}(${cnt})${noise}`);
      }
      console.log(`    tension: ${cell.attnTension}/${n} (${pct(cell.attnTension, n)})`);

      // recharge_type
      const rcSorted = Object.entries(cell.recharge).sort((a, b) => b[1] - a[1]);
      console.log(`\n  recharge_type:`);
      let needsBreakdownRC = false;
      for (const [val, cnt] of rcSorted) {
        const noise = noiseCheck(val, cnt, n, base.recharge[val] ?? 0);
        if (noise) needsBreakdownRC = true;
        console.log(`    ${val}=${pct(cnt, n)}(${cnt})${noise}`);
      }
      console.log(`    tension: ${cell.rechargeTension}/${n} (${pct(cell.rechargeTension, n)})`);

      console.log();

      if (needsBreakdownAC || needsBreakdownRC) {
        breakdownCells.push({ archetype: arch, pi, label: `${arch} × ${pi}` });
      }
    }
  }

  // D5.x / D6.x breakdown for surviving cells
  if (breakdownCells.length > 0) {
    console.log(`\n${"═".repeat(70)}`);
    console.log(`  D5.x / D6.x ANSWER BREAKDOWN — surviving flagged cells`);
    console.log(`${"═".repeat(70)}\n`);

    for (const target of breakdownCells) {
      const cell = cells[target.archetype]?.[target.pi];
      if (!cell) continue;

      console.log(`  ── ${target.label} (n=${cell.rows.length}) ──\n`);

      // G2 distribution (determines which depth questions were asked)
      const g2Dist: Record<string, number> = {};
      for (const r of cell.rows) {
        const g = r.g2 ?? "(null)";
        g2Dist[g] = (g2Dist[g] ?? 0) + 1;
      }
      console.log(`  G2 (attention_competition gateway):`);
      Object.entries(g2Dist).sort((a,b) => b[1]-a[1]).forEach(([v,c]) => console.log(`    ${v}=${c}`));
      console.log();

      // D5.x (attention_competition depth — only asked when G2=social → slot3=attn_comp)
      const d5Patterns: Record<string, number> = {};
      for (const r of cell.rows) {
        if (r.g2 !== "social") continue; // D5.x only asked for social G2
        const d51 = r.answers["D5.1"] ?? "-";
        const d52 = r.answers["D5.2"] ?? "-";
        const key = `D5.1=${d51}  D5.2=${d52}`;
        d5Patterns[key] = (d5Patterns[key] ?? 0) + 1;
      }
      const d5Count = Object.values(d5Patterns).reduce((a, b) => a + b, 0);
      if (d5Count > 0) {
        console.log(`  D5.x answer patterns (${d5Count} rows with G2=social):`);
        Object.entries(d5Patterns).sort((a,b) => b[1]-a[1]).forEach(([k,c]) => console.log(`    n=${c}  ${k}`));
      } else {
        console.log(`  D5.x: no rows with G2=social — depth questions not asked in this cell`);
      }
      console.log();

      // D6.x (recharge_type depth — only asked when G2=internal → slot3=recharge_type)
      const d6DepthPatterns: Record<string, number> = {};
      const d6ConfirmPatterns: Record<string, number> = {};
      for (const r of cell.rows) {
        if (r.g2 === "internal") {
          // Got full depth: D6.1, D6.2, D6.3
          const d61 = r.answers["D6.1"] ?? "-";
          const d62 = r.answers["D6.2"] ?? "-";
          const d63 = r.answers["D6.3"] ?? "-";
          const d6c = r.answers["D6.confirm"] ?? "-";
          const key = `D6.1=${d61}  D6.2=${d62}  D6.3=${d63}  D6.conf=${d6c}`;
          d6DepthPatterns[key] = (d6DepthPatterns[key] ?? 0) + 1;
        } else {
          // Got D6.confirm only
          const d6c = r.answers["D6.confirm"] ?? "-";
          d6ConfirmPatterns[d6c] = (d6ConfirmPatterns[d6c] ?? 0) + 1;
        }
      }

      const depthCount = Object.values(d6DepthPatterns).reduce((a, b) => a + b, 0);
      const confirmCount = Object.values(d6ConfirmPatterns).reduce((a, b) => a + b, 0);

      if (depthCount > 0) {
        console.log(`  D6.x depth patterns (${depthCount} rows with G2=internal):`);
        Object.entries(d6DepthPatterns).sort((a,b) => b[1]-a[1]).forEach(([k,c]) => console.log(`    n=${c}  ${k}`));
        console.log();
      }
      if (confirmCount > 0) {
        console.log(`  D6.confirm patterns (${confirmCount} rows with G2≠internal):`);
        Object.entries(d6ConfirmPatterns).sort((a,b) => b[1]-a[1]).forEach(([k,c]) => console.log(`    n=${c}  D6.confirm=${k}`));
      }
      console.log();
    }
  } else {
    console.log(`\nNo cells with >1.5-row elevation found — sweep complete, no breakdown needed.\n`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
