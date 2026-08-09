// scripts/categorized-backfill.mts
// Part 4 of go-live build: categorized narrative report backfill.
//
// Categories:
//   free-only   — parent_name set, no paid purchase linked → generate draft → auto-publish
//   paid-never  — paid purchase, no LMS progress → generate draft, hold (pending Part 3)
//   paid-mid    — paid, some LMS progress, week 2 not completed → generate draft, hold
//   paid-done   — paid, completed week 2 → generate draft, hold
//
// Safety filters (all categories):
//   - Exclude assessments with no parent_name (report not claimed yet)
//   - Exclude assessments with no stored answers (empty test records)
//   - Exclude assessments that already have a non-superseded draft/published report
//   - Exclude assessments at generation cap (generation_attempts >= 5)
//
// Paid hold: Part 3 findings (see scripts/investigate-archetype-mismatch.mts) show 0 real
//   mismatches among paid customers with actual answer data. Draft notification copy is
//   printed at the end but NOT sent — remains pending explicit go-ahead from owner.
//
// Flags:
//   --dry-run (default) — prints plan without generating anything
//   --generate          — actually generates; paid reports stay as draft
//   --also-publish-free — additionally promotes free-only drafts to published (requires --generate)
//
// Run:
//   npx tsx scripts/categorized-backfill.mts                        # dry-run
//   npx tsx scripts/categorized-backfill.mts --generate             # generate, hold paid as draft
//   npx tsx scripts/categorized-backfill.mts --generate --also-publish-free

import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { buildHdg } from "../lib/graph/hdg.js";
import { buildBehaviourGraph } from "../lib/graph/behaviour-graph.js";
import { buildBehaviourSignature } from "../lib/graph/signature.js";
import { buildConfidenceVector } from "../lib/graph/confidence.js";
import { buildFamilyAttentionLoop } from "../lib/graph/loop.js";
import { scoreAssessment, tallyDimension } from "../lib/engine/scorer.js";
import type { Dimensions } from "../lib/engine/scorer.js";
import { buildNarrativeContext } from "../lib/narrative/context.js";
import { composeReport } from "../lib/narrative/compose-report.js";
import { runQualityEngine } from "../lib/quality/engine.js";
import type { AttentionMoment } from "../lib/narrative/types.js";

const sql = neon(process.env.DATABASE_URL!);
const MAX_DATA_POINTS = 18;
const MAX_TOTAL_ATTEMPTS = 5;

const ALL_DIMENSIONS = [
  "attention_shape", "reward_driver", "friction_response",
  "parent_instinct", "attention_competition", "recharge_type",
] as const;

const args = process.argv.slice(2);
const DRY_RUN        = !args.includes("--generate");
const ALSO_PUBLISH   = args.includes("--also-publish-free") && !DRY_RUN;
const limitIdx       = args.indexOf("--limit");
const FREE_LIMIT     = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;

// ── Query helpers ─────────────────────────────────────────────────────────────

type AssessmentRow = {
  id: string;
  session_id: string;
  child_name: string | null;
  age_band: string;
  child_gender: string | null;
  parent_name: string;
  email: string | null;
  archetype: string;
  parent_pattern: string;
  archetype_fit_tier: string | null;
  parent_instinct_fit_tier: string | null;
  concerns: string[];
  answers: Record<string, string>;
  dimensions_json: Record<string, { value: string; consistency: number; data_points: number; winning_votes: number }>;
  weakest_two: string[];
  generation_attempts: number;
  category: "free-only" | "paid-never" | "paid-mid" | "paid-done";
};

// ── Report generation (same pipeline as generate route) ─────────────────────

