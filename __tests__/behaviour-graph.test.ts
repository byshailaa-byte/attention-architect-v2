/**
 * Phase 1 + 1.5 regression tests — HDG + Behaviour Graph construction.
 *
 * Phase 1.5 corrections:
 * - Mixed-certainty aggregation: tier follows dominant evidence, not the weakest source.
 *   Devsaran friction_response: D3.1+D3.3 unconditional (primary), D3.2 conditional.
 *   The conditional does not directly contradict (unconditional set is itself split).
 *   Result: framework_interpretation with reduced confidence — NOT hypothesis.
 * - Cross-dimension value translation: D3.3 contributes to recharge_type in that
 *   dimension's vocabulary (e.g. "support-seek" → "social-connection"), not raw.
 *
 * Three validated real cases:
 *   Parvathi  — Live Wire; D3.2=solo-push (conditional, only source)  → hypothesis (unchanged)
 *   Devsaran  — D3.2=support-seek (conditional, among 2 unconditional) → framework_interpretation
 *   Atharv    — D3.2=avoid (unconditional, single node)               → direct_evidence (unchanged)
 */

import { describe, it, expect } from "vitest";
import { buildHdg } from "@/lib/graph/hdg";
import { buildBehaviourGraph } from "@/lib/graph/behaviour-graph";
import type { BgSignalNode, HdgNode } from "@/lib/graph/types";

// ── Fixtures ──────────────────────────────────────────────────────────────────

// Parvathi: Live Wire (sensation-seeking × social), Quick Fixer parent.
// D3.2=solo-push is conditional and is friction_response's ONLY source.
// No unconditional evidence to dominate → hypothesis.
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

// Devsaran: narrow-deep × mastery, Negotiator parent.
// friction_response has THREE contributing nodes:
//   D3.1=support-seek (unconditional, 1.0) — "Looks for someone to help or work through it"
//   D3.2=support-seek (conditional, 1.0)   — "Depends on whether someone's there to help"
//   D3.3=support-seek (unconditional, 1.0)
// All three point to support-seek. Unconditional set is unanimous.
// D3.2 (conditional) agrees with the unanimous direction — no direct contradiction.
// Tier = framework_interpretation: 2 reinforcing unconditional primaries, conditional agrees.
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

// Atharv: narrow-deep × autonomy, Negotiator parent.
// D3.2=avoid is unconditional and is friction_response's ONLY source → direct_evidence.
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function printHdg(label: string, nodes: HdgNode[]) {
  console.log(`\n=== ${label} — Human Decision Graph (${nodes.length} nodes) ===`);
  for (const n of nodes) {
    const flag = n.context === "conditional" ? " [CONDITIONAL]" : "";
    console.log(`  ${n.id}  actor=${n.actor}${flag}`);
    console.log(`    trigger: ${n.trigger}`);
    console.log(`    choice:  ${n.choice}`);
  }
}

function printBg(label: string, signals: BgSignalNode[]) {
  console.log(`\n=== ${label} — Behaviour Graph (${signals.length} signal nodes) ===`);
  for (const s of signals) {
    console.log(
      `  ${s.id}  value=${s.value}  tier=${s.evidence_tier}  weight_sum=${s.weight_sum.toFixed(2)}`
    );
    console.log(`    sources: ${s.source_nodes.join(", ")}`);
  }
}

// ── Parvathi (unchanged from Phase 1) ────────────────────────────────────────

describe("Parvathi (Live Wire) — D3.2=solo-push [conditional, only source]", () => {
  const hdg = buildHdg(PARVATHI);
  const bg = buildBehaviourGraph(hdg);

  it("HDG is built (nodes > 0)", () => {
    expect(hdg.nodes.length).toBeGreaterThan(0);
  });

  it("D3.2 node is marked conditional", () => {
    const d32 = hdg.nodes.find((n) => n.source_question === "D3.2");
    expect(d32?.context).toBe("conditional");
  });

  it("friction_response signal node exists", () => {
    expect(bg.signal_nodes.find((n) => n.dimension === "friction_response")).toBeDefined();
  });

  it("friction_response evidence_tier === hypothesis (conditional is only source — no unconditional evidence to dominate)", () => {
    const node = bg.signal_nodes.find((n) => n.dimension === "friction_response");
    expect(node?.evidence_tier).toBe("hypothesis");
  });

  it("graph output", () => {
    printHdg("PARVATHI", hdg.nodes);
    printBg("PARVATHI", bg.signal_nodes);
  });
});

// ── Devsaran (Phase 1.5 correction) ──────────────────────────────────────────

