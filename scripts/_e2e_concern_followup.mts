import { randomUUID } from "crypto";
import { neon } from "@neondatabase/serverless";

const BASE = "http://localhost:3007";
const ADMIN_KEY = process.env.ADMIN_API_KEY ?? "dev-local-admin";
const sql = neon(process.env.DATABASE_URL!);
const sessionId = randomUUID();
console.log(`Session: ${sessionId}`);

const submitResp = await fetch(`${BASE}/api/assessment/submit`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sessionId, childName: "Arjun", ageBand: "10-11", gender: "boy",
    concerns: ["homework"],
    worryFollowup: "He just stares at the page and says he doesn't know where to start",
    variant: "control",
    answers: {
      G1:"narrow-deep",   G2:"novelty",    G3:"steady-hand",
      "D1.1":"narrow-deep","D1.2":"wide-shifting",
      "D2.1":"mastery","D2.2":"mastery","D2.3":"novelty","D2.confirm":"mastery",
      "D3.1":"avoid",  "D3.2":"avoid",  "D3.3":"avoid","D3.confirm":"avoid",
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
  }),
});
if (!submitResp.ok) { console.error("Submit failed:", await submitResp.json()); process.exit(1); }
console.log(`Submit: 200`);

await sql`UPDATE assessments SET parent_name = 'Priya', email = 'priya@example.com' WHERE session_id = ${sessionId}::uuid`;
console.log(`parent_name set`);

const genResp = await fetch(`${BASE}/api/report/generate`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ADMIN_KEY}` },
  body: JSON.stringify({ sessionId }),
});
const text = await genResp.text();
let gj: Record<string, unknown>;
try { gj = JSON.parse(text); } catch { console.log("Raw:", text.slice(0, 500)); process.exit(1); }

if (!genResp.ok) {
  console.log(`Generate failed (${genResp.status}):`, JSON.stringify(gj, null, 2));
  process.exit(1);
}

console.log(`Generate: ${genResp.status} reportId=${gj.reportId} cached=${gj.cached}`);

// Fetch and print the moments
const rows = await sql`
  SELECT narrative_moments, archetype, parent_instinct
  FROM reports
  WHERE id = ${gj.reportId as string}::uuid
  LIMIT 1
`;
if (!rows.length) { console.log("No report row found"); process.exit(1); }

const { narrative_moments: moments, archetype, parent_instinct } = rows[0] as {
  narrative_moments: { moment_id: string; section: string; content: string }[];
  archetype: string;
  parent_instinct: string;
};
console.log(`\nArchetype: ${archetype} | Instinct: ${parent_instinct}\n`);
for (const m of moments) {
  console.log(`── ${m.section} (${m.moment_id}) ──`);
  console.log(m.content);
  console.log();
}
