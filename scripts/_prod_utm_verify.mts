import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";

const sql = neon(process.env.DATABASE_URL!);
const sessionId = randomUUID();

const resp = await fetch("https://attention-architect-v2.vercel.app/api/assessment/submit", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sessionId, childName: "ProdUTMTest", ageBand: "10-11", gender: null,
    answers: {
      G1:"narrow-deep",G2:"novelty",G3:"steady-hand",
      "D1.1":"narrow-deep","D1.2":"wide-shifting",
      "D2.1":"mastery","D2.2":"mastery","D2.3":"novelty","D2.confirm":"mastery",
      "D3.1":"avoid","D3.2":"avoid","D3.3":"avoid","D3.confirm":"avoid",
      P1:"steady-hand",P2:"quick-fixer",
      "D5.1":"task-escape","D5.2":"task-escape",
      R1:"responsive",R2:"responsive",R3:"responsive",
      "D6.1":"sensory-quiet","D6.2":"sensory-quiet","D6.3":"sensory-quiet","D6.confirm":"sensory-quiet",
    },
    questionSequence: [
      {id:"G1",dimension:"attention_shape"},{id:"G2",dimension:"attention_competition"},{id:"G3",dimension:"parent_instinct"},
      {id:"D1.1",dimension:"attention_shape"},{id:"D1.2",dimension:"attention_shape"},
      {id:"D2.1",dimension:"reward_driver"},{id:"D2.2",dimension:"reward_driver"},{id:"D2.3",dimension:"reward_driver"},{id:"D2.confirm",dimension:"reward_driver"},
      {id:"D3.1",dimension:"friction_response"},{id:"D3.2",dimension:"friction_response"},{id:"D3.3",dimension:"friction_response"},{id:"D3.confirm",dimension:"friction_response"},
      {id:"P1",dimension:"parent_instinct"},{id:"P2",dimension:"parent_instinct"},
      {id:"D5.1",dimension:"attention_competition"},{id:"D5.2",dimension:"attention_competition"},
      {id:"R1",dimension:"recovery_response"},{id:"R2",dimension:"recovery_response"},{id:"R3",dimension:"recovery_response"},
      {id:"D6.1",dimension:"recharge_type"},{id:"D6.2",dimension:"recharge_type"},{id:"D6.3",dimension:"recharge_type"},{id:"D6.confirm",dimension:"recharge_type"},
    ],
    concerns: [], worryFollowup: null,
    utm: { utm_source: "meta", utm_medium: "paid", utm_campaign: "prod_verify_sept", utm_content: "creative_a", fbclid: "abc123" },
  }),
});

console.log("submit status:", resp.status);
if (!resp.ok) { console.error(await resp.json()); process.exit(1); }

await sql`UPDATE assessments SET is_internal = true WHERE session_id = ${sessionId}::uuid`;
const rows = await sql`SELECT utm FROM assessments WHERE session_id = ${sessionId}::uuid` as { utm: unknown }[];
console.log("assessments.utm:", JSON.stringify(rows[0]?.utm));