describe("Devsaran — D3.2=support-seek [conditional among split unconditionals]", () => {
  const hdg = buildHdg(DEVSARAN);
  const bg = buildBehaviourGraph(hdg);

  it("HDG is built (nodes > 0)", () => {
    expect(hdg.nodes.length).toBeGreaterThan(0);
  });

  it("D3.2 node is marked conditional", () => {
    const d32 = hdg.nodes.find((n) => n.source_question === "D3.2");
    expect(d32?.context).toBe("conditional");
  });

  it("D3.1 and D3.3 nodes are unconditional and both support-seek (corrected fixture)", () => {
    const d31 = hdg.nodes.find((n) => n.source_question === "D3.1");
    const d33 = hdg.nodes.find((n) => n.source_question === "D3.3");
    expect(d31?.context).toBe("unconditional");
    expect(d31?.source_value).toBe("support-seek");
    expect(d33?.context).toBe("unconditional");
    expect(d33?.source_value).toBe("support-seek");
  });

  it("friction_response signal node exists", () => {
    expect(bg.signal_nodes.find((n) => n.dimension === "friction_response")).toBeDefined();
  });

  it("friction_response evidence_tier === framework_interpretation (2 reinforcing unconditional primaries; conditional D3.2 agrees with unanimous direction — no contradiction)", () => {
    const node = bg.signal_nodes.find((n) => n.dimension === "friction_response");
    expect(node?.evidence_tier).toBe("framework_interpretation");
  });

  it("friction_response has 3 contributing nodes", () => {
    const node = bg.signal_nodes.find((n) => n.dimension === "friction_response");
    expect(node?.source_nodes.length).toBe(3);
  });

  it("recharge_type D3.3 contribution uses translated value (support-seek → social-connection), not orphan friction_response vocabulary", () => {
    const rt = bg.signal_nodes.find((n) => n.dimension === "recharge_type");
    expect(rt).toBeDefined();
    // D3.3="support-seek" translates to "social-connection" in recharge_type vocabulary.
    // D6.confirm="autonomous-unstructured" is primary (1.0) and dominates.
    // Value should still be autonomous-unstructured (1.0 > 0.25).
    expect(rt?.value).toBe("autonomous-unstructured");
    // D3.3 source appears as a contributor (translated, not orphan)
    expect(rt?.source_nodes).toContain("decision_D3.3");
  });

  it("graph output", () => {
    printHdg("DEVSARAN", hdg.nodes);
    printBg("DEVSARAN", bg.signal_nodes);
  });
});

// ── Atharv (unchanged from Phase 1) ──────────────────────────────────────────

describe("Atharv — D3.2=avoid [unconditional, single node]", () => {
  const hdg = buildHdg(ATHARV);
  const bg = buildBehaviourGraph(hdg);

  it("HDG is built (nodes > 0)", () => {
    expect(hdg.nodes.length).toBeGreaterThan(0);
  });

  it("D3.2 node is unconditional", () => {
    const d32 = hdg.nodes.find((n) => n.source_question === "D3.2");
    expect(d32?.context).toBe("unconditional");
  });

  it("friction_response signal node exists", () => {
    expect(bg.signal_nodes.find((n) => n.dimension === "friction_response")).toBeDefined();
  });

  it("friction_response evidence_tier === direct_evidence (single unconditional primary, no conditional present)", () => {
    const node = bg.signal_nodes.find((n) => n.dimension === "friction_response");
    expect(node?.evidence_tier).toBe("direct_evidence");
  });

  it("friction_response has exactly 1 contributing HDG node", () => {
    const node = bg.signal_nodes.find((n) => n.dimension === "friction_response");
    expect(node?.source_nodes.length).toBe(1);
    expect(node?.source_nodes[0]).toBe("decision_D3.2");
  });

  it("graph output", () => {
    printHdg("ATHARV", hdg.nodes);
    printBg("ATHARV", bg.signal_nodes);
  });
});

// ── Direct-contradiction edge case ───────────────────────────────────────────

describe("Evidence tier — direct contradiction check", () => {
  it("conditional that agrees with unanimous unconditional → framework_interpretation (no contradiction)", () => {
    // D3.1=solo-push (uncond), D3.3=solo-push (uncond), D3.2=solo-push (cond, but solo-push is conditional in D3.2)
    // Unconditional unanimous on solo-push, conditional also says solo-push → no contradiction
    const hdg = buildHdg({
      G1: "narrow-deep",
      G2: "novelty",
      G3: "pusher",
      "D2.1": "mastery",
      "D3.1": "solo-push",
      "D3.2": "solo-push",   // conditional (D3.2:solo-push is in CONDITIONAL_ANSWERS)
      "D3.3": "solo-push",
      "D6.confirm": "autonomous-unstructured",
    });
    const bg = buildBehaviourGraph(hdg);
    const node = bg.signal_nodes.find((n) => n.dimension === "friction_response");
    // 2 unconditional primary nodes, all unanimous; conditional agrees → framework_interpretation
    expect(node?.evidence_tier).toBe("framework_interpretation");
  });

  it("conditional contradicting unanimous unconditional → hypothesis", () => {
    // D3.1=solo-push (uncond), D3.3=solo-push (uncond) agree unanimously.
    // D3.2=support-seek (cond) votes against the unanimous direction → direct contradiction.
    const hdg = buildHdg({
      G1: "narrow-deep",
      G2: "novelty",
      G3: "pusher",
      "D2.1": "mastery",
      "D3.1": "solo-push",
      "D3.2": "support-seek", // conditional, contradicts unanimous uncond
      "D3.3": "solo-push",
      "D6.confirm": "autonomous-unstructured",
    });
    const bg = buildBehaviourGraph(hdg);
    const node = bg.signal_nodes.find((n) => n.dimension === "friction_response");
    // Unconditional unanimous on solo-push; conditional says support-seek → hypothesis
    expect(node?.evidence_tier).toBe("hypothesis");
  });
});
