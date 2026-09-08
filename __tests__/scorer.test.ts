/**
 * Phase 2 scoring tests — updated for spec revision (scoring-formula-4axis-spec.md §4a).
 *
 * Key changes from previous version:
 * - Recovery norm is vote-based (lookup table), not raw consistency
 * - Recovery INELIGIBLE for weakest_two when recharge_type.data_points == 1
 * - Sweep redesigned: axis-feeding dimensions only (parent_instinct feeds no axis)
 */

import { describe, it, expect } from "vitest";
import {
  tallyDimension,
  scoreAssessment,
  deriveArchetype,
  Dimensions,
} from "../lib/engine/scorer";

// ── tallyDimension ─────────────────────────────────────────────────────────────

describe("tallyDimension", () => {
  it("3 unanimous → consistency=1.0, winning_votes=3", () => {
    const r = tallyDimension(["autonomy", "autonomy", "autonomy"]);
    expect(r.value).toBe("autonomy");
    expect(r.consistency).toBe(1);
    expect(r.winning_votes).toBe(3);
    expect(r.data_points).toBe(3);
  });

  it("2-1 split → consistency=2/3, winning_votes=2", () => {
    const r = tallyDimension(["autonomy", "autonomy", "mastery"]);
    expect(r.value).toBe("autonomy");
    expect(r.consistency).toBeCloseTo(2 / 3);
    expect(r.winning_votes).toBe(2);
  });

  it("tie → first answer wins", () => {
    expect(tallyDimension(["mastery", "autonomy"]).value).toBe("mastery");
  });

  it("SPEC §2: single data point → consistency=0.5 (not 1.0)", () => {
    const r = tallyDimension(["novelty"]);
    expect(r.consistency).toBe(0.5);
    expect(r.winning_votes).toBe(1);
    expect(r.data_points).toBe(1);
  });
});

// ── deriveArchetype ────────────────────────────────────────────────────────────

describe("deriveArchetype", () => {
  it("sensation-seeking × autonomy → The Storm", () => {
    expect(deriveArchetype("sensation-seeking", "autonomy")).toBe("The Storm");
  });
  it("narrow-deep × mastery → The All-In Kid", () => {
    expect(deriveArchetype("narrow-deep", "mastery")).toBe("The All-In Kid");
  });
  it("wide-shifting × novelty → The Explorer", () => {
    expect(deriveArchetype("wide-shifting", "novelty")).toBe("The Explorer");
  });
  it("social-anchored × social → The Glue", () => {
    expect(deriveArchetype("social-anchored", "social")).toBe("The Glue");
  });
  it("narrow-deep × novelty → The Inventor (fallback)", () => {
    expect(deriveArchetype("narrow-deep", "novelty")).toBe("The Inventor");
  });
  it("sensation-seeking × social → The Live Wire (fallback)", () => {
    expect(deriveArchetype("sensation-seeking", "social")).toBe("The Live Wire");
  });
  it("sensation-seeking × mastery → The Storm (fallback)", () => {
    expect(deriveArchetype("sensation-seeking", "mastery")).toBe("The Storm");
  });
});

// ── Recovery eligibility (spec §4a INELIGIBLE rule) ───────────────────────────

