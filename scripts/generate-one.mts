// Generate exactly one free-only assessment from the pending queue.
// Identical code path as the full backfill — composeReport → runQualityEngine → publish.
import { neon } from "@neondatabase/serverless";
import { buildHdg } from "@/lib/graph/hdg";
import { buildBehaviourGraph } from "@/lib/graph/behaviour-graph";
import { buildBehaviourSignature } from "@/lib/graph/signature";
import { buildConfidenceVector } from "@/lib/graph/confidence";
import { buildFamilyAttentionLoop } from "@/lib/graph/loop";
import { scoreAssessment } from "@/lib/engine/scorer";
import { buildNarrativeContext } from "@/lib/narrative/context";
import { composeReport } from "@/lib/narrative/compose-report";
import { runQualityEngine } from "@/lib/quality/engine";
import type { AttentionMoment } from "@/lib/narrative/types";

const MAX_DATA_POINTS = 18;

const sql = neon(process.env.DATABASE_URL!);

// Pick ONE pending free-only assessment
const pending = await sql`
  SELECT a.id, a.session_id, a.child_name, a.age_band, a.child_gender,
         a.parent_name, a.archetype, a.parent_pattern,
         a.archetype_fit_tier, a.parent_instinct_fit_tier,
         a.concerns, a.answers, a.dimensions AS dimensions_json,
         a.generation_attempts
  FROM assessments a
  WHERE a.parent_name IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM reports r
      WHERE r.assessment_id = a.id AND r.superseded_by IS NULL
    )
    AND a.generation_attempts < 5
    AND NOT EXISTS (SELECT 1 FROM purchases p WHERE p.assessment_id = a.id AND p.status = 'paid')
  ORDER BY a.created_at ASC
  LIMIT 1
` as unknown as any[];

if (pending.length === 0) { console.log("No pending assessments."); process.exit(0); }
const row = pending[0];
console.log(`Generating: ${row.id.slice(0, 8)} (${row.child_name ?? "?"} / ${row.parent_name})`);

// Increment attempt counter
await sql`UPDATE assessments SET generation_attempts = generation_attempts + 1 WHERE id = ${row.id}::uuid AND generation_attempts < 5`;

const hdg = buildHdg(row.answers);
const bg  = buildBehaviourGraph(hdg);
const sig = buildBehaviourSignature(hdg, bg);
const cv  = buildConfidenceVector(hdg, bg, sig);
const loop = buildFamilyAttentionLoop(hdg, bg, sig);
const scoring = scoreAssessment(row.dimensions_json, MAX_DATA_POINTS, cv.overall_confidence);
const ctx = buildNarrativeContext(
  { child_name: row.child_name, age_band: row.age_band, child_gender: row.child_gender,
    parent_name: row.parent_name, archetype: row.archetype,
    archetype_fit_tier: row.archetype_fit_tier ?? scoring.archetype_fit_tier,
    parent_pattern: row.parent_pattern, concerns: row.concerns ?? [],
    parent_instinct_fit_tier: row.parent_instinct_fit_tier ?? scoring.parent_instinct_fit_tier },
  hdg, bg, sig, loop, cv, scoring,
);

const { report: composed, specs } = await composeReport(ctx);
console.log(`composeReport done — archetype: ${composed.archetype}`);

const priorRows = await sql`
  SELECT narrative_moments FROM reports WHERE superseded_by IS NULL AND status IN ('draft','published')
  ORDER BY generated_at DESC LIMIT 10
` as unknown as { narrative_moments: AttentionMoment[] }[];
const priorTexts = priorRows
  .map(r => r.narrative_moments?.find?.((m: AttentionMoment) => m.section === "Recognition")?.content)
  .filter((s): s is string => typeof s === "string" && s.length > 0);

const { moments: finalMoments, qualityResult } = await runQualityEngine({
  moments: composed.moments, specs, archetype: composed.archetype,
  archetypeFitTier: composed.archetype_fit_tier, parentInstinct: composed.parent_instinct,
  parentInstinctFitTier: composed.parent_instinct_fit_tier ?? "no_clear_fit",
  loop, priorRecognitionTexts: priorTexts, ctx,
});
console.log(`Quality: ${qualityResult.passed ? "passed" : "failed"}`);
if (!qualityResult.passed) { console.error("Quality failed:", qualityResult.failures); process.exit(1); }

const [rep] = await sql`
  INSERT INTO reports (assessment_id, behaviour_signature, archetype, archetype_fit_tier,
    parent_instinct, parent_instinct_fit_tier, narrative_moments, family_attention_loop,
    confidence_vector, status, schema_version, quality_check_results, auto_generated,
    promoted_at, promoted_by)
  VALUES (${row.id}::uuid, ${JSON.stringify(sig)}::jsonb, ${composed.archetype},
    ${composed.archetype_fit_tier}, ${composed.parent_instinct},
    ${composed.parent_instinct_fit_tier ?? null}, ${JSON.stringify(finalMoments)}::jsonb,
    ${JSON.stringify(loop)}::jsonb, ${JSON.stringify(cv)}::jsonb,
    'published', ${composed.schema_version}, ${JSON.stringify(qualityResult)}::jsonb,
    false, ${new Date().toISOString()}, 'backfill')
  RETURNING id
` as unknown as { id: string }[];

console.log(`✓ Published reportId=${rep.id}`);
console.log(`SESSION_ID=${row.session_id}`);
