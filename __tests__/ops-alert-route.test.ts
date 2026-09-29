// Ops-alert wiring in the auto-generate route:
//  - composeReport throws  → sendOpsAlert fires (stage-labelled) AND the error re-throws
//  - quality fails         → sendOpsAlert fires, route returns {stored:false} (no throw)
// The route's many collaborators are mocked so the test exercises only the alert wiring.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const h = vi.hoisted(() => ({
  sqlMock: vi.fn(),
  sendOpsAlertMock: vi.fn(),
  composeReportMock: vi.fn(),
  runQualityEngineMock: vi.fn(),
}));

vi.mock("@/lib/boot-guard", () => ({ assertBootGuards: () => {} }));
vi.mock("@/lib/db/client", () => ({ getSql: () => h.sqlMock }));
vi.mock("@/lib/alerts/notify", () => ({
  sendOpsAlert: h.sendOpsAlertMock,
  opsAlertBody: (f: Record<string, unknown>) => JSON.stringify(f),
}));
vi.mock("@/lib/graph/hdg", () => ({ buildHdg: () => ({}) }));
vi.mock("@/lib/graph/behaviour-graph", () => ({ buildBehaviourGraph: () => ({}) }));
vi.mock("@/lib/graph/signature", () => ({ buildBehaviourSignature: () => ({ dimensions: [] }) }));
vi.mock("@/lib/graph/confidence", () => ({ buildConfidenceVector: () => ({ overall_confidence: 1 }) }));
vi.mock("@/lib/graph/loop", () => ({ buildFamilyAttentionLoop: () => ({ detected: false }) }));
vi.mock("@/lib/engine/scorer", () => ({
  tallyDimension: () => ({ value: "x", consistency: 0, data_points: 0, winning_votes: 0 }),
  scoreAssessment: () => ({ archetype_fit_tier: "primary", parent_instinct_fit_tier: "primary" }),
}));
vi.mock("@/lib/narrative/context", () => ({ buildNarrativeContext: () => ({ archetype: "The Explorer" }) }));
vi.mock("@/lib/narrative/compose-report", () => ({ composeReport: h.composeReportMock, TEASER_FIXED_CLOSE: "CLOSE" }));
vi.mock("@/lib/quality/engine", () => ({ runQualityEngine: h.runQualityEngineMock }));
vi.mock("@/lib/narrative/simplified-strengths", () => ({ generateSimplifiedStrengths: vi.fn(), selectStrengthDimensions: () => [] }));
vi.mock("@/lib/narrative/simplified-actions", () => ({ generateSimplifiedActions: vi.fn(), selectActionDimensions: () => [] }));
vi.mock("@/lib/narrative/simplified-reformatter", () => ({ reformatM01: vi.fn() }));
vi.mock("@/lib/narrative/instinct-interaction-fallback", () => ({ generateInstinctInteractionFallback: vi.fn(), selectFallbackDimensions: () => [] }));
vi.mock("@/lib/report/pronouns", () => ({ CHILD_NAME_FALLBACK: "your child", resolveChildPronoun: () => "they" }));

const SESSION = "11111111-1111-1111-1111-111111111111";
const assessmentRow = {
  id: "22222222-2222-2222-2222-222222222222",
  child_name: null, age_band: "10-11", child_gender: null, parent_name: null,
  archetype: "The Explorer", parent_pattern: "The Pusher",
  archetype_fit_tier: "primary", parent_instinct_fit_tier: "primary",
  concerns: [], worry_followup: null, worry_followup_other: null,
  answers: {}, dimensions_json: {}, weakest_two: [], generation_attempts: 1,
};

// SQL calls in order: settings, assessment, existing-report, attempt-increment,
// auto_generated count, priorRows. Unspecified calls default to [].
const BASE: unknown[][] = [
  [{ key: "auto_generate_enabled", value: "true" }, { key: "auto_generate_pipeline_start_at", value: "2026-01-01T00:00:00.000Z" }],
  [assessmentRow],
  [],
  [{ generation_attempts: 2 }],
  [{ n: "5" }],
  [],
];

function queueSql(results: unknown[][]) {
  let i = 0;
  h.sqlMock.mockImplementation(() => Promise.resolve(results[i++] ?? []));
}

function makeReq(): NextRequest {
  return {
    headers: { get: (k: string) => (k.toLowerCase() === "x-internal-secret" ? "test-secret" : null) },
    json: async () => ({ sessionId: SESSION }),
  } as unknown as NextRequest;
}

describe("auto-generate route — ops alert wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_SECRET = "test-secret";
  });

  it("alerts and RE-THROWS when composeReport throws", async () => {
    queueSql(BASE);
    h.composeReportMock.mockRejectedValue(new Error("compose boom"));

    const { POST } = await import("@/app/api/internal/report/auto-generate/route");
    await expect(POST(makeReq())).rejects.toThrow("compose boom");

    expect(h.sendOpsAlertMock).toHaveBeenCalledTimes(1);
    expect(String(h.sendOpsAlertMock.mock.calls[0][0])).toContain("Report generation failed");
    // body carries the stage that failed + the error message
    expect(String(h.sendOpsAlertMock.mock.calls[0][1])).toContain("compose");
  });

  it("alerts (no throw) when quality fails and returns stored:false", async () => {
    queueSql(BASE);
    h.composeReportMock.mockResolvedValue({
      report: { moments: [], archetype: "The Explorer", archetype_fit_tier: "primary", parent_instinct: "The Pusher", parent_instinct_fit_tier: "primary", schema_version: 1 },
      specs: {},
    });
    h.runQualityEngineMock.mockResolvedValue({ moments: [], qualityResult: { passed: false, failures: [{ check: "tone" }] } });

    const { POST } = await import("@/app/api/internal/report/auto-generate/route");
    const res = await POST(makeReq());
    const body = await res.json();

    expect(body.stored).toBe(false);
    expect(h.sendOpsAlertMock).toHaveBeenCalledTimes(1);
    expect(String(h.sendOpsAlertMock.mock.calls[0][0])).toContain("quality failed");
  });
});
