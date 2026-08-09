/**
 * Phase 4 — overall_confidence distribution across existing production rows.
 *
 * Computes buildConfidenceVector() from stored answers for every deduplicated
 * non-Unknown row, reports the distribution, and flags where low values cluster.
 * Output: aggregate statistics only. No PII.
 *
 * Run: DATABASE_URL="..." npx tsx scripts/phase4-confidence-dist.ts
 */

import { neon } from "@neondatabase/serverless";
import { buildHdg } from "../lib/graph/hdg";
import { buildBehaviourGraph } from "../lib/graph/behaviour-graph";
import { buildBehaviourSignature } from "../lib/graph/signature";
import { buildConfidenceVector } from "../lib/graph/confidence";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("DATABASE_URL required"); process.exit(1); }
const sql = neon(DB_URL);

interface DbRow {
  id: string;
  session_id: string | null;
  archetype: string;
  created_at: string;
  answers: Record<string, string>;
}

function bucket(v: number): string {
  if (v >= 0.90) return "0.90–1.00";
  if (v >= 0.80) return "0.80–0.89";
  if (v >= 0.70) return "0.70–0.79";
  if (v >= 0.60) return "0.60–0.69";
  if (v >= 0.50) return "0.50–0.59";
  if (v >= 0.40) return "0.40–0.49";
  return "<0.40";
}

async function main() {
  const raw = (await sql`
    SELECT id, session_id, archetype, created_at, answers
    FROM assessments
    WHERE archetype IS NOT NULL
      AND archetype != 'Unknown'
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
  const rows = [...sessionMap.values(), ...noSession];

  console.log(`\n=== Phase 4 — overall_confidence Distribution ===`);
  console.log(`Raw rows: ${raw.length} | After dedup: ${rows.length}\n`);

  const buckets: Record<string, number> = {};
  const values: number[] = [];
  const perDimMeans: Record<string, number[]> = {};
  const lowRows: Array<{ archetype: string; oc: number; missingEvidence: string[] }> = [];

  for (const row of rows) {
    try {
      const hdg = buildHdg(row.answers);
      const bg = buildBehaviourGraph(hdg);
      const sig = buildBehaviourSignature(hdg, bg);
      const cv = buildConfidenceVector(hdg, bg, sig);

      const oc = cv.overall_confidence;
      values.push(oc);

      const b = bucket(oc);
      buckets[b] = (buckets[b] ?? 0) + 1;

      for (const [dim, conf] of Object.entries(cv.per_dimension_confidence)) {
        if (!perDimMeans[dim]) perDimMeans[dim] = [];
        perDimMeans[dim].push(conf);
      }

      if (oc < 0.55) {
        lowRows.push({ archetype: row.archetype, oc: Math.round(oc * 1000) / 1000, missingEvidence: cv.missing_evidence });
      }
    } catch {
      // skip malformed rows
    }
  }

  const n = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const sorted = [...values].sort((a, b) => a - b);
  const p10 = sorted[Math.floor(n * 0.10)] ?? 0;
  const p25 = sorted[Math.floor(n * 0.25)] ?? 0;
  const p50 = sorted[Math.floor(n * 0.50)] ?? 0;
  const min = sorted[0] ?? 0;

  console.log(`── Bucket distribution ─────────────────────────────────`);
  const BUCKET_ORDER = ["0.90–1.00","0.80–0.89","0.70–0.79","0.60–0.69","0.50–0.59","0.40–0.49","<0.40"];
  for (const b of BUCKET_ORDER) {
    const cnt = buckets[b] ?? 0;
    const bar = "█".repeat(Math.round(cnt / n * 30));
    console.log(`  ${b}: n=${cnt} (${Math.round(cnt/n*100)}%) ${bar}`);
  }

  console.log(`\n── Summary statistics ──────────────────────────────────`);
  console.log(`  n=${n}  mean=${mean.toFixed(3)}  min=${min.toFixed(3)}`);
  console.log(`  p10=${p10.toFixed(3)}  p25=${p25.toFixed(3)}  p50=${p50.toFixed(3)}`);

  console.log(`\n── Per-dimension mean confidence ───────────────────────`);
  const DIM_ORDER = ["attention_shape","reward_driver","friction_response","parent_instinct","attention_competition","recharge_type"];
  for (const dim of DIM_ORDER) {
    const vals = perDimMeans[dim] ?? [];
    const m = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    console.log(`  ${dim.padEnd(24)}: mean=${m.toFixed(3)} (n=${vals.length})`);
  }

  if (lowRows.length > 0) {
    console.log(`\n── Rows with overall_confidence < 0.55 ─────────────────`);
    for (const r of lowRows) {
      console.log(`  oc=${r.oc}  archetype=${r.archetype}  missing=${r.missingEvidence.length > 0 ? r.missingEvidence.join(",") : "none"}`);
    }
  } else {
    console.log(`\n✓ No rows with overall_confidence < 0.55`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
