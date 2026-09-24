/**
 * Recompute grouping across all published sessions using both changes:
 *   - RESISTANCE_MAX = 0.35
 *   - Attention 4th axis (AS_MIN=0.20, AS_MAX=0.80)
 * Reads from prod DB (SELECT only). Runs scorer locally.
 */
import { neon } from "@neondatabase/serverless";
import { scoreAssessment } from "@/lib/engine/scorer";
import type { Dimensions } from "@/lib/engine/scorer";

const DATABASE_URL = process.env.DATABASE_URL_PROD;
if (!DATABASE_URL) throw new Error("DATABASE_URL_PROD not set");
const sql = neon(DATABASE_URL);

const rows = await sql`
  SELECT a.session_id, a.archetype, a.dimensions as dimensions_json
  FROM assessments a
  JOIN reports r ON r.assessment_id = a.id
  WHERE r.status = 'published'
    AND a.dimensions IS NOT NULL
  ORDER BY a.created_at DESC
` as Array<{ session_id: string; archetype: string; dimensions_json: unknown }>;

console.log(`Sessions fetched: ${rows.length}`);

type Result = {
  session_id: string;
  archetype:  string;
  attentionShape: string;
  weakest_two: string[];
  attentionNorm:  number;
  resistanceNorm: number;
  stabilityNorm:  number;
  recoveryNorm:   number;
  recoveryEligible: boolean;
};

const results: Result[] = [];
let skipped = 0;

for (const row of rows) {
  const dims = row.dimensions_json as Dimensions;
  if (!dims?.attention_shape || !dims?.reward_driver) { skipped++; continue; }
  try {
    const out = scoreAssessment(dims);
    results.push({
      session_id: row.session_id,
      archetype:  row.archetype,
      attentionShape: dims.attention_shape.value,
      weakest_two: out.weakest_two,
      attentionNorm:  out.axes.attention.norm,
      resistanceNorm: out.axes.resistance.norm,
      stabilityNorm:  out.axes.stability.norm,
      recoveryNorm:   out.axes.recovery.norm,
      recoveryEligible: out.axes.recovery.eligible,
    });
  } catch (e) { skipped++; }
}

console.log(`Scored: ${results.length}  Skipped: ${skipped}\n`);

// ── Helper: percentile ────────────────────────────────────────────────────────
const pct = (sorted: number[], q: number) =>
  sorted[Math.min(Math.floor(q * sorted.length), sorted.length - 1)].toFixed(4);

// ── 1. Attention axis by shape value ──────────────────────────────────────────
console.log("=== ATTENTION NORM BY ATTENTION_SHAPE ===");
const shapes = ["narrow-deep", "wide-shifting", "social-anchored", "sensation-seeking"];
const shapeNorms: Record<string, number[]> = {};
for (const r of results) {
  if (!shapeNorms[r.attentionShape]) shapeNorms[r.attentionShape] = [];
  shapeNorms[r.attentionShape].push(r.attentionNorm);
}
for (const sh of shapes) {
  const s = (shapeNorms[sh] ?? []).sort((a, b) => a - b);
  if (s.length === 0) { console.log(`  ${sh.padEnd(20)} n=  0`); continue; }
  console.log(
    `  ${sh.padEnd(20)} n=${String(s.length).padStart(3)}  ` +
    `min=${s[0].toFixed(4)} P25=${pct(s,0.25)} median=${pct(s,0.50)} P75=${pct(s,0.75)} max=${s[s.length-1].toFixed(4)}`
  );
}

// ── 2. Structural overlap: do ranges share space? ─────────────────────────────
console.log("\n=== STRUCTURAL OVERLAP CHECK ===");
const ssNorms = (shapeNorms["sensation-seeking"] ?? []).sort((a, b) => a - b);
const ndNorms = (shapeNorms["narrow-deep"] ?? []).sort((a, b) => a - b);
const wsNorms = (shapeNorms["wide-shifting"] ?? []).sort((a, b) => a - b);
const saNorms = (shapeNorms["social-anchored"] ?? []).sort((a, b) => a - b);
const ssMax = ssNorms[ssNorms.length - 1] ?? 0;
const ndMin = ndNorms[0] ?? 1;
console.log(`  sensation-seeking: max=${ssMax.toFixed(4)}`);
console.log(`  social-anchored:   max=${(saNorms[saNorms.length-1] ?? 0).toFixed(4)}`);
console.log(`  wide-shifting:     max=${(wsNorms[wsNorms.length-1] ?? 0).toFixed(4)}`);
console.log(`  narrow-deep:       min=${ndMin.toFixed(4)}`);
console.log(`  Separation gap (nd_min - ss_max): ${(ndMin - ssMax).toFixed(4)}`);
const wsOverlapWithNd = ndNorms.filter(n => n <= (wsNorms[wsNorms.length-1] ?? 0)).length;
console.log(`  wide-shifting sessions that could rank above narrow-deep min: ${wsOverlapWithNd}/${ndNorms.length}`);

