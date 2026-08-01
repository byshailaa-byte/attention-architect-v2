// Scoring engine — implements docs/specs/scoring-formula-4axis-spec.md §2–§5
// and honest-path triggers from docs/specs/honest-path-trigger-spec.md §3.
//
// Spec-defined constants tagged [CALIBRATE] are reasoned starting values, not empirical.

import { resolveArchetypeFitTier, resolveParentInstinctFitTier, type FitTier } from "@/lib/graph/resolver";
export type { FitTier };

export type DimensionResult = {
  value: string;
  consistency: number;   // winning_votes / data_points; 0.5 for single data point (§2)
  data_points: number;
  winning_votes: number; // integer — used directly in Trigger A (§3)
};

export type Dimensions = Record<string, DimensionResult>;

export type AxisResult = {
  value: number;     // raw (0–1), before normalization
  norm: number;      // normalized (0–1) — used for bar width, banding, and ranking
  band: "Strong" | "Mixed" | "Low";
  eligible: boolean; // false = cannot appear in weakest_two (Recovery only, §4a)
};

export type ScoringOutput = {
  archetype: string;
  parent_pattern: string;
  archetype_fit_tier: FitTier;
  parent_instinct_fit_tier: FitTier;
  axes: {
    stability: AxisResult;
    resistance: AxisResult;
    recovery: AxisResult;
  };
  weakest_two: string[];
  honest_flag: boolean;
  honest_trigger: string | null;
  data_richness: number; // internal only — logged, never displayed
};

// ── Per-dimension tally ────────────────────────────────────────────────────────

/**
 * Tally answers for one dimension.
 * Spec §2: a dimension with exactly 1 data point gets consistency = 0.5, NOT 1.0.
 * "One answer tells you nothing about unanimity — use 0.5. It reads as 'we don't know'."
 * Tiebreak: first answer given (spec §5 step 4).
 */
export function tallyDimension(answers: string[]): DimensionResult {
  const total = answers.length;
  const counts: Record<string, number> = {};
  for (const a of answers) counts[a] = (counts[a] ?? 0) + 1;

  let winningValue = answers[0];
  let winningCount = 0;
  for (const [val, count] of Object.entries(counts)) {
    if (count > winningCount) { winningCount = count; winningValue = val; }
  }

  const consistency = total === 1 ? 0.5 : winningCount / total;

  return { value: winningValue, consistency, data_points: total, winning_votes: winningCount };
}

// ── Archetype grid + fallback (assessment-final §6) ───────────────────────────

const ARCHETYPE_GRID: Record<string, Record<string, string>> = {
  "narrow-deep":       { mastery: "The All-In Kid", autonomy: "The Inventor" },
  "wide-shifting":     { novelty: "The Explorer",   social:   "The Magnet" },
  "social-anchored":   { social:  "The Glue",       mastery:  "The Captain" },
  "sensation-seeking": { novelty: "The Live Wire",  autonomy: "The Storm" },
};

const ARCHETYPE_FALLBACK: Record<string, Record<string, string>> = {
  "narrow-deep":       { novelty: "The Inventor",  social:   "The All-In Kid" },
  "wide-shifting":     { mastery: "The Explorer",  autonomy: "The Explorer" },
  "social-anchored":   { novelty: "The Glue",      autonomy: "The Captain" },
  "sensation-seeking": { mastery: "The Storm",     social:   "The Live Wire" },
};

export function deriveArchetype(shape: string, driver: string): string {
  return ARCHETYPE_GRID[shape]?.[driver]
    ?? ARCHETYPE_FALLBACK[shape]?.[driver]
    ?? "Unknown";
}

// ── Parent pattern (assessment-final §7) ──────────────────────────────────────

const PARENT_PATTERN: Record<string, string> = {
  "quick-fixer": "The Quick Fixer",
  "pusher":      "The Pusher",
  "negotiator":  "The Negotiator",
  "steady-hand": "The Steady Hand",
};

export function deriveParentPattern(parentInstinct: string): string {
  return PARENT_PATTERN[parentInstinct] ?? "Unknown";
}