async function generateAndStore(
  row: AssessmentRow,
  targetStatus: "draft" | "published",
): Promise<{ reportId: string; status: string } | { error: string }> {
  // Atomic attempt cap check + increment
  const incremented = (await sql`
    UPDATE assessments
    SET generation_attempts = generation_attempts + 1
    WHERE id = ${row.id}::uuid
      AND generation_attempts < ${MAX_TOTAL_ATTEMPTS}
    RETURNING generation_attempts
  `) as unknown as { generation_attempts: number }[];

  if (incremented.length === 0) {
    return { error: "generation_limit_reached" };
  }

  const answers = row.answers ?? {};
  const dimensions: Dimensions = {} as Dimensions;
  for (const dim of ALL_DIMENSIONS) {
    const stored = row.dimensions_json?.[dim];
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

  const hdg  = buildHdg(answers);
  const bg   = buildBehaviourGraph(hdg);
  const sig  = buildBehaviourSignature(hdg, bg);
  const cv   = buildConfidenceVector(hdg, bg, sig);
  const loop = buildFamilyAttentionLoop(hdg, bg, sig);
  const scoring = scoreAssessment(dimensions, MAX_DATA_POINTS, cv.overall_confidence);

  const ctx = buildNarrativeContext(
    {
      child_name: row.child_name,
      age_band: row.age_band,
      child_gender: row.child_gender,
      parent_name: row.parent_name,
      archetype: row.archetype,
      archetype_fit_tier: row.archetype_fit_tier ?? scoring.archetype_fit_tier,
      parent_pattern: row.parent_pattern,
      parent_instinct_fit_tier: row.parent_instinct_fit_tier ?? scoring.parent_instinct_fit_tier,
      concerns: row.concerns ?? [],
    },
    hdg, bg, sig, loop, cv, scoring,
  );

  let composed: Awaited<ReturnType<typeof composeReport>>["report"];
  let specs: Awaited<ReturnType<typeof composeReport>>["specs"];
  try {
    const result = await composeReport(ctx);
    composed = result.report;
    specs = result.specs;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Billing rejection: request never reached the model — roll back the attempt counter
    // so a transient credit outage doesn't burn a permanent generation slot.
    if (msg.includes("credit balance is too low") || msg.includes("credit balance")) {
      await sql`UPDATE assessments SET generation_attempts = generation_attempts - 1 WHERE id = ${row.id}::uuid`;
    }
    throw e;
  }

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
    parentInstinctFitTier: composed.parent_instinct_fit_tier ?? "no_clear_fit",
    loop,
    priorRecognitionTexts,
    ctx,
  });

  if (!qualityResult.passed) {
    // Store as draft even on quality failure so admin can review; don't publish
    const finalStoreStatus = "draft";
    const [reportRow] = (await sql`
      INSERT INTO reports (
        assessment_id, behaviour_signature, archetype, archetype_fit_tier,
        parent_instinct, parent_instinct_fit_tier, narrative_moments, family_attention_loop,
        confidence_vector, status, schema_version, quality_check_results, auto_generated
      ) VALUES (
        ${row.id}::uuid, ${JSON.stringify(sig)}::jsonb,
        ${composed.archetype}, ${composed.archetype_fit_tier},
        ${composed.parent_instinct}, ${composed.parent_instinct_fit_tier ?? null},
        ${JSON.stringify(finalMoments)}::jsonb, ${JSON.stringify(loop)}::jsonb,
        ${JSON.stringify(cv)}::jsonb, ${finalStoreStatus},
        ${composed.schema_version}, ${JSON.stringify(qualityResult)}::jsonb, false
      ) RETURNING id
    `) as unknown as { id: string }[];
    return { error: `quality_failed (${qualityResult.failures.length} checks) — stored as draft ${reportRow.id}` };
  }

  const promotedAt = targetStatus === "published" ? new Date().toISOString() : null;
  const promotedBy = targetStatus === "published" ? "backfill" : null;

  const [reportRow] = (await sql`
    INSERT INTO reports (
      assessment_id, behaviour_signature, archetype, archetype_fit_tier,
      parent_instinct, parent_instinct_fit_tier, narrative_moments, family_attention_loop,
      confidence_vector, status, schema_version, quality_check_results,
      auto_generated, promoted_at, promoted_by
    ) VALUES (
      ${row.id}::uuid, ${JSON.stringify(sig)}::jsonb,
      ${composed.archetype}, ${composed.archetype_fit_tier},
      ${composed.parent_instinct}, ${composed.parent_instinct_fit_tier ?? null},
      ${JSON.stringify(finalMoments)}::jsonb, ${JSON.stringify(loop)}::jsonb,
      ${JSON.stringify(cv)}::jsonb, ${targetStatus},
      ${composed.schema_version}, ${JSON.stringify(qualityResult)}::jsonb,
      false, ${promotedAt}, ${promotedBy}
    ) RETURNING id
  `) as unknown as { id: string }[];

  return { reportId: reportRow.id, status: targetStatus };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`=== Categorized Backfill${DRY_RUN ? " [DRY RUN — no changes]" : ""} ===\n`);

  // Fetch all claimed assessments (parent_name set)
  const allAssessments = (await sql`
    SELECT
      a.id,
      a.session_id::text,
      a.child_name,
      a.age_band,
      a.child_gender,
      a.parent_name,
      a.email,
      a.archetype,
      a.parent_pattern,
      a.archetype_fit_tier,
      a.parent_instinct_fit_tier,
      a.concerns,
      a.answers,
      a.dimensions AS dimensions_json,
      a.weakest_two,
      a.generation_attempts,
      -- Is there a paid purchase for this assessment?
      EXISTS (
        SELECT 1 FROM purchases p
        WHERE p.assessment_id = a.id AND p.status = 'paid'
      ) AS is_paid,
      -- Does an active (non-superseded) report already exist?
      EXISTS (
        SELECT 1 FROM reports r
        WHERE r.assessment_id = a.id AND r.superseded_by IS NULL
      ) AS has_report,
      -- User ID for LMS progress lookup (from purchase)
      (SELECT p.user_id::text FROM purchases p WHERE p.assessment_id = a.id AND p.status = 'paid' LIMIT 1) AS paid_user_id
    FROM assessments a
    WHERE a.parent_name IS NOT NULL
    ORDER BY a.created_at
  `) as unknown as (Omit<AssessmentRow, "category"> & {
    is_paid: boolean;
    has_report: boolean;
    paid_user_id: string | null;
  })[];

  // Fetch LMS progress for all paid users
  const paidUserIds = [...new Set(
    allAssessments.filter(a => a.paid_user_id).map(a => a.paid_user_id as string)
  )];

  type LpRow = { user_id: string; week: number; day: number };
  const lpRows: LpRow[] = paidUserIds.length > 0
    ? (await sql`
        SELECT user_id::text, week, day
        FROM lms_progress
        WHERE user_id = ANY(${paidUserIds}::uuid[])
      `) as unknown as LpRow[]
    : [];

  const lmsCountByUser = new Map<string, number>();
  const lmsMaxWeekByUser = new Map<string, number>();
  for (const r of lpRows) {
    lmsCountByUser.set(r.user_id, (lmsCountByUser.get(r.user_id) ?? 0) + 1);
    lmsMaxWeekByUser.set(r.user_id, Math.max(lmsMaxWeekByUser.get(r.user_id) ?? 0, r.week));
  }

  // Categorize
  const buckets = {
    "free-only":  [] as AssessmentRow[],
    "paid-never": [] as AssessmentRow[],
    "paid-mid":   [] as AssessmentRow[],
    "paid-done":  [] as AssessmentRow[],
  };
  const skipped: { id: string; reason: string }[] = [];

  for (const a of allAssessments) {
    const hasAnswers = a.answers && Object.keys(a.answers).length > 0;
    if (!hasAnswers) {
      skipped.push({ id: a.id.slice(0, 8), reason: "no answers (test account)" });
      continue;
    }
    if (a.has_report) {
      skipped.push({ id: a.id.slice(0, 8), reason: "report already exists" });
      continue;
    }
    if ((a.generation_attempts ?? 0) >= MAX_TOTAL_ATTEMPTS) {
      skipped.push({ id: a.id.slice(0, 8), reason: "generation cap reached" });
      continue;
    }

    let category: AssessmentRow["category"];

    if (!a.is_paid) {
      category = "free-only";
    } else {
      const lmsCount   = lmsCountByUser.get(a.paid_user_id ?? "") ?? 0;
      const lmsMaxWeek = lmsMaxWeekByUser.get(a.paid_user_id ?? "") ?? 0;
      // "Completed" = reached week 2 content (max available week)
      if (lmsCount === 0) {
        category = "paid-never";
      } else if (lmsMaxWeek >= 2) {
        category = "paid-done";
      } else {
        category = "paid-mid";
      }
    }

    if (category === "free-only" && buckets["free-only"].length >= FREE_LIMIT) {
      skipped.push({ id: a.id.slice(0, 8), reason: `free-only limit (${FREE_LIMIT}) reached` });
      continue;
    }
    buckets[category].push({ ...a, category });
  }

  // Print plan
  if (FREE_LIMIT !== Infinity) console.log(`Free-only limit: ${FREE_LIMIT}\n`);
  console.log("Skipped (excluded by filter):");
  if (skipped.length === 0) {
    console.log("  none");
  } else {
    for (const s of skipped) console.log(`  ${s.id} — ${s.reason}`);
  }
  console.log();

  for (const [cat, items] of Object.entries(buckets)) {
    const action =
      cat === "free-only" && ALSO_PUBLISH ? "generate → published" :
      cat === "free-only"                 ? "generate → draft (add --also-publish-free to publish)" :
                                            "generate → draft (hold — paid customer)";
    console.log(`${cat}: ${items.length} assessments → ${action}`);
    for (const a of items) {
      console.log(`  ${a.id.slice(0, 8)} ${a.child_name ?? "(no name)"} / ${a.parent_name} — ${a.archetype} — ${a.email ?? "(no email)"}`);
    }
  }
  console.log();

  if (DRY_RUN) {
    const total = Object.values(buckets).reduce((s, b) => s + b.length, 0);
    console.log(`Dry run complete. ${total} assessments would be generated.`);
    console.log("Re-run with --generate to execute.\n");
    printNotificationCopy(buckets["paid-never"], buckets["paid-mid"], buckets["paid-done"]);
    return;
  }

  // Execute
  const results: { id: string; category: string; result: string }[] = [];

  for (const [cat, items] of Object.entries(buckets)) {
    for (const a of items) {
      const isPaid = cat !== "free-only";
      const targetStatus: "draft" | "published" =
        cat === "free-only" && ALSO_PUBLISH ? "published" : "draft";

      console.log(`Generating ${cat} ${a.id.slice(0, 8)} (${a.child_name ?? "?"} / ${a.parent_name})...`);
      try {
        const result = await generateAndStore(a, targetStatus);
        if ("error" in result) {
          console.log(`  ✗ ${result.error}`);
          results.push({ id: a.id.slice(0, 8), category: cat, result: `error: ${result.error}` });
        } else {
          console.log(`  ✓ reportId=${result.reportId} status=${result.status}`);
          if (isPaid) {
            console.log(`    [paid — held as draft, not published]`);
          }
          results.push({ id: a.id.slice(0, 8), category: cat, result: `${result.status} ${result.reportId?.slice(0, 8)}` });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.log(`  ✗ exception: ${msg}`);
        results.push({ id: a.id.slice(0, 8), category: cat, result: `exception: ${msg}` });
      }
    }
  }

  // Summary
  console.log("\n=== RESULTS ===");
  for (const r of results) {
    console.log(`  [${r.category}] ${r.id} → ${r.result}`);
  }

  printNotificationCopy(buckets["paid-never"], buckets["paid-mid"], buckets["paid-done"]);
}

function printNotificationCopy(never: AssessmentRow[], mid: AssessmentRow[], done: AssessmentRow[]) {
  const paid = [...never, ...mid, ...done];
  if (paid.length === 0) return;

  console.log("\n=== DRAFT NOTIFICATION COPY FOR PAID CUSTOMERS (not sent) ===\n");
  console.log("Addresses:", paid.map(a => a.email ?? "(no email)").join(", "));
  console.log();
  console.log("Subject: Your Attention Health Report is ready");
  console.log();
  console.log(`Hi [Parent name],

We've just finished generating a personalised Attention Health Report for [child name].

The report gives you a detailed picture of how [child name]'s attention actually works — what lights it up, what costs it, and what your home environment is specifically doing to help or hinder.

You can view it here:
[Report link]

This is a more in-depth version of the report you may have already seen — built from the same assessment, but with the full Narrative Engine running on it.

If you have any questions, just reply to this email.

— The Attention Architect team`);
  console.log();
  console.log("(This copy is a draft — do not send until go-ahead from owner.)");
}

main().catch(e => { console.error(e); process.exit(1); });