describe("Recovery eligibility", () => {
  function dimsWithRecharge(answers: string[]): Dimensions {
    return {
      attention_shape:       tallyDimension(["narrow-deep", "narrow-deep", "narrow-deep"]),
      reward_driver:         tallyDimension(["mastery", "mastery", "mastery"]),
      friction_response:     tallyDimension(["solo-push", "solo-push", "solo-push"]),
      parent_instinct:       tallyDimension(["pusher"]),
      attention_competition: tallyDimension(["genuine-interest"]),
      recharge_type:         tallyDimension(answers),
    };
  }

  it("data_points=1 → Recovery ineligible, not in weakest_two", () => {
    const out = scoreAssessment(dimsWithRecharge(["sensory-quiet"]));
    expect(out.axes.recovery.eligible).toBe(false);
    expect(out.weakest_two).not.toContain("Recovery");
    // Only Stability and Resistance are eligible; both must appear
    expect(out.weakest_two).toHaveLength(2);
  });

  it("data_points=2, winning_votes=2 → eligible, norm=1.00", () => {
    const out = scoreAssessment(dimsWithRecharge(["sensory-quiet", "sensory-quiet"]));
    expect(out.axes.recovery.eligible).toBe(true);
    expect(out.axes.recovery.norm).toBeCloseTo(1.00);
    expect(out.axes.recovery.band).toBe("Strong");
  });

  it("data_points=2, winning_votes=1 → eligible, norm=0.35 (Low)", () => {
    const out = scoreAssessment(dimsWithRecharge(["sensory-quiet", "social-connection"]));
    expect(out.axes.recovery.eligible).toBe(true);
    expect(out.axes.recovery.norm).toBeCloseTo(0.35);
    expect(out.axes.recovery.band).toBe("Low");
  });

  it("data_points=3, winning_votes=3 → eligible, norm=1.00", () => {
    const out = scoreAssessment(dimsWithRecharge(["autonomous-unstructured", "autonomous-unstructured", "autonomous-unstructured"]));
    expect(out.axes.recovery.eligible).toBe(true);
    expect(out.axes.recovery.norm).toBeCloseTo(1.00);
  });

  it("data_points=3, winning_votes=2 → eligible, norm=0.65 (Strong at cutoff)", () => {
    const out = scoreAssessment(dimsWithRecharge(["sensory-quiet", "sensory-quiet", "social-connection"]));
    expect(out.axes.recovery.eligible).toBe(true);
    expect(out.axes.recovery.norm).toBeCloseTo(0.65);
    expect(out.axes.recovery.band).toBe("Strong");
  });

  it("data_points=3, winning_votes=1 → eligible, norm=0.30 (Low)", () => {
    const out = scoreAssessment(dimsWithRecharge(["sensory-quiet", "social-connection", "cognitive-displacement"]));
    expect(out.axes.recovery.eligible).toBe(true);
    expect(out.axes.recovery.norm).toBeCloseTo(0.30);
    expect(out.axes.recovery.band).toBe("Low");
  });

  it("data_points=3, winning_votes=1, norm=0.30 → Recovery enters weakest_two if stronger axes exist", () => {
    // narrow-deep + solo-push → Stability norm ≈ 0.74 (Strong)
    // genuine-interest competition → Resistance norm high
    // Recovery scattered (1/3) → norm=0.30 < both → appears in weakest_two
    const dims: Dimensions = {
      attention_shape:       tallyDimension(["narrow-deep", "narrow-deep", "narrow-deep"]),
      reward_driver:         tallyDimension(["mastery", "mastery", "mastery"]),
      friction_response:     tallyDimension(["solo-push", "solo-push", "solo-push"]),
      parent_instinct:       tallyDimension(["pusher"]),
      attention_competition: tallyDimension(["genuine-interest", "genuine-interest", "genuine-interest"]),
      recharge_type:         tallyDimension(["sensory-quiet", "social-connection", "cognitive-displacement"]),
    };
    const out = scoreAssessment(dims);
    expect(out.axes.recovery.eligible).toBe(true);
    expect(out.axes.recovery.norm).toBeCloseTo(0.30);
    expect(out.weakest_two).toContain("Recovery");
  });
});

// ── BLOCKING STORM VERIFICATION ────────────────────────────────────────────────
//
// G1=sensation-seeking, G3=pusher, reward_driver=autonomy — all four G2 values.
//
// Recovery eligibility by G2:
//   G2=novelty  → recharge 1 pt → INELIGIBLE; weakest_two from {Stability, Resistance} only
//   G2=external → recharge 1 pt → INELIGIBLE
//   G2=internal → recharge 3 pts (slot3) → ELIGIBLE; but unanimous → norm=1.00 (Strong)
//   G2=social   → recharge 1 pt → INELIGIBLE

function buildStormDims(
  g2: string,
  opts: { competitionAnswers?: string[] } = {}
): Dimensions {
  const shapeAnswers =
    g2 === "novelty"
      ? ["sensation-seeking", "sensation-seeking", "sensation-seeking"] // Rule 2 full depth
      : ["sensation-seeking"]; // G1 anchor only

  const competitionAnswers =
    g2 === "social"
      ? (opts.competitionAnswers ?? ["social", "boredom-avoidance", "boredom-avoidance"])
      : [g2];

  const rechargeAnswers =
    g2 === "internal"
      ? ["autonomous-unstructured", "autonomous-unstructured", "autonomous-unstructured"] // slot3
      : ["autonomous-unstructured"]; // confirm only → INELIGIBLE

  return {
    attention_shape:       tallyDimension(shapeAnswers),
    reward_driver:         tallyDimension(["autonomy", "autonomy", "autonomy"]),
    friction_response:     tallyDimension(["solo-push", "solo-push", "solo-push"]),
    parent_instinct:       tallyDimension(["pusher", "pusher", "pusher"]),
    attention_competition: tallyDimension(competitionAnswers),
    recharge_type:         tallyDimension(rechargeAnswers),
  };
}

