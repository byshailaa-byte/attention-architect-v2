/**
 * Phase 3 + Phase 4 — Family Attention Loop tests.
 *
 * Detected loops:
 *   Parvathi              — quick-fixer × hypothesis friction → intervenes_too_early
 *   All-In Kid Negotiator — negotiator × All-In Kid × recharge=cognitive-displacement → Rule 4
 *
 * Fallbacks (loop not detected):
 *   Devsaran — negotiator × All-In Kid × recharge=autonomous-unstructured
 *              (Rule 4 doesn't fire — recharge ≠ cognitive-displacement)
 *   Atharv   — negotiator × Inventor (reward_driver=autonomy)
 *              (Rule 4 doesn't fire — not The All-In Kid)
 *
 * Also tests:
 *   - thin-data fallback (no matching rule → detected=false, pattern_summary present)
 *   - precedes edges form a cycle for detected loops
 *   - loop_tension_point carries correct parent/child node ids and dimensions
 *   - no loop is forced when tension point doesn't clear the rule bar
 *   - Rule 4 fires for 7/10 All-In Kid × Negotiator families (recharge=cognitive-displacement);
 *     the other 3 fall through to noLoop
 *   - steady-hand parents have zero loop rules
 */

import { describe, it, expect } from "vitest";
import { buildHdg } from "@/lib/graph/hdg";
import { buildBehaviourGraph } from "@/lib/graph/behaviour-graph";
import { buildBehaviourSignature } from "@/lib/graph/signature";
import { buildFamilyAttentionLoop } from "@/lib/graph/loop";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PARVATHI: Record<string, string> = {
  G1: "sensation-seeking",
  G2: "social",
  G3: "quick-fixer",
  "D2.1": "social",
  "D2.2": "social",
  "D2.3": "social",
  "D3.2": "solo-push", // conditional, only friction source → hypothesis
  "D6.confirm": "social-connection",
};

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

// Negotiator parent — no rule matches → thin-data fallback (wide-shifting, not All-In Kid)
const NEGOTIATOR: Record<string, string> = {
  G1: "wide-shifting",
  G2: "social",
  G3: "negotiator",
  "D2.1": "social",
  "D6.confirm": "social-connection",
};

// Rule 4 fixtures — All-In Kid × Negotiator (G1=narrow-deep, G3=negotiator, reward=mastery)
//
// Routing for G1=narrow-deep, G2=novelty, G3=negotiator:
//   slot1=reward_driver (D2.1-D2.3), Rule 2 fires → slot2=attention_shape (D1.1-D1.2),
//   slot3=null (negotiator). Friction gets D3.confirm; recharge gets D6.confirm.

// Should fire Rule 4: recharge=cognitive-displacement
const ALL_IN_KID_NEG_COGDISP: Record<string, string> = {
  G1: "narrow-deep",
  G2: "novelty",
  G3: "negotiator",
  "D1.1": "narrow-deep",
  "D1.2": "narrow-deep",
  "D2.1": "mastery",
  "D2.2": "mastery",
  "D2.3": "mastery",
  "D3.confirm": "solo-push",
  "D6.confirm": "cognitive-displacement",
};

// Should NOT fire Rule 4: same cell but recharge=sensory-quiet
const ALL_IN_KID_NEG_SENSORY: Record<string, string> = {
  G1: "narrow-deep",
  G2: "novelty",
  G3: "negotiator",
  "D1.1": "narrow-deep",
  "D1.2": "narrow-deep",
  "D2.1": "mastery",
  "D2.2": "mastery",
  "D2.3": "mastery",
  "D3.confirm": "solo-push",
  "D6.confirm": "sensory-quiet",
};

