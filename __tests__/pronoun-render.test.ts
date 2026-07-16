import { describe, it, expect } from "vitest";
import { glue } from "@/content/archetypes/glue";
import { negotiator } from "@/content/patterns/negotiator";
import { buildPronounTokens } from "@/lib/report/pronouns";
import { fillTokens } from "@/lib/report/tokens";

const CHILD = "Priya";
const PARENT = "Meena";

function buildTokens(gender: "girl" | "boy" | null) {
  return {
    child_name: CHILD,
    name: PARENT,
    ...buildPronounTokens(gender),
  };
}

function renderField(template: string, gender: "girl" | "boy" | null): string {
  const tokens = buildTokens(gender);
  const reframeFragment = glue.s4ReframeClose;
  const mechanismTemplate = negotiator.s4MechanismTemplate;
  if (template === "__mechanism__") {
    return fillTokens(mechanismTemplate.replace(/\{\{child_reframe_close\}\}/g, reframeFragment), tokens);
  }
  return fillTokens(template, tokens);
}

function renderAll(gender: "girl" | "boy" | null) {
  return {
    s1Flavor:           renderField(glue.s1FlavorPhrase, gender),
    s1Evidence:         renderField(glue.s1EvidenceObservation, gender),
    s2Anecdote:         renderField(glue.s2Anecdote, gender),
    s2Pullquote:        renderField(glue.s2Pullquote, gender),
    s2Strength:         glue.s2Strength,
    s2Shadow:           glue.s2Shadow,
    s3Worries:          glue.s3ParentWorries.map((w) => renderField(w, gender)),
    s3Doubts:           negotiator.s3SelfDoubts.map((d) => renderField(d, gender)),
    s3Disarm:           renderField(negotiator.s3Disarm, gender),
    mechanism:          renderField("__mechanism__", gender),
    s4Analysis:         glue.s4Analysis.map((a) => renderField(a, gender)),
    s5Stability:        renderField(glue.s5AxisDescriptions.stability, gender),
    s5Resistance:       renderField(glue.s5AxisDescriptions.resistance, gender),
    s5Recovery:         renderField(glue.s5AxisDescriptions.recovery, gender),
    s6Future:           renderField(glue.s6FutureScene, gender),
    s6Vision:           renderField(negotiator.s6FutureVision, gender),
    s7Stay:             renderField(`${glue.s7StayPathBase} ${negotiator.s7StayPathClause}`, gender),
    s7Change:           renderField(`${glue.s7ChangePathBase} ${negotiator.s7ChangePathClause}`, gender),
    s8Bullets:          glue.s8RoadmapBullets.map((b) => renderField(b, gender)),
    s8Clause:           negotiator.s8RoadmapClause,
  };
}

describe("Pronoun render — Glue + Negotiator", () => {
  it("no MISSING markers for any gender", () => {
    for (const gender of [null, "girl", "boy"] as const) {
      const r = renderAll(gender);
      const flat = JSON.stringify(r);
      expect(flat, `gender=${gender}`).not.toContain("[[MISSING");
      expect(flat, `gender=${gender}`).not.toContain("{{");
    }
  });

  it("gender=null uses they/them/their/themself in pronoun positions", () => {
    const r = renderAll(null);
    // Spot-check specific pronoun positions — no gendered pronouns in child slots.
    // s1Flavor uses obj twice: "around them … connected to them"
    expect(r.s1Flavor).toContain("around them");
    expect(r.s1Flavor).not.toContain("around him");
    expect(r.s1Flavor).not.toContain("around her");
    // s1Evidence uses subj: "they'll ask"
    expect(r.s1Evidence).toContain("they'll ask");
    // s4ReframeClose in mechanism: "around them feel"
    expect(r.mechanism).toContain("around them feel");
    // s6FutureScene uses poss: "their whole list"
    expect(r.s6Future).toContain("their whole list");
    // s7Stay uses subj: "they can't concentrate"
    expect(r.s7Stay).toContain("they can't concentrate");
  });

  it("gender=girl uses she/her/her/herself in pronoun positions", () => {
    const r = renderAll("girl");
    expect(r.s1Flavor).toContain("around her");
    expect(r.s1Evidence).toContain("she'll ask");
    expect(r.mechanism).toContain("around her feel");
    expect(r.s6Future).toContain("her whole list");
    expect(r.s7Stay).toContain("she can't concentrate");
    // No child-slot masculine or neutral pronouns (use \b to avoid she→he substring)
    expect(r.s1Flavor).not.toContain("around him");
    expect(r.s1Evidence).not.toMatch(/\bhe'll\b/);
    expect(r.s6Future).not.toMatch(/\bhis\b/);
    expect(r.s6Future).not.toContain("their whole list");
  });

  it("gender=boy uses he/him/his/himself in pronoun positions", () => {
    const r = renderAll("boy");
    expect(r.s1Flavor).toContain("around him");
    expect(r.s1Evidence).toMatch(/\bhe'll\b/);
    expect(r.mechanism).toContain("around him feel");
    expect(r.s6Future).toContain("his whole list");
    expect(r.s7Stay).toMatch(/\bhe can't\b/);
    // No child-slot feminine or neutral pronouns
    expect(r.s1Flavor).not.toContain("around her");
    expect(r.s1Evidence).not.toContain("she'll ask");
    expect(r.s6Future).not.toContain("her whole list");
    expect(r.s6Future).not.toContain("their whole list");
  });

  it("renders natural sentences for null gender — spot checks", () => {
    const r = renderAll(null);
    // s1FlavorPhrase
    expect(r.s1Flavor).toBe("whether the people around them feel connected to them");
    // s4ReframeClose in mechanism
    expect(r.mechanism).toContain("disconnected from how the people around them feel");
    // s1Evidence — "they'll ask"
    expect(r.s1Evidence).toContain("they'll ask");
    // s6 future
    expect(r.s6Future).toContain("their whole list");
    // s7StayPath — "they can't concentrate"
    expect(r.s7Stay).toContain("they can't concentrate");
  });

  it("renders natural sentences for girl — spot checks", () => {
    const r = renderAll("girl");
    expect(r.s1Flavor).toBe("whether the people around her feel connected to her");
    expect(r.mechanism).toContain("disconnected from how the people around her feel");
    expect(r.s1Evidence).toContain("she'll ask");
    expect(r.s6Future).toContain("her whole list");
  });

  it("renders natural sentences for boy — spot checks", () => {
    const r = renderAll("boy");
    expect(r.s1Flavor).toBe("whether the people around him feel connected to him");
    expect(r.mechanism).toContain("disconnected from how the people around him feel");
    expect(r.s1Evidence).toContain("he'll ask");
    expect(r.s6Future).toContain("his whole list");
  });
});
