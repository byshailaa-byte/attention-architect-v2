/**
 * Smoke C — contrast narrow-deep vs sensation-seeking snapshot groupings.
 * Uses prod session dimensions. Runs new scorer locally (not from DB axes —
 * old sessions have axes without attention field).
 */
import { neon } from "@neondatabase/serverless";
import { scoreAssessment } from "@/lib/engine/scorer";
import type { Dimensions } from "@/lib/engine/scorer";

const sql = neon(process.env.DATABASE_URL_PROD!);

// Fetch one narrow-deep (All-In Kid) and one sensation-seeking (Live Wire)
// using stored dimensions — recompute with new engine
const rows = await sql`
  SELECT a.session_id, a.archetype, a.dimensions
  FROM assessments a
  WHERE a.archetype IN ('The All-In Kid', 'The Live Wire', 'The Storm')
    AND a.dimensions IS NOT NULL
  ORDER BY
    CASE a.archetype
      WHEN 'The Live Wire' THEN 1
      WHEN 'The Storm' THEN 2
      WHEN 'The All-In Kid' THEN 3
    END,
    a.created_at DESC
  LIMIT 6
` as Array<{ session_id: string; archetype: string; dimensions: Dimensions }>;

console.log("=== SMOKE C: SNAPSHOT GROUPING CONTRAST ===\n");

const seen = new Set<string>();
const picked: typeof rows = [];
for (const r of rows) {
  const group = r.archetype === "The All-In Kid" ? "nd" : "ss";
  if (!seen.has(group)) { seen.add(group); picked.push(r); }
  if (picked.length === 2) break;
}

const AXIS_TO_DIM: Record<string, string> = {
  Attention:  "attention_shape",
  Stability:  "friction_response",
  Resistance: "attention_competition",
  Recovery:   "recharge_type",
};

for (const r of picked) {
  const out = scoreAssessment(r.dimensions);
  const weakKeys = new Set(out.weakest_two.map(ax => AXIS_TO_DIM[ax]).filter(Boolean));
  const amberDims = ["attention_shape","attention_competition","friction_response","recharge_type"].filter(d => weakKeys.has(d));
  const tealDims  = ["attention_shape","attention_competition","friction_response","recharge_type"].filter(d => !weakKeys.has(d));

  console.log(`${r.archetype} — ${r.session_id.slice(0, 8)}`);
  console.log(`  weakest_two: ${JSON.stringify(out.weakest_two)}`);
  console.log(`  attention:  norm=${out.axes.attention.norm.toFixed(4)} band=${out.axes.attention.band}`);
  console.log(`  stability:  norm=${out.axes.stability.norm.toFixed(4)} band=${out.axes.stability.band}`);
  console.log(`  resistance: norm=${out.axes.resistance.norm.toFixed(4)} band=${out.axes.resistance.band}`);
  console.log(`  recovery:   norm=${out.axes.recovery.norm.toFixed(4)} band=${out.axes.recovery.band} eligible=${out.axes.recovery.eligible}`);
  console.log(`  ► "Where the plan starts" (amber): ${amberDims.join(", ")}`);
  console.log(`  ► "Already working"  (teal):  ${tealDims.join(", ")}`);
  console.log();
}

// Confirm no session shows all four in one group
const allRows = await sql`
  SELECT a.session_id, a.dimensions
  FROM assessments a
  WHERE a.dimensions IS NOT NULL
  LIMIT 50
` as Array<{ session_id: string; dimensions: Dimensions }>;

let allAmber = 0;
for (const r of allRows) {
  try {
    const out = scoreAssessment(r.dimensions);
    if (out.weakest_two.length >= 4) allAmber++;
  } catch { /* skip */ }
}
console.log(`All-four-in-one-group check (sampled 50 sessions): ${allAmber === 0 ? "✓ none" : `✗ ${allAmber} sessions`}`);