// ── Polarity tables (spec §3) ──────────────────────────────────────────────────

const STABILITY_BASELINE: Record<string, number> = {
  "narrow-deep":       0.85,
  "social-anchored":   0.60,
  "wide-shifting":     0.35,
  "sensation-seeking": 0.30,
};

const STABILITY_FRICTION_MODIFIER: Record<string, number> = {
  "solo-push":        +0.10,
  "energized":        +0.10,
  "support-seek":      0.00,
  "avoid":            -0.10,
  "emotional-derail": -0.15,
};

// "external" added in the updated spec at 0.35 alongside boredom-avoidance/novelty.
// [CALIBRATE] highest priority in this table — external is heavily confounded by environment.
const RESISTANCE_COMPETITION_POLARITY: Record<string, number> = {
  "genuine-interest":  0.70,
  "social":            0.50,
  "boredom-avoidance": 0.35,
  "novelty":           0.35,
  "external":          0.35,
  "task-escape":       0.25,
  "internal":          0.25,
};

function resistanceFrictionModifier(frictionValue: string): number {
  return (frictionValue === "avoid" || frictionValue === "emotional-derail") ? -0.10 : 0.00;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

// ── Normalization ranges (spec §4a) ───────────────────────────────────────────
// [CALIBRATE] — theoretical bounds, tighten to observed percentiles once data exists.

const STABILITY_MIN  = 0.03;  const STABILITY_MAX  = 0.95;
const RESISTANCE_MIN = 0.10;  const RESISTANCE_MAX = 0.70;

function normalize(value: number, min: number, max: number): number {
  return (value - min) / (max - min);
}

// ── Band cutoffs (applied to normalized values, spec §4b) ─────────────────────
// [CALIBRATE]

function toBand(norm: number): "Strong" | "Mixed" | "Low" {
  if (norm >= 0.65) return "Strong";
  if (norm >= 0.40) return "Mixed";
  return "Low";
}

// ── Axis computation ───────────────────────────────────────────────────────────

function computeStability(dims: Dimensions): AxisResult {
  const shape    = dims.attention_shape;
  const friction = dims.friction_response;

  const baseline = STABILITY_BASELINE[shape.value] ?? 0.30;
  const modifier = friction ? (STABILITY_FRICTION_MODIFIER[friction.value] ?? 0.00) : 0.00;
  const polarity = clamp(baseline + modifier, 0.05, 0.95);

  // [CALIBRATE] consistency from attention_shape (primary dimension)
  const value = polarity * (0.5 + 0.5 * shape.consistency);
  const norm  = normalize(value, STABILITY_MIN, STABILITY_MAX);
  return { value, norm, band: toBand(norm), eligible: true };
}

function computeResistance(dims: Dimensions): AxisResult {
  const competition = dims.attention_competition;
  const friction    = dims.friction_response;

  const basePol  = RESISTANCE_COMPETITION_POLARITY[competition.value] ?? 0.35;
  const modifier = friction ? resistanceFrictionModifier(friction.value) : 0.00;
  const polarity = clamp(basePol + modifier, 0.05, 0.95);

  // [CALIBRATE] consistency from attention_competition (primary dimension)
  const value = polarity * (0.5 + 0.5 * competition.consistency);
  const norm  = normalize(value, RESISTANCE_MIN, RESISTANCE_MAX);
  return { value, norm, band: toBand(norm), eligible: true };
}

/**
 * Spec §4a vote-based Recovery normalization lookup.
 * Returns null when data_points == 1 → INELIGIBLE for weakest_two.
 * "One answer tells us which route; it tells us nothing about consistency of route."
 */
function recoveryNorm(data_points: number, winning_votes: number): number | null {
  if (data_points <= 1) return null; // INELIGIBLE
  if (data_points === 2) return winning_votes === 2 ? 1.00 : 0.35;
  // data_points === 3
  if (winning_votes === 3) return 1.00;
  if (winning_votes === 2) return 0.65;
  return 0.30; // three-way scatter
}

function computeRecovery(dims: Dimensions): AxisResult {
  const recharge = dims.recharge_type;

  // Raw value: still computed for display/bar width (§3 formula unchanged).
  const value = 0.25 + 0.50 * recharge.consistency;

  const norm = recoveryNorm(recharge.data_points, recharge.winning_votes);
  const eligible = norm !== null;

  // When ineligible: band still derived from value for display purposes,
  // but norm=0 and eligible=false keeps it out of ranking (§4a).
  const displayNorm = norm ?? 0;
  return { value, norm: displayNorm, band: toBand(displayNorm), eligible };
}

// ── Weakest-two (spec §4c, ranked by NORMALIZED values) ───────────────────────

function selectWeakestTwo(
  stability: AxisResult,
  resistance: AxisResult,
  recovery: AxisResult
): string[] {
  const candidates = [
    { name: "Stability",  n: stability.norm,  eligible: stability.eligible },
    { name: "Resistance", n: resistance.norm, eligible: resistance.eligible },
    { name: "Recovery",   n: recovery.norm,   eligible: recovery.eligible },
  ].filter(a => a.eligible);

  // ascending; tie → alphabetical (provisional — no objective field in Phase 0–2)
  candidates.sort((a, b) => a.n - b.n || a.name.localeCompare(b.name));
  return candidates.slice(0, 2).map(a => a.name);
}

// ── Honest-path triggers (honest-path-trigger-spec §3) ────────────────────────

function computeHonestPath(dims: Dimensions): { honest_flag: boolean; honest_trigger: string | null } {
  const friction    = dims.friction_response;
  const competition = dims.attention_competition;
  const recharge    = dims.recharge_type;

  // Trigger A — distress around difficulty.
  // Spec: winning_votes >= 2 (unambiguous integer, avoids floating-point rounding).
  // Note: winning_votes >= 2 implies data_points >= 2, so no separate data_points check needed.
  if (friction?.value === "emotional-derail" && friction.winning_votes >= 2) {
    return { honest_flag: true, honest_trigger: "A" };
  }

  // Trigger B — systematic avoidance across independent dimensions.
  if (
    friction?.value === "avoid" &&
    (competition?.value === "task-escape" || competition?.value === "internal")
  ) {
    return { honest_flag: true, honest_trigger: "B" };
  }

  // Trigger C — sensory load (three-way convergence required; lowest confidence).
  if (
    recharge?.value === "sensory-quiet" &&
    competition?.value === "external" &&
    (friction?.value === "avoid" || friction?.value === "emotional-derail")
  ) {
    return { honest_flag: true, honest_trigger: "C" };
  }

  return { honest_flag: false, honest_trigger: null };
}

// ── Main scoring function ──────────────────────────────────────────────────────

export function scoreAssessment(
  dims: Dimensions,
  maxPossibleDataPoints = 18,
  overallConfidence?: number,
): ScoringOutput {
  const archetype      = deriveArchetype(dims.attention_shape.value, dims.reward_driver.value);
  const parent_pattern = deriveParentPattern(dims.parent_instinct.value);

  const archetype_fit_tier = resolveArchetypeFitTier(
    archetype,
    dims.attention_shape,
    dims.reward_driver,
    dims.friction_response?.value,
    overallConfidence,
  );

  const parent_instinct_fit_tier = resolveParentInstinctFitTier(dims.parent_instinct, overallConfidence);

  const stability  = computeStability(dims);
  const resistance = computeResistance(dims);
  const recovery   = computeRecovery(dims);

  const weakest_two = selectWeakestTwo(stability, resistance, recovery);

  const { honest_flag, honest_trigger } = computeHonestPath(dims);

  const totalDataPoints = Object.values(dims).reduce((s, d) => s + d.data_points, 0);
  const data_richness   = totalDataPoints / maxPossibleDataPoints;

  return {
    archetype, parent_pattern, archetype_fit_tier, parent_instinct_fit_tier,
    axes: { stability, resistance, recovery },
    weakest_two, honest_flag, honest_trigger, data_richness,
  };
}