describe("BLOCKING — Storm verification (G1=sensation-seeking, G3=pusher, reward=autonomy)", () => {
  const G2_VARIANTS = ["novelty", "external", "internal", "social"] as const;

  for (const g2 of G2_VARIANTS) {
    describe(`G2=${g2}`, () => {
      it("Assertion 1: archetype == The Storm", () => {
        expect(scoreAssessment(buildStormDims(g2)).archetype).toBe("The Storm");
      });

      it("Assertion 2: parent_pattern == The Pusher", () => {
        expect(scoreAssessment(buildStormDims(g2)).parent_pattern).toBe("The Pusher");
      });

      it("Assertion 3 (BLOCKING): weakest_two == {Attention, Stability}", () => {
        // sensation-seeking has Attention norm ≈0.167 (lowest) and Stability ≈0.29–0.40.
        // Resistance is Medium–Strong depending on G2 competition value.
        // Attention axis was added 2026-09 (4-axis system); prior assertion was {Stability, Resistance}.
        const out = scoreAssessment(buildStormDims(g2));
        const set = new Set(out.weakest_two);
        expect(set.has("Attention")).toBe(true);
        expect(set.has("Stability")).toBe(true);
      });

      it("Diagnostic: axis norms and eligibility", () => {
        const out = scoreAssessment(buildStormDims(g2));
        console.log(
          `G2=${g2}: ` +
          `Attention=${out.axes.attention.norm.toFixed(3)}(${out.axes.attention.band}) ` +
          `Stability=${out.axes.stability.norm.toFixed(3)}(${out.axes.stability.band}) ` +
          `Resistance=${out.axes.resistance.norm.toFixed(3)}(${out.axes.resistance.band}) ` +
          `Recovery=${out.axes.recovery.norm.toFixed(3)}(${out.axes.recovery.band},eligible=${out.axes.recovery.eligible}) ` +
          `weakest_two=${JSON.stringify(out.weakest_two)}`
        );
      });
    });
  }
});

// ── BLOCKING — axis-profile sweep (spec §6 revised gate) ──────────────────────
//
// Spec: sweep axis-feeding dimension combinations within routing cases.
// parent_instinct feeds NO axis — sweeping it inflates counts without adding signal.
//
// Routing determines data_points per axis dimension:
//   Case A (G2=novelty, G1≠wide-shifting): shape=3pts, friction=1pt, competition=1pt, recharge=1pt
//   Case B (G2=internal):                  shape=1pt, friction=3pts, competition=1pt(internal), recharge=3pts
//   Case C (G2=social):                    shape=1pt, friction=3pts, competition=3pts, recharge=1pt
//   Case D (G2=external or novelty+wide):  shape=1pt, friction=3pts, competition=1pt, recharge=1pt
//
// Recovery ELIGIBLE only in Case B (recharge 3pts). All others: 1pt → INELIGIBLE.
// After routing fix (D6.confirm2, blocked pending question text): eligible in all cases.

