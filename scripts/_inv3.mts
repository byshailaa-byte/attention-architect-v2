import { neon } from "@neondatabase/serverless";
const PROD = "postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(PROD);

// Check detection/fallback rates restricted to simplified-variant sessions
const q = await sql`
  SELECT
    COUNT(*) AS total_published_simplified,
    COUNT(*) FILTER (WHERE (r.family_attention_loop->>'detected')::boolean = true) AS loop_detected,
    COUNT(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM jsonb_array_elements(r.narrative_moments) m WHERE m->>'moment_id' = 'm_03'
    )) AS rendered_m03,
    COUNT(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM jsonb_array_elements(r.narrative_moments) m WHERE m->>'moment_id' = 'm_instinct_interaction_fallback'
    )) AS has_cached_fallback,
    COUNT(*) FILTER (WHERE (r.family_attention_loop->>'detected')::boolean = false
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(r.narrative_moments) m WHERE m->>'moment_id' = 'm_instinct_interaction_fallback'
      )
    ) AS no_loop_no_cached_fallback
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  WHERE r.status = 'published'
    AND a.pricing_variant = 'simplified'
` as unknown as {
  total_published_simplified: string;
  loop_detected: string;
  rendered_m03: string;
  has_cached_fallback: string;
  no_loop_no_cached_fallback: string;
}[];

console.log("Simplified-variant sessions only:");
console.log(JSON.stringify(q[0], null, 2));

// Also: breakdown by parent_instinct to see if detection rate clusters
const inst = await sql`
  SELECT
    r.parent_instinct,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE (r.family_attention_loop->>'detected')::boolean = true) AS detected,
    ROUND(100.0 * COUNT(*) FILTER (WHERE (r.family_attention_loop->>'detected')::boolean = true) / COUNT(*), 1) AS pct_detected
  FROM reports r
  WHERE r.status = 'published'
  GROUP BY r.parent_instinct
  ORDER BY total DESC
` as unknown as { parent_instinct: string; total: string; detected: string; pct_detected: string }[];

console.log("\nBreakdown by parent_instinct (all published):");
inst.forEach(r => console.log(`  ${r.parent_instinct}: total=${r.total} detected=${r.detected} (${r.pct_detected}%)`));
