// Verify serialiseContext() output for two sessions:
// one with worry_followup, one without.

import { getSql } from "@/lib/db/client";
import { buildHdg } from "@/lib/graph/hdg";
import { buildBehaviourGraph } from "@/lib/graph/behaviour-graph";
import { buildBehaviourSignature } from "@/lib/graph/signature";
import { buildConfidenceVector } from "@/lib/graph/confidence";
import { buildFamilyAttentionLoop } from "@/lib/graph/loop";
import { scoreAssessment, tallyDimension } from "@/lib/engine/scorer";
import { buildNarrativeContext, serialiseContext } from "@/lib/narrative/context";
import type { Dimensions } from "@/lib/engine/scorer";

const sql = getSql();

type Row = {
  session_id: string; child_name: string | null; age_band: string;
  child_gender: string | null; parent_name: string | null;
  archetype: string; parent_pattern: string;
  archetype_fit_tier: string | null; parent_instinct_fit_tier: string | null;
  concerns: string[]; worry_followup: string | null;
  answers: Record<string, string>;
  dimensions_json: Record<string, { value: string; consistency: number; data_points: number; winning_votes: number }>;
};

const COLS = `session_id, child_name, age_band, child_gender, parent_name,
    archetype, parent_pattern, archetype_fit_tier, parent_instinct_fit_tier,
    concerns, worry_followup, answers, dimensions AS dimensions_json`;

const [withRows, withoutRows] = await Promise.all([
  sql`SELECT ${sql.unsafe(COLS)} FROM assessments WHERE archetype IS NOT NULL AND answers IS NOT NULL AND worry_followup IS NOT NULL ORDER BY created_at DESC LIMIT 1`,
  sql`SELECT ${sql.unsafe(COLS)} FROM assessments WHERE archetype IS NOT NULL AND answers IS NOT NULL AND worry_followup IS NULL AND concerns IS NOT NULL ORDER BY created_at DESC LIMIT 1`,
]) as unknown as [Row[], Row[]];

const withFollowup    = withRows[0]    ?? null;
const withoutFollowup = withoutRows[0] ?? null;

const targets = [
  { label: "WITH worry_followup",    row: withFollowup },
  { label: "WITHOUT worry_followup", row: withoutFollowup },
];

const ALL_DIMENSIONS = [
  "attention_shape","reward_driver","friction_response",
  "parent_instinct","attention_competition","recharge_type",
] as const;
const MAX_DATA_POINTS = 18;

function buildCtx(row: Row) {
  const answers = row.answers;
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
  const hdg = buildHdg(answers);
  const bg  = buildBehaviourGraph(hdg);
  const sig = buildBehaviourSignature(hdg, bg);
  const cv  = buildConfidenceVector(hdg, bg, sig);
  const loop = buildFamilyAttentionLoop(hdg, bg, sig);
  const scoring = scoreAssessment(dimensions, MAX_DATA_POINTS, cv.overall_confidence);
  return buildNarrativeContext(
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
    },
    hdg, bg, sig, loop, cv, scoring,
  );
}

// Extract just the FAMILY CONTEXT header (up to BEHAVIOUR DIMENSIONS)
function familyBlock(s: string): string {
  const idx = s.indexOf("\nBEHAVIOUR DIMENSIONS");
  return idx > 0 ? s.slice(0, idx).trim() : s.slice(0, 700).trim();
}

for (const { label, row } of targets) {
  if (!row) { console.log(`[${label}] — no matching session in dev DB\n`); continue; }
  const ctx = buildCtx(row);
  const full = serialiseContext(ctx);
  console.log("═".repeat(72));
  console.log(label);
  console.log(`session_id: ${row.session_id}`);
  console.log(`archetype:  ${row.archetype}  |  concerns: ${JSON.stringify(row.concerns)}`);
  if (row.worry_followup) console.log(`followup:   "${row.worry_followup}"`);
  console.log("─".repeat(72));
  console.log(familyBlock(full));
  console.log();
}

process.exit(0);
