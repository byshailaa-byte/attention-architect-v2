/**
 * Single-case recheck for T6 (finish / Lego set) after output-shape fix.
 * Verifies: (1) generated portion is exactly 2 sentences, (2) bridge uses G2 evidence.
 * Run: npx tsx scripts/teaser-t6-recheck.ts
 */

import * as dotenv from "dotenv";
import path from "path";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { buildHdg } from "../lib/graph/hdg";
import { buildBehaviourGraph } from "../lib/graph/behaviour-graph";
import { buildBehaviourSignature } from "../lib/graph/signature";
import { buildConfidenceVector } from "../lib/graph/confidence";
import { buildFamilyAttentionLoop } from "../lib/graph/loop";
import { scoreAssessment, tallyDimension } from "../lib/engine/scorer";
import type { Dimensions } from "../lib/engine/scorer";
import { buildNarrativeContext, type NarrativeContext } from "../lib/narrative/context";
import { generateMoment, type MomentSpec } from "../lib/narrative/generate-moment";
import { CONCERN_CARD_LABELS } from "../lib/concerns";
import type { HdgNode } from "../lib/graph/types";

const ALL_DIMENSIONS = [
  "attention_shape", "reward_driver", "friction_response",
  "parent_instinct", "attention_competition", "recharge_type",
] as const;
const MAX_DATA_POINTS = 18;
const TEASER_FIXED_CLOSE = "Patterns like this tend to get more workable the earlier they're named clearly — that's just how habits settle, for kids and adults alike.";

function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 3));
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter(t => b.has(t)).length;
  return intersection / new Set([...a, ...b]).size;
}

const T6 = {
  concern:       "finish",
  worryFollowup: "He has six half-finished drawings in his room and a Lego set opened last week he hasn't touched since.",
  g1:            "new activity proposed → child immediately disengages from current task (transition context)",
  g2:            "unfinished task revisited → child shows resistance and changes subject (persistence context)",
};

const sql = neon(process.env.DATABASE_URL!);

