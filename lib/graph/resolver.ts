// Archetype + parent-instinct expected shapes, and archetype fit-tier computation.
//
// Source of truth: archetype-expected-shapes-draft-v2.md (production-verified, 183 families).
// Key finding that shapes this entire file:
//   Only ONE non-grid dimension shows genuine clustering in the 183-family corpus —
//   Magnet's friction_response=support-seek (67%, n=12). Every other archetype's
//   friction_response/attention_competition/recharge_type is scattered even at large n
//   (All-In Kid n=66, Inventor n=30). Grid (attention_shape × reward_driver) does
//   essentially all archetype-discriminating work; non-grid dimensions matter for
//   narrative richness and loop detection, not for telling archetypes apart.
//
// Fit-tier logic:
//   Grid consistency dominates → primary/secondary/weak/no_clear_fit.
//   Magnet's friction_response serves as an additional confirming signal for
//   borderline grid placements. All other non-grid signals are below 60% threshold
//   and are treated as scattered — they do not affect the fit tier.

import type { DimensionResult } from "@/lib/engine/scorer";

export type FitTier = "primary" | "secondary" | "weak" | "no_clear_fit";

// ── Expected shapes ────────────────────────────────────────────────────────────

interface ConfirmedSignal {
  dimension: string;
  value: string;
  rate: number;  // fraction at archetype-wide level
  n: number;     // archetype sample size at time of confirmation
}

export interface ArchetypeShape {
  archetype: string;
  grid: { attention_shape: string; reward_driver: string };
  // Non-grid signals confirmed by production data at ≥60% and sufficient n.
  // Empty for all archetypes except Magnet — the only one with a real finding.
  confirmedSignals: ConfirmedSignal[];
}

interface CellSignal {
  archetype: string;
  dimension: string;
  value: string;
  rate: number;
  cellN: number;
  ruleId: string;
}

export interface ParentInstinctShape {
  instinct: string;
  displayName: string;
  loopRules: string[];
  // Per-cell signals confirmed in the archetype × instinct cross-tab.
  // Loop rules check these per-family (not blanket to the cell).
  confirmedCellSignals: CellSignal[];
}

// 8 archetype expected shapes
// "content-primary" means no non-grid dimension reaches the 60% threshold at sufficient n.
// Do not claim dominant friction/competition/recharge style for content-primary archetypes.
export const ARCHETYPE_SHAPES: Record<string, ArchetypeShape> = {
  "The All-In Kid": {
    archetype: "The All-In Kid",
    grid: { attention_shape: "narrow-deep", reward_driver: "mastery" },
    // n=66. friction 52% solo-push, attn_comp 50% novelty, recharge 44% sensory-quiet.
    // None clear 60% at this n. Content-primary for all non-grid dimensions.
    confirmedSignals: [],
  },
  "The Inventor": {
    archetype: "The Inventor",
    grid: { attention_shape: "narrow-deep", reward_driver: "autonomy" },
    // n=30. attn_comp=internal 53% — highest value, doesn't clear 60%.
    // Highest friction tension rate in corpus (73%) — genuinely heterogeneous coping.
    // Content-primary; do not claim dominant non-grid style.
    confirmedSignals: [],
  },
  "The Explorer": {
    archetype: "The Explorer",
    grid: { attention_shape: "wide-shifting", reward_driver: "novelty" },
    // n=21. All non-grid dimensions scattered. Content-primary.
    confirmedSignals: [],
  },
  "The Magnet": {
    archetype: "The Magnet",
    grid: { attention_shape: "wide-shifting", reward_driver: "social" },
    // n=12. friction_response=support-seek 67% — the ONLY confirmed non-grid signal
    // in the entire 183-family corpus. Also highest tension rates overall (92%),
    // itself a real, specific characteristic. attn_comp and recharge remain scattered.
    confirmedSignals: [
      { dimension: "friction_response", value: "support-seek", rate: 0.67, n: 12 },
    ],
  },
  "The Glue": {
    archetype: "The Glue",
    grid: { attention_shape: "social-anchored", reward_driver: "social" },
    // n=7. Too small for firm conclusions. Content-primary entirely.
    confirmedSignals: [],
  },
  "The Captain": {
    archetype: "The Captain",
    grid: { attention_shape: "social-anchored", reward_driver: "mastery" },
    // n=3. Too small for any claim beyond grid position. Content-primary entirely.
    confirmedSignals: [],
  },
  "The Live Wire": {
    archetype: "The Live Wire",
    grid: { attention_shape: "sensation-seeking", reward_driver: "novelty" },
    // n=19. attn_comp=external 58% (close but doesn't clear 60%).
    // friction tension rate 58% archetype-wide — real characteristic, content-consistent.
    // Content-primary.
    confirmedSignals: [],
  },
  "The Storm": {
    archetype: "The Storm",
    grid: { attention_shape: "sensation-seeking", reward_driver: "autonomy" },
    // n=16. friction tied 38%/38%, recharge tied 44%/44%.
    // Highest reward_driver tension in corpus (88%). Content-primary.
    confirmedSignals: [],
  },
};

