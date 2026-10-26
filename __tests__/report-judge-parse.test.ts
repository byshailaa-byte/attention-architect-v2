import { describe, it, expect } from "vitest";
import { parseJudgeFailed } from "@/lib/report-v2/judge";

// Regression for the verdict parse bug: the judge's reasons routinely contain the words "failure" /
// "failed" / "pass" (the giveup worry's moment is literally "after the first failure"). The parser must
// read ONLY the PASS/FAIL token after "Qn:", never match those words inside the reason prose.
describe("parseJudgeFailed — reads the verdict token, not words in the reason", () => {
  it("Q1 PASS whose reason says 'after the first failure' is NOT a failure", () => {
    const text = [
      "Q1: PASS — the real reason fits the moment after the first failure; switch matches Week 1",
      "Q2: PASS — a parent could picture it",
      "Q3: PASS — shows focusing well",
      "Q4: PASS — no parent blame",
    ].join("\n");
    expect(parseJudgeFailed(text)).toEqual([]);
  });

  it("'the child failed and then tried again' in a PASS reason does not flip Q1", () => {
    const text = "Q1: PASS — coherent even though the child failed and tried again\nQ2: PASS\nQ3: PASS\nQ4: PASS";
    expect(parseJudgeFailed(text)).toEqual([]);
  });

  it("a genuine FAIL is still caught; a 'pass'/'failed' word elsewhere does not mask it", () => {
    const text = "Q1: FAIL — drifts to generic advice\nQ2: PASS — easy to pass, clear\nQ3: PASS\nQ4: PASS";
    expect(parseJudgeFailed(text)).toEqual(["coherence"]);
  });

  it("handles markdown-bolded tokens and a mix", () => {
    const text = "Q1: **PASS** — fine\nQ2: **FAIL** — vague\nQ3: PASS — strength moment\nQ4: FAIL — 'you push' blames the parent";
    expect(parseJudgeFailed(text)).toEqual(["usability", "relationship"]);
  });

  it("a missing question line fails closed", () => {
    const text = "Q1: PASS — fine\nQ2: PASS — fine\nQ4: PASS — fine"; // Q3 absent
    expect(parseJudgeFailed(text)).toEqual(["seenIt"]);
  });
});
