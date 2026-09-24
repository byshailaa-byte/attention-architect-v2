// Same as _debug_submit but with correct age_band "10-11"
import { neon } from "@neondatabase/serverless";
import { tallyDimension, scoreAssessment } from "../lib/engine/scorer.js";
import { buildHdg } from "../lib/graph/hdg.js";
import { buildBehaviourGraph } from "../lib/graph/behaviour-graph.js";
import { buildBehaviourSignature } from "../lib/graph/signature.js";
import { buildConfidenceVector } from "../lib/graph/confidence.js";
import { randomUUID } from "crypto";

const sql = neon(process.env.DATABASE_URL!);
const sessionId = randomUUID();

const answers = {
  G1:"narrow-deep", G2:"novelty", G3:"steady-hand",
  "D1.1":"narrow-deep","D1.2":"wide-shifting",
  "D2.1":"mastery","D2.2":"mastery","D2.3":"novelty","D2.confirm":"mastery",
  "D3.1":"avoid","D3.2":"avoid","D3.3":"avoid","D3.confirm":"avoid",
  P1:"steady-hand",P2:"quick-fixer",
  "D5.1":"task-escape","D5.2":"task-escape",
  R1:"responsive",R2:"responsive",R3:"responsive",
  "D6.1":"sensory-quiet","D6.2":"sensory-quiet","D6.3":"sensory-quiet","D6.confirm":"sensory-quiet",
};
const questionSequence = [
  {id:"G1",dimension:"attention_shape"},{id:"G2",dimension:"attention_competition"},{id:"G3",dimension:"parent_instinct"},
  {id:"D1.1",dimension:"attention_shape"},{id:"D1.2",dimension:"attention_shape"},
  {id:"D2.1",dimension:"reward_driver"},{id:"D2.2",dimension:"reward_driver"},{id:"D2.3",dimension:"reward_driver"},{id:"D2.confirm",dimension:"reward_driver"},
  {id:"D3.1",dimension:"friction_response"},{id:"D3.2",dimension:"friction_response"},{id:"D3.3",dimension:"friction_response"},{id:"D3.confirm",dimension:"friction_response"},
  {id:"P1",dimension:"parent_instinct"},{id:"P2",dimension:"parent_instinct"},
  {id:"D5.1",dimension:"attention_competition"},{id:"D5.2",dimension:"attention_competition"},
  {id:"R1",dimension:"recovery_response"},{id:"R2",dimension:"recovery_response"},{id:"R3",dimension:"recovery_response"},
  {id:"D6.1",dimension:"recharge_type"},{id:"D6.2",dimension:"recharge_type"},{id:"D6.3",dimension:"recharge_type"},{id:"D6.confirm",dimension:"recharge_type"},
];

const ALL_DIMENSIONS = ["attention_shape","reward_driver","friction_response","parent_instinct","attention_competition","recharge_type","recovery_response"] as const;
const MAX_DATA_POINTS = 21;

const dimAnswers: Record<string, string[]> = {};
for (const { id, dimension } of questionSequence) {
  if (answers[id as keyof typeof answers] !== undefined) {
    if (!dimAnswers[dimension]) dimAnswers[dimension] = [];
    dimAnswers[dimension].push(answers[id as keyof typeof answers]);
  }
}

const dimensions: Record<string, unknown> = {};
for (const dim of ALL_DIMENSIONS) {
  const arr = dimAnswers[dim];
  dimensions[dim] = arr?.length ? tallyDimension(arr) : { value: "unknown", consistency: 0, data_points: 0, winning_votes: 0 };
}

const hdg = buildHdg(answers);
const bg = buildBehaviourGraph(hdg);
const sig = buildBehaviourSignature(hdg, bg);
const cv = buildConfidenceVector(hdg, bg, sig);
const scoring = scoreAssessment(dimensions as Parameters<typeof scoreAssessment>[0], MAX_DATA_POINTS, cv.overall_confidence);

// Test 1: with utm
const utmValue = { utm_source: "meta", utm_medium: "paid", utm_campaign: "test_sept", utm_content: "creative_a", fbclid: "abc123" };
try {
  await sql`
    INSERT INTO assessments (
      session_id, child_name, age_band, child_gender, answers, dimensions,
      archetype, parent_pattern,
      archetype_fit_tier, parent_instinct_fit_tier,
      axes, weakest_two,
      honest_flag, honest_trigger,
      confidence_vector,
      concerns,
      worry_followup,
      pricing_variant,
      utm
    ) VALUES (
      ${sessionId}::uuid,
      ${"UtmTestA"},
      ${"10-11"},
      ${null},
      ${JSON.stringify(answers)}::jsonb,
      ${JSON.stringify(dimensions)}::jsonb,
      ${scoring.archetype},
      ${scoring.parent_pattern},
      ${scoring.archetype_fit_tier},
      ${scoring.parent_instinct_fit_tier},
      ${JSON.stringify(scoring.axes)}::jsonb,
      ${scoring.weakest_two},
      ${scoring.honest_flag},
      ${scoring.honest_trigger},
      ${JSON.stringify(cv)}::jsonb,
      ${["homework"]},
      ${"He just stares at the page and says he doesn't know where to start"},
      ${"control"},
      ${JSON.stringify(utmValue)}::jsonb
    )
  `;
  const rows = await sql`SELECT utm FROM assessments WHERE session_id = ${sessionId}::uuid`;
  console.log("Test A — assessments.utm =", JSON.stringify((rows as {utm:unknown}[])[0]?.utm, null, 2));
} catch (e) {
  console.error("Test A FAILED:", (e as Error).message);
}

// Test 2: no utm (empty)
const sessionId2 = randomUUID();
const utmValue2 = {};
try {
  await sql`
    INSERT INTO assessments (
      session_id, child_name, age_band, child_gender, answers, dimensions,
      archetype, parent_pattern,
      archetype_fit_tier, parent_instinct_fit_tier,
      axes, weakest_two,
      honest_flag, honest_trigger,
      confidence_vector,
      concerns,
      worry_followup,
      pricing_variant,
      utm
    ) VALUES (
      ${sessionId2}::uuid,
      ${"UtmTestB"},
      ${"10-11"},
      ${null},
      ${JSON.stringify(answers)}::jsonb,
      ${JSON.stringify(dimensions)}::jsonb,
      ${scoring.archetype},
      ${scoring.parent_pattern},
      ${scoring.archetype_fit_tier},
      ${scoring.parent_instinct_fit_tier},
      ${JSON.stringify(scoring.axes)}::jsonb,
      ${scoring.weakest_two},
      ${scoring.honest_flag},
      ${scoring.honest_trigger},
      ${JSON.stringify(cv)}::jsonb,
      ${["screens"]},
      ${"Can't put the phone down"},
      ${"control"},
      ${JSON.stringify(utmValue2)}::jsonb
    )
  `;
  const rows2 = await sql`SELECT utm FROM assessments WHERE session_id = ${sessionId2}::uuid`;
  console.log("Test B — assessments.utm =", JSON.stringify((rows2 as {utm:unknown}[])[0]?.utm, null, 2));
} catch (e) {
  console.error("Test B FAILED:", (e as Error).message);
}
