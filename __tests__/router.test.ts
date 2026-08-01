import { describe, it, expect } from "vitest";
import { resolveDepthSet, buildQuestionSequence } from "../lib/engine/router";

const G1_VALUES = ["narrow-deep", "wide-shifting", "social-anchored", "sensation-seeking"];
const G2_VALUES = ["novelty", "external", "internal", "social"];
const G3_VALUES = ["quick-fixer", "pusher", "negotiator", "steady-hand"];

describe("Router — all 64 gateway combinations", () => {
  for (const G1 of G1_VALUES) {
    for (const G2 of G2_VALUES) {
      for (const G3 of G3_VALUES) {
        const label = `G1=${G1} G2=${G2} G3=${G3}`;

        it(`${label} — depth set valid`, () => {
          const depth = resolveDepthSet({ G1, G2, G3 });

          // reward_driver always in slot1
          expect(depth.slot1).toBe("reward_driver");

          // slot2 is one of the two possible values
          expect(["attention_shape", "friction_response"]).toContain(depth.slot2);

          // slot3 is null or a valid dimension
          if (depth.slot3 !== null) {
            expect([
              "friction_response",
              "recharge_type",
              "attention_competition",
              "parent_instinct",
            ]).toContain(depth.slot3);
          }

          // no duplicates
          const slots = [depth.slot1, depth.slot2, depth.slot3].filter(Boolean);
          expect(new Set(slots).size).toBe(slots.length);

          // size is 2 or 3
          expect(slots.length).toBeGreaterThanOrEqual(2);
          expect(slots.length).toBeLessThanOrEqual(3);
        });

        it(`${label} — question count in [10,13]`, () => {
          const qs = buildQuestionSequence({ G1, G2, G3 });
          expect(qs.length).toBeGreaterThanOrEqual(10);
          expect(qs.length).toBeLessThanOrEqual(13);
        });

        it(`${label} — no duplicate question IDs`, () => {
          const qs = buildQuestionSequence({ G1, G2, G3 });
          const ids = qs.map((q) => q.id);
          expect(new Set(ids).size).toBe(ids.length);
        });
      }
    }
  }
});

// Spot-check specific Rule 2 behaviour
describe("Router — Rule 2 logic", () => {
  it("G2=novelty AND G1=wide-shifting → Rule 2 does NOT fire (G1 is wide-shifting)", () => {
    const depth = resolveDepthSet({ G1: "wide-shifting", G2: "novelty", G3: "negotiator" });
    // Rule 2 requires G1 ≠ wide-shifting; so Rule 3 fires instead
    expect(depth.slot2).toBe("friction_response");
  });

  it("G2=novelty AND G1=sensation-seeking → Rule 2 fires, attention_shape in slot2", () => {
    const depth = resolveDepthSet({ G1: "sensation-seeking", G2: "novelty", G3: "negotiator" });
    expect(depth.slot2).toBe("attention_shape");
  });

  it("G2=novelty AND G1=narrow-deep → Rule 2 fires", () => {
    const depth = resolveDepthSet({ G1: "narrow-deep", G2: "novelty", G3: "negotiator" });
    expect(depth.slot2).toBe("attention_shape");
  });
});

// Spot-check Rule 4 behaviour
describe("Router — Rule 4 logic", () => {
  it("G2=internal → slot3=recharge_type (friction is already in slot2)", () => {
    const depth = resolveDepthSet({ G1: "narrow-deep", G2: "internal", G3: "negotiator" });
    expect(depth.slot2).toBe("friction_response");
    expect(depth.slot3).toBe("recharge_type");
  });

  it("G2=social → slot3=attention_competition", () => {
    const depth = resolveDepthSet({ G1: "narrow-deep", G2: "social", G3: "negotiator" });
    expect(depth.slot3).toBe("attention_competition");
  });

  it("G3=pusher and G2=external → slot3=parent_instinct", () => {
    const depth = resolveDepthSet({ G1: "narrow-deep", G2: "external", G3: "pusher" });
    expect(depth.slot3).toBe("parent_instinct");
  });

  it("G3=quick-fixer and G2=external → slot3=parent_instinct", () => {
    const depth = resolveDepthSet({ G1: "narrow-deep", G2: "external", G3: "quick-fixer" });
    expect(depth.slot3).toBe("parent_instinct");
  });

  it("G3=negotiator and G2=external → no slot3", () => {
    const depth = resolveDepthSet({ G1: "narrow-deep", G2: "external", G3: "negotiator" });
    expect(depth.slot3).toBeNull();
  });

  it("G2=social takes priority over G3=pusher for slot3", () => {
    // G2=social fires Rule 4 first → slot3=attention_competition, not parent_instinct
    const depth = resolveDepthSet({ G1: "narrow-deep", G2: "social", G3: "pusher" });
    expect(depth.slot3).toBe("attention_competition");
  });
});
