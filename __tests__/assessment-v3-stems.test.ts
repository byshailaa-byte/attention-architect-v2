import { describe, it, expect } from "vitest";
import { fillTokens, agreementErrors, type Gender } from "@/lib/report/pronouns";
import { allStems } from "@/content/assessment/worry-stems";

// Every worry-specific G1/G2 stem, rendered for boy/girl/unset, must resolve all tokens and read
// with correct agreement, and use the right gendered pronoun.
const GENDERS: { label: string; g: Gender }[] = [
  { label: "boy", g: "boy" }, { label: "girl", g: "girl" }, { label: "unset", g: null },
];
const STEMS = allStems().flatMap((s) => [s.g1, s.g2]);
const NAME = "Reyansh";

describe("assessment v3 worry stems — agreement over boy/girl/unset", () => {
  it("collected 7 worries × 2 stems", () => {
    expect(STEMS.length).toBe(14);
  });

  it("no leftover {tokens}, any gender", () => {
    const bad: string[] = [];
    for (const { label, g } of GENDERS) {
      const fill = fillTokens(NAME, g);
      for (const t of STEMS) { const o = fill(t); if (/\{[^}]*\}|\{s:|\|\}/.test(o)) bad.push(`[${label}] ${o}`); }
    }
    expect(bad).toEqual([]);
  });

  it("shared agreementErrors() finds no fault, any gender", () => {
    const hits: string[] = [];
    for (const { label, g } of GENDERS) {
      const fill = fillTokens(NAME, g);
      for (const t of STEMS) { const errs = agreementErrors(fill(t), NAME); if (errs.length) hits.push(`[${label}] ${errs.join("; ")} :: ${fill(t)}`); }
    }
    expect(hits).toEqual([]);
  });

  it("boy uses him/his — never them/their/they/her", () => {
    const fill = fillTokens(NAME, "boy");
    expect(STEMS.map(fill).filter((o) => /\b(them|their|themselves|themself|they|they're|her|herself)\b/i.test(o))).toEqual([]);
  });

  it("girl uses her — never them/their/they/him/his", () => {
    const fill = fillTokens(NAME, "girl");
    expect(STEMS.map(fill).filter((o) => /\b(them|their|themselves|themself|they|they're|him|his|himself)\b/i.test(o))).toEqual([]);
  });
});
