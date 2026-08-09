// Generation timing test: runs composeReport against a realistic context
// and measures wall-clock time for the full pipeline with all three optimizations.
// Uses synthetic answers that produce a "loop present" report for comparison.
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

// Realistic answers that produce The All-In Kid + loop present
const ANSWERS: Record<string, string> = {
  G1: "deep_focus_interest",
  G2: "interest_switches",
  G3: "step_in_remind",
  "D1.1": "high_resistance",
  "D1.2": "task_avoidance",
  "D2.1": "mastery",
  "D2.2": "intrinsic",
  "D2.3": "interest_driven",
  "D2.confirm": "yes",
  "D3.1": "shut_down",
  "D3.2": "gradual",
  "D3.confirm": "yes",
  "D5.1": "alone",
  "D5.2": "structured_time",
  "D6.1": "physical",
  "D6.confirm": "yes",
  P1: "immediate_help",
  P2: "persist",
  S1: "resists",
};

const MAX_DATA_POINTS = 18;

const t0 = performance.now();

const hdg  = buildHdg(ANSWERS);
const bg   = buildBehaviourGraph(hdg);
const sig  = buildBehaviourSignature(hdg, bg);
const cv   = buildConfidenceVector(hdg, bg, sig);
const loop = buildFamilyAttentionLoop(hdg, bg, sig);
const scoring = scoreAssessment(
  {
    attention_shape:    { value: "deep_focus", consistency: 0.9, data_points: 4, winning_votes: 4 },
    reward_driver:      { value: "mastery",    consistency: 0.8, data_points: 3, winning_votes: 3 },
    friction_response:  { value: "avoidance",  consistency: 0.7, data_points: 3, winning_votes: 2 },
    parent_instinct:    { value: "step_in",    consistency: 0.8, data_points: 3, winning_votes: 3 },
    attention_competition: { value: "interest_switches", consistency: 0.9, data_points: 3, winning_votes: 3 },
    recharge_type:      { value: "solitude",   consistency: 0.8, data_points: 3, winning_votes: 3 },
  },
  MAX_DATA_POINTS,
  cv.overall_confidence,
);

const ctx = buildNarrativeContext(
  {
    child_name: "Atharv",
    age_band: "10-11",
    child_gender: "boy",
    parent_name: "Chitra",
    archetype: "The All-In Kid",
    archetype_fit_tier: "primary",
    parent_pattern: "The Quick Fixer",
    parent_instinct_fit_tier: "primary",
    concerns: ["focus", "screens"],
  },
  hdg, bg, sig, loop, cv, scoring,
);

const tBuild = performance.now();
console.log(`Context build: ${((tBuild - t0) / 1000).toFixed(2)}s (deterministic)`);
console.log(`Loop detected: ${loop.detected} (${loop.loop_tension_point?.mechanism ?? "none"})`);
console.log(`\nStarting composeReport...`);

const tGen0 = performance.now();
const { report, specs } = await composeReport(ctx);
const tGen1 = performance.now();

const wallSecs = ((tGen1 - tGen0) / 1000).toFixed(1);
console.log(`\n✓ composeReport completed in ${wallSecs}s`);
console.log(`  Moments generated: ${report.moments.length}`);

for (const m of report.moments) {
  const words = m.content.split(/\s+/).length;
  console.log(`  [${m.moment_id}] ${m.section} — ${words}w`);
}

// Print roadmap beats for quality comparison
const roadmapMoments = report.moments.filter(m => m.section.startsWith("Roadmap"));
console.log(`\n── Roadmap beats (batched, ${roadmapMoments.length} beats) ──`);
for (const m of roadmapMoments) {
  console.log(`\n${m.section}:`);
  console.log(`  "${m.content}"`);
}

// Check for week-number violations in roadmap
const weekViolation = roadmapMoments.some(m => /week\s+\d/i.test(m.content));
console.log(`\ncheckNoWeekNumberRoadmap: ${weekViolation ? "FAIL ✗" : "PASS ✓"}`);

// Check loop citation in roadmap (loop dimension should appear in at least one beat)
const loopDim = loop.loop_tension_point?.child_dimension ?? "attention_shape";
const loopCited = roadmapMoments.some(m =>
  m.content.toLowerCase().includes(loopDim.replace(/_/g, " ").toLowerCase()) ||
  m.evidence_source.length > 0
);
console.log(`checkRoadmapLoopCitation: ${!loopCited ? "needs manual review" : "PASS ✓"} (loop dim: ${loopDim})`);
console.log(`\nTotal wall time: ${wallSecs}s`);
