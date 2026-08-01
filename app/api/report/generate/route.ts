// POST /api/report/generate
// Triggers narrative report generation for an assessment and stores in reports table.
//
// Security:
//   - Admin-only: caller must send Authorization: Bearer <ADMIN_API_KEY>.
//   - sessionId must match an assessment with parent_name set (report claimed).
//   - Generation attempts per assessment capped at MAX_GENERATION_ATTEMPTS to bound API cost.
//   - confidence_vector never leaves this route — stored in internal-only column, never in response.
//
// All implementation and testing is against localhost:3007 only.
// Do not call this route against the live site.

import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";
import { tallyDimension } from "@/lib/engine/scorer";
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
import type { Dimensions } from "@/lib/engine/scorer";

assertBootGuards();

const ALL_DIMENSIONS = [
  "attention_shape",
  "reward_driver",
  "friction_response",
  "parent_instinct",
  "attention_competition",
  "recharge_type",
] as const;

const MAX_DATA_POINTS = 18;

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = (await req.json()) as { sessionId: string };

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(sessionId)) {
      return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });
    }

    // Admin-only route — must send Authorization: Bearer <ADMIN_API_KEY>
    const adminKey = process.env.ADMIN_API_KEY;
    const authHeader = req.headers.get("authorization") ?? "";
    if (!adminKey || authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sql = getSql();

    // Fetch assessment — requires parent_name to be set (report claimed)
    const rows = (await sql`
      SELECT
        id,
        child_name,
        age_band,
        child_gender,
        parent_name,
        archetype,
        parent_pattern,
        archetype_fit_tier,
        parent_instinct_fit_tier,
        concerns,
        answers,
        dimensions AS dimensions_json,
        weakest_two,
        generation_attempts
      FROM assessments
      WHERE session_id = ${sessionId}::uuid
        AND parent_name IS NOT NULL
      LIMIT 1
    `) as unknown as {
      id: string;
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
      return NextResponse.json(
        { error: "Assessment not found or report not yet claimed" },
        { status: 404 },
      );
    }

    const row = rows[0];

    // Check if a non-superseded report already exists (draft or published).
    // Published → definitely cached. Draft → also cached (don't regenerate while under review).
    // Caller can pass ?force=true to bypass and regenerate (which will supersede the existing row).
    const forceRegen = new URL(req.url).searchParams.get("force") === "true";
    if (!forceRegen) {
      const existing = (await sql`
        SELECT id, status FROM reports
        WHERE assessment_id = ${row.id}::uuid
          AND superseded_by IS NULL
        LIMIT 1
      `) as unknown as { id: string; status: string }[];

      if (existing.length > 0) {
        return NextResponse.json({ reportId: existing[0].id, status: existing[0].status, cached: true });
      }
    }

    // Single atomic cap-check + increment. The WHERE generation_attempts < MAX ensures
    // two simultaneous requests for the same session can't both pass the cap — only one
    // will receive RETURNING data; the other sees 0 rows and must return 429.
    const MAX_TOTAL_ATTEMPTS = 5;
    const incremented = (await sql`
      UPDATE assessments
      SET generation_attempts = generation_attempts + 1
      WHERE id = ${row.id}::uuid
        AND generation_attempts < ${MAX_TOTAL_ATTEMPTS}
      RETURNING generation_attempts
    `) as unknown as { generation_attempts: number }[];

    if (incremented.length === 0) {
      return NextResponse.json(
        { error: "generation_limit_reached", limit: MAX_TOTAL_ATTEMPTS },
        { status: 429 },
      );
    }

    // Rebuild the full graph pipeline from stored answers
    const answers = row.answers;

    // Rebuild dimensions from stored JSON (avoids re-tallying)
    const dimensions: Dimensions = {} as Dimensions;
    for (const dim of ALL_DIMENSIONS) {
      const stored = row.dimensions_json[dim];
      if (stored) {
        dimensions[dim] = stored;
      } else {
        // Fallback: re-tally from answers if dimension is missing from stored JSON
        const arr: string[] = [];
        for (const [qId, val] of Object.entries(answers)) {
          // Crude dimension lookup — relies on the answer key being prefixed
          if (qId.startsWith(dim.split("_")[0])) arr.push(val);
        }
        dimensions[dim] = arr.length > 0
          ? tallyDimension(arr)
          : { value: "unknown", consistency: 0, data_points: 0, winning_votes: 0 };
      }
    }

    const hdg = buildHdg(answers);
    const bg  = buildBehaviourGraph(hdg);
    const sig = buildBehaviourSignature(hdg, bg);
    const cv  = buildConfidenceVector(hdg, bg, sig);
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

    console.log(`[report/generate] session=${sessionId} archetype=${ctx.archetype} loop=${loop.detected} generating...`);

    // Generate all narrative moments (sequential LLM calls)
    const { report: composed, specs } = await composeReport(ctx);

    console.log(`[report/generate] session=${sessionId} moments=${composed.moments.length} generated`);

    // Fetch Recognition sections from the last 10 non-superseded reports for opening_similarity check.
    const priorRows = (await sql`
      SELECT narrative_moments FROM reports
      WHERE superseded_by IS NULL
        AND status IN ('draft', 'published')
      ORDER BY generated_at DESC
      LIMIT 10
    `) as unknown as { narrative_moments: AttentionMoment[] }[];

    const priorRecognitionTexts = priorRows
      .map(r => r.narrative_moments?.find?.((m: AttentionMoment) => m.section === "Recognition")?.content)
      .filter((s): s is string => typeof s === "string" && s.length > 0);

    // Run Quality Engine — checks prose compliance, regenerates failing moments (up to 2× each)
    const { moments: finalMoments, qualityResult } = await runQualityEngine({
      moments: composed.moments,
      specs,
      archetype: composed.archetype,
      archetypeFitTier: composed.archetype_fit_tier,
      parentInstinct: composed.parent_instinct,
      parentInstinctFitTier: composed.parent_instinct_fit_tier ?? "no_clear_fit",
      loop,
      priorRecognitionTexts,
      ctx,
    });

    console.log(`[report/generate] session=${sessionId} moments=${finalMoments.length} quality=${qualityResult.passed ? "passed" : `failed (${qualityResult.failures.length} checks)`}`);

    // Quality gate: if checks still fail after all regeneration attempts, do NOT insert.
    // Silently proceeding would store a report the admin can't reliably promote,
    // and would undermine the entire draft/publish gate's purpose.
    // The caller should retry (with ?force=true on a subsequent call if a stale draft exists).
    if (!qualityResult.passed) {
      console.warn(`[report/generate] session=${sessionId} blocked — unresolved quality failures:`, qualityResult.failures);
      return NextResponse.json(
        {
          error: "quality_check_failed",
          failures: qualityResult.failures,
        },
        { status: 422 },
      );
    }

    // Store in reports table as 'draft' — NOT 'published'.
    // The page.tsx report route gates on status='published'. Only an explicit
    // admin promote step (future endpoint) should move a report to 'published'.
    // Inserting as 'draft' here means calling this route for a real customer
    // does NOT change what they see — the existing ReportView stays live
    // until the report is manually reviewed and promoted.
    //
    // confidence_vector stored in the internal-only column — never in API response.
    // quality_check_results stored for admin use when deciding whether to promote.
    const [reportRow] = (await sql`
      INSERT INTO reports (
        assessment_id,
        behaviour_signature,
        archetype,
        archetype_fit_tier,
        parent_instinct,
        parent_instinct_fit_tier,
        narrative_moments,
        family_attention_loop,
        confidence_vector,
        status,
        schema_version,
        quality_check_results
      ) VALUES (
        ${row.id}::uuid,
        ${JSON.stringify(sig)}::jsonb,
        ${composed.archetype},
        ${composed.archetype_fit_tier},
        ${composed.parent_instinct},
        ${composed.parent_instinct_fit_tier ?? null},
        ${JSON.stringify(finalMoments)}::jsonb,
        ${JSON.stringify(loop)}::jsonb,
        ${JSON.stringify(cv)}::jsonb,
        'draft',
        ${composed.schema_version},
        ${JSON.stringify(qualityResult)}::jsonb
      )
      RETURNING id
    `) as unknown as { id: string }[];

    // On force-regen: supersede the old row(s) now that the new row exists.
    // superseded_by is a FK to reports(id), so the new row must exist first.
    if (forceRegen) {
      await sql`
        UPDATE reports
        SET superseded_by = ${reportRow.id}::uuid
        WHERE assessment_id = ${row.id}::uuid
          AND id != ${reportRow.id}::uuid
          AND superseded_by IS NULL
      `;
    }

    // confidence_vector intentionally excluded from this response
    return NextResponse.json({ reportId: reportRow.id, cached: false, status: "draft" });
  } catch (e) {
    console.error("[report/generate]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
