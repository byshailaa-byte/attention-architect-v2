/**
 * Phase 2 — Behaviour Signature tests.
 *
 * Key assertions:
 *   1. Devsaran dim_motivation (reward_driver): all-mastery answers produce compatible
 *      facets (ordered list) rather than a tension object or collapsed single value.
 *   2. Parvathi friction_response: hypothesis tier preserves the qualitative expression
 *      even when evidence is conditional-only.
 *   3. Confidence guard: BehaviourSignature JSON contains no numeric *confidence* field —
 *      this is the parent-facing brand guardrail (confidence lives in ConfidenceVector only).
 *   4. Fixed shape: signature always has one entry per dimension in ALL_DIMENSIONS (currently 7).
 *   5. Confidence vector: numerics are present and sane; overall in (0,1].
 */

import { describe, it, expect } from "vitest";
import { buildHdg } from "@/lib/graph/hdg";
import { buildBehaviourGraph } from "@/lib/graph/behaviour-graph";
import { buildBehaviourSignature } from "@/lib/graph/signature";
import { buildConfidenceVector } from "@/lib/graph/confidence";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PARVATHI: Record<string, string> = {
  G1: "sensation-seeking",
  G2: "social",
  G3: "quick-fixer",
  "D2.1": "social",
  "D2.2": "social",
  "D2.3": "social",
  "D3.2": "solo-push",
  "D6.confirm": "social-connection",
};

// Devsaran: narrow-deep × mastery, three D2.x all unanimous on mastery.
// dim_motivation (reward_driver) must show compatible facets, NOT tension.
const DEVSARAN: Record<string, string> = {
  G1: "narrow-deep",
  G2: "novelty",
  G3: "negotiator",
  "D1.1": "narrow-deep",
  "D1.2": "narrow-deep",
  "D2.1": "mastery",
  "D2.2": "mastery",
  "D2.3": "mastery",
  "D3.1": "support-seek",
  "D3.2": "support-seek",
  "D3.3": "support-seek",
  "D6.confirm": "autonomous-unstructured",
};

const ATHARV: Record<string, string> = {
  G1: "narrow-deep",
  G2: "novelty",
  G3: "negotiator",
  "D1.1": "narrow-deep",
  "D1.2": "narrow-deep",
  "D2.1": "autonomy",
  "D2.2": "autonomy",
  "D2.3": "autonomy",
  "D3.2": "avoid",
  "D6.confirm": "autonomous-unstructured",
};

// ── Devsaran dim_motivation ───────────────────────────────────────────────────

describe("Devsaran — dim_motivation (reward_driver) compatible-facet representation", () => {
  const hdg = buildHdg(DEVSARAN);
  const bg = buildBehaviourGraph(hdg);
  const sig = buildBehaviourSignature(hdg, bg);
  const rd = sig.dimensions.find((d) => d.dimension === "reward_driver")!;

  it("reward_driver dimension is present", () => {
    expect(rd).toBeDefined();
  });

  it("evidence_tier is framework_interpretation (3 unconditional primaries)", () => {
    expect(rd.evidence_tier).toBe("framework_interpretation");
  });

  it("expression.tension is null — facets are compatible, not genuinely opposing", () => {
    expect(rd.expression.tension).toBeNull();
  });

  it("expression.value is an array (multiple compatible facets, not collapsed to single string)", () => {
    expect(Array.isArray(rd.expression.value)).toBe(true);
  });

  it("expression.value contains text from D2.1 (challenge ignition)", () => {
    const facets = rd.expression.value as string[];
    expect(facets.some((f) => f.includes("figuring out something really hard"))).toBe(true);
  });

  it("expression.value contains text from D2.2 (post-completion attribution)", () => {
    const facets = rd.expression.value as string[];
    expect(facets.some((f) => f.includes("got better at something"))).toBe(true);
  });

  it("expression.value contains text from D2.3 (disengagement trigger)", () => {
    const facets = rd.expression.value as string[];
    expect(facets.some((f) => f.includes("stopped being challenging"))).toBe(true);
  });

  it("expression.type is qualitative_tendency", () => {
    expect(rd.expression.type).toBe("qualitative_tendency");
  });

  it("contradiction_flag is false (no genuine opposing tendencies)", () => {
    expect(rd.contradiction_flag).toBe(false);
  });
});

// ── Parvathi friction_response ────────────────────────────────────────────────

describe("Parvathi — friction_response hypothesis tier with qualitative expression", () => {
  const hdg = buildHdg(PARVATHI);
  const bg = buildBehaviourGraph(hdg);
  const sig = buildBehaviourSignature(hdg, bg);
  const fr = sig.dimensions.find((d) => d.dimension === "friction_response")!;

  it("friction_response dimension is present", () => {
    expect(fr).toBeDefined();
  });

  it("evidence_tier is hypothesis (D3.2 conditional is only source)", () => {
    expect(fr.evidence_tier).toBe("hypothesis");
  });

  it("expression.value is a non-null string (qualitative, not null)", () => {
    expect(typeof fr.expression.value).toBe("string");
    expect(fr.expression.value).not.toBeNull();
  });

  it("expression.tension is null (hypothesis from conditional, not structural contradiction)", () => {
    expect(fr.expression.tension).toBeNull();
  });

  it("expression.type is qualitative_tendency", () => {
    expect(fr.expression.type).toBe("qualitative_tendency");
  });
});

