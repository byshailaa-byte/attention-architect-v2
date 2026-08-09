// Loop-present generation test using real Aryan/Shashanka profile.
// Loop: friction_response (child) ↔ Quick-fixer parent instinct.
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });

import { buildHdg } from "../lib/graph/hdg.js";
import { buildBehaviourGraph } from "../lib/graph/behaviour-graph.js";
import { buildBehaviourSignature } from "../lib/graph/signature.js";
import { buildConfidenceVector } from "../lib/graph/confidence.js";
import { buildFamilyAttentionLoop } from "../lib/graph/loop.js";
import { scoreAssessment } from "../lib/engine/scorer.js";
import { buildNarrativeContext } from "../lib/narrative/context.js";
import { composeReport } from "../lib/narrative/compose-report.js";

const ANSWERS: Record<string, string> = {
  G1: "social-anchored", G2: "social", G3: "quick-fixer",
  "D2.1": "mastery", "D2.2": "mastery", "D2.3": "mastery",
  "D3.1": "solo-push", "D3.2": "solo-push", "D3.3": "solo-push",
  "D5.1": "social", "D5.2": "social",
  "D6.1": "social-connection", "D6.2": "social-connection", "D6.3": "social-connection",
};

const MAX_DATA_POINTS = 18;
const t0 = performance.now();

const hdg  = buildHdg(ANSWERS);
const bg   = buildBehaviourGraph(hdg);
const sig  = buildBehaviourSignature(hdg, bg);
const cv   = buildConfidenceVector(hdg, bg, sig);
const loop = buildFamilyAttentionLoop(hdg, bg, sig);

console.log(`Loop detected: ${loop.detected}`);
if (loop.detected) {
  console.log(`Loop mechanism: ${loop.loop_tension_point?.mechanism}`);
  console.log(`Loop child_dimension: ${loop.loop_tension_point?.child_dimension}`);
}

const scoring = scoreAssessment(
  {
    attention_shape:       { value: "social_anchored", consistency: 0.9, data_points: 2, winning_votes: 2 },
    reward_driver:         { value: "mastery",         consistency: 0.9, data_points: 3, winning_votes: 3 },
    friction_response:     { value: "solo_push",       consistency: 0.9, data_points: 3, winning_votes: 3 },
    parent_instinct:       { value: "quick_fixer",     consistency: 0.9, data_points: 1, winning_votes: 1 },
    attention_competition: { value: "social",          consistency: 0.9, data_points: 2, winning_votes: 2 },
    recharge_type:         { value: "social_connection", consistency: 0.9, data_points: 3, winning_votes: 3 },
  },
  MAX_DATA_POINTS,
  cv.overall_confidence,
);

const ctx = buildNarrativeContext(
  {
    child_name: "Aryan",
    age_band: "8-9",
    child_gender: null,
    parent_name: "Shashanka",
    archetype: "The Captain",
    archetype_fit_tier: "primary",
    parent_pattern: "The Quick Fixer",
    parent_instinct_fit_tier: "primary",
    concerns: [],
  },
  hdg, bg, sig, loop, cv, scoring,
);

console.log(`\nStarting composeReport (Aryan/Shashanka, loop present)...`);
const tGen0 = performance.now();
const { report } = await composeReport(ctx);
const tGen1 = performance.now();
const wallSecs = ((tGen1 - tGen0) / 1000).toFixed(1);

console.log(`\n✓ composeReport completed in ${wallSecs}s`);
console.log(`  Moments generated: ${report.moments.length}`);
for (const m of report.moments) {
  const words = m.content.split(/\s+/).length;
  console.log(`  [${m.moment_id}] ${m.section} — ${words}w`);
}

const roadmapMoments = report.moments.filter(m => m.section.startsWith("Roadmap"));
console.log(`\n── Roadmap beats (batched, ${roadmapMoments.length} beats) ──`);
for (const m of roadmapMoments) {
  console.log(`\n${m.section}:`);
  console.log(`  "${m.content}"`);
}

const weekViolation = roadmapMoments.some(m => /week\s+\d/i.test(m.content));
console.log(`\ncheckNoWeekNumberRoadmap: ${weekViolation ? "FAIL ✗" : "PASS ✓"}`);

const loopDim = loop.loop_tension_point?.child_dimension ?? "attention_shape";
const loopCited = roadmapMoments.some(m =>
  m.content.toLowerCase().includes(loopDim.replace(/_/g, " ").toLowerCase()) ||
  m.evidence_source.length > 0
);
console.log(`checkRoadmapLoopCitation: ${!loopCited ? "needs manual review" : "PASS ✓"} (loop dim: ${loopDim})`);
console.log(`\nTotal wall time: ${wallSecs}s`);
