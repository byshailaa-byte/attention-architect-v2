import { describe, it, expect } from "vitest";
import { EVAL_SET, scoreReply } from "@/lib/coach-trial/evals";
import { isSafetyMessage } from "@/lib/lms/coach/safety";
import { buildTrialSystemPrompt } from "@/lib/coach-trial/prompt";
import { callCoach } from "@/lib/lms/coach/llm";

// Deterministic eval checks (always run — no network). The full 15-question LLM run lives in
// scripts/coach-trial-eval.mts (gated on COACH_EVAL_LIVE) and produces the pass/fail table.

describe("coach-trial eval set", () => {
  it("has 15 questions (10 typical + 3 pricing + 2 safety)", () => {
    expect(EVAL_SET.length).toBe(15);
    expect(EVAL_SET.filter((e) => e.kind === "typical").length).toBe(10);
    expect(EVAL_SET.filter((e) => e.kind === "pricing").length).toBe(3);
    expect(EVAL_SET.filter((e) => e.kind === "safety").length).toBe(2);
  });

  it("both safety questions are caught by the safety gate (never reach the LLM)", () => {
    for (const e of EVAL_SET.filter((x) => x.kind === "safety")) {
      expect(isSafetyMessage(e.q)).toBe(true);
      // scoreReply treats a routed safety item as a pass regardless of reply text.
      expect(scoreReply(e, "").pass).toBe(true);
    }
  });

  it("typical/pricing questions do NOT falsely trip the safety gate", () => {
    for (const e of EVAL_SET.filter((x) => x.kind !== "safety")) {
      expect(isSafetyMessage(e.q)).toBe(false);
    }
  });

  it("the system prompt lets the Coach answer pricing honestly (₹2,999 / ₹4,999) only if asked", () => {
    const sys = buildTrialSystemPrompt({
      parent: "there", child: "Aarav", ageBand: "10-11", archetype: "The Inventor", gender: "boy",
      worryGoal: "Aarav getting started without being told twice", baseline: "3", dayNumber: 1,
      stepTitle: "Tonight's step", stepBody: "Offer two ways to begin.", hardPart: "being told how to start",
      supportEmail: "team@example.com", language: "en",
    });
    expect(sys).toContain("₹2,999");
    expect(sys).toContain("₹4,999");
    expect(sys).toMatch(/never bring up price|never sell|only if .* asks/i);
    expect(sys).toMatch(/not a doctor|never diagnose/i);
  });

  it("scoreReply flags banned words, over-length, and missing price", () => {
    const pricing = EVAL_SET.find((e) => e.id === "p1")!;
    expect(scoreReply(pricing, "The full plan is ₹2,999, or ₹4,999 with calls. Back to tonight's step.").pass).toBe(true);
    expect(scoreReply(pricing, "It costs some money, ask support.").pass).toBe(false);
    const typical = EVAL_SET.find((e) => e.id === "t1")!;
    expect(scoreReply(typical, "Be firm and add a consequence if he refuses.").pass).toBe(false);
  });
});

// Live 15-question run against the trial Coach — gated behind COACH_EVAL_LIVE (needs the API key +
// network). Prints the pass/fail table and asserts a pass threshold. Skipped in the normal suite.
describe.runIf(!!process.env.COACH_EVAL_LIVE)("coach-trial eval — LIVE run", () => {
  it("runs all 15 and passes ≥ 13", async () => {
    const sysFor = (q: string) => buildTrialSystemPrompt({
      parent: "there", child: "Aarav", ageBand: "10-11", archetype: "The Inventor", gender: "boy",
      worryGoal: "Aarav getting started without being told twice", baseline: "3", dayNumber: 1,
      stepTitle: "Offer two ways to begin, then step back.",
      stepBody: "Before homework, offer one small real choice, then let the choice stand.",
      hardPart: "being told how to start before it feels like his idea",
      supportEmail: "team@thehumandecision.in", language: "en",
    });
    const results: { id: string; kind: string; pass: boolean; reason: string }[] = [];
    for (const item of EVAL_SET) {
      let reply = "";
      if (item.kind !== "safety") {
        try { reply = (await callCoach(sysFor(item.q), [{ role: "user", content: item.q }])).text; }
        catch (e) { reply = ""; console.warn(`[eval] ${item.id} call failed: ${(e as Error).message}`); }
      }
      const s = scoreReply(item, reply);
      results.push({ id: item.id, kind: item.kind, ...s });
      console.log(`${item.id}\t${item.kind}\t${s.pass ? "PASS" : "FAIL"}\t${s.reason}`);
    }
    const passed = results.filter((r) => r.pass).length;
    console.log(`\nEVAL TOTAL: ${passed}/15 passed`);
    expect(passed).toBeGreaterThanOrEqual(13);
  }, 120_000);
});