// 4 parent instinct expected shapes
// Source: production corpus + phase 4 broader dimension sweep.
export const PARENT_INSTINCT_SHAPES: Record<string, ParentInstinctShape> = {
  "quick-fixer": {
    instinct: "quick-fixer",
    displayName: "The Quick Fixer",
    loopRules: ["rule1"],
    confirmedCellSignals: [],
  },
  "pusher": {
    instinct: "pusher",
    displayName: "The Pusher",
    loopRules: ["rule2", "rule3"],
    confirmedCellSignals: [],
  },
  "negotiator": {
    instinct: "negotiator",
    displayName: "The Negotiator",
    // Rule 4: All-In Kid × negotiator × recharge=cognitive-displacement.
    // 70% of the cell (n=10); D6.confirm independently confirmed 6/9 non-depth families;
    // the one depth-routed family (G2=internal) chose cognitive-displacement at all three D6 sub-questions.
    // Loop fires per-family on the specific child's resolved recharge_type, not blanket to the cell.
    loopRules: ["rule4"],
    confirmedCellSignals: [
      {
        archetype: "The All-In Kid",
        dimension: "recharge_type",
        value: "cognitive-displacement",
        rate: 0.70,
        cellN: 10,
        ruleId: "rule4",
      },
    ],
    // FUTURE CANDIDATES — logged, not implemented, await more data:
    //
    // Explorer × negotiator: recharge_type=social-connection, 67% (n=6), +2.3 rows above
    //   the 29% archetype baseline. D6.confirm confirmed 3/5; D6 depth (1 row) unanimous
    //   across all three D6 sub-questions. Cell needs n≥12 before drafting a rule.
    //
    // All-In Kid × steady-hand: recharge_type=autonomous-unstructured, 38% (n=8),
    //   +1.8 rows above 15% baseline. Borderline (+1.5 threshold). Same direction as
    //   negotiator-paired All-In Kids (both show depressed sensory-quiet vs 44% baseline)
    //   but elevation doesn't clearly separate from noise at n=8.
    //   Revisit when All-In Kid × steady-hand cell reaches n≥12.
  },
  "steady-hand": {
    instinct: "steady-hand",
    displayName: "The Steady Hand",
    // No loop rules: friction sweep null result; attention_competition and recharge sweeps
    // produced only borderline elevations (All-In Kid×steady-hand autonomous-unstr +1.8 rows,
    // logged as future candidate above). Families with steady-hand parent fall to
    // noLoop / pattern_summary only — correct behavior, not a gap.
    loopRules: [],
    confirmedCellSignals: [],
  },
};

// ── Fit-tier computation ──────────────────────────────────────────────────────
//
// Grid consistency dominates. Primary-grid and fallback-grid archetypes are scored
// identically — both tables are deliberately authored (production confirms Inventor
// majority-routes through fallback at 60% novelty). Grid source does not affect tier.
//
// Anchored dimension (attention_shape, via G1): one gateway answer is complete,
// sufficient evidence by design. data_points=1 scores 2, same as unanimous.
// Non-anchored dimension (reward_driver): slot1 always routes D2.1–D2.3, so
// data_points=1 only occurs in incomplete submissions and scores 1 (above split).
//
// Score range: 0–4. Cutoffs: ≥3→primary, 2→secondary, 1→secondary, 0→weak.
// Magnet's confirmed friction signal (support-seek, 67% n=12) upgrades gridScore=2 to primary.

