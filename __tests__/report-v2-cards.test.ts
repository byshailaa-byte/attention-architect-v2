import { describe, it, expect, vi } from "vitest";
import { clampCard, parseCardParam, CARD_TOTAL } from "@/lib/report-v2/cards-nav";

vi.mock("@/lib/boot-guard", () => ({ assertBootGuards: () => {} }));

describe("Report v2 card routing (?card=N)", () => {
  it("clamps to [1, 7]", () => {
    expect(clampCard(0)).toBe(1);
    expect(clampCard(1)).toBe(1);
    expect(clampCard(7)).toBe(7);
    expect(clampCard(99)).toBe(CARD_TOTAL);
    expect(clampCard(-3)).toBe(1);
    expect(clampCard("4")).toBe(4);
    expect(clampCard("banana")).toBe(1);
    expect(clampCard(undefined)).toBe(1);
  });

  it("parses the ?card= param (undefined when absent/invalid → deck starts at 1)", () => {
    expect(parseCardParam(undefined)).toBeUndefined();
    expect(parseCardParam("3")).toBe(3);
    expect(parseCardParam(["5", "2"])).toBe(5);
    expect(parseCardParam("0")).toBeUndefined();
    expect(parseCardParam("x")).toBeUndefined();
    expect(parseCardParam("12")).toBe(CARD_TOTAL); // capped
  });
});

describe("POST /api/report/goal-v2 — goal sheet saves to report_v2_goal", () => {
  function load() {
    const calls: { text: string; values: unknown[] }[] = [];
    const sql = Object.assign(
      (strings: TemplateStringsArray, ...values: unknown[]) => {
        const text = strings.join("?");
        calls.push({ text, values });
        if (/UPDATE assessments/.test(text)) return Promise.resolve([{ session_id: "x" }]);
        return Promise.resolve([]);
      },
      {},
    );
    vi.doMock("@/lib/db/client", () => ({ getSql: () => sql }));
    return { calls };
  }

  const SID = "11111111-1111-1111-1111-111111111111";
  const req = (body: unknown) => ({ json: async () => body } as unknown as import("next/server").NextRequest);

  it("updates report_v2_goal and fires goal_changed", async () => {
    vi.resetModules();
    const { calls } = load();
    const { POST } = await import("@/app/api/report/goal-v2/route");
    const res = await POST(req({ sessionId: SID, goal: "Mia starts on her own, the first time.", goalKey: "reminders" }));
    expect(res.status).toBe(200);
    expect(calls.some((c) => /UPDATE assessments SET report_v2_goal/.test(c.text))).toBe(true);
    expect(calls.some((c) => /funnel_events/.test(c.text) && /goal_changed/.test(c.text))).toBe(true);
  });

  it("rejects an invalid sessionId", async () => {
    vi.resetModules();
    load();
    const { POST } = await import("@/app/api/report/goal-v2/route");
    const res = await POST(req({ sessionId: "nope", goal: "x" }));
    expect(res.status).toBe(400);
  });

  it("rejects an over-long goal", async () => {
    vi.resetModules();
    load();
    const { POST } = await import("@/app/api/report/goal-v2/route");
    const res = await POST(req({ sessionId: SID, goal: "x".repeat(201) }));
    expect(res.status).toBe(400);
  });

  it("rejects an unknown goalKey", async () => {
    vi.resetModules();
    load();
    const { POST } = await import("@/app/api/report/goal-v2/route");
    const res = await POST(req({ sessionId: SID, goal: "ok goal", goalKey: "banana" }));
    expect(res.status).toBe(400);
  });
});