async function run() {
  // Load baseline session
  const rows = (await sql`
    SELECT child_name, age_band, child_gender, parent_name, archetype, parent_pattern,
           archetype_fit_tier, parent_instinct_fit_tier, concerns, answers,
           dimensions AS dimensions_json, weakest_two
    FROM assessments WHERE answers != '{}'::jsonb AND archetype IS NOT NULL
    ORDER BY created_at DESC LIMIT 1
  `) as unknown as {
    child_name: string | null; age_band: string; child_gender: string | null; parent_name: string;
    archetype: string; parent_pattern: string; archetype_fit_tier: string | null;
    parent_instinct_fit_tier: string | null; concerns: string[];
    answers: Record<string, string>;
    dimensions_json: Record<string, { value: string; consistency: number; data_points: number; winning_votes: number }>;
    weakest_two: string[];
  }[];

  const row = rows[0];
  const answers = row.answers;
  const dimensions: Dimensions = {} as Dimensions;
  for (const dim of ALL_DIMENSIONS) {
    const stored = row.dimensions_json[dim];
    dimensions[dim] = stored ?? { value: "unknown", consistency: 0, data_points: 0, winning_votes: 0 };
  }
  const hdgBase  = buildHdg(answers);
  const bg       = buildBehaviourGraph(hdgBase);
  const sig      = buildBehaviourSignature(hdgBase, bg);
  const cv       = buildConfidenceVector(hdgBase, bg, sig);
  const loop     = buildFamilyAttentionLoop(hdgBase, bg, sig);
  const scoring  = scoreAssessment(dimensions, MAX_DATA_POINTS, cv.overall_confidence);
  const baseCtx  = buildNarrativeContext(
    {
      child_name: row.child_name, age_band: row.age_band, child_gender: row.child_gender,
      parent_name: row.parent_name, archetype: row.archetype,
      archetype_fit_tier: row.archetype_fit_tier ?? scoring.archetype_fit_tier,
      parent_pattern: row.parent_pattern,
      parent_instinct_fit_tier: row.parent_instinct_fit_tier ?? scoring.parent_instinct_fit_tier,
    },
    hdgBase, bg, sig, loop, cv, scoring,
  );

  // Build synthetic G1/G2 nodes
  function parseNode(raw: string, question: string, id: string): HdgNode {
    const m = raw.match(/^(.+?)\s*→\s*(.+?)\s*\((.+?)\s*context\)$/);
    return m
      ? { id, actor: "child", trigger: m[1].trim(), choice: m[2].trim(), source_question: question, source_value: "recheck", context: m[3].trim() as never }
      : { id, actor: "child", trigger: raw, choice: "observed", source_question: question, source_value: "recheck", context: "general" as never };
  }
  const syntheticNodes: HdgNode[] = [
    ...baseCtx.hdg.nodes.filter(n => n.source_question !== "G1" && n.source_question !== "G2"),
    parseNode(T6.g1, "G1", "recheck_g1"),
    parseNode(T6.g2, "G2", "recheck_g2"),
  ];
  const testCtx: NarrativeContext = {
    ...baseCtx,
    concerns: [T6.concern],
    worryFollowup: T6.worryFollowup,
    hdg: { ...baseCtx.hdg, nodes: syntheticNodes },
  };

  const worryLabel = CONCERN_CARD_LABELS[T6.concern] ?? "what you told us";

  const spec: MomentSpec = {
    momentId: "m_teaser",
    momentType: "recognition",
    section: "Teaser",
    purpose: "pre-payment recognition teaser — open by reflecting the parent's stated worry, then bridge to one new detail from G1/G2 evidence that the follow-up answer did not already say; recognition only, no explanation",
    emotionalObjective: "precise recognition without resolution",
    confidenceTier: "confirmed",
    behaviourNodeRefs: [],
    humanDecisionRefs: ["recheck_g1", "recheck_g2"],
    evidenceText: [
      `Parent's stated worry (use this natural phrasing, not the raw key): ${worryLabel}`,
      `Parent's follow-up answer — for the OPENING REFLECTION only, not the bridge: ${T6.worryFollowup}`,
      `[REQUIRED for bridge sentence — this is where the new, unstated detail must come from]: ${T6.g1}`,
      `[REQUIRED for bridge sentence — this is where the new, unstated detail must come from]: ${T6.g2}`,
    ],
    additionalInstruction:
      `EVIDENCE INPUTS:\n` +
      `- worryLabel: "${worryLabel}" — human-readable concern description\n` +
      `- worryFollowupAnswer: the parent's own words — used for the OPENING reflection only, not the bridge\n` +
      `- G1/G2 evidence nodes: REQUIRED for the bridge sentence — this is where the new, unstated detail must come from\n` +
      `Do not draw from anything else in the FAMILY CONTEXT block.\n\n` +
      `OUTPUT SHAPE — NON-NEGOTIABLE:\n` +
      `Your output must be EXACTLY 2 sentences. No more, no fewer. ` +
      `A closing sentence about the report and what helps is appended by code after your output — ` +
      `do not write it yourself. Do not gesture toward the report, do not mention patterns settling, ` +
      `do not write a third sentence of any kind. Stop after sentence 2.\n\n` +
      `STRUCTURE:\n` +
      `SENTENCE 1 — Open by reflecting "${worryLabel}" back in your own plain words — ` +
      `by DESCRIBING THE SITUATION, not by narrating the parent's act of naming or carrying the concern. ` +
      `The opening sentence must show what actually happens in the house, not comment on what the parent noticed or named.\n` +
      `BANNED OPENING CONSTRUCTIONS — any sentence matching these patterns must be rewritten:\n` +
      `  • "you came here worried about…" or "you came here with…"\n` +
      `  • "the word you landed on…" or "the word you brought…"\n` +
      `  • "the worry you brought…" or "the concern you named…"\n` +
      `  • "you've named it" / "you named it exactly" / "name it exactly"\n` +
      `  • Any construction where the first move is to observe that the parent noticed, named, or carried the concern.\n` +
      `RIGHT SHAPE — describe the pattern directly, from inside the situation: ` +
      `"Homework in your house isn't just hard — it's a fight on every front." ` +
      `"Screens always win." "Every reminder loops back to annoyance." ` +
      `The parent should feel recognised because the situation is described, not because their act of naming it is acknowledged.\n` +
      `SENTENCE 2 — Bridge to ONE specific detail from the scoped G1/G2 evidence that ` +
      `the parent's follow-up answer did NOT already state. This is required, not optional — ` +
      `do not skip it even if the follow-up answer already sounds specific. ` +
      `Test before writing: if this sentence could be produced by only reading the follow-up ` +
      `answer and never looking at the evidence, it is wrong — rewrite it. ` +
      `The goal is genuine recognition ("how did they know that"), not an elegant echo of ` +
      `what the parent already told us.\n` +
      `STOP HERE. Your output ends after sentence 2.\n\n` +
      `HARD RULES (same as every other moment, plus these):\n` +
      `- Never name any of the 8 child archetypes or 4 parent instinct patterns.\n` +
      `- Never explain WHY the pattern happens — recognition only.\n` +
      `- Never predict what will happen to this child at any future age or in any future scenario.\n` +
      `- Do not address the parent by name anywhere in your output.\n` +
      `Output the moment text only. No preamble, no labels, no quotation marks.`,
    wordTarget: "exactly 2 sentences (35–55 words). A third closing sentence is appended by code — do not write it.",
  };

  console.log("[T6-recheck] Generating...\n");
  const moment = await generateMoment(spec, testCtx);
  const generated = moment.content;
  const full = generated + "\n\n" + TEASER_FIXED_CLOSE;

  // Count sentences in generated portion
  const prose = generated.includes("\n\n") ? generated.split("\n\n")[0].trim() : generated.trim();
  const sentences = prose.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  const bridge = sentences.length >= 2 ? sentences[1] : null;
  const sim = bridge ? jaccard(tokenize(bridge), tokenize(T6.worryFollowup)) : 0;

  console.log("GENERATED PORTION:");
  console.log(`  "${generated}"`);
  console.log();
  console.log("FULL (with appended close):");
  console.log(`  "${full}"`);
  console.log();
  console.log(`Sentence count: ${sentences.length} → ${sentences.length === 2 ? "✓ PASS (exactly 2)" : "✗ FAIL (must be 2)"}`);
  console.log(`Bridge Jaccard vs follow-up: ${sim.toFixed(2)} → ${sim < 0.40 ? "✓ PASS (not a paraphrase)" : "✗ FAIL (paraphrase)"}`);
  console.log();
  console.log("Sentence 1 (opening):");
  console.log(`  "${sentences[0] ?? "(none)"}"`);
  console.log("Sentence 2 (bridge):");
  console.log(`  "${bridge ?? "(none)"}"`);
  console.log();
  console.log("G2 evidence it should draw from:");
  console.log(`  "${T6.g2}"`);
}

run().catch(e => { console.error("[T6-recheck] Fatal:", e); process.exit(1); });
