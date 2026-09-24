// Test A: submit with full UTM object, verify DB write
import { randomUUID } from "crypto";
import { neon } from "@neondatabase/serverless";

const BASE = "http://localhost:3007";
const sql = neon(process.env.DATABASE_URL!);
const sessionId = randomUUID();
console.log(`Session: ${sessionId}`);

const res = await fetch(`${BASE}/api/assessment/submit`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sessionId,
    childName: "UtmTestA",
    ageBand: "10-11",
    gender: "boy",
    concerns: ["homework"],
    worryFollowup: "He just stares at the page",
    variant: "control",
    answers: {
      G1:"narrow-deep", G2:"novelty", G3:"steady-hand",
      "D1.1":"narrow-deep","D1.2":"narrow-deep",
      "D2.1":"mastery","D2.2":"novelty","D2.3":"autonomy","D2.confirm":"mastery",
      "D3.1":"avoid","D3.2":"avoid","D3.3":"avoid","D3.confirm":"avoid",
      P1:"steady-hand",P2:"steady-hand",
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
    utm: {
      utm_source: "meta",
      utm_medium: "paid",
      utm_campaign: "test_sept",
      utm_content: "creative_a",
      fbclid: "abc123",
    },
  }),
});

if (!res.ok) { console.error("Submit failed:", await res.json()); process.exit(1); }
console.log("Submit: 200");

const rows = await sql`SELECT utm FROM assessments WHERE session_id = ${sessionId}::uuid`;
console.log("\nassessments.utm =", JSON.stringify((rows as { utm: unknown }[])[0]?.utm, null, 2));
