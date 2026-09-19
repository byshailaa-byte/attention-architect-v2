// §2 snapshot logic: rarity tag + proportion-bar segments. Pure functions over
// the build-time distribution constant. No parent-facing copy lives here.

import { SNAPSHOT_DISTRIBUTION } from "./snapshot-distribution";

type Counts = Record<string, number>;

function dimCounts(dimension: string): Counts {
  return SNAPSHOT_DISTRIBUTION[dimension] ?? {};
}

/**
 * Rarity tag for a value within its dimension (B3). Precedence:
 *   1. value under 2% of its dimension (incl. zero / unseen) → no tag
 *   2. no value in the dimension exceeds 35% share          → "Splits evenly"
 *   3. this value is the highest share                       → "Most common"
 *   4. otherwise                                             → "1 in N", N = round(1/share)
 * Rule (1) is applied first so a near-empty bucket never carries a tag, even in
 * a dimension that otherwise splits.
 */
export function rarityTag(dimension: string, value: string): string | null {
  const counts = dimCounts(dimension);
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  if (total === 0) return null;

  const n = counts[value] ?? 0;
  const share = n / total;
  if (share < 0.02) return null;

  const maxCount = Math.max(...Object.values(counts));
  const maxShare = maxCount / total;
  if (maxShare <= 0.35) return "Splits evenly";
  if (n === maxCount) return "Most common";
  return `1 in ${Math.round(1 / share)}`;
}

export type BarSegment = { value: string; share: number; isChild: boolean };

/**
 * Proportion-bar segments for a dimension (B4 data), ordered by share descending.
 * Only values with a real count appear; if the child's value has no count yet
 * (a stale constant meeting a never-before-seen value), it is added with a
 * nominal weight of 1 so the child's segment always renders.
 */
export function barSegments(dimension: string, childValue: string): BarSegment[] {
  const counts: Counts = { ...dimCounts(dimension) };
  if (!(counts[childValue] > 0)) counts[childValue] = 1;

  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value, n]) => ({ value, share: n / total, isChild: value === childValue }));
}