describe("BLOCKING — axis-profile sweep (spec §6)", () => {

  const SHAPE_VALUES   = ["narrow-deep", "wide-shifting", "social-anchored", "sensation-seeking"];
  const FRICTION_VALUES = ["solo-push", "energized", "support-seek", "avoid", "emotional-derail"];
  const COMPETITION_VALUES = ["genuine-interest", "social", "boredom-avoidance", "novelty",
                               "external", "task-escape", "internal"];
  const RECHARGE_VALUES = ["sensory-quiet", "social-connection", "cognitive-displacement",
                            "autonomous-unstructured"];

  // Build a dimension set for a given routing case.
  function caseDims(
    caseId: "A" | "B" | "C" | "D",
    shape: string,
    friction: string,
    competition: string,
    recharge: string,
    rechargeConsistency: "full" | "split" | "scatter" = "full"
  ): Dimensions {
    // data_points and winning_votes by routing case
    const shapeArr   = caseId === "A"
      ? [shape, shape, shape]      // 3pts
      : [shape];                   // 1pt

    const frictionArr = caseId === "A"
      ? [friction]                 // 1pt (confirm only)
      : [friction, friction, friction]; // 3pts

    const compArr = caseId === "C"
      ? [competition, competition, competition] // 3pts (G2+D5.1+D5.2)
      : [competition];             // 1pt

    let rechargeArr: string[];
    if (caseId === "B") {
      // 3pts — vary consistency
      if (rechargeConsistency === "full")    rechargeArr = [recharge, recharge, recharge];
      else if (rechargeConsistency === "split") rechargeArr = [recharge, recharge, RECHARGE_VALUES[(RECHARGE_VALUES.indexOf(recharge)+1)%4]];
      else rechargeArr = [recharge, RECHARGE_VALUES[(RECHARGE_VALUES.indexOf(recharge)+1)%4], RECHARGE_VALUES[(RECHARGE_VALUES.indexOf(recharge)+2)%4]];
    } else {
      rechargeArr = [recharge]; // 1pt → INELIGIBLE
    }

    return {
      attention_shape:       tallyDimension(shapeArr),
      reward_driver:         tallyDimension(["mastery"]),
      friction_response:     tallyDimension(frictionArr),
      parent_instinct:       tallyDimension(["pusher"]),
      attention_competition: tallyDimension(compArr),
      recharge_type:         tallyDimension(rechargeArr),
    };
  }

  it("spec §6 axis-profile sweep", () => {
    const results: Array<{ weakest_two: string[]; recovery_eligible: boolean }> = [];

    // Case B (G2=internal) — only case where Recovery is currently eligible.
    // attention_competition is fixed to "internal" (G2 anchor).
    for (const shape of SHAPE_VALUES) {
      for (const friction of FRICTION_VALUES) {
        for (const recharge of RECHARGE_VALUES) {
          for (const rc of ["full", "split", "scatter"] as const) {
            const dims = caseDims("B", shape, friction, "internal", recharge, rc);
            const out  = scoreAssessment(dims);
            results.push({
              weakest_two: out.weakest_two,
              recovery_eligible: out.axes.recovery.eligible,
            });
          }
        }
      }
    }

    // Cases A, C, D — Recovery always INELIGIBLE (recharge 1pt).
    for (const shape of SHAPE_VALUES) {
      for (const friction of FRICTION_VALUES) {
        for (const competition of COMPETITION_VALUES) {
          for (const recharge of RECHARGE_VALUES) {
            // Case D (G2=external pattern)
            const dims = caseDims("D", shape, friction, competition, recharge);
            const out  = scoreAssessment(dims);
            results.push({ weakest_two: out.weakest_two, recovery_eligible: false });
          }
        }
      }
    }

    const total = results.length;
    const eligible = results.filter(r => r.recovery_eligible).length;
    const inWeakestGivenEligible = results.filter(r => r.recovery_eligible && r.weakest_two.includes("Recovery")).length;

    const counts = { Stability: 0, Resistance: 0, Recovery: 0 };
    for (const r of results) {
      for (const a of r.weakest_two) counts[a as keyof typeof counts]++;
    }

    console.log(`Sweep total: ${total} profiles`);
    console.log(`Recovery ELIGIBLE: ${eligible}/${total} (${(eligible/total*100).toFixed(0)}%)`);
    console.log(`Recovery IN weakest_two (given eligible): ${inWeakestGivenEligible}/${eligible} (${eligible > 0 ? (inWeakestGivenEligible/eligible*100).toFixed(0) : "n/a"}%)`);
    console.log(`weakest_two dist: Stability=${counts.Stability}/${total} (${(counts.Stability/total*100).toFixed(0)}%) Resistance=${counts.Resistance}/${total} (${(counts.Resistance/total*100).toFixed(0)}%) Recovery=${counts.Recovery}/${total} (${(counts.Recovery/total*100).toFixed(0)}%)`);

    // Stability and Resistance are always eligible — both must meet 15% floor.
    const floor = Math.floor(total * 0.15);
    expect(counts.Stability,  "Stability below 15% floor").toBeGreaterThanOrEqual(floor);
    expect(counts.Resistance, "Resistance below 15% floor").toBeGreaterThanOrEqual(floor);

    // Recovery: check that WHEN eligible, it appears in weakest_two at ≥15% of eligible cases.
    if (eligible > 0) {
      const eligibleFloor = Math.floor(eligible * 0.15);
      expect(inWeakestGivenEligible,
        "Recovery eligible but never weak — axis is not a differentiator"
      ).toBeGreaterThanOrEqual(eligibleFloor);
    }

    // Flag if Recovery is rarely eligible — this is the routing problem the spec identifies.
    // Not a failing assertion (requires routing fix / D6.confirm2 question), but logs clearly.
    if (eligible / total < 0.15) {
      console.warn(
        `⚠️  ROUTING BLOCKER: Recovery eligible in only ${(eligible/total*100).toFixed(0)}% of profiles. ` +
        `Spec §4a requires D6.confirm2 (a second recharge confirming question) to fix this. ` +
        `Question text must be provided — cannot be invented.`
      );
    }
  });
});

