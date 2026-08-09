/**
 * Phase 4 — gridScore distribution audit across 176 real-archetype production rows.
 *
 * Checks:
 *  (1) Distribution of anchoredStrength(attention_shape) values
 *  (2) Distribution of nonAnchoredStrength(reward_driver) values
 *  (3) Combined gridScore distribution (max 4)
 *  (4) Any rows where gridScore = 0 (both grid dimensions split)
 *  (5) Whether attention_shape ever has data_points > 1 (Rule 2 fired)
 *
 * Uses stored dimensions JSONB — no need to reprocess HDG/BG/Sig.
 * Output: aggregate statistics only. No PII.
 *
 * Run: DATABASE_URL="..." npx tsx scripts/phase4-gridscore-audit.ts
 */

import { neon } from "@neondatabase/serverless";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("DATABASE_URL required"); process.exit(1); }
const sql = neon(DB_URL);

interface DimResult {
  value: string;
  consistency: number;
  data_points: number;
  winning_votes: number;
}

interface DbRow {
  id: string;
  session_id: string | null;
  archetype: string;
  created_at: string;
  shape_dp: number;
  shape_wv: number;
  driver_dp: number;
  driver_wv: number;
  shape_value: string;
  driver_value: string;
}

// Mirror of resolver.ts logic (anchor-aware, post-fix)
function anchoredStrength(dp: number, wv: number): number {
  if (dp <= 1) return 2; // anchored single = gateway sufficient
  if (wv === dp) return 2; // unanimous
  if (wv * 2 > dp) return 1; // majority
  return 0; // split
}

function nonAnchoredStrength(dp: number, wv: number): number {
  if (dp <= 1) return 1; // non-anchored single = incomplete
  if (wv === dp) return 2; // unanimous
  if (wv * 2 > dp) return 1; // majority
  return 0; // split
}

async function main() {
  const raw = (await sql`
    SELECT
      id,
      session_id,
      archetype,
      created_at,
      (dimensions->'attention_shape'->>'data_points')::int  AS shape_dp,
      (dimensions->'attention_shape'->>'winning_votes')::int AS shape_wv,
      (dimensions->'attention_shape'->>'value')             AS shape_value,
      (dimensions->'reward_driver'->>'data_points')::int    AS driver_dp,
      (dimensions->'reward_driver'->>'winning_votes')::int  AS driver_wv,
      (dimensions->'reward_driver'->>'value')               AS driver_value
    FROM assessments
    WHERE archetype IS NOT NULL
      AND archetype != 'Unknown'
      AND dimensions IS NOT NULL
    ORDER BY created_at
  `) as DbRow[];

  // Dedup: same logic as previous scripts (keep most recent per session_id)
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
  const rows = [...sessionMap.values(), ...noSession];

  console.log(`\n=== Phase 4 — gridScore Distribution Audit ===`);
  console.log(`Raw rows (non-Unknown): ${raw.length} | After dedup: ${rows.length}\n`);

  // Per-row analysis
  const shapeScoreDist: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
  const driverScoreDist: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
  const gridScoreDist: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  const shapeDpDist: Record<number, number> = {};
  const driverDpDist: Record<number, number> = {};
  const gridScoreZeroRows: DbRow[] = [];

  for (const row of rows) {
    const ss = anchoredStrength(row.shape_dp, row.shape_wv);
    const ds = nonAnchoredStrength(row.driver_dp, row.driver_wv);
    const gs = ss + ds;

    shapeScoreDist[ss] = (shapeScoreDist[ss] ?? 0) + 1;
    driverScoreDist[ds] = (driverScoreDist[ds] ?? 0) + 1;
    gridScoreDist[gs] = (gridScoreDist[gs] ?? 0) + 1;
    shapeDpDist[row.shape_dp] = (shapeDpDist[row.shape_dp] ?? 0) + 1;
    driverDpDist[row.driver_dp] = (driverDpDist[row.driver_dp] ?? 0) + 1;

    if (gs === 0) gridScoreZeroRows.push(row);
  }

  const n = rows.length;

  console.log(`── attention_shape data_points distribution ────────────`);
  for (const [dp, cnt] of Object.entries(shapeDpDist).sort((a,b) => Number(a[0])-Number(b[0]))) {
    console.log(`  data_points=${dp}: n=${cnt} (${Math.round(cnt/n*100)}%)`);
  }

  console.log(`\n── attention_shape anchoredStrength distribution ───────`);
  for (const [score, cnt] of Object.entries(shapeScoreDist).sort((a,b) => Number(a[0])-Number(b[0]))) {
    console.log(`  score=${score}: n=${cnt} (${Math.round(cnt/n*100)}%)`);
  }

  console.log(`\n── reward_driver data_points distribution ──────────────`);
  for (const [dp, cnt] of Object.entries(driverDpDist).sort((a,b) => Number(a[0])-Number(b[0]))) {
    console.log(`  data_points=${dp}: n=${cnt} (${Math.round(cnt/n*100)}%)`);
  }

  console.log(`\n── reward_driver nonAnchoredStrength distribution ──────`);
  for (const [score, cnt] of Object.entries(driverScoreDist).sort((a,b) => Number(a[0])-Number(b[0]))) {
    console.log(`  score=${score}: n=${cnt} (${Math.round(cnt/n*100)}%)`);
  }

  console.log(`\n── Combined gridScore distribution (max=4) ─────────────`);
  for (const [gs, cnt] of Object.entries(gridScoreDist).sort((a,b) => Number(a[0])-Number(b[0]))) {
    const tier = Number(gs) >= 3 ? "primary" : Number(gs) >= 1 ? "secondary" : "weak";
    console.log(`  gridScore=${gs} (→ ${tier}): n=${cnt} (${Math.round(cnt/n*100)}%)`);
  }

  if (gridScoreZeroRows.length === 0) {
    console.log(`\n✓ gridScore=0 (both grid dimensions split): NEVER OCCURS in ${n} production rows`);
    console.log(`  "no_clear_fit" via grid-score floor is unreachable — confirmed by data, not assumed.`);
  } else {
    console.log(`\n⚠  gridScore=0 rows: n=${gridScoreZeroRows.length}`);
    for (const row of gridScoreZeroRows) {
      console.log(`  archetype=${row.archetype} shape=${row.shape_value}(dp=${row.shape_dp},wv=${row.shape_wv}) driver=${row.driver_value}(dp=${row.driver_dp},wv=${row.driver_wv})`);
    }
  }

  // Also show what the OLD scoring (single=0) would have produced for comparison
  console.log(`\n── Comparison: gridScore under OLD scoring (single=0, fallback capped at secondary) ─`);
  const oldGridScoreDist: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  let wouldHaveBeenCapped = 0;
  for (const row of rows) {
    const oldSS = row.shape_dp <= 1 ? 0 : row.shape_wv === row.shape_dp ? 2 : row.shape_wv * 2 > row.shape_dp ? 1 : 0;
    const oldDS = row.driver_dp <= 1 ? 0 : row.driver_wv === row.driver_dp ? 2 : row.driver_wv * 2 > row.driver_dp ? 1 : 0;
    const oldGS = oldSS + oldDS;
    oldGridScoreDist[oldGS] = (oldGridScoreDist[oldGS] ?? 0) + 1;
  }
  for (const [gs, cnt] of Object.entries(oldGridScoreDist).sort((a,b) => Number(a[0])-Number(b[0]))) {
    const tier = Number(gs) >= 3 ? "primary" : Number(gs) >= 1 ? "secondary" : "weak";
    console.log(`  old gridScore=${gs} (→ ${tier}): n=${cnt} (${Math.round(cnt/n*100)}%)`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