// [CALIBRATE] — floor below which overall_confidence triggers no_clear_fit.
// Dev corpus (50 rows): min=0.717, all between 0.717–0.890, mean=0.807.
// Floor set at 0.60 to catch genuinely broken assessments only (bad data, malformed answers).
// At the observed distribution this never fires; revisit against the full production corpus.
const CONFIDENCE_RESOLUTION_FLOOR = 0.60;

function anchoredStrength(dim: DimensionResult): number {
  // data_points=0: defensive guard (no answer at all)
  if (!dim.data_points) return 0;
  // data_points=1: gateway anchor alone = sufficient evidence by design
  if (dim.data_points === 1) return 2;
  if (dim.winning_votes === dim.data_points) return 2;
  if (dim.winning_votes * 2 > dim.data_points) return 1;
  return 0;
}

function nonAnchoredStrength(dim: DimensionResult): number {
  // data_points=0: defensive guard (no answer at all)
  if (!dim.data_points) return 0;
  // data_points=1: confirm-only path — real answer but less than expected depth
  if (dim.data_points === 1) return 1;
  if (dim.winning_votes === dim.data_points) return 2;
  if (dim.winning_votes * 2 > dim.data_points) return 1;
  return 0;
}

export function resolveArchetypeFitTier(
  archetype: string,
  shapeDim: DimensionResult,
  driverDim: DimensionResult,
  frictionValue?: string,
  overallConfidence?: number,
): FitTier {
  // Condition 1: corrupted/unexpected dimension values (no valid archetype assigned).
  if (archetype === "Unknown") return "no_clear_fit";

  // Condition 2 (spec OR clause): overall confidence below the resolution floor.
  // Fires for assessments where evidence is systematically low-quality, not just
  // grid-uncertain. At CONFIDENCE_RESOLUTION_FLOOR=0.60 this is a data-integrity
  // backstop; raise the floor once production distribution is analyzed.
  if (overallConfidence !== undefined && overallConfidence < CONFIDENCE_RESOLUTION_FLOOR) {
    return "no_clear_fit";
  }

  const gridScore = anchoredStrength(shapeDim) + nonAnchoredStrength(driverDim);

  // Magnet's friction_response=support-seek: the one data-confirmed non-grid signal.
  // Only applies when grid is borderline (gridScore=2); does not affect clear placements.
  const magnetConfirmed =
    archetype === "The Magnet" && frictionValue === "support-seek";

  if (gridScore >= 3) return "primary";

  if (gridScore === 2) {
    return magnetConfirmed ? "primary" : "secondary";
  }

  if (gridScore === 1) return "secondary";

  // gridScore === 0: both dimensions split — placement uncertain, archetype still named.
  return "weak";
}

// parent_instinct is ANCHORED (G3). All four values have a direct 1:1 mapping —
// no fallback grid, no "Unknown" case — so no_clear_fit is not reachable via grid.
// Uses anchoredStrength: G3 alone = sufficient (data_points=1 → score 2 → primary).
//
// overallConfidence gates this the same way it gates resolveArchetypeFitTier:
// overall_confidence is a family-level metric (mean across all 6 dimensions), not
// per-resolution-target. A family below the floor gets no_clear_fit on both outputs.
export function resolveParentInstinctFitTier(
  dim: DimensionResult,
  overallConfidence?: number,
): FitTier {
  if (overallConfidence !== undefined && overallConfidence < CONFIDENCE_RESOLUTION_FLOOR) {
    return "no_clear_fit";
  }
  const score = anchoredStrength(dim);
  if (score >= 2) return "primary";
  if (score >= 1) return "secondary";
  return "weak";
}
