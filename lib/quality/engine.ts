// Quality Engine orchestrator — §15 of the Report Engine Architecture.
//
// Runs all checks in order (cheapest structural checks first).
// For any failing moment: regenerates using the original MomentSpec, up to MAX_RETRIES.
// After regeneration, re-runs ALL checks (not just the failing one) to catch new issues.
// If a moment still fails after all retries, keeps the original and logs.
// Returns: final moments (some possibly regenerated) + quality summary.
//
// All implementation and testing is against localhost:3007 only.

import { generateMoment, type MomentSpec } from "@/lib/narrative/generate-moment";
import type { NarrativeContext } from "@/lib/narrative/context";
import type { AttentionMoment } from "@/lib/narrative/types";
import type { FamilyAttentionLoop } from "@/lib/graph/loop";
import type { HumanDecisionGraph } from "@/lib/graph/types";
import type { CheckFailure, QualityResult } from "./types";
import {
  checkTraceability,
  checkHypothesisHedge,
  checkLabelOnce,
  checkFitTierCompliance,
  checkNoWeekNumberRoadmap,
  checkSinglePullquote,
  checkRoadmapLoopCitation,
  checkNoObjectivePicker,
  checkOpeningSimilarity,
  checkOutOfScopeNodeReference,
  checkUnvalidatedDimensionRouting,
  checkClinicalLanguage,
  checkBlameFraming,
  checkEarlyActionContent,
  checkRecognitionOrdering,
} from "./checks";

const MAX_RETRIES = 2;

export interface QualityEngineInput {
  moments: AttentionMoment[];
  specs: Record<string, MomentSpec>;
  archetype: string;
  archetypeFitTier: string;
  parentInstinct: string;
  parentInstinctFitTier: string;
  loop: FamilyAttentionLoop;
  // Recognition content from the last N generated reports (for opening_similarity).
  // Pass [] to skip the similarity check (e.g., for the very first report).
  priorRecognitionTexts: string[];
  ctx: NarrativeContext;
}

export interface QualityEngineOutput {
  moments: AttentionMoment[];
  qualityResult: QualityResult;
}

function runAllChecks(
  moments: AttentionMoment[],
  input: Omit<QualityEngineInput, "moments" | "specs" | "ctx">,
  unvalidatedActiveDimLabels: string[],
  hdg: HumanDecisionGraph,
  dimensionValues: string[],
): CheckFailure[] {
  const failures: CheckFailure[] = [];

  const t = checkTraceability(moments);
  if (t) failures.push(t);

  const h = checkHypothesisHedge(moments);
  if (h) failures.push(h);

  const l = checkLabelOnce(moments, input.archetype, input.parentInstinct, input.parentInstinctFitTier);
  failures.push(...l);

  const f = checkFitTierCompliance(moments, input.archetype, input.archetypeFitTier);
  if (f) failures.push(f);

  const w = checkNoWeekNumberRoadmap(moments);
  if (w) failures.push(w);

  const pq = checkSinglePullquote(moments);
  if (pq) failures.push(pq);

  const r = checkRoadmapLoopCitation(moments, input.loop);
  if (r) failures.push(r);

  const o = checkNoObjectivePicker(moments);
  if (o) failures.push(o);

  const s = checkOpeningSimilarity(moments, input.priorRecognitionTexts);
  if (s) failures.push(s);

  if (hdg) {
    const osr = checkOutOfScopeNodeReference(moments, hdg, dimensionValues);
    if (osr) failures.push(osr);
  }

  const u = checkUnvalidatedDimensionRouting(moments, unvalidatedActiveDimLabels);
  if (u) failures.push(u);

  const cl = checkClinicalLanguage(moments);
  if (cl) failures.push(cl);

  const bf = checkBlameFraming(moments);
  if (bf) failures.push(bf);

  const ea = checkEarlyActionContent(moments);
  if (ea) failures.push(ea);

  const ro = checkRecognitionOrdering(moments);
  if (ro) failures.push(ro);

  return failures;
}

export async function runQualityEngine(
  input: QualityEngineInput,
): Promise<QualityEngineOutput> {
  let moments = [...input.moments];
  const { specs, ctx, ...checkInput } = input;

  const unvalidatedActiveDimLabels = (ctx.sig?.dimensions ?? [])
    .filter(d => !d.validated && d.evidence_tier !== "insufficient_evidence")
    .map(d => d.label);

  // Extract all always-visible dimension value strings for false-positive suppression
  // in checkOutOfScopeNodeReference. These appear in BEHAVIOUR DIMENSIONS regardless of scope.
  const dimensionValues = (ctx.sig?.dimensions ?? []).flatMap(d => {
    const expr = d.expression as { value?: string | string[]; tension?: { value_b?: string } };
    const vals: string[] = [];
    if (Array.isArray(expr?.value)) vals.push(...expr.value);
    else if (expr?.value) vals.push(expr.value);
    if (expr?.tension?.value_b) vals.push(expr.tension.value_b);
    return vals;
  });

  const initialFailures = runAllChecks(moments, checkInput, unvalidatedActiveDimLabels, ctx.hdg, dimensionValues);

  if (initialFailures.length === 0) {
    return { moments, qualityResult: { passed: true, failures: [] } };
  }

  // Collect unique moment_ids that need regeneration (null = report-level, skip regen)
  const failingIds = new Set(
    initialFailures.map(f => f.moment_id).filter((id): id is string => id !== null),
  );

  for (const momentId of failingIds) {
    const spec = specs[momentId];
    if (!spec) {
      console.warn(`[quality-engine] no spec for ${momentId} — cannot regenerate`);
      continue;
    }

    let regenerated = false;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`[quality-engine] regenerating ${momentId} (attempt ${attempt}/${MAX_RETRIES})`);
      const newMoment = await generateMoment(spec, ctx);
      const candidate = moments.map(m => m.moment_id === momentId ? newMoment : m);

      const recheck = runAllChecks(candidate, checkInput, unvalidatedActiveDimLabels, ctx.hdg, dimensionValues);
      const stillFailing = recheck.some(f => f.moment_id === momentId);
      if (!stillFailing) {
        moments = candidate;
        regenerated = true;
        console.log(`[quality-engine] ${momentId} passed after attempt ${attempt}`);
        break;
      }
      console.warn(`[quality-engine] ${momentId} still failing after attempt ${attempt}`);
    }

    if (!regenerated) {
      console.warn(`[quality-engine] ${momentId} failed all ${MAX_RETRIES} regeneration attempts — keeping original`);
    }
  }

  const finalFailures = runAllChecks(moments, checkInput, unvalidatedActiveDimLabels, ctx.hdg, dimensionValues);
  return {
    moments,
    qualityResult: { passed: finalFailures.length === 0, failures: finalFailures },
  };
}