// ── Fixed shape ───────────────────────────────────────────────────────────────

describe("BehaviourSignature fixed shape", () => {
  it("Parvathi signature has one entry per dimension in ALL_DIMENSIONS", () => {
    const sig = buildBehaviourSignature(buildHdg(PARVATHI), buildBehaviourGraph(buildHdg(PARVATHI)));
    expect(sig.dimensions).toHaveLength(7);
  });

  it("Atharv signature has one entry per dimension in ALL_DIMENSIONS", () => {
    const sig = buildBehaviourSignature(buildHdg(ATHARV), buildBehaviourGraph(buildHdg(ATHARV)));
    expect(sig.dimensions).toHaveLength(7);
  });

  it("dimensions with no evidence get evidence_tier insufficient_evidence", () => {
    // Parvathi has no parent_instinct depth questions beyond G3 gateway
    // (P1, P2 not in PARVATHI fixture — parent_instinct will be present from G3)
    // Use a minimal fixture with only G1 to force missing dimensions
    const minimal: Record<string, string> = { G1: "narrow-deep" };
    const hdg = buildHdg(minimal);
    const bg = buildBehaviourGraph(hdg);
    const sig = buildBehaviourSignature(hdg, bg);
    expect(sig.dimensions).toHaveLength(7);
    const missing = sig.dimensions.filter(
      (d) => d.evidence_tier === "insufficient_evidence"
    );
    expect(missing.length).toBeGreaterThan(0);
  });
});

// ── Confidence guard (brand guardrail) ────────────────────────────────────────

describe("Confidence guardrail — BehaviourSignature must not contain numeric confidence fields", () => {
  function findNumericConfidence(obj: unknown, path = ""): string[] {
    if (obj === null || typeof obj !== "object") return [];
    const violations: string[] = [];
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      const fullPath = path ? `${path}.${key}` : key;
      if (
        (key === "confidence" || key.endsWith("_confidence")) &&
        typeof val === "number"
      ) {
        violations.push(`${fullPath}=${val}`);
      }
      if (Array.isArray(val)) {
        val.forEach((item, i) =>
          violations.push(...findNumericConfidence(item, `${fullPath}[${i}]`))
        );
      } else if (typeof val === "object" && val !== null) {
        violations.push(...findNumericConfidence(val, fullPath));
      }
    }
    return violations;
  }

  it("Devsaran BehaviourSignature JSON has no numeric *confidence* fields", () => {
    const hdg = buildHdg(DEVSARAN);
    const bg = buildBehaviourGraph(hdg);
    const sig = buildBehaviourSignature(hdg, bg);
    const violations = findNumericConfidence(sig);
    expect(violations).toEqual([]);
  });

  it("Parvathi BehaviourSignature JSON has no numeric *confidence* fields", () => {
    const hdg = buildHdg(PARVATHI);
    const bg = buildBehaviourGraph(hdg);
    const sig = buildBehaviourSignature(hdg, bg);
    const violations = findNumericConfidence(sig);
    expect(violations).toEqual([]);
  });
});

// ── ConfidenceVector (internal) ───────────────────────────────────────────────

describe("ConfidenceVector — numeric internals are sane", () => {
  const hdg = buildHdg(DEVSARAN);
  const bg = buildBehaviourGraph(hdg);
  const sig = buildBehaviourSignature(hdg, bg);
  const cv = buildConfidenceVector(hdg, bg, sig);

  it("overall_confidence is between 0 and 1", () => {
    expect(cv.overall_confidence).toBeGreaterThan(0);
    expect(cv.overall_confidence).toBeLessThanOrEqual(1);
  });

  it("evidence_density is between 0 and 1", () => {
    expect(cv.evidence_density).toBeGreaterThan(0);
    expect(cv.evidence_density).toBeLessThanOrEqual(1);
  });

  it("evidence_quality is between 0 and 1", () => {
    expect(cv.evidence_quality).toBeGreaterThan(0);
    expect(cv.evidence_quality).toBeLessThanOrEqual(1);
  });

  it("reward_driver confidence is high (3 strong unconditional primaries)", () => {
    const rdConf = cv.per_dimension_confidence["reward_driver"];
    expect(rdConf).toBeGreaterThanOrEqual(0.75);
  });

  it("friction_response confidence is reduced (conditional contributor present)", () => {
    const frConf = cv.per_dimension_confidence["friction_response"];
    // framework_interpretation base = 0.80, reduced by conditional weight share
    expect(frConf).toBeLessThan(0.80);
    expect(frConf).toBeGreaterThan(0);
  });

  it("contradiction_score is 0 (no tension objects in Devsaran signature)", () => {
    expect(cv.contradiction_score).toBe(0);
  });

  it("missing_evidence lists dimensions with no signal nodes", () => {
    // Devsaran has no D5.x answers → attention_competition may be missing
    // (only G2=novelty contributes via primary at 1.0 for attention_competition)
    expect(Array.isArray(cv.missing_evidence)).toBe(true);
  });

  it("per_dimension_confidence has no entry for insufficient_evidence dimensions", () => {
    const presentDims = new Set(bg.signal_nodes.map((n) => n.dimension));
    for (const [dim] of Object.entries(cv.per_dimension_confidence)) {
      expect(presentDims.has(dim)).toBe(true);
    }
  });
});

