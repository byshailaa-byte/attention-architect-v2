import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";

const PROD = "https://attention-architect-v2.vercel.app";
const sessionId = randomUUID();
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET!;
const sql = neon(process.env.DATABASE_URL_PROD!);

console.log(`\nSession: ${sessionId}`);

// ── Step 1: Submit assessment ────────────────────────────────────────────────
const submitBody = {
  sessionId,
  childName: "Test Child",
  ageBand: "10-11",
  gender: "boy",
  concerns: ["homework"],
  worryFollowup: "He just stares at the page and says he doesn't know where to start",
  variant: "control",
  answers: {
    "G1": "narrow-deep",
    "G2": "novelty",
    "G3": "steady-hand",
    "D1.1": "narrow-deep",
    "D1.2": "narrow-deep",
    "D2.1": "intrinsic",
    "D2.2": "intrinsic",
    "D2.3": "intrinsic",
    "D2.confirm": "intrinsic",
    "D3.1": "resist",
    "D3.2": "resist",
    "D3.3": "resist",
    "D3.confirm": "resist",
    "P1": "steady-hand",
    "P2": "steady-hand",
    "D5.1": "novelty",
    "D5.2": "novelty",
    "R1": "bounce-back",
    "R2": "bounce-back",
    "R3": "bounce-back",
    "D6.1": "solo",
    "D6.2": "solo",
    "D6.3": "solo",
    "D6.confirm": "solo",
  },
  questionSequence: [
    { id: "G1", dimension: "attention_shape" },
    { id: "G2", dimension: "attention_competition" },
    { id: "G3", dimension: "parent_instinct" },
    { id: "D1.1", dimension: "attention_shape" },
    { id: "D1.2", dimension: "attention_shape" },
    { id: "D2.1", dimension: "reward_driver" },
    { id: "D2.2", dimension: "reward_driver" },
    { id: "D2.3", dimension: "reward_driver" },
    { id: "D2.confirm", dimension: "reward_driver" },
    { id: "D3.1", dimension: "friction_response" },
    { id: "D3.2", dimension: "friction_response" },
    { id: "D3.3", dimension: "friction_response" },
    { id: "D3.confirm", dimension: "friction_response" },
    { id: "P1", dimension: "parent_instinct" },
    { id: "P2", dimension: "parent_instinct" },
    { id: "D5.1", dimension: "attention_competition" },
    { id: "D5.2", dimension: "attention_competition" },
    { id: "R1", dimension: "recovery_response" },
    { id: "R2", dimension: "recovery_response" },
    { id: "R3", dimension: "recovery_response" },
    { id: "D6.1", dimension: "recharge_type" },
    { id: "D6.2", dimension: "recharge_type" },
    { id: "D6.3", dimension: "recharge_type" },
    { id: "D6.confirm", dimension: "recharge_type" },
  ],
};

const submitResp = await fetch(`${PROD}/api/assessment/submit`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(submitBody),
});
const submitJson = await submitResp.json();
console.log(`\nSubmit status: ${submitResp.status}`);
if (!submitResp.ok) {
  console.error("Submit failed:", submitJson);
  process.exit(1);
}

// We need parent_name set for the generate route to work (it checks report is "claimed")
// Set it directly in prod DB
await sql`UPDATE assessments SET parent_name = 'Test Parent' WHERE session_id = ${sessionId}::uuid`;
console.log("parent_name set");

// ── Step 2: Trigger auto-generate ───────────────────────────────────────────
const genResp = await fetch(`${PROD}/api/internal/report/auto-generate`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-internal-secret": INTERNAL_SECRET,
  },
  body: JSON.stringify({ sessionId }),
});
const genJson = await genResp.json();
console.log(`\nAuto-generate status: ${genResp.status}`);
console.log("Response:", JSON.stringify(genJson, null, 2));

// ── Step 3: Read moments from prod DB ───────────────────────────────────────
const rows = await sql`
  SELECT r.moments, r.archetype, r.parent_instinct, r.status,
         a.concerns, a.worry_followup
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  WHERE a.session_id = ${sessionId}::uuid
  ORDER BY r.generated_at DESC
  LIMIT 1
` as { moments: unknown; archetype: string; parent_instinct: string; status: string; concerns: string[]; worry_followup: string | null }[];

if (rows.length === 0) {
  console.log("\nNo report found in DB yet.");
  process.exit(0);
}

const row = rows[0];
console.log(`\nArchetype: ${row.archetype} | Instinct: ${row.parent_instinct} | Status: ${row.status}`);
console.log(`Concerns stored: ${JSON.stringify(row.concerns)}`);
console.log(`worry_followup stored: "${row.worry_followup}"`);

const moments = row.moments as { title: string; body: string }[];
console.log(`\n── Generated moments (${moments.length}) ──`);
for (const m of moments) {
  console.log(`\n[${m.title}]`);
  console.log(m.body);
}

process.exit(0);
