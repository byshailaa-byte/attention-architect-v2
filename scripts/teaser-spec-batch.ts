/**
 * Teaser spec fix validation batch — generates 10 m_teaser moments with synthetic
 * evidence, then checks whether the bridge sentence (sentence 2) draws from G1/G2
 * evidence rather than paraphrasing the parent's follow-up answer.
 *
 * What changed: G1/G2 evidence is now REQUIRED for the bridge; follow-up answer is
 * now OPENING REFLECTION ONLY. This batch validates that the new spec actually changes
 * behaviour.
 *
 * Run: npx tsx scripts/teaser-spec-batch.ts
 */

import * as dotenv from "dotenv";
import path from "path";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { buildHdg } from "../lib/graph/hdg";
import { buildBehaviourGraph } from "../lib/graph/behaviour-graph";
import { buildBehaviourSignature } from "../lib/graph/signature";
import { buildConfidenceVector } from "../lib/graph/confidence";
import { buildFamilyAttentionLoop } from "../lib/graph/loop";
import { scoreAssessment, tallyDimension } from "../lib/engine/scorer";
import type { Dimensions } from "../lib/engine/scorer";
import { buildNarrativeContext, type NarrativeContext } from "../lib/narrative/context";
import { generateMoment, type MomentSpec } from "../lib/narrative/generate-moment";
import { CONCERN_CARD_LABELS } from "../lib/concerns";
import type { HdgNode } from "../lib/graph/types";

const ALL_DIMENSIONS = [
  "attention_shape", "reward_driver", "friction_response",
  "parent_instinct", "attention_competition", "recharge_type",
] as const;

const MAX_DATA_POINTS = 18;
const TEASER_FIXED_CLOSE = "Patterns like this tend to get more workable the earlier they're named clearly — that's just how habits settle, for kids and adults alike.";

