import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { tallyDimension, scoreAssessment, Dimensions } from "@/lib/engine/scorer";
import { buildHdg } from "@/lib/graph/hdg";
import { buildBehaviourGraph } from "@/lib/graph/behaviour-graph";
import { buildBehaviourSignature } from "@/lib/graph/signature";
import { buildConfidenceVector } from "@/lib/graph/confidence";
import { assertBootGuards } from "@/lib/boot-guard";

assertBootGuards();

const ALL_DIMENSIONS = [
  "attention_shape",
  "reward_driver",
  "friction_response",
  "parent_instinct",
  "attention_competition",
  "recharge_type",
] as const;

// Max possible data points (3 per dimension × 6 dimensions = 18)
const MAX_DATA_POINTS = 18;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sessionId,
      childName,
      ageBand,
      gender,
      answers,
      questionSequence,
      concerns,
    } = body as {
      sessionId: string;
      childName: string;
      ageBand: string;
      gender: string | null;
      answers: Record<string, string>;
      questionSequence: Array<{ id: string; dimension: string }>;
      concerns?: string[];
    };

    if (!sessionId || !ageBand || !answers || !questionSequence) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Build per-dimension answer arrays (in question-asked order)
    const dimAnswers: Record<string, string[]> = {};
    for (const { id, dimension } of questionSequence) {
      if (answers[id] !== undefined) {
        if (!dimAnswers[dimension]) dimAnswers[dimension] = [];
        dimAnswers[dimension].push(answers[id]);
      }
    }

    // Tally each dimension
    const dimensions: Dimensions = {} as Dimensions;
    for (const dim of ALL_DIMENSIONS) {
      const arr = dimAnswers[dim];
      if (!arr || arr.length === 0) {
        // Should not happen in normal flow, but guard defensively
        dimensions[dim] = { value: "unknown", consistency: 0, data_points: 0, winning_votes: 0 };
      } else {
        dimensions[dim] = tallyDimension(arr);
      }
    }

    const hdg = buildHdg(answers);
    const bg  = buildBehaviourGraph(hdg);
    const sig = buildBehaviourSignature(hdg, bg);
    const cv  = buildConfidenceVector(hdg, bg, sig);

    const scoring = scoreAssessment(dimensions, MAX_DATA_POINTS, cv.overall_confidence);

    // data_richness and confidence are internal only — logged, never returned to client
    console.log(`[assessment] session=${sessionId} data_richness=${scoring.data_richness.toFixed(3)} overall_confidence=${cv.overall_confidence.toFixed(3)}`);

    const sql = getSql();

    await sql`
      INSERT INTO assessments (
        session_id, child_name, age_band, child_gender, answers, dimensions,
        archetype, parent_pattern,
        archetype_fit_tier, parent_instinct_fit_tier,
        axes, weakest_two,
        honest_flag, honest_trigger,
        confidence_vector,
        concerns
      ) VALUES (
        ${sessionId}::uuid,
        ${childName || null},
        ${ageBand},
        ${gender ?? null},
        ${JSON.stringify(answers)}::jsonb,
        ${JSON.stringify(dimensions)}::jsonb,
        ${scoring.archetype},
        ${scoring.parent_pattern},
        ${scoring.archetype_fit_tier},
        ${scoring.parent_instinct_fit_tier},
        ${JSON.stringify(scoring.axes)}::jsonb,
        ${scoring.weakest_two},
        ${scoring.honest_flag},
        ${scoring.honest_trigger},
        ${JSON.stringify(cv)}::jsonb,
        ${concerns ?? []}
      )
    `;

    // Fire assessment_complete event (fire-and-forget)
    sql`
      INSERT INTO funnel_events (event_type, session_id, metadata)
      VALUES ('assessment_complete', ${sessionId}::uuid, ${JSON.stringify({ archetype: scoring.archetype })}::jsonb)
    `.catch((e: unknown) => console.warn("[funnel] assessment_complete:", (e as Error).message));

    // Eager auto-generation: trigger the narrative report pipeline (fire-and-forget).
    // The auto-generate route checks the master switch, phase gate, and generation cap —
    // so calling it unconditionally here is safe. Errors are swallowed; the parent still
    // sees the static ReportView if generation fails or is disabled.
    const autoGenUrl = new URL("/api/internal/report/auto-generate", req.nextUrl.origin);
    fetch(autoGenUrl.toString(), {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "X-Internal-Secret": process.env.INTERNAL_API_SECRET ?? "",
      },
      body: JSON.stringify({ sessionId }),
    }).catch((e: unknown) => console.warn("[auto-generate] trigger failed:", (e as Error).message));

    // Return scoring (but NEVER honest_flag or honest_trigger — Gate 3)
    return NextResponse.json({
      archetype: scoring.archetype,
      parent_pattern: scoring.parent_pattern,
      axes: scoring.axes,
      weakest_two: scoring.weakest_two,
    });
  } catch (e) {
    console.error("[assessment/submit]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
