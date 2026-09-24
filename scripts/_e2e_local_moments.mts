import { randomUUID } from "crypto";
import { neon } from "@neondatabase/serverless";

const BASE = "http://localhost:3007";
const ADMIN_KEY = process.env.ADMIN_API_KEY ?? "dev-local-admin";
const sql = neon(process.env.DATABASE_URL!);
const sessionId = randomUUID();
console.log(`\nSession: ${sessionId}`);

// Submit
const submitResp = await fetch(`${BASE}/api/assessment/submit`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sessionId, childName: "Rohan", ageBand: "10-11", gender: "boy",
    concerns: ["homework"],
    worryFollowup: "He just stares at the page and says he doesn't know where to start",
    variant: "control",
    answers: {
      G1:"narrow-deep", G2:"novelty", G3:"steady-hand",
      "D1.1":"narrow-deep","D1.2":"narrow-deep",
      "D2.1":"intrinsic","D2.2":"intrinsic","D2.3":"intrinsic","D2.confirm":"intrinsic",
      "D3.1":"resist","D3.2":"resist","D3.3":"resist","D3.confirm":"resist",
      P1:"steady-hand",P2:"steady-hand",
      "D5.1":"novelty","D5.2":"novelty",
      R1:"bounce-back",R2:"bounce-back",R3:"bounce-back",
      "D6.1":"solo","D6.2":"solo","D6.3":"solo","D6.confirm":"solo",
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
  }),
});
const sj = await submitResp.json();
if (!submitResp.ok) { console.error("Submit failed:", sj); process.exit(1); }
console.log(`Submit: 200 — archetype=${sj.archetype ?? "pending"}`);

// Set parent_name directly in dev DB (bypass claim route to avoid WhatsApp trigger)
await sql`UPDATE assessments SET parent_name = 'Test Parent', email = 'test@example.com' WHERE session_id = ${sessionId}::uuid`;
console.log("parent_name set via DB");

// Generate
const genResp = await fetch(`${BASE}/api/report/generate`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ADMIN_KEY}` },
  body: JSON.stringify({ sessionId }),
});
const gj = await genResp.json() as { moments?: {title:string;body:string}[]; archetype?: string; parent_instinct?: string; error?: string };
if (!genResp.ok) { console.error("Generate failed:", gj); process.exit(1); }
console.log(`Generate: 200 — archetype=${gj.archetype}  instinct=${gj.parent_instinct}`);

const moments = gj.moments ?? [];
console.log(`\n── Generated moments (${moments.length}) ──`);
for (const m of moments) {
  console.log(`\n[${m.title}]`);
  console.log(m.body);
}
process.exit(0);
