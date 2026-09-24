// Test B: submit with no UTM (empty object), verify DB writes {}
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
    childName: "UtmTestB",
    ageBand: "10-11",
    gender: "girl",
    concerns: ["screens"],
    worryFollowup: "Can't put the phone down",
    variant: "control",
    answers: {
      G1:"wide-shifting", G2:"novelty", G3:"quick-fixer",
      "D1.1":"wide-shifting","D1.2":"wide-shifting",
      "D2.1":"novelty","D2.2":"novelty","D2.3":"novelty","D2.confirm":"novelty",
      "D3.1":"support-seek","D3.2":"support-seek","D3.3":"support-seek","D3.confirm":"support-seek",
      P1:"quick-fixer",P2:"quick-fixer",
      "D5.1":"boredom-avoidance","D5.2":"boredom-avoidance",
      R1:"responsive",R2:"responsive",R3:"responsive",
      "D6.1":"social-connection","D6.2":"social-connection","D6.3":"social-connection","D6.confirm":"social-connection",
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
    utm: {},
  }),
});

if (!res.ok) { console.error("Submit failed:", await res.json()); process.exit(1); }
console.log("Submit: 200");

const rows = await sql`SELECT utm FROM assessments WHERE session_id = ${sessionId}::uuid`;
console.log("\nassessments.utm =", JSON.stringify((rows as { utm: unknown }[])[0]?.utm, null, 2));
