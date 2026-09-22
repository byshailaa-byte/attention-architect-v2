// POST /api/internal/report/auto-generate
// Internal-only: called fire-and-forget from /api/assessment/submit.
// Protected by X-Internal-Secret header (INTERNAL_API_SECRET env var).
// Not accessible through the public middleware — /api/internal/* is not in the admin matcher,
// so Basic Auth does NOT apply; instead this route validates the internal secret directly.
//
// Phase gate:
//   GATING_WINDOW_COUNT = 0, GATING_WINDOW_MS = 0 → no gate, publish immediately on quality pass.
//   While in window (if window re-enabled): generate → draft + pending_narrative_reviews count.
//   After window: generate → if quality passes → published; if quality fails → draft.
//
// On generation failure (exception or quality block): nothing is stored; parent keeps seeing
//   static ReportView (fetchPublishedNarrativeReport returns null → page.tsx falls through).
//
// Master switch: if app_settings.auto_generate_enabled != 'true', returns 200 without generating.

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
import { composeReport, TEASER_FIXED_CLOSE } from "@/lib/narrative/compose-report";
import { runQualityEngine } from "@/lib/quality/engine";
// Derived simplified-surface moments — generated at publish time (Phase 3) so the
// simplified render is a pure read. Same generators the render used to call lazily.
import { generateSimplifiedStrengths, selectStrengthDimensions } from "@/lib/narrative/simplified-strengths";
import { generateSimplifiedActions, selectActionDimensions } from "@/lib/narrative/simplified-actions";
import { reformatM01 } from "@/lib/narrative/simplified-reformatter";
import { generateInstinctInteractionFallback, selectFallbackDimensions } from "@/lib/narrative/instinct-interaction-fallback";
import { CHILD_NAME_FALLBACK, resolveChildPronoun, type Gender } from "@/lib/report/pronouns";
import type { AttentionMoment } from "@/lib/narrative/types";
import type { Dimensions } from "@/lib/engine/scorer";

assertBootGuards();

// Full generation pipeline runs ~48s avg. Pin explicitly — no global maxDuration in this project.
export const maxDuration = 300;

const ALL_DIMENSIONS = [
  "attention_shape",
  "reward_driver",
  "friction_response",
  "parent_instinct",
  "attention_competition",
  "recharge_type",
] as const;

const MAX_DATA_POINTS  = 18;
const MAX_TOTAL_ATTEMPTS = 5;
const GATING_WINDOW_COUNT = 0;       // no gating window — publish immediately on quality pass
const GATING_WINDOW_MS = 0;          // no time window

