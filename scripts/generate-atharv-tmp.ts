/**
 * One-off generation — reads assessment from local dev DB, writes preview row.
 * Usage: ASSESSMENT_ID=<uuid> npx tsx scripts/generate-atharv-tmp.ts
 * Defaults to Atharv/Chitra (RC3 — The Inventor).
 */

import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { buildHdg } from "../lib/graph/hdg";
import { buildBehaviourGraph } from "../lib/graph/behaviour-graph";
import { buildBehaviourSignature } from "../lib/graph/signature";
import { buildConfidenceVector } from "../lib/graph/confidence";
import { buildFamilyAttentionLoop } from "../lib/graph/loop";
import { scoreAssessment } from "../lib/engine/scorer";
import type { Dimensions } from "../lib/engine/scorer";
import { buildNarrativeContext } from "../lib/narrative/context";
import { composeReport } from "../lib/narrative/compose-report";
import { runQualityEngine } from "../lib/quality/engine";
import type { AttentionMoment } from "../lib/narrative/types";

const ASSESSMENT_ID = process.env.ASSESSMENT_ID ?? "4be2a3a8-957a-44ca-9b4c-2b024ed36631";
const ALL_DIMENSIONS = [
  "attention_shape", "reward_driver", "friction_response",
  "parent_instinct", "attention_competition", "recharge_type",
] as const;
const MAX_DATA_POINTS = 18;
const MAX_TOTAL_ATTEMPTS = 5;

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const rows = (await sql`
    SELECT id, session_id, child_name, age_band, child_gender, parent_name,
           archetype, parent_pattern, archetype_fit_tier, parent_instinct_fit_tier,
           concerns, answers, dimensions AS dimensions_json, weakest_two, generation_attempts
    FROM assessments WHERE id = ${ASSESSMENT_ID}::uuid LIMIT 1
  `) as any[];

  if (!rows.length) { console.error("Assessment not found in local DB"); process.exit(1); }
  const row = rows[0];

  if ((row.generation_attempts ?? 0) >= MAX_TOTAL_ATTEMPTS) {
    console.error(`generation_attempts cap reached (${row.generation_attempts}/${MAX_TOTAL_ATTEMPTS})`);
    process.exit(1);
  }

  console.log(`Generating for ${row.child_name} / ${row.parent_name} — ${row.archetype} (${row.archetype_fit_tier ?? "primary"})`);

  const answers = row.answers ?? {};
  const storedDims = row.dimensions_json ?? {};
  const dimensions: Dimensions = {} as Dimensions;
  for (const dim of ALL_DIMENSIONS) {
    const stored = storedDims[dim];
    dimensions[dim] = stored ?? { value: "unknown", consistency: 0, data_points: 0, winning_votes: 0 };
  }

  const hdg  = buildHdg(answers);
  const bg   = buildBehaviourGraph(hdg);
  const sig  = buildBehaviourSignature(hdg, bg);
  const cv   = buildConfidenceVector(hdg, bg, sig);
  const loop = buildFamilyAttentionLoop(hdg, bg, sig);
  const scoring = scoreAssessment(dimensions, MAX_DATA_POINTS, cv.overall_confidence);

  const ctx = buildNarrativeContext(
    {
      child_name:               row.child_name,
      age_band:                 row.age_band,
      child_gender:             row.child_gender,
      parent_name:              row.parent_name,
      archetype:                row.archetype,
      archetype_fit_tier:       row.archetype_fit_tier ?? scoring.archetype_fit_tier,
      parent_pattern:           row.parent_pattern,
      parent_instinct_fit_tier: row.parent_instinct_fit_tier ?? scoring.parent_instinct_fit_tier,
      concerns:                 row.concerns ?? [],
    },
    hdg, bg, sig, loop, cv, scoring,
  );

  console.log(`  loop=${loop.detected} pi_fit_tier=${ctx.parentInstinctFitTier}`);

  const t0 = Date.now();
  const { report: composed, specs } = await composeReport(ctx);
  console.log(`  ${composed.moments.length} moments in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const priorRows = (await sql`
    SELECT narrative_moments FROM reports
    WHERE assessment_id = ${ASSESSMENT_ID}::uuid AND superseded_by IS NULL AND status IN ('draft','published')
    ORDER BY generated_at DESC LIMIT 10
  `) as any[];
  const priorRecognitionTexts = priorRows
    .map(r => r.narrative_moments?.find?.((m: AttentionMoment) => m.section === "Recognition")?.content)
    .filter((s: any): s is string => typeof s === "string" && s.length > 0);

  const { moments: finalMoments, qualityResult } = await runQualityEngine({
    moments: composed.moments,
    specs,
    archetype: composed.archetype,
    archetypeFitTier: composed.archetype_fit_tier ?? "primary",
    parentInstinct: composed.parent_instinct,
    parentInstinctFitTier: composed.parent_instinct_fit_tier ?? "no_clear_fit",
    loop,
    priorRecognitionTexts,
    ctx,
  });

  console.log(`  quality=${qualityResult.passed ? "PASSED" : `FAILED (${qualityResult.failures.length} checks)`}`);
  if (!qualityResult.passed) {
    console.error("Quality failures:", JSON.stringify(qualityResult.failures, null, 2));
    process.exit(1);
  }

  const [reportRow] = (await sql`
    INSERT INTO reports (
      assessment_id, behaviour_signature, archetype, archetype_fit_tier,
      parent_instinct, parent_instinct_fit_tier, narrative_moments, family_attention_loop,
      confidence_vector, status, schema_version, quality_check_results
    ) VALUES (
      ${ASSESSMENT_ID}::uuid,
      ${JSON.stringify(sig)}::jsonb,
      ${composed.archetype},
      ${composed.archetype_fit_tier},
      ${composed.parent_instinct},
      ${composed.parent_instinct_fit_tier ?? null},
      ${JSON.stringify(finalMoments)}::jsonb,
      ${JSON.stringify(loop)}::jsonb,
      ${JSON.stringify(cv)}::jsonb,
      'preview',
      ${composed.schema_version},
      ${JSON.stringify(qualityResult)}::jsonb
    ) RETURNING id
  `) as any[];

  console.log(`\nPreview URL: http://localhost:3005/admin/report-preview/${reportRow.id}`);
}

main().catch(e => { console.error(e); process.exit(1); });
