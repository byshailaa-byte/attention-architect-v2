import { describe, it, expect } from "vitest";
import { fillTokens, agreementErrors, type Gender } from "@/lib/report/pronouns";
import { allStems } from "@/content/assessment/worry-stems";

// Every template in worry-stems.ts, rendered for boy/girl/unset, must: resolve all tokens, carry
// no "they's" or "they <verb>s" agreement break, and read with correct agreement. This test is the
// one that MISSED the old bug ("they's supposed", "they loves"); the scan below now catches it.

const GENDERS: { label: string; g: Gender }[] = [
  { label: "boy", g: "boy" }, { label: "girl", g: "girl" }, { label: "unset", g: null },
];
const STEMS = allStems().flatMap((s) => [s.g1, s.g2]);
const NAME = "Reyansh";

// Returns the reasons a rendered string is broken (empty = clean).
function stemViolations(rendered: string): string[] {
  const out: string[] = [];
  if (/\bthey'?s\b/i.test(rendered)) out.push(`"they's" contraction`);
  // "they <verb>s" (singular-they must take the base verb) — allow the known plural-noun "they focus".
  const m = rendered.match(/\bthey\s+([a-z]+s)\b/i);
  if (m && m[1].toLowerCase() !== "focus") out.push(`"they ${m[1]}" (singular they takes base verb)`);
  if (/\{[^}]*\}|\{s:|\|\}/.test(rendered)) out.push(`leftover token`);
  return out;
}

describe("assessment v3 worry stems — every template, boy/girl/unset", () => {
  it("collected 7 worries × 2 stems", () => {
    expect(STEMS.length).toBe(14);
  });

  it("no they's / they-<verb>s / leftover tokens, any gender", () => {
    const hits: string[] = [];
    for (const { label, g } of GENDERS) {
      const fill = fillTokens(NAME, g);
      for (const t of STEMS) { const o = fill(t); const v = stemViolations(o); if (v.length) hits.push(`[${label}] ${v.join(", ")} :: ${o}`); }
    }
    expect(hits).toEqual([]);
  });

  it("shared agreementErrors() finds no fault, any gender", () => {
    const hits: string[] = [];
    for (const { label, g } of GENDERS) {
      const fill = fillTokens(NAME, g);
      for (const t of STEMS) { const errs = agreementErrors(fill(t), NAME); if (errs.length) hits.push(`[${label}] ${errs.join("; ")} :: ${fill(t)}`); }
    }
    expect(hits).toEqual([]);
  });

  // Proof the scan WOULD have caught the old bug — these are the exact old unset renders.
  it("the scan catches the OLD buggy renders (regression guard)", () => {
    expect(stemViolations("…something they's supposed to be doing?").length).toBeGreaterThan(0);
    expect(stemViolations("when Sam is deep in something they loves").length).toBeGreaterThan(0);
    expect(stemViolations("but when they's absorbed in something").length).toBeGreaterThan(0);
    // …and passes the corrected forms.
    expect(stemViolations("something they're supposed to be doing?")).toEqual([]);
    expect(stemViolations("when Sam gets completely absorbed in something")).toEqual([]);
  });

  it("G1 is the ORIGINAL wording for every worry (only G2 is worry-specific)", () => {
    const g1s = allStems().map((s) => s.g1);
    expect(new Set(g1s).size).toBe(1); // all identical
    expect(g1s[0]).toContain("completely absorbed");
  });
});
