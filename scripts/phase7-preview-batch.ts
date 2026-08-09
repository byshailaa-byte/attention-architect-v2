/**
 * Phase 7 test batch — generates preview reports for 5 existing sessions.
 *
 * Writes status='preview' rows to the reports table.
 * NEVER modifies or supersedes any existing report row.
 * No emails, no WhatsApp, no notifications triggered.
 * All work against local/dev database only.
 *
 * Run: npx tsx scripts/phase7-preview-batch.ts
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
import { scoreAssessment, tallyDimension } from "../lib/engine/scorer";
import type { Dimensions } from "../lib/engine/scorer";
import { buildNarrativeContext } from "../lib/narrative/context";
import { composeReport } from "../lib/narrative/compose-report";
import { runQualityEngine } from "../lib/quality/engine";
import type { AttentionMoment } from "../lib/narrative/types";

const ALL_DIMENSIONS = [
  "attention_shape",
  "reward_driver",
  "friction_response",
  "parent_instinct",
  "attention_competition",
  "recharge_type",
] as const;

const MAX_DATA_POINTS = 18;
const MAX_TOTAL_ATTEMPTS = 5;

// 5 sessions selected empirically from the DB.
// Selection criteria: claimed (parent_name IS NOT NULL), answers != '{}', generation_attempts < 5, no existing reports.
//
// P1/P2 original selections (9ab1c1a2, c9508308) were test rows with answers:{} and dimensions:{} —
// no HDG can be built from empty answers, so G1/G2 nodes never exist and traceability always fails.
// Replaced with real sessions of the same archetype:
//   P1 → eb45784b (The Captain, Shashanka, free tier — only paid pool had 1 real session)
//   P2 → e3fdfb4b (The Storm, real answers)
const BATCH = [
  { assessmentId: "eb45784b-fee3-4692-b512-0dbb9cef19f2", tier: "free",  label: "P1" },
  { assessmentId: "e3fdfb4b-c752-4873-978f-9ca504e0cdfb", tier: "free",  label: "P2" },
  { assessmentId: "11928a27-542f-4246-8a2f-72010b21a35c", tier: "paid",  label: "P3" },
  { assessmentId: "e1f33fd2-5cbf-48b2-9893-91577aaf0ff0", tier: "free",  label: "F1" },
  { assessmentId: "0fda65ea-66bd-45dc-9c00-c03e1996addc", tier: "free",  label: "F3" },
] as const;

const sql = neon(process.env.DATABASE_URL!);

async function generatePreview(assessmentId: string, label: string, tier: string): Promise<string | null> {
  const rows = (await sql`
    SELECT
      id, session_id, child_name, age_band, child_gender, parent_name,
      archetype, parent_pattern, archetype_fit_tier, parent_instinct_fit_tier,
      concerns, answers, dimensions AS dimensions_json, weakest_two, generation_attempts
    FROM assessments
    WHERE id = ${assessmentId}::uuid
    LIMIT 1
  `) as unknown as {
    id: string;
    session_id: string;
    child_name: string | null;
    age_band: string;
    child_gender: string | null;
    parent_name: string;
    archetype: string;
    parent_pattern: string;
    archetype_fit_tier: string | null;
    parent_instinct_fit_tier: string | null;
    concerns: string[];
    answers: Record<string, string>;
    dimensions_json: Record<string, { value: string; consistency: number; data_points: number; winning_votes: number }>;
    weakest_two: string[];
    generation_attempts: number;
  }[];

  if (rows.length === 0) {
    console.error(`  [${label}] assessment not found`);
    return null;
  }

  const row = rows[0];

  if (row.generation_attempts >= MAX_TOTAL_ATTEMPTS) {
    console.warn(`  [${label}] skipped — generation_attempts cap reached (${row.generation_attempts}/${MAX_TOTAL_ATTEMPTS})`);
    return null;
  }

  const answers = row.answers;
  const dimensions: Dimensions = {} as Dimensions;
  for (const dim of ALL_DIMENSIONS) {
    const stored = row.dimensions_json[dim];
    if (stored) {
      dimensions[dim] = stored;
    } else {
      const arr: string[] = [];
      for (const [qId, val] of Object.entries(answers)) {
        if (qId.startsWith(dim.split("_")[0])) arr.push(val);
      }
      dimensions[dim] = arr.length > 0
        ? tallyDimension(arr)
        : { value: "unknown", consistency: 0, data_points: 0, winning_votes: 0 };
    }
  }

  const hdg   = buildHdg(answers);
  const bg    = buildBehaviourGraph(hdg);
  const sig   = buildBehaviourSignature(hdg, bg);
  const cv    = buildConfidenceVector(hdg, bg, sig);
  const loop  = buildFamilyAttentionLoop(hdg, bg, sig);
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
    },
    hdg, bg, sig, loop, cv, scoring,
  );

  console.log(`  [${label}] archetype=${ctx.archetype} fit_tier=${ctx.archetypeFitTier} loop=${loop.detected} → generating...`);
  const t0 = Date.now();

  const { report: composed, specs } = await composeReport(ctx);
  // Increment only after the model has been reached — infra failures (billing/auth/429) above
  // this line throw before any model call, so the attempt budget is not consumed.
  await sql`
    UPDATE assessments SET generation_attempts = generation_attempts + 1 WHERE id = ${assessmentId}::uuid
  `;
  console.log(`  [${label}] ${composed.moments.length} moments generated in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // Prior reports for opening_similarity (preview rows excluded — they're under review, not committed)
  const priorRows = (await sql`
    SELECT narrative_moments FROM reports
    WHERE superseded_by IS NULL AND status IN ('draft', 'published')
    ORDER BY generated_at DESC LIMIT 10
  `) as unknown as { narrative_moments: AttentionMoment[] }[];

  const priorRecognitionTexts = priorRows
    .map(r => r.narrative_moments?.find?.((m: AttentionMoment) => m.section === "Recognition")?.content)
    .filter((s): s is string => typeof s === "string" && s.length > 0);

  const { moments: finalMoments, qualityResult } = await runQualityEngine({
    moments: composed.moments,
    specs,
    archetype: composed.archetype,
    archetypeFitTier: composed.archetype_fit_tier ?? "primary",
    parentInstinct: composed.parent_instinct,
    parentInstinctFitTier: composed.parent_instinct_fit_tier ?? "primary",
    loop,
    priorRecognitionTexts,
    ctx,
  });

  console.log(`  [${label}] quality=${qualityResult.passed ? "PASSED" : `FAILED (${qualityResult.failures.length} checks)`}`);

  if (!qualityResult.passed) {
    console.warn(`  [${label}] quality failures:`, JSON.stringify(qualityResult.failures, null, 2));
    console.warn(`  [${label}] NOT storing — quality gate blocked`);
    return null;
  }

  // INSERT as status='preview' — completely separate from live draft/published rows.
  // Does NOT supersede or modify any existing report row.
  const [reportRow] = (await sql`
    INSERT INTO reports (
      assessment_id, behaviour_signature, archetype, archetype_fit_tier,
      parent_instinct, parent_instinct_fit_tier, narrative_moments, family_attention_loop,
      confidence_vector, status, schema_version, quality_check_results
    ) VALUES (
      ${assessmentId}::uuid,
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
    )
    RETURNING id
  `) as unknown as { id: string }[];

  console.log(`  [${label}] stored preview report id=${reportRow.id}`);
  return reportRow.id;
}

async function run() {
  console.log(`[phase7-batch] Starting — ${BATCH.length} sessions (${BATCH.filter(b => b.tier === "paid").length} paid, ${BATCH.filter(b => b.tier === "free").length} free)`);
  console.log(`[phase7-batch] status='preview' — no existing rows will be modified\n`);

  const results: { label: string; tier: string; reportId: string | null }[] = [];

  for (let i = 0; i < BATCH.length; i++) {
    const { assessmentId, label, tier } = BATCH[i];
    console.log(`[phase7-batch] [${i + 1}/${BATCH.length}] ${label} (${tier}) assessment=${assessmentId}`);
    try {
      const reportId = await generatePreview(assessmentId, label, tier);
      results.push({ label, tier, reportId });
    } catch (err) {
      console.error(`  [${label}] ERROR:`, err instanceof Error ? err.message : err);
      results.push({ label, tier, reportId: null });
    }
    console.log();
  }

  const succeeded = results.filter(r => r.reportId !== null);
  const failed    = results.filter(r => r.reportId === null);

  console.log(`[phase7-batch] Complete — ${succeeded.length}/${BATCH.length} succeeded, ${failed.length} failed`);

  if (succeeded.length > 0) {
    console.log(`\n[phase7-batch] Preview URLs (admin auth required):`);
    for (const r of succeeded) {
      console.log(`  [${r.label}/${r.tier}] http://localhost:3005/admin/report-preview/${r.reportId}`);
    }
    console.log(`\n[phase7-batch] Listing: http://localhost:3005/admin/report-preview`);
  }

  if (failed.length > 0) {
    console.log(`\n[phase7-batch] Failed sessions:`);
    for (const r of failed) {
      console.log(`  [${r.label}/${r.tier}] — quality gate blocked or error`);
    }
  }
}

run().catch(e => {
  console.error("[phase7-batch] Fatal:", e);
  process.exit(1);
});
