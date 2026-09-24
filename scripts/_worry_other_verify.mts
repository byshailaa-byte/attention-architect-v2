import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";

const BASE = "http://localhost:3007";
const sql  = neon(process.env.DATABASE_URL!);

const BASE_BODY = {
  ageBand: "10-11", gender: null, childName: "TestWO",
  answers: {
    G1:"narrow-deep", G2:"novelty", G3:"steady-hand",
    "D1.1":"narrow-deep","D1.2":"wide-shifting",
    "D2.1":"mastery","D2.2":"mastery","D2.3":"novelty","D2.confirm":"mastery",
    "D3.1":"avoid","D3.2":"avoid","D3.3":"avoid","D3.confirm":"avoid",
    P1:"steady-hand", P2:"quick-fixer",
    "D5.1":"task-escape","D5.2":"task-escape",
    R1:"responsive", R2:"responsive", R3:"responsive",
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
  concerns: ["screens"],
};

async function submit(extra: Record<string, unknown>) {
  const sessionId = randomUUID();
  const body = { ...BASE_BODY, sessionId, ...extra };
  const r = await fetch(`${BASE}/api/assessment/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { sessionId, status: r.status, json: await r.json() };
}

async function readRow(sid: string) {
  const rows = await sql`
    SELECT worry_followup, worry_followup_other
    FROM assessments WHERE session_id = ${sid}::uuid
  ` as { worry_followup: string | null; worry_followup_other: string | null }[];
  return rows[0] ?? null;
}

// ── Case a: fixed option ───────────────────────────────────────────────────
{
  console.log("\n=== Case a: fixed option — worry_followup set, _other null ===");
  const { sessionId, status, json } = await submit({
    worryFollowup: "They delay starting as long as possible",
  });
  console.log("status:", status, "archetype:", json.archetype ?? json.error);
  const row = await readRow(sessionId);
  console.log("DB row:", row);
}

// ── Case b: Something else with text ──────────────────────────────────────
{
  console.log("\n=== Case b: Something else + typed text ===");
  const { sessionId, status, json } = await submit({
    worryFollowup: "Something else",
    worryFollowupOther: "  They just give up after 30 seconds  ",
  });
  console.log("status:", status, "archetype:", json.archetype ?? json.error);
  const row = await readRow(sessionId);
  console.log("DB row:", row);
  // Expect: worry_followup = "Something else", worry_followup_other = "They just give up after 30 seconds" (trimmed)
}

// ── Case c: Something else, no text ───────────────────────────────────────
{
  console.log("\n=== Case c: Something else + empty text → _other null ===");
  const { sessionId, status, json } = await submit({
    worryFollowup: "Something else",
    worryFollowupOther: "",
  });
  console.log("status:", status, "archetype:", json.archetype ?? json.error);
  const row = await readRow(sessionId);
  console.log("DB row:", row);
  // Expect: worry_followup = "Something else", worry_followup_other = null
}

// ── Case d: 300 chars — must reject ───────────────────────────────────────
{
  console.log("\n=== Case d: 300-char text → 400 ===");
  const longText = "a".repeat(300);
  const { status, json } = await submit({
    worryFollowup: "Something else",
    worryFollowupOther: longText,
  });
  console.log("status:", status, "error:", json.error);
  // Expect 400 with error message about 200 chars
}

// ── Case e: serialiseContext via direct import ─────────────────────────────
{
  console.log("\n=== Case e: serialiseContext output with typed text ===");
  // Build a minimal context object directly to test serialiseContext
  const { buildNarrativeContext, serialiseContext } = await import("../lib/narrative/context.js");
  const { buildHdg }               = await import("../lib/graph/hdg.js");
  const { buildBehaviourGraph }    = await import("../lib/graph/behaviour-graph.js");
  const { buildBehaviourSignature } = await import("../lib/graph/signature.js");
  const { buildConfidenceVector }  = await import("../lib/graph/confidence.js");
  const { buildFamilyAttentionLoop } = await import("../lib/graph/loop.js");
  const { scoreAssessment }        = await import("../lib/engine/scorer.js");

  const answers: Record<string,string> = {
    G1:"narrow-deep", G2:"novelty", G3:"steady-hand",
    "D1.1":"narrow-deep","D1.2":"wide-shifting",
    "D2.1":"mastery","D2.2":"mastery","D2.3":"novelty","D2.confirm":"mastery",
    "D3.1":"avoid","D3.2":"avoid","D3.3":"avoid","D3.confirm":"avoid",
    P1:"steady-hand", P2:"quick-fixer",
    "D5.1":"task-escape","D5.2":"task-escape",
    R1:"responsive", R2:"responsive", R3:"responsive",
    "D6.1":"sensory-quiet","D6.2":"sensory-quiet","D6.3":"sensory-quiet","D6.confirm":"sensory-quiet",
  };
  const hdg = buildHdg(answers);
  const bg  = buildBehaviourGraph(hdg);
  const sig = buildBehaviourSignature(hdg, bg);
  const cv  = buildConfidenceVector(hdg, bg, sig);
  const loop = buildFamilyAttentionLoop(hdg, bg, sig);
  const scoring = scoreAssessment(
    { attention_shape:{value:"narrow-deep",consistency:1,data_points:3,winning_votes:3},
      reward_driver:{value:"mastery",consistency:1,data_points:4,winning_votes:4},
      friction_response:{value:"avoid",consistency:1,data_points:4,winning_votes:4},
      parent_instinct:{value:"steady-hand",consistency:1,data_points:3,winning_votes:3},
      attention_competition:{value:"novelty",consistency:1,data_points:3,winning_votes:3},
      recharge_type:{value:"sensory-quiet",consistency:1,data_points:4,winning_votes:4},
      recovery_response:{value:"responsive",consistency:1,data_points:3,winning_votes:3},
    } as Parameters<typeof scoreAssessment>[0],
    18, cv.overall_confidence
  );

  const ctx = buildNarrativeContext(
    {
      child_name: "Sam",
      age_band: "10-11",
      child_gender: null,
      parent_name: "Parent",
      archetype: scoring.archetype,
      archetype_fit_tier: scoring.archetype_fit_tier,
      parent_pattern: scoring.parent_pattern,
      parent_instinct_fit_tier: scoring.parent_instinct_fit_tier,
      concerns: ["screens"],
      worry_followup: "Something else",
      worry_followup_other: "My child melts down every single evening",
    },
    hdg, bg, sig, loop, cv, scoring,
  );

  const out = serialiseContext(ctx);
  const relevant = out.split("\n").filter(l =>
    l.includes("concern") || l.includes("worry") || l.includes("Parent's") || l.includes("typed freely")
  );
  console.log("Relevant lines from serialiseContext:");
  for (const l of relevant) console.log(" ", l);
}
