import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";

const sql = neon(process.env.DATABASE_URL!);
const sessionId = randomUUID();

// Clone answers/dimensions from the existing dev session
const answers = {
  G1: "narrow-deep", G2: "novelty", G3: "quick-fixer",
  P1: "quick-fixer", P2: "quick-fixer", S1: "disengagement",
  "D1.1": "narrow-deep", "D1.2": "narrow-deep",
  "D2.1": "mastery", "D2.2": "mastery", "D2.3": "mastery",
  "D3.confirm": "solo-push", "D6.confirm": "sensory-quiet"
};

const dimensions = {
  recharge_type:       { value: "sensory-quiet", consistency: 0.5, data_points: 1, winning_votes: 1 },
  reward_driver:       { value: "mastery",       consistency: 1,   data_points: 3, winning_votes: 3 },
  attention_shape:     { value: "narrow-deep",   consistency: 1,   data_points: 3, winning_votes: 3 },
  parent_instinct:     { value: "quick-fixer",   consistency: 1,   data_points: 3, winning_votes: 3 },
  friction_response:   { value: "solo-push",     consistency: 0.5, data_points: 1, winning_votes: 1 },
  attention_competition: { value: "novelty",     consistency: 0.5, data_points: 1, winning_votes: 1 },
};

await sql`
  INSERT INTO assessments (
    session_id, child_name, age_band, child_gender,
    archetype, parent_pattern, archetype_fit_tier, parent_instinct_fit_tier,
    concerns, worry_followup, answers, dimensions, weakest_two,
    pricing_variant
  ) VALUES (
    ${sessionId}::uuid,
    ${"TestWA"},
    ${"8-9"},
    ${null},
    ${"The All-In Kid"},
    ${"The Quick Fixer"},
    ${"primary"},
    ${"primary"},
    ${["homework"]},
    ${"It depends on the subject"},
    ${JSON.stringify(answers)}::jsonb,
    ${JSON.stringify(dimensions)}::jsonb,
    ${["Resistance", "Stability"]},
    ${"simplified"}
  )
`;

console.log("SESSION_ID=" + sessionId);