// ── Atharv friction_response (direct_evidence) ───────────────────────────────

describe("Atharv — friction_response direct_evidence expression", () => {
  const hdg = buildHdg(ATHARV);
  const bg = buildBehaviourGraph(hdg);
  const sig = buildBehaviourSignature(hdg, bg);
  const fr = sig.dimensions.find((d) => d.dimension === "friction_response")!;

  it("evidence_tier is direct_evidence", () => {
    expect(fr.evidence_tier).toBe("direct_evidence");
  });

  it("expression.value is a single string (one source node)", () => {
    expect(typeof fr.expression.value).toBe("string");
  });

  it("expression contains D3.2:avoid choice text", () => {
    expect(fr.expression.value).toContain("draining");
  });

  it("expression.tension is null", () => {
    expect(fr.expression.tension).toBeNull();
  });
});

// ── Genuine structural tension (tension code path) ────────────────────────────
//
// This is the ONLY test that exercises expression.tension !== null.
// Fixture: D2.1=mastery, D2.2=mastery, D2.3=novelty — all unconditional primaries.
// mastery wins the weighted vote (2.0 vs novelty's 1.5 including G2 secondary).
// D2.3 is unconditional, home-dimension, non-dominant → lands in dissentingNodes.
// Both sides are genuine observations — not conditional hedging — so tension is warranted.
//
// Evidence tier: unconditional set is NOT unanimous (mastery + novelty present),
// so resolveEvidenceTier skips the "direct contradiction" branch and returns
// framework_interpretation (3 significant unconditionals). The BG signal node
// carries the correct dominant value; the tension object is assembled by the
// Signature layer on top.

describe("Genuine structural tension — unconditional primary split across same dimension", () => {
  const answers: Record<string, string> = {
    G1: "narrow-deep",
    G2: "novelty",
    G3: "pusher",
    "D2.1": "mastery",
    "D2.2": "mastery",
    "D2.3": "novelty", // unconditional, home-dim, non-dominant → triggers tension
    "D6.confirm": "autonomous-unstructured",
  };
  const hdg = buildHdg(answers);
  const bg = buildBehaviourGraph(hdg);
  const sig = buildBehaviourSignature(hdg, bg);
  const rd = sig.dimensions.find((d) => d.dimension === "reward_driver")!;

  it("dominant value is mastery (2.0 > novelty 1.5)", () => {
    const signalNode = bg.signal_nodes.find((n) => n.dimension === "reward_driver");
    expect(signalNode?.value).toBe("mastery");
  });

  it("evidence_tier is framework_interpretation (unconditional split, not conditional contradiction)", () => {
    expect(rd.evidence_tier).toBe("framework_interpretation");
  });

  it("expression.tension is NOT null — genuine structural opposition detected", () => {
    expect(rd.expression.tension).not.toBeNull();
  });

  it("contradiction_flag is true", () => {
    expect(rd.contradiction_flag).toBe(true);
  });

  it("tension.value_a contains mastery facets (D2.1 + D2.2 choice texts)", () => {
    const va = rd.expression.tension!.value_a;
    expect(va).toContain("figuring out something really hard");
    expect(va).toContain("got better at something");
  });

  it("tension.value_b contains the dissenting D2.3=novelty choice text", () => {
    const vb = rd.expression.tension!.value_b;
    expect(vb).toContain("something newer appeared");
  });

  it("expression.value (dominant side) is an array of the two mastery choice texts", () => {
    expect(Array.isArray(rd.expression.value)).toBe(true);
    const facets = rd.expression.value as string[];
    expect(facets).toHaveLength(2);
  });

  it("expression.type is qualitative_tendency", () => {
    expect(rd.expression.type).toBe("qualitative_tendency");
  });

  it("no numeric confidence fields even when tension is present (guard holds)", () => {
    function findNumericConfidence(obj: unknown, path = ""): string[] {
      if (obj === null || typeof obj !== "object") return [];
      const violations: string[] = [];
      for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
        const fullPath = path ? `${path}.${key}` : key;
        if (
          (key === "confidence" || key.endsWith("_confidence")) &&
          typeof val === "number"
        ) {
          violations.push(`${fullPath}=${val}`);
        }
        if (Array.isArray(val)) {
          val.forEach((item, i) =>
            violations.push(...findNumericConfidence(item, `${fullPath}[${i}]`))
          );
        } else if (typeof val === "object" && val !== null) {
          violations.push(...findNumericConfidence(val, fullPath));
        }
      }
      return violations;
    }
    expect(findNumericConfidence(sig)).toEqual([]);
  });
});
