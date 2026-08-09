/**
 * Phase 7 real-customer validation batch.
 *
 * Reads assessments from a production branch (ANALYTICS_DB_URL) — read-only.
 * Writes preview reports to local dev DB (DATABASE_URL) — never touches production.
 *
 * Production schema predates Phase 15: no archetype_fit_tier / parent_instinct_fit_tier /
 * generation_attempts columns. All fit tiers computed fresh from scoring engine.
 * No generation_attempts tracked or written — this is a read-only probe of production data.
 *
 * Run:
 *   ANALYTICS_DB_URL="..." npx tsx scripts/phase7-real-customer-batch.ts
 *
 * Same non-negotiables as every prior production touch:
 *   - status='preview' only in local DB
 *   - no email, no funnel event, no WhatsApp
 *   - nothing promoted
 *   - production branch dropped by caller after run completes
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

if (!process.env.ANALYTICS_DB_URL) {
  console.error("ANALYTICS_DB_URL required — set to the read-only production branch endpoint");
  process.exit(1);
}

const sqlProd  = neon(process.env.ANALYTICS_DB_URL);  // read from production branch
const sqlLocal = neon(process.env.DATABASE_URL!);       // write preview rows to local DB

const ALL_DIMENSIONS = [
  "attention_shape",
  "reward_driver",
  "friction_response",
  "parent_instinct",
  "attention_competition",
  "recharge_type",
] as const;

const MAX_DATA_POINTS   = 18;
const MAX_TOTAL_ATTEMPTS = 5;

// 5 real customers — 2 paid, 3 free — selected from production branch.
// Criteria: non-test email, non-placeholder name, answers != '{}', archetype not null.
// Spread: Explorer + Live Wire (paid), Inventor + All-In Kid + Storm (free).
// Full UUIDs verified against br-bitter-haze-aqrwccby before script was written.
const BATCH = [
  { assessmentId: "7f53e8d6-2929-4f49-8f70-75d7aab041be", tier: "paid", label: "RC1" }, // Explorer,    Shanku/Shailaa
  { assessmentId: "c1cf07de-9775-4254-ad00-4b37ba42d67c", tier: "paid", label: "RC2" }, // Live Wire,   Niya Arun
  { assessmentId: "4be2a3a8-957a-44ca-9b4c-2b024ed36631", tier: "free", label: "RC3" }, // Inventor,    Chitra/Atharv
  { assessmentId: "3eed4885-2eef-42c3-b41d-1f2f1273f184", tier: "free", label: "RC4" }, // All-In Kid,  Payal/Samyak
  { assessmentId: "8d42ad31-2dc1-48a4-bc5d-1ff1b1cac7a2", tier: "free", label: "RC5" }, // Storm,       Alhana A/Ahsan
] as const;

async function generatePreview(assessmentId: string, label: string): Promise<string | null> {
  // READ from production branch — note: no archetype_fit_tier/generation_attempts in prod schema
  const rows = (await sqlProd`
    SELECT
      id, session_id, child_name, age_band, child_gender, parent_name,
      archetype, parent_pattern, concerns,
      answers, dimensions AS dimensions_json, weakest_two
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
    concerns: string[];
    answers: Record<string, string>;
    dimensions_json: Record<string, { value: string; consistency: number; data_points: number; winning_votes: number }>;
    weakest_two: string[];
  }[];

  if (rows.length === 0) {
    console.error(`  [${label}] assessment not found in production branch`);
    return null;
  }

  const row = rows[0];

  const answers    = row.answers;
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

  const hdg     = buildHdg(answers);
  const bg      = buildBehaviourGraph(hdg);
  const sig     = buildBehaviourSignature(hdg, bg);
  const cv      = buildConfidenceVector(hdg, bg, sig);
  const loop    = buildFamilyAttentionLoop(hdg, bg, sig);
  const scoring = scoreAssessment(dimensions, MAX_DATA_POINTS, cv.overall_confidence);

  // Both fit tiers fully computed from scorer — prod schema has no persisted columns for these
  const ctx = buildNarrativeContext(
    {
      child_name:               row.child_name,
      age_band:                 row.age_band,
      child_gender:             row.child_gender,
      parent_name:              row.parent_name,
      archetype:                row.archetype,
      archetype_fit_tier:       scoring.archetype_fit_tier,
      parent_pattern:           row.parent_pattern,
      parent_instinct_fit_tier: scoring.parent_instinct_fit_tier,
      concerns:                 row.concerns ?? [],
    },
    hdg, bg, sig, loop, cv, scoring,
  );

  console.log(
    `  [${label}] archetype=${ctx.archetype} fit_tier=${ctx.archetypeFitTier}` +
    ` pi_fit_tier=${ctx.parentInstinctFitTier} loop=${loop.detected} → generating...`
  );
  const t0 = Date.now();

  const { report: composed, specs } = await composeReport(ctx);
  console.log(`  [${label}] ${composed.moments.length} moments in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // Prior reports for opening_similarity — from local DB (draft/published, not preview)
  const priorRows = (await sqlLocal`
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
    parentInstinctFitTier: composed.parent_instinct_fit_tier ?? "no_clear_fit",
    loop,
    priorRecognitionTexts,
    ctx,
  });

  const qualityStr = qualityResult.passed
    ? "PASSED"
    : `FAILED (${qualityResult.failures.length} checks)`;
  console.log(`  [${label}] quality=${qualityStr}`);

  if (!qualityResult.passed) {
    console.warn(`  [${label}] failures:`, JSON.stringify(qualityResult.failures, null, 2));
    console.warn(`  [${label}] NOT storing`);
    return null;
  }

  // Upsert the production assessment row into local assessments so the reports FK is satisfied.
  // sqlLocal is the local dev DB — this never touches production.
  await sqlLocal`
    INSERT INTO assessments (
      id, session_id, child_name, age_band, child_gender, parent_name,
      archetype, parent_pattern, answers, dimensions, weakest_two
    ) VALUES (
      ${row.id}::uuid, ${row.session_id}::uuid,
      ${row.child_name}, ${row.age_band}, ${row.child_gender}, ${row.parent_name},
      ${row.archetype}, ${row.parent_pattern},
      ${JSON.stringify(row.answers)}::jsonb,
      ${JSON.stringify(row.dimensions_json)}::jsonb,
      ${row.weakest_two}
    )
    ON CONFLICT (id) DO NOTHING
  `;

  // WRITE to local DB only — preview row, never touches production
  const [reportRow] = (await sqlLocal`
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

  console.log(`  [${label}] stored local preview id=${reportRow.id}`);
  return reportRow.id;
}

async function run() {
  console.log(`[rc-batch] Production branch → br-bitter-haze-aqrwccby (read-only)`);
  console.log(`[rc-batch] Local DB → writes status='preview' only`);
  console.log(`[rc-batch] ${BATCH.length} sessions (${BATCH.filter(b => b.tier === "paid").length} paid, ${BATCH.filter(b => b.tier === "free").length} free)\n`);

  const results: { label: string; tier: string; reportId: string | null }[] = [];

  for (let i = 0; i < BATCH.length; i++) {
    const { assessmentId, label, tier } = BATCH[i];
    console.log(`[rc-batch] [${i + 1}/${BATCH.length}] ${label} (${tier}) assessment=${assessmentId}`);
    try {
      const reportId = await generatePreview(assessmentId, label);
      results.push({ label, tier, reportId });
    } catch (err) {
      console.error(`  [${label}] ERROR:`, err instanceof Error ? err.message : err);
      results.push({ label, tier, reportId: null });
    }
    console.log();
  }

  const succeeded = results.filter(r => r.reportId !== null);
  const failed    = results.filter(r => r.reportId === null);

  console.log(`[rc-batch] Complete — ${succeeded.length}/${BATCH.length} succeeded, ${failed.length} failed`);
  if (succeeded.length > 0) {
    console.log(`\n[rc-batch] Preview URLs (admin auth required):`);
    for (const r of succeeded) {
      console.log(`  [${r.label}/${r.tier}] http://localhost:3005/admin/report-preview/${r.reportId}`);
    }
  }
  if (failed.length > 0) {
    console.log(`\n[rc-batch] Failed:`);
    for (const r of failed) console.log(`  [${r.label}/${r.tier}]`);
  }
}

run().catch(e => {
  console.error("[rc-batch] Fatal:", e);
  process.exit(1);
});
