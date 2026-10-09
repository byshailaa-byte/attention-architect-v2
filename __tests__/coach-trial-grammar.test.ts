import { describe, it, expect } from "vitest";
import { fillTokens, agreementErrors, type Gender } from "@/lib/report/pronouns";
import { allOnboardingTemplates, baselineConfirm } from "@/lib/coach-trial/onboarding";
import { splitBold } from "@/lib/coach-trial/markdown";

// Every FIXED onboarding template, rendered for boy / girl / unset, must: resolve all tokens,
// read with correct agreement (singular-they takes plural verbs), and use the right gendered
// pronoun — a boy report must never say them/their/they, a girl never him/his/they.
const GENDERS: { label: string; g: Gender }[] = [
  { label: "boy", g: "boy" }, { label: "girl", g: "girl" }, { label: "unset", g: null },
];
const TEMPLATES = allOnboardingTemplates();
const NAME = "Aarav";

describe("coach-trial onboarding templates — agreement over boy/girl/unset", () => {
  it("collected the templates", () => {
    expect(TEMPLATES.length).toBeGreaterThan(15);
  });

  it("no leftover {tokens} / {s:|} leaks, any gender", () => {
    const leftover: string[] = [];
    for (const { label, g } of GENDERS) {
      const fill = fillTokens(NAME, g);
      for (const t of TEMPLATES) {
        const out = fill(t);
        const m = out.match(/\{[^}]*\}|\{s:|\|\}/);
        if (m) leftover.push(`[${label}] ${m[0]} :: ${out}`);
      }
    }
    expect(leftover).toEqual([]);
  });

  it("shared agreementErrors() finds no fault, any gender", () => {
    const hits: string[] = [];
    for (const { label, g } of GENDERS) {
      const fill = fillTokens(NAME, g);
      for (const t of TEMPLATES) {
        const out = fill(t);
        const errs = agreementErrors(out, NAME);
        if (errs.length) hits.push(`[${label}] ${errs.join("; ")} :: ${out}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("boy render uses him/his — never them/their/they/her", () => {
    const fill = fillTokens(NAME, "boy");
    const hits = TEMPLATES.map(fill).filter((o) => /\b(them|their|themselves|themself|they|her|herself)\b/i.test(o));
    expect(hits).toEqual([]);
  });

  it("girl render uses her — never them/their/they/him/his", () => {
    const fill = fillTokens(NAME, "girl");
    const hits = TEMPLATES.map(fill).filter((o) => /\b(them|their|themselves|themself|they|him|his|himself)\b/i.test(o));
    expect(hits).toEqual([]);
  });
});

describe("baseline confirm includes the unit per worry", () => {
  it("reminders/screens → reminders; homework → minutes; confidence/giveup → times; finish → done", () => {
    expect(baselineConfirm("reminders", "3", "3")).toContain("3 reminders");
    expect(baselineConfirm("reminders", "1", "1")).toContain("1 reminder"); // singular
    expect(baselineConfirm("screens", "5+", "5+")).toContain("5+ reminders");
    expect(baselineConfirm("homework", "10–20", "10–20 min")).toContain("10–20 minutes");
    expect(baselineConfirm("confidence", "2", "2")).toContain("2 times");
    expect(baselineConfirm("giveup", "0", "0")).toContain("0 times");
    expect(baselineConfirm("finish", "half", "About half")).toContain("half done");
    expect(baselineConfirm("finish", "none", "None")).toContain("nothing done");
  });
});

describe("splitBold — safe bold-only markdown for Coach bubbles", () => {
  it("splits **bold** out and leaves plain text alone", () => {
    expect(splitBold("Say **this exactly** tonight.")).toEqual([
      { bold: false, text: "Say " },
      { bold: true, text: "this exactly" },
      { bold: false, text: " tonight." },
    ]);
    expect(splitBold("no markup here")).toEqual([{ bold: false, text: "no markup here" }]);
    // never emits HTML/other tags — only {bold,text} parts
    expect(splitBold("<b>x</b> **y**").every((p) => typeof p.text === "string")).toBe(true);
  });
});