// Jaccard similarity (same logic as Check 19 in checks.ts)
function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 3)
  );
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter(t => b.has(t)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

// Extract bridge sentence (sentence 2 of the teaser prose, before TEASER_FIXED_CLOSE)
function extractBridge(content: string): string | null {
  const prose = content.includes("\n\n") ? content.split("\n\n")[0].trim() : content.trim();
  const sentences = prose.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  return sentences.length >= 2 ? sentences[1] : null;
}

// 10 test cases: varied concerns, follow-ups, and G1/G2 evidence
// The follow-up describes what the parent sees; G1/G2 describe specific behaviour patterns
// the model should draw from for the bridge (something the parent didn't already say).
const TEST_CASES = [
  {
    label: "T1",
    concern: "homework",
    worryFollowup: "She sits at the table for an hour but barely gets anything done — there are tears before we've even started.",
    g1: "child gets a snack request → starts a 20-minute detour from the task (homework context)",
    g2: "parent repeats the instruction three times → child complies briefly then re-engages distraction (homework context)",
  },
  {
    label: "T2",
    concern: "screens",
    worryFollowup: "The second I say 'one more minute' he's already negotiating for another 30.",
    g1: "screen transition announced → child argues the transition was unfair (screen context)",
    g2: "device removed → child cannot self-direct for at least 10 minutes afterward (transition context)",
  },
  {
    label: "T3",
    concern: "reminders",
    worryFollowup: "I've said 'shoes on' so many times today I've lost count, and she hasn't moved.",
    g1: "parent asks once → child shows no behavioural response (routine context)",
    g2: "third reminder → child shows irritation without changing behaviour (routine context)",
  },
  {
    label: "T4",
    concern: "giveup",
    worryFollowup: "If anything feels hard in the first 30 seconds he just puts it down and says he can't do it.",
    g1: "novel task begins → child offers verbal self-dismissal before attempting (challenge context)",
    g2: "encouragement given → child re-engages for less than 2 minutes before stopping (effort context)",
  },
  {
    label: "T5",
    concern: "confidence",
    worryFollowup: "She compares herself to her friends constantly — 'they're all better than me at everything'.",
    g1: "peer comparison mentioned → child withdraws from participation (social context)",
    g2: "achievement acknowledged by adult → child dismisses it or attributes it to luck (recognition context)",
  },
  {
    label: "T6",
    concern: "finish",
    worryFollowup: "He has six half-finished drawings in his room and a Lego set opened last week he hasn't touched since.",
    g1: "new activity proposed → child immediately disengages from current task (transition context)",
    g2: "unfinished task revisited → child shows resistance and changes subject (persistence context)",
  },
  {
    label: "T7",
    concern: "homework",
    worryFollowup: "We fight about starting for 45 minutes, and then once he's in it he's fine — but that lead-up destroys the evening.",
    g1: "homework initiation requested → child uses delay tactics averaging 20+ minutes (homework context)",
    g2: "parent escalates tone → child finally begins but withdraws emotionally for the session (compliance context)",
  },
  {
    label: "T8",
    concern: "screens",
    worryFollowup: "She doesn't want to do anything that isn't her tablet — books, friends, everything else is boring.",
    g1: "non-screen activity suggested → child rates it as boring without trying (engagement context)",
    g2: "extended screen session → child shows irritability when asked to transition to any alternative (reward context)",
  },
  {
    label: "T9",
    concern: "reminders",
    worryFollowup: "By the third reminder I feel like I'm nagging — and then I feel guilty about it too.",
    g1: "parent gives first instruction → no observable acknowledgment (routine context)",
    g2: "parent repeats → child responds with verbal compliance but no action within 5 minutes (compliance context)",
  },
  {
    label: "T10",
    concern: "other",
    worryFollowup: "She seems like she's somewhere else even when she's sitting right in front of me — like the lights are on but nobody's home.",
    g1: "direct question asked → child requires 3+ repetitions before orienting to speaker (attention context)",
    g2: "calm, undemanding environment → child still fails to sustain attention on self-chosen activity beyond 8 minutes (attention context)",
  },
];

const sql = neon(process.env.DATABASE_URL!);

async function loadBaselineSession(): Promise<NarrativeContext> {
  // Pull one real session to use as the structural baseline (archetype, sig, loop, etc.)
  // We override concerns, worryFollowup, and G1/G2 nodes per test case.
  const rows = (await sql`
    SELECT
      id, child_name, age_band, child_gender, parent_name,
      archetype, parent_pattern, archetype_fit_tier, parent_instinct_fit_tier,
      concerns, answers, dimensions AS dimensions_json, weakest_two
    FROM assessments
    WHERE answers != '{}'::jsonb AND archetype IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1
  `) as unknown as {
    id: string;
    child_name: string | null;
    age_band: string;
    child_gender: string | null;
    parent_name: string;
    archetype: string;
    parent_pattern: string;
    archetype_fit_tier: string | null;
    parent_instinct_fit_tier: string | null;
    concerns: string[];
    answers: Record<string, string>;
    dimensions_json: Record<string, { value: string; consistency: number; data_points: number; winning_votes: number }>;
    weakest_two: string[];
  }[];

  const row = rows[0];
  const answers = row.answers;
  const dimensions: Dimensions = {} as Dimensions;
  for (const dim of ALL_DIMENSIONS) {
    const stored = row.dimensions_json[dim];
    if (stored) {
      dimensions[dim] = stored;
    } else {
      const arr: string[] = [];
      for (const [qId, val] of Object.entries(answers)) {
        if (qId.startsWith(dim.split("_")[0])) arr.push(val);
      }
      dimensions[dim] = arr.length > 0
        ? tallyDimension(arr)
        : { value: "unknown", consistency: 0, data_points: 0, winning_votes: 0 };
    }
  }

  const hdg  = buildHdg(answers);
  const bg   = buildBehaviourGraph(hdg);
  const sig  = buildBehaviourSignature(hdg, bg);
  const cv   = buildConfidenceVector(hdg, bg, sig);
  const loop = buildFamilyAttentionLoop(hdg, bg, sig);
  const scoring = scoreAssessment(dimensions, MAX_DATA_POINTS, cv.overall_confidence);

  return buildNarrativeContext(
    {
      child_name:               row.child_name,
      age_band:                 row.age_band,
      child_gender:             row.child_gender,
      parent_name:              row.parent_name,
      archetype:                row.archetype,
      archetype_fit_tier:       row.archetype_fit_tier ?? scoring.archetype_fit_tier,
      parent_pattern:           row.parent_pattern,
      parent_instinct_fit_tier: row.parent_instinct_fit_tier ?? scoring.parent_instinct_fit_tier,
    },
    hdg, bg, sig, loop, cv, scoring,
  );
}

function buildSyntheticG1G2(g1Text: string, g2Text: string, baseHdgNodes: HdgNode[]): HdgNode[] {
  // Remove any existing G1/G2 nodes, then add synthetic ones
  const otherNodes = baseHdgNodes.filter(n => n.source_question !== "G1" && n.source_question !== "G2");

  // Parse "trigger → choice (context)" format used by evidenceLines
  function parseEvidenceLine(raw: string, question: string, id: string): HdgNode {
    const match = raw.match(/^(.+?)\s*→\s*(.+?)\s*\((.+?)\s*context\)$/);
    if (match) {
      return { id, actor: "child", trigger: match[1].trim(), choice: match[2].trim(), source_question: question, source_value: "batch_test", context: match[3].trim() as never };
    }
    // Fallback: treat whole string as trigger
    return { id, actor: "child", trigger: raw, choice: "observed", source_question: question, source_value: "batch_test", context: "general" as never };
  }

  return [
    ...otherNodes,
    parseEvidenceLine(g1Text, "G1", "batch_g1"),
    parseEvidenceLine(g2Text, "G2", "batch_g2"),
  ];
}

function buildTeaserSpec(
  worryLabel: string,
  worryFollowup: string,
  g1EvidenceLine: string,
  g2EvidenceLine: string,
): MomentSpec {
  return {
    momentId: "m_teaser",
    momentType: "recognition",
    section: "Teaser",
    purpose: "pre-payment recognition teaser — open by reflecting the parent's stated worry, then bridge to one new detail from G1/G2 evidence that the follow-up answer did not already say; recognition only, no explanation",
    emotionalObjective: "precise recognition without resolution",
    confidenceTier: "confirmed",
    behaviourNodeRefs: [],
    humanDecisionRefs: ["batch_g1", "batch_g2"],
    evidenceText: [
      `Parent's stated worry (use this natural phrasing, not the raw key): ${worryLabel}`,
      `Parent's follow-up answer — for the OPENING REFLECTION only, not the bridge: ${worryFollowup}`,
      `[REQUIRED for bridge sentence — this is where the new, unstated detail must come from]: ${g1EvidenceLine}`,
      `[REQUIRED for bridge sentence — this is where the new, unstated detail must come from]: ${g2EvidenceLine}`,
    ],
    additionalInstruction:
      `EVIDENCE INPUTS:\n` +
      `- worryLabel: "${worryLabel}" — human-readable concern description\n` +
      `- worryFollowupAnswer: the parent's own words — used for the OPENING reflection only, not the bridge\n` +
      `- G1/G2 evidence nodes: REQUIRED for the bridge sentence — this is where the new, unstated detail must come from\n` +
      `Do not draw from anything else in the FAMILY CONTEXT block.\n\n` +
      `STRUCTURE:\n` +
      `1. Open by reflecting "${worryLabel}" back in your own plain words — ` +
      `by DESCRIBING THE SITUATION, not by narrating the parent's act of naming or carrying the concern. ` +
      `The opening sentence must show what actually happens in the house, not comment on what the parent noticed or named.\n` +
      `BANNED OPENING CONSTRUCTIONS — any sentence matching these patterns must be rewritten:\n` +
      `  • "you came here worried about…" or "you came here with…"\n` +
      `  • "the word you landed on…" or "the word you brought…"\n` +
      `  • "the worry you brought…" or "the concern you named…"\n` +
      `  • "you've named it" / "you named it exactly" / "name it exactly"\n` +
      `  • Any construction where the first move is to observe that the parent noticed, named, or carried the concern.\n` +
      `RIGHT SHAPE — describe the pattern directly, from inside the situation: ` +
      `"Homework in your house isn't just hard — it's a fight on every front." ` +
      `"Screens always win." "Every reminder loops back to annoyance." ` +
      `The parent should feel recognised because the situation is described, not because their act of naming it is acknowledged.\n` +
      `2. Bridge to ONE specific detail from the scoped G1/G2 evidence that ` +
      `the parent's follow-up answer did NOT already state. This is required, not optional — ` +
      `do not skip it even if the follow-up answer already sounds specific. ` +
      `Test before writing: if this sentence could be produced by only reading the follow-up ` +
      `answer and never looking at the evidence, it is wrong — rewrite it. ` +
      `The goal is genuine recognition ("how did they know that"), not an elegant echo of ` +
      `what the parent already told us.\n` +
      `3. End with a plain, undramatic gesture toward the full report — acknowledging that what's ` +
      `actually going on, and what tends to help, is in the report. ` +
      `Do not write any sentence about patterns or habits settling — that gets appended after your output and must not be pre-empted.\n\n` +
      `HARD RULES (same as every other moment, plus these):\n` +
      `- Never name any of the 8 child archetypes or 4 parent instinct patterns.\n` +
      `- Never explain WHY the pattern happens — recognition only.\n` +
      `- Never predict what will happen to this child at any future age or in any future scenario.\n` +
      `- Do not address the parent by name anywhere in your output.\n` +
      `Output the moment text only. No preamble, no labels, no quotation marks.`,
    wordTarget: "2–3 sentences (40–70 words).",
  };
}

async function run() {
  console.log("[teaser-batch] Loading baseline session from dev DB...");
  const baseCtx = await loadBaselineSession();
  console.log(`[teaser-batch] Baseline: archetype=${baseCtx.archetype} | ${TEST_CASES.length} test cases\n`);

  const results: {
    label: string;
    concern: string;
    worryFollowup: string;
    content: string;
    bridge: string | null;
    jaccard: number;
    passCheck: boolean;
  }[] = [];

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    console.log(`[${tc.label}] Generating... (concern=${tc.concern})`);

    const worryLabel = CONCERN_CARD_LABELS[tc.concern] ?? "what you told us";

    // Build context with synthetic G1/G2 nodes
    const syntheticHdg = {
      ...baseCtx.hdg,
      nodes: buildSyntheticG1G2(tc.g1, tc.g2, baseCtx.hdg.nodes),
    };
    const testCtx: NarrativeContext = {
      ...baseCtx,
      concerns: [tc.concern],
      worryFollowup: tc.worryFollowup,
      hdg: syntheticHdg,
    };

    const spec = buildTeaserSpec(worryLabel, tc.worryFollowup, tc.g1, tc.g2);

    try {
      const moment = await generateMoment(spec, testCtx);
      const fullContent = moment.content + "\n\n" + TEASER_FIXED_CLOSE;
      const bridge = extractBridge(moment.content);
      const sim = bridge
        ? jaccard(tokenize(bridge), tokenize(tc.worryFollowup))
        : 0;
      const passCheck = sim < 0.40;

      results.push({ label: tc.label, concern: tc.concern, worryFollowup: tc.worryFollowup, content: fullContent, bridge, jaccard: sim, passCheck });
      console.log(`[${tc.label}] Done — Jaccard bridge/followup: ${sim.toFixed(2)} → ${passCheck ? "PASS" : "FAIL (paraphrase)"}\n`);
    } catch (err) {
      console.error(`[${tc.label}] ERROR:`, err instanceof Error ? err.message : err);
      results.push({ label: tc.label, concern: tc.concern, worryFollowup: tc.worryFollowup, content: "", bridge: null, jaccard: 0, passCheck: false });
    }
  }

  // Print full report
  console.log("\n" + "=".repeat(80));
  console.log("BATCH RESULTS — m_teaser spec fix validation");
  console.log("=".repeat(80) + "\n");

  for (const r of results) {
    const status = r.passCheck ? "✓ PASS" : "✗ FAIL";
    console.log(`${r.label} [${r.concern}] — bridge Jaccard: ${r.jaccard.toFixed(2)} → ${status}`);
    console.log(`  Follow-up: "${r.worryFollowup.substring(0, 80)}${r.worryFollowup.length > 80 ? "…" : ""}"`);
    console.log(`  Bridge:    "${r.bridge ?? "(none extracted)"}"`);
    console.log();
    console.log("  FULL TEASER:");
    for (const line of r.content.split("\n")) {
      console.log(`    ${line}`);
    }
    console.log();
    console.log("-".repeat(80));
    console.log();
  }

  const passed = results.filter(r => r.passCheck).length;
  console.log(`SUMMARY: ${passed}/${results.length} bridge sentences passed (Jaccard < 0.40)`);
  if (passed < results.length) {
    const fails = results.filter(r => !r.passCheck);
    console.log(`FAILURES: ${fails.map(r => r.label).join(", ")}`);
  }
}

run().catch(e => {
  console.error("[teaser-batch] Fatal:", e);
  process.exit(1);
});