// ── 3. Amber frequency per dimension ─────────────────────────────────────────
console.log("\n=== AMBER FREQUENCY PER DIMENSION ===");
const axes = ["Attention", "Resistance", "Stability", "Recovery"] as const;
const dimLabels: Record<string, string> = {
  Attention: "attention_shape", Resistance: "attention_competition",
  Stability: "friction_response", Recovery: "recharge_type",
};
for (const axis of axes) {
  const count = results.filter(r => r.weakest_two.includes(axis)).length;
  console.log(`  ${axis.padEnd(10)} (${dimLabels[axis]}): ${count}/${results.length} = ${(100*count/results.length).toFixed(1)}%`);
}

// ── 4. Distinct combinations and spread ──────────────────────────────────────
const comboCounts: Record<string, number> = {};
for (const r of results) {
  const key = [...r.weakest_two].sort().join(" + ");
  comboCounts[key] = (comboCounts[key] ?? 0) + 1;
}
const sortedCombos = Object.entries(comboCounts).sort((a, b) => b[1] - a[1]);
console.log(`\n=== DISTINCT COMBINATIONS: ${sortedCombos.length} of max 6 ===`);
for (const [combo, count] of sortedCombos) {
  console.log(`  [${combo}]: ${count}  (${(100*count/results.length).toFixed(1)}%)`);
}
// Effective entropy: 1 / sum(p^2)
const probs = sortedCombos.map(([, c]) => c / results.length);
const entropy = 1 / probs.reduce((s, p) => s + p * p, 0);
console.log(`  Effective combinations (1/Σp²): ${entropy.toFixed(2)}`);

// ── 5. By archetype ───────────────────────────────────────────────────────────
const archetypes = [...new Set(results.map(r => r.archetype))].sort();
console.log("\n=== BY ARCHETYPE (attention amber%, dominant combos) ===");
for (const arch of archetypes) {
  const rs = results.filter(r => r.archetype === arch);
  const attnAmber = rs.filter(r => r.weakest_two.includes("Attention")).length;
  const combos: Record<string, number> = {};
  for (const r of rs) {
    const k = [...r.weakest_two].sort().join("+");
    combos[k] = (combos[k] ?? 0) + 1;
  }
  const topCombos = Object.entries(combos).sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, c]) => `[${k}]=${c}(${(100*c/rs.length).toFixed(0)}%)`)
    .join("  ");
  const attNormRange = rs.map(r => r.attentionNorm).sort((a, b) => a - b);
  console.log(
    `  ${arch.padEnd(20)} n=${String(rs.length).padStart(3)}  ` +
    `Attn=${attNormRange[0].toFixed(3)}-${attNormRange[attNormRange.length-1].toFixed(3)}  ` +
    `amber=${(100*attnAmber/rs.length).toFixed(0)}%  ${topCombos}`
  );
}

// ── 6. Empirical recalibration ───────────────────────────────────────────────
console.log("\n=== EMPIRICAL RECALIBRATION ===");
const allNorms = results.map(r => r.attentionNorm).sort((a, b) => a - b);
const N = allNorms.length;
console.log(`Full distribution: min=${allNorms[0].toFixed(4)} P1=${pct(allNorms,0.01)} P5=${pct(allNorms,0.05)} P25=${pct(allNorms,0.25)} P50=${pct(allNorms,0.50)} P75=${pct(allNorms,0.75)} P95=${pct(allNorms,0.95)} P99=${pct(allNorms,0.99)} max=${allNorms[N-1].toFixed(4)}`);
console.log(`\nDistinct raw values (count of unique norms): ${new Set(allNorms.map(n => n.toFixed(4))).size}`);
const uniqueNorms = [...new Set(allNorms.map(n => parseFloat(n.toFixed(4))))].sort((a, b) => a - b);
console.log(`Unique norms: ${uniqueNorms.map(n => n.toFixed(4)).join(", ")}`);