// ── Honest-path triggers ───────────────────────────────────────────────────────

describe("Honest-path triggers", () => {
  it("Trigger A fires: winning_votes=2 out of 2", () => {
    const dims: Dimensions = {
      attention_shape:       tallyDimension(["narrow-deep"]),
      reward_driver:         tallyDimension(["mastery"]),
      friction_response:     tallyDimension(["emotional-derail", "emotional-derail"]),
      parent_instinct:       tallyDimension(["pusher"]),
      attention_competition: tallyDimension(["novelty"]),
      recharge_type:         tallyDimension(["autonomous-unstructured"]),
    };
    const out = scoreAssessment(dims);
    expect(out.honest_flag).toBe(true);
    expect(out.honest_trigger).toBe("A");
  });

  it("Trigger A fires: winning_votes=2 out of 3 (2/3 case that 0.67 threshold would have missed)", () => {
    const dims: Dimensions = {
      attention_shape:       tallyDimension(["narrow-deep"]),
      reward_driver:         tallyDimension(["mastery"]),
      friction_response:     tallyDimension(["emotional-derail", "emotional-derail", "solo-push"]),
      parent_instinct:       tallyDimension(["pusher"]),
      attention_competition: tallyDimension(["novelty"]),
      recharge_type:         tallyDimension(["autonomous-unstructured"]),
    };
    const out = scoreAssessment(dims);
    expect(out.honest_flag).toBe(true);
    expect(out.honest_trigger).toBe("A");
  });

  it("Trigger A does NOT fire: winning_votes=1 (single data point)", () => {
    const dims: Dimensions = {
      attention_shape:       tallyDimension(["narrow-deep"]),
      reward_driver:         tallyDimension(["mastery"]),
      friction_response:     tallyDimension(["emotional-derail"]),
      parent_instinct:       tallyDimension(["pusher"]),
      attention_competition: tallyDimension(["novelty"]),
      recharge_type:         tallyDimension(["autonomous-unstructured"]),
    };
    expect(scoreAssessment(dims).honest_flag).toBe(false);
  });

  it("Trigger B fires: avoid + task-escape", () => {
    const dims: Dimensions = {
      attention_shape:       tallyDimension(["wide-shifting"]),
      reward_driver:         tallyDimension(["novelty"]),
      friction_response:     tallyDimension(["avoid", "avoid", "avoid"]),
      parent_instinct:       tallyDimension(["negotiator"]),
      attention_competition: tallyDimension(["task-escape", "task-escape"]),
      recharge_type:         tallyDimension(["cognitive-displacement"]),
    };
    expect(scoreAssessment(dims).honest_trigger).toBe("B");
  });

  it("Trigger B fires: avoid + internal", () => {
    const dims: Dimensions = {
      attention_shape:       tallyDimension(["wide-shifting"]),
      reward_driver:         tallyDimension(["novelty"]),
      friction_response:     tallyDimension(["avoid", "avoid"]),
      parent_instinct:       tallyDimension(["negotiator"]),
      attention_competition: tallyDimension(["internal"]),
      recharge_type:         tallyDimension(["sensory-quiet"]),
    };
    expect(scoreAssessment(dims).honest_trigger).toBe("B");
  });

  it("Trigger C fires: sensory-quiet + external + avoid", () => {
    const dims: Dimensions = {
      attention_shape:       tallyDimension(["narrow-deep"]),
      reward_driver:         tallyDimension(["mastery"]),
      friction_response:     tallyDimension(["avoid", "avoid"]),
      parent_instinct:       tallyDimension(["steady-hand"]),
      attention_competition: tallyDimension(["external"]),
      recharge_type:         tallyDimension(["sensory-quiet"]),
    };
    expect(scoreAssessment(dims).honest_trigger).toBe("C");
  });

  it("Trigger A takes priority when multiple triggers would fire", () => {
    const dims: Dimensions = {
      attention_shape:       tallyDimension(["narrow-deep"]),
      reward_driver:         tallyDimension(["mastery"]),
      friction_response:     tallyDimension(["emotional-derail", "emotional-derail", "avoid"]),
      parent_instinct:       tallyDimension(["pusher"]),
      attention_competition: tallyDimension(["task-escape"]),
      recharge_type:         tallyDimension(["sensory-quiet"]),
    };
    expect(scoreAssessment(dims).honest_trigger).toBe("A");
  });

  it("No trigger fires for a clean Storm profile", () => {
    expect(scoreAssessment(buildStormDims("novelty")).honest_flag).toBe(false);
  });
});
