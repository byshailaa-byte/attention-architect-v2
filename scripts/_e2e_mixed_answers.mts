import { randomUUID } from "crypto";
import { neon } from "@neondatabase/serverless";

const BASE = "http://localhost:3007";
const ADMIN_KEY = process.env.ADMIN_API_KEY ?? "dev-local-admin";
const sql = neon(process.env.DATABASE_URL!);
const sessionId = randomUUID();
console.log(`Session: ${sessionId}`);

// Mixed answers — creates genuine uncertainty in attention_shape (G1=narrow-deep but D1.2=wide-shifting)
// and friction_response (D3.1=solo-push vs D3.2=avoid = mixed signals → hypothesis tier)
// All values are valid NODE_TEXTS keys (see lib/graph/hdg.ts).
const submitResp = await fetch(`${BASE}/api/assessment/submit`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sessionId, childName: "Arjun", ageBand: "10-11", gender: "boy",
    concerns: ["homework"],
    worryFollowup: "He starts the homework but abandons it the moment it gets hard",
    variant: "control",
    answers: {
      G1:"narrow-deep",   G2:"novelty",    G3:"steady-hand",
      "D1.1":"narrow-deep","D1.2":"wide-shifting",              // mixed attention_shape → uncertain
      "D2.1":"mastery","D2.2":"novelty","D2.3":"autonomy","D2.confirm":"mastery",
      "D3.1":"solo-push","D3.2":"avoid","D3.3":"support-seek","D3.confirm":"avoid", // mixed friction → uncertain
      P1:"steady-hand",P2:"quick-fixer",
      "D5.1":"task-escape","D5.2":"task-escape",
      R1:"responsive",R2:"responsive",R3:"responsive",
      "D6.1":"sensory-quiet","D6.2":"cognitive-displacement","D6.3":"sensory-quiet","D6.confirm":"sensory-quiet",
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
if (!submitResp.ok) { console.error("Submit failed:", await submitResp.json()); process.exit(1); }
console.log(`Submit: 200`);

await sql`UPDATE assessments SET parent_name = 'Priya', email = 'priya@example.com' WHERE session_id = ${sessionId}::uuid`;

// Try up to 3 times
for (let i = 1; i <= 3; i++) {
  const genResp = await fetch(`${BASE}/api/report/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ADMIN_KEY}` },
    body: JSON.stringify({ sessionId }),
  });
  const text = await genResp.text();
  let gj: { moments?: {title:string;body:string}[]; archetype?: string; parent_instinct?: string; error?: string; failures?: {check:string;moment_id:string;reason:string}[]; cached?: boolean };
  try { gj = JSON.parse(text); } catch { console.log("Raw:", text.slice(0,500)); process.exit(1); }

  if (gj.cached) { console.log("Cached (unexpected)"); process.exit(1); }
  if (!genResp.ok) {
    console.log(`Attempt ${i} failed: ${JSON.stringify(gj.failures)}`);
    if (i === 3) process.exit(1);
    continue;
  }
  console.log(`✓ Attempt ${i} — archetype=${gj.archetype}  instinct=${gj.parent_instinct}`);
  const moments = gj.moments ?? [];
  console.log(`\n── Generated moments (${moments.length}) ──`);
  for (const m of moments) { console.log(`\n[${m.title}]\n${m.body}`); }
  process.exit(0);
}
process.exit(1);