// Rule 4 with G2=internal: gets full D6.x depth instead of D6.confirm.
// The one G2=internal family in the production cell chose cognitive-displacement
// at all three sub-questions — replicated here.
const ALL_IN_KID_NEG_COGDISP_DEPTH: Record<string, string> = {
  G1: "narrow-deep",
  G2: "internal",   // → slot3=recharge_type (D6.1, D6.2, D6.3)
  G3: "negotiator",
  "D2.1": "mastery",
  "D2.2": "mastery",
  "D2.3": "mastery",
  "D6.1": "cognitive-displacement",
  "D6.2": "autonomous-unstructured",
  "D6.3": "cognitive-displacement",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildAll(answers: Record<string, string>) {
  const hdg = buildHdg(answers);
  const bg = buildBehaviourGraph(hdg);
  const sig = buildBehaviourSignature(hdg, bg);
  const loop = buildFamilyAttentionLoop(hdg, bg, sig);
  return { hdg, bg, sig, loop };
}

// ── Parvathi — intervenes_too_early ──────────────────────────────────────────

describe("Parvathi — quick-fixer × hypothesis friction → intervenes_too_early", () => {
  const { loop } = buildAll(PARVATHI);

  it("loop is detected", () => {
    expect(loop.detected).toBe(true);
  });

  it("mechanism is intervenes_too_early", () => {
    expect(loop.loop_tension_point?.mechanism).toBe("intervenes_too_early");
  });

  it("parent dimension is parent_instinct", () => {
    expect(loop.loop_tension_point?.parent_dimension).toBe("parent_instinct");
  });

  it("child dimension is friction_response", () => {
    expect(loop.loop_tension_point?.child_dimension).toBe("friction_response");
  });

  it("parent node is decision_G3", () => {
    expect(loop.loop_tension_point?.parent_node_id).toBe("decision_G3");
  });

  it("child node is decision_D3.2 (the conditional friction node)", () => {
    expect(loop.loop_tension_point?.child_node_id).toBe("decision_D3.2");
  });

  it("has 2 precedes edges (cycle between D3.2 and G3)", () => {
    expect(loop.precedes_edges).toHaveLength(2);
  });

  it("precedes edges form a cycle: D3.2→G3 and G3→D3.2", () => {
    const fromFriction = loop.precedes_edges.find(
      (e) => e.from_node === "decision_D3.2" && e.to_node === "decision_G3"
    );
    const fromParent = loop.precedes_edges.find(
      (e) => e.from_node === "decision_G3" && e.to_node === "decision_D3.2"
    );
    expect(fromFriction).toBeDefined();
    expect(fromParent).toBeDefined();
  });

  it("loop_description is non-null and contains parent choice text", () => {
    expect(loop.loop_description).not.toBeNull();
    expect(loop.loop_description).toContain("steps in and helps get it done");
  });

  it("pattern_summary is present", () => {
    expect(loop.pattern_summary.length).toBeGreaterThan(0);
  });
});

// ── Devsaran — Rule 4 doesn't fire (recharge≠cognitive-displacement) ─────────

describe("Devsaran — negotiator × All-In Kid × recharge=autonomous-unstructured → noLoop (Rule 4 requires cognitive-displacement)", () => {
  const { loop } = buildAll(DEVSARAN);

  it("loop is NOT detected — Rule 4 exists for this archetype×instinct but recharge is autonomous-unstructured, not cognitive-displacement", () => {
    expect(loop.detected).toBe(false);
  });

  it("loop_tension_point is null", () => {
    expect(loop.loop_tension_point).toBeNull();
  });

  it("precedes_edges is empty", () => {
    expect(loop.precedes_edges).toHaveLength(0);
  });

  it("loop_description is null", () => {
    expect(loop.loop_description).toBeNull();
  });

  it("pattern_summary is present and non-empty (fallback summarises available pattern data)", () => {
    expect(loop.pattern_summary.length).toBeGreaterThan(0);
    expect(loop.pattern_summary).not.toBe(
      "Insufficient data to characterise the family attention pattern."
    );
  });
});

// ── Atharv — Rule 4 doesn't fire (not The All-In Kid) ────────────────────────

describe("Atharv — negotiator × Inventor (reward_driver=autonomy) → noLoop (Rule 4 applies only to The All-In Kid)", () => {
  const { loop } = buildAll(ATHARV);

  it("loop is NOT detected — Rule 4 requires reward_driver=mastery (The All-In Kid); Atharv's child is The Inventor", () => {
    expect(loop.detected).toBe(false);
  });

  it("loop_tension_point is null", () => {
    expect(loop.loop_tension_point).toBeNull();
  });

  it("precedes_edges is empty", () => {
    expect(loop.precedes_edges).toHaveLength(0);
  });

  it("loop_description is null", () => {
    expect(loop.loop_description).toBeNull();
  });

  it("pattern_summary is present and non-empty", () => {
    expect(loop.pattern_summary.length).toBeGreaterThan(0);
    expect(loop.pattern_summary).not.toBe(
      "Insufficient data to characterise the family attention pattern."
    );
  });
});

// ── Rule 4 — negotiator × All-In Kid × recharge=cognitive-displacement ───────
//
// 7 of 10 All-In Kid × Negotiator families in the production corpus should fire;
// 3 (recharge ≠ cognitive-displacement) fall through to noLoop.

describe("Rule 4 — negotiator × All-In Kid × recharge=cognitive-displacement → misaligned_response", () => {
  it("fires when recharge=cognitive-displacement (D6.confirm path — 6/9 non-depth families)", () => {
    const { loop } = buildAll(ALL_IN_KID_NEG_COGDISP);
    expect(loop.detected).toBe(true);
    expect(loop.loop_tension_point?.mechanism).toBe("misaligned_response");
  });

  it("parent dimension is parent_instinct", () => {
    const { loop } = buildAll(ALL_IN_KID_NEG_COGDISP);
    expect(loop.loop_tension_point?.parent_dimension).toBe("parent_instinct");
  });

  it("child dimension is recharge_type", () => {
    const { loop } = buildAll(ALL_IN_KID_NEG_COGDISP);
    expect(loop.loop_tension_point?.child_dimension).toBe("recharge_type");
  });

  it("parent node is decision_G3", () => {
    const { loop } = buildAll(ALL_IN_KID_NEG_COGDISP);
    expect(loop.loop_tension_point?.parent_node_id).toBe("decision_G3");
  });

  it("child node is decision_D6.confirm (the recharge confirm node for non-depth path)", () => {
    const { loop } = buildAll(ALL_IN_KID_NEG_COGDISP);
    expect(loop.loop_tension_point?.child_node_id).toBe("decision_D6.confirm");
  });

  it("has 2 precedes edges forming a cycle", () => {
    const { loop } = buildAll(ALL_IN_KID_NEG_COGDISP);
    expect(loop.precedes_edges).toHaveLength(2);
    const fromRecharge = loop.precedes_edges.find(
      (e) => e.from_node === "decision_D6.confirm" && e.to_node === "decision_G3"
    );
    const fromParent = loop.precedes_edges.find(
      (e) => e.from_node === "decision_G3" && e.to_node === "decision_D6.confirm"
    );
    expect(fromRecharge).toBeDefined();
    expect(fromParent).toBeDefined();
  });

  it("loop_description is non-null and hedged (mechanism offered as plausible, not proved)", () => {
    const { loop } = buildAll(ALL_IN_KID_NEG_COGDISP);
    expect(loop.loop_description).not.toBeNull();
    expect(loop.loop_description).toContain("plausible");
  });

  it("does NOT fire when recharge=sensory-quiet (same archetype×instinct, different recharge)", () => {
    const { loop } = buildAll(ALL_IN_KID_NEG_SENSORY);
    expect(loop.detected).toBe(false);
    expect(loop.loop_tension_point).toBeNull();
  });

  it("fires for D6.x depth path (G2=internal, full recharge depth) — child node is decision_D6.1", () => {
    const { loop } = buildAll(ALL_IN_KID_NEG_COGDISP_DEPTH);
    expect(loop.detected).toBe(true);
    expect(loop.loop_tension_point?.child_node_id).toBe("decision_D6.1");
  });

  it("pattern_summary is present", () => {
    const { loop } = buildAll(ALL_IN_KID_NEG_COGDISP);
    expect(loop.pattern_summary.length).toBeGreaterThan(0);
  });
});

// ── Coverage — loop rules by parent instinct ──────────────────────────────────
//
// quick-fixer: Rule 1 (intervenes_too_early on hypothesis friction / solo-push)
// pusher:      Rules 2 (stays_too_long on mastery completion) + 3 (misaligned on autonomy×avoid)
// negotiator:  Rule 4 (misaligned_response for All-In Kid × recharge=cognitive-displacement only)
//              Devsaran/Atharv correctly fall through — Rule 4 is per-family conditional.
// steady-hand: no rules — noLoop always; families get pattern_summary only.

describe("Coverage — loop rules by parent instinct", () => {
  it("Parvathi (quick-fixer) has a detected loop via Rule 1", () => {
    const { loop } = buildAll(PARVATHI);
    expect(loop.detected).toBe(true);
  });

  it("All-In Kid + cognitive-displacement recharge (negotiator) fires Rule 4", () => {
    const { loop } = buildAll(ALL_IN_KID_NEG_COGDISP);
    expect(loop.detected).toBe(true);
  });

  it("Devsaran (negotiator × All-In Kid, recharge≠cognitive-displacement) → noLoop", () => {
    const { loop } = buildAll(DEVSARAN);
    expect(loop.detected).toBe(false);
  });

  it("Atharv (negotiator × Inventor) → noLoop — Rule 4 requires All-In Kid archetype", () => {
    const { loop } = buildAll(ATHARV);
    expect(loop.detected).toBe(false);
  });
});

// ── Thin-data fallback ────────────────────────────────────────────────────────

describe("Thin-data fallback — no rule fires, no loop forced", () => {
  it("negotiator parent produces detected=false (no matching rule)", () => {
    const { loop } = buildAll(NEGOTIATOR);
    expect(loop.detected).toBe(false);
  });

  it("loop_tension_point is null in fallback", () => {
    const { loop } = buildAll(NEGOTIATOR);
    expect(loop.loop_tension_point).toBeNull();
  });

  it("precedes_edges is empty in fallback", () => {
    const { loop } = buildAll(NEGOTIATOR);
    expect(loop.precedes_edges).toHaveLength(0);
  });

  it("loop_description is null in fallback", () => {
    const { loop } = buildAll(NEGOTIATOR);
    expect(loop.loop_description).toBeNull();
  });

  it("pattern_summary is present and non-empty in fallback", () => {
    const { loop } = buildAll(NEGOTIATOR);
    expect(loop.pattern_summary.length).toBeGreaterThan(0);
    expect(loop.pattern_summary).not.toBe(
      "Insufficient data to characterise the family attention pattern."
    );
  });

  it("minimal fixture (no parent answers) also falls back gracefully", () => {
    const { loop } = buildAll({ G1: "narrow-deep" });
    expect(loop.detected).toBe(false);
    expect(loop.loop_tension_point).toBeNull();
  });
});

// ── Reading expression.tension from the Signature (Phase 3 constraint) ────────

describe("Loop reads expression.tension from Signature (not from BG)", () => {
  it("a dimension-level tension present does not cause buildFamilyAttentionLoop to throw", () => {
    // Fixture with structural intra-dimension tension (D2.1=mastery vs D2.3=novelty)
    // plus a quick-fixer parent — Rule 1 should still fire and produce a loop.
    const answers: Record<string, string> = {
      G1: "narrow-deep",
      G2: "novelty",
      G3: "quick-fixer",
      "D2.1": "mastery",
      "D2.2": "mastery",
      "D2.3": "novelty", // structural tension on reward_driver
      "D3.2": "solo-push", // conditional → hypothesis friction
      "D6.confirm": "autonomous-unstructured",
    };
    const hdg = buildHdg(answers);
    const bg = buildBehaviourGraph(hdg);
    const sig = buildBehaviourSignature(hdg, bg);

    // Verify reward_driver actually has dimension-level tension (the thing being "read")
    const rdDim = sig.dimensions.find((d) => d.dimension === "reward_driver")!;
    expect(rdDim.expression.tension).not.toBeNull();

    // Loop should still be detected by Rule 1 (quick-fixer × hypothesis friction)
    expect(() => buildFamilyAttentionLoop(hdg, bg, sig)).not.toThrow();
    const loop = buildFamilyAttentionLoop(hdg, bg, sig);
    expect(loop.detected).toBe(true);
    expect(loop.loop_tension_point?.mechanism).toBe("intervenes_too_early");
  });
});