export async function POST(req: NextRequest) {
  // Validate internal secret
  const secret = process.env.INTERNAL_API_SECRET ?? "";
  const provided = req.headers.get("x-internal-secret") ?? "";
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = (await req.json()) as { sessionId?: string };
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });
  }

  const sql = getSql();

  // Check master switch
  const settingsRows = (await sql`
    SELECT key, value FROM app_settings WHERE key IN ('auto_generate_enabled', 'auto_generate_pipeline_start_at')
  `) as unknown as { key: string; value: string }[];
  const settings = Object.fromEntries(settingsRows.map(r => [r.key, r.value]));

  if (settings["auto_generate_enabled"] !== "true") {
    return NextResponse.json({ skipped: true, reason: "pipeline_disabled" });
  }

  // Fetch assessment — no parent_name gate: generation now triggers immediately on assessment
  // submit (before the data-collection form), so parent_name may be null at this point.
  // parent_name is used only as metadata in the FAMILY CONTEXT block; prose always uses "you".
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
      worry_followup,
      worry_followup_other,
      answers,
      dimensions AS dimensions_json,
      weakest_two,
      generation_attempts
    FROM assessments
    WHERE session_id = ${sessionId}::uuid
    LIMIT 1
  `) as unknown as {
    id: string;
    child_name: string | null;
    age_band: string;
    child_gender: string | null;
    parent_name: string | null;
    archetype: string;
    parent_pattern: string;
    archetype_fit_tier: string | null;
    parent_instinct_fit_tier: string | null;
    concerns: string[];
    worry_followup: string | null;
    worry_followup_other: string | null;
    answers: Record<string, string>;
    dimensions_json: Record<string, { value: string; consistency: number; data_points: number; winning_votes: number }>;
    weakest_two: string[];
    generation_attempts: number;
  }[];

  if (rows.length === 0) {
    return NextResponse.json({ skipped: true, reason: "session_not_found" });
  }

  const row = rows[0];

  // Check for an existing non-superseded report (draft or published).
  // Auto-generation never overwrites an existing report — admin can force-regen via the manual route.
  const existing = (await sql`
    SELECT id, status FROM reports
    WHERE assessment_id = ${row.id}::uuid
      AND superseded_by IS NULL
    LIMIT 1
  `) as unknown as { id: string; status: string }[];

  if (existing.length > 0) {
    return NextResponse.json({ skipped: true, reason: "report_exists", reportId: existing[0].id, status: existing[0].status });
  }

  // Atomic attempt cap
  const incremented = (await sql`
    UPDATE assessments
    SET generation_attempts = generation_attempts + 1
    WHERE id = ${row.id}::uuid
      AND generation_attempts < ${MAX_TOTAL_ATTEMPTS}
    RETURNING generation_attempts
  `) as unknown as { generation_attempts: number }[];

  if (incremented.length === 0) {
    return NextResponse.json({ skipped: true, reason: "generation_limit_reached" });
  }

  // Record pipeline start time on first run
  if (!settings["auto_generate_pipeline_start_at"]) {
    await sql`
      INSERT INTO app_settings (key, value)
      VALUES ('auto_generate_pipeline_start_at', ${new Date().toISOString()})
      ON CONFLICT (key) DO NOTHING
    `;
  }

  // Determine phase gate: draft if in gating window, else auto-publish on quality pass
  const pipelineStart = settings["auto_generate_pipeline_start_at"]
    ? new Date(settings["auto_generate_pipeline_start_at"])
    : new Date();
  const msSinceStart = Date.now() - pipelineStart.getTime();

  const autoGenCountRows = (await sql`
    SELECT COUNT(*) AS n FROM reports WHERE auto_generated = true
  `) as unknown as { n: string }[];
  const autoGenCount = parseInt(autoGenCountRows[0]?.n ?? "0", 10);

  const inGatingWindow = autoGenCount < GATING_WINDOW_COUNT || msSinceStart < GATING_WINDOW_MS;

  // Build graph pipeline from stored answers
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
      parent_name: row.parent_name ?? "Parent",
      archetype: row.archetype,
      archetype_fit_tier: row.archetype_fit_tier ?? scoring.archetype_fit_tier,
      parent_pattern: row.parent_pattern,
      parent_instinct_fit_tier: row.parent_instinct_fit_tier ?? scoring.parent_instinct_fit_tier,
      concerns: row.concerns ?? [],
      worry_followup: row.worry_followup ?? null,
      worry_followup_other: row.worry_followup_other ?? null,
    },
    hdg, bg, sig, loop, cv, scoring,
  );

  console.log(`[auto-generate] session=${sessionId} archetype=${ctx.archetype} loop=${loop.detected} gating=${inGatingWindow} generating...`);

  const { report: composed, specs } = await composeReport(ctx);

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

  const priorTeaserTexts = priorRows
    .map(r => r.narrative_moments?.find?.((m: AttentionMoment) => m.moment_id === "m_teaser")?.content)
    .filter((s): s is string => typeof s === "string" && s.length > 0);

  const { moments: rawFinalMoments, qualityResult } = await runQualityEngine({
    moments: composed.moments,
    specs,
    archetype: composed.archetype,
    archetypeFitTier: composed.archetype_fit_tier,
    parentInstinct: composed.parent_instinct,
    parentInstinctFitTier: composed.parent_instinct_fit_tier ?? "no_clear_fit",
    loop,
    priorRecognitionTexts,
    priorTeaserTexts,
    ctx,
  });

  // If the quality engine regenerated m_teaser, generateMoment() returns bare prose
  // without the fixed closing sentence. Re-apply it here so the stored moment is complete.
  const finalMoments = rawFinalMoments.map(m => {
    if (m.moment_id === "m_teaser" && !m.content.includes(TEASER_FIXED_CLOSE)) {
      return { ...m, content: `${m.content}\n\n${TEASER_FIXED_CLOSE}` };
    }
    return m;
  });

  console.log(`[auto-generate] session=${sessionId} quality=${qualityResult.passed ? "passed" : `failed (${qualityResult.failures.length})`}`);

  if (!qualityResult.passed) {
    // Quality failed: do not store. Parent keeps seeing static ReportView.
    // Increment was already recorded, so this attempt counts against the cap.
    console.warn(`[auto-generate] session=${sessionId} quality failed — not stored, parent sees static view`);
    return NextResponse.json({ stored: false, reason: "quality_failed", failures: qualityResult.failures });
  }

  // ── Derived simplified-surface moments (strengths, actions, detail-01, instinct
  // fallback), generated HERE at publish time so a published report is always
  // complete and the simplified render is a pure read. Independent → Promise.all.
  // If ANY generator throws, this throws and nothing is stored — never publish
  // incomplete; the existing retry path re-runs. Missing sig-dims / m_01 legitimately
  // skip a moment (that section hides on render); only a thrown error blocks publish.
  const derivedStart = Date.now();
  const childName = (row.child_name ?? "").trim() || CHILD_NAME_FALLBACK;
  const dGender = (row.child_gender ?? null) as Gender;
  const childPronouns = { subj: resolveChildPronoun(dGender, "subj"), obj: resolveChildPronoun(dGender, "obj"), poss: resolveChildPronoun(dGender, "poss") };
  const parentInstinctSlug = row.parent_pattern.toLowerCase().replace(/^the /, "").replace(/\s+/g, "-");
  const sigDims = (sig.dimensions ?? []) as { dimension: string; validated: boolean; evidence_tier: string; expression: { type?: string; value?: string } | null }[];
  const ageBand = row.age_band;
  const arche = composed.archetype;
  const m01Moment = finalMoments.find((m) => m.moment_id === "m_01");
  const hasM03 = finalMoments.some((m) => m.moment_id === "m_03");
  const strengthDims = selectStrengthDimensions(sigDims);
  const actionDims = selectActionDimensions(sigDims);
  const fallbackDims = hasM03 ? [] : selectFallbackDimensions(sigDims);

  const [strengths, actions, detail01Bullets, fallbackGen] = await Promise.all([
    strengthDims.length ? generateSimplifiedStrengths({ childName, childPronouns, ageBand, archetype: arche, dimensions: strengthDims }) : Promise.resolve(null),
    actionDims.length ? generateSimplifiedActions({ childName, childPronouns, ageBand, archetype: arche, parentInstinct: parentInstinctSlug, parentInstinctDisplay: row.parent_pattern, dimensions: actionDims }) : Promise.resolve(null),
    m01Moment ? reformatM01(m01Moment.content) : Promise.resolve(null),
    fallbackDims.length ? generateInstinctInteractionFallback({ childName, childPronouns, ageBand, archetype: arche, archetypeFitTier: row.archetype_fit_tier ?? "primary", parentInstinct: parentInstinctSlug, parentInstinctDisplay: row.parent_pattern, parentInstinctFitTier: row.parent_instinct_fit_tier ?? "primary", dimensions: fallbackDims }) : Promise.resolve(null),
  ]);

  const derivedMoments: { moment_id: string; title: string; content: string }[] = [];
  if (strengths) derivedMoments.push({ moment_id: "m_simplified_strengths", title: "strengths", content: JSON.stringify(strengths) });
  if (fallbackGen) derivedMoments.push({ moment_id: "m_instinct_interaction_fallback", title: fallbackGen.section, content: fallbackGen.content });
  if (actions) derivedMoments.push({ moment_id: "m_simplified_actions", title: "actions", content: JSON.stringify(actions) });
  if (detail01Bullets) derivedMoments.push({ moment_id: "m_01_simplified", title: "detail01_bullets", content: JSON.stringify(detail01Bullets) });
  const momentsToStore = [...finalMoments, ...derivedMoments];
  console.log(`[auto-generate] session=${sessionId} derived=[${derivedMoments.map((m) => m.moment_id).join(", ")}] in ${Date.now() - derivedStart}ms`);

  // Decide final status
  const shouldAutoPublish = !inGatingWindow;
  const finalStatus = shouldAutoPublish ? "published" : "draft";
  const promotedAt  = shouldAutoPublish ? new Date().toISOString() : null;
  const promotedBy  = shouldAutoPublish ? "auto-pipeline" : null;

  // Conditional INSERT: only writes if no non-superseded report already exists.
  // Guards against the concurrent-trigger race: early trigger (fires at submit) and
  // claim-time trigger can both be in-flight for the same session. The loser of the
  // INSERT race sees 0 rows from RETURNING, undoes its attempt increment, and exits.
  //
  // With the unique index idx_reports_one_live_per_assessment in place, a race where
  // two calls both pass the WHERE NOT EXISTS guard before either commits produces a
  // 23505 unique violation instead of 0 RETURNING rows. Both paths are equivalent and
  // handled identically below.
  let insertedRows: { id: string }[] = [];
  try {
    insertedRows = (await sql`
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
        quality_check_results,
        auto_generated,
        promoted_at,
        promoted_by
      )
      SELECT
        ${row.id}::uuid,
        ${JSON.stringify(sig)}::jsonb,
        ${composed.archetype},
        ${composed.archetype_fit_tier},
        ${composed.parent_instinct},
        ${composed.parent_instinct_fit_tier ?? null},
        ${JSON.stringify(momentsToStore)}::jsonb,
        ${JSON.stringify(loop)}::jsonb,
        ${JSON.stringify(cv)}::jsonb,
        ${finalStatus},
        ${composed.schema_version},
        ${JSON.stringify(qualityResult)}::jsonb,
        true,
        ${promotedAt},
        ${promotedBy}
      WHERE NOT EXISTS (
        SELECT 1 FROM reports
        WHERE assessment_id = ${row.id}::uuid
          AND superseded_by IS NULL
      )
      RETURNING id
    `) as unknown as { id: string }[];
  } catch (e) {
    if ((e as { code?: string }).code !== "23505") throw e;
    // Unique violation: another concurrent call won the INSERT race.
    // Fall through to the insertedRows.length === 0 path below.
  }

  if (insertedRows.length === 0) {
    // Another concurrent call already wrote the report. Undo our attempt increment so
    // the customer doesn't lose one of their five real attempts to a spurious race.
    await sql`
      UPDATE assessments
      SET generation_attempts = generation_attempts - 1
      WHERE id = ${row.id}::uuid
    `;
    console.log(`[auto-generate] session=${sessionId} concurrent write lost — attempt decremented, skipping`);
    return NextResponse.json({ skipped: true, reason: "report_exists_concurrent" });
  }

  const reportRow = insertedRows[0];

  // For drafts: bump the pending_narrative_reviews counter in app_settings for the admin badge
  if (finalStatus === "draft") {
    await sql`
      INSERT INTO app_settings (key, value)
      VALUES ('pending_narrative_reviews', '1')
      ON CONFLICT (key) DO UPDATE
        SET value = (COALESCE(app_settings.value::integer, 0) + 1)::text,
            updated_at = now()
    `;
  }

  console.log(`[auto-generate] session=${sessionId} stored reportId=${reportRow.id} status=${finalStatus}`);

  return NextResponse.json({ reportId: reportRow.id, status: finalStatus, stored: true });
}
