// Tests for the two customer-safety gates in the Narrative Engine:
//
// Gate A — fetchPublishedNarrativeReport (lib/report/fetch-narrative.ts):
//   Page.tsx calls this to decide whether to render NarrativeReportView.
//   Must only return a report when status='published' AND superseded_by IS NULL.
//   A draft row (status='draft') must be invisible to this function.
//   confidence_vector must never appear in the SELECT columns.
//
// Gate B — generate route INSERT (app/api/report/generate/route.ts):
//   Must always insert new reports as status='draft', never 'published'.
//   A future refactor that accidentally changes this would bypass the draft/review
//   gate and immediately serve AI-generated content to live customers.
//
// Neither gate is testable via integration (would need a real DB + admin promote step),
// so these tests verify the SQL template literals and the response contract.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Gate A: fetchPublishedNarrativeReport ────────────────────────────────────

// Reuse the makeSql helper pattern from payment-capture.test.ts:
// vi.fn() at runtime accepts tagged-template-literal call signatures.
type FakeSql = Parameters<typeof import("@/lib/report/fetch-narrative").fetchPublishedNarrativeReport>[0];

function makeCapturingSql(results: unknown[][]) {
  const capturedStrings: string[][] = [];
  let callIndex = 0;
  const sql = vi.fn().mockImplementation((...args: unknown[]) => {
    capturedStrings.push(Array.from(args[0] as TemplateStringsArray));
    const result = results[callIndex++] ?? [];
    return Promise.resolve(result);
  });
  return { sql: sql as unknown as FakeSql, capturedStrings };
}

describe("fetchPublishedNarrativeReport — published-only gate", () => {
  it("returns null when sql returns no rows (e.g., only a draft row exists at DB level)", async () => {
    const { sql } = makeCapturingSql([[]]);
    const { fetchPublishedNarrativeReport } = await import("@/lib/report/fetch-narrative");
    const result = await fetchPublishedNarrativeReport(sql, "assess-001");
    expect(result).toBeNull();
  });

  it("returns the row when a published report exists", async () => {
    const row = {
      narrative_moments: [],
      archetype: "The All-In Kid",
      parent_instinct: "The Quick Fixer",
    };
    const { sql } = makeCapturingSql([[row]]);
    const { fetchPublishedNarrativeReport } = await import("@/lib/report/fetch-narrative");
    const result = await fetchPublishedNarrativeReport(sql, "assess-001");
    expect(result).toEqual(row);
  });

  it("SELECT query requires status = 'published'", async () => {
    const { sql, capturedStrings } = makeCapturingSql([[]]);
    const { fetchPublishedNarrativeReport } = await import("@/lib/report/fetch-narrative");
    await fetchPublishedNarrativeReport(sql, "assess-001");

    expect(capturedStrings).toHaveLength(1);
    const query = capturedStrings[0].join("");
    expect(query).toContain("status = 'published'");
  });

  it("SELECT query requires superseded_by IS NULL", async () => {
    const { sql, capturedStrings } = makeCapturingSql([[]]);
    const { fetchPublishedNarrativeReport } = await import("@/lib/report/fetch-narrative");
    await fetchPublishedNarrativeReport(sql, "assess-001");

    const query = capturedStrings[0].join("");
    expect(query).toContain("superseded_by IS NULL");
  });

  it("SELECT query never includes confidence_vector — internal-only column", async () => {
    const { sql, capturedStrings } = makeCapturingSql([[]]);
    const { fetchPublishedNarrativeReport } = await import("@/lib/report/fetch-narrative");
    await fetchPublishedNarrativeReport(sql, "assess-001");

    const query = capturedStrings[0].join("");
    expect(query).not.toContain("confidence_vector");
  });
});

// ── Gate B: generate route — draft INSERT ────────────────────────────────────

// Module-level variable so the getSql mock factory can close over it.
// Set in each test before calling POST.
let _mockSql: ReturnType<typeof vi.fn>;

vi.mock("@/lib/db/client", () => ({
  getSql: () => _mockSql,
}));
vi.mock("@/lib/boot-guard", () => ({
  assertBootGuards: vi.fn(),
}));
vi.mock("@/lib/graph/hdg", () => ({
  buildHdg: vi.fn(() => ({ nodes: [] })),
}));
vi.mock("@/lib/graph/behaviour-graph", () => ({
  buildBehaviourGraph: vi.fn(() => ({ signal_nodes: [], aggregates_edges: [] })),
}));
vi.mock("@/lib/graph/signature", () => ({
  buildBehaviourSignature: vi.fn(() => ({ dimensions: [] })),
}));
vi.mock("@/lib/graph/confidence", () => ({
  buildConfidenceVector: vi.fn(() => ({
    per_dimension_confidence: {},
    overall_confidence: 0.8,
    contradiction_score: 0,
    evidence_density: 1,
    evidence_quality: 0.8,
    missing_evidence: [],
  })),
}));
vi.mock("@/lib/graph/loop", () => ({
  buildFamilyAttentionLoop: vi.fn(() => ({
    detected: false,
    loop_tension_point: null,
    precedes_edges: [],
    pattern_summary: "",
    loop_description: null,
  })),
}));
vi.mock("@/lib/engine/scorer", () => ({
  scoreAssessment: vi.fn(() => ({
    archetype: "The All-In Kid",
    parent_pattern: "The Quick Fixer",
    archetype_fit_tier: "primary",
    parent_instinct_fit_tier: "primary",
    axes: {
      stability:  { value: 0.8, norm: 0.8, band: "Strong", eligible: true },
      resistance: { value: 0.6, norm: 0.6, band: "Mixed",  eligible: true },
      recovery:   { value: 0.5, norm: 0.5, band: "Mixed",  eligible: true },
    },
    weakest_two: [],
    honest_flag: false,
    honest_trigger: null,
    data_richness: 0.8,
  })),
  tallyDimension: vi.fn(() => ({ value: "unknown", consistency: 0, data_points: 0, winning_votes: 0 })),
}));
vi.mock("@/lib/narrative/context", () => ({
  buildNarrativeContext: vi.fn(() => ({
    childName: "Arjun",
    ageBand: "10-11",
    gender: "boy",
    parentName: "Priya",
    pronouns: { subj: "he", obj: "him", poss: "his", reflexive: "himself" },
    archetype: "The All-In Kid",
    archetypeFitTier: "primary",
    parentInstinct: "The Quick Fixer",
    parentInstinctFitTier: "primary",
    hdg: { nodes: [] },
    bg: { signal_nodes: [], aggregates_edges: [] },
    sig: { dimensions: [] },
    loop: { detected: false, loop_tension_point: null, precedes_edges: [], pattern_summary: "", loop_description: null },
    cv: { per_dimension_confidence: {}, overall_confidence: 0.8, contradiction_score: 0, evidence_density: 1, evidence_quality: 0.8, missing_evidence: [] },
    scoring: {},
  })),
}));
vi.mock("@/lib/quality/engine", () => ({
  runQualityEngine: vi.fn(async ({ moments }: { moments: unknown[] }) => ({
    moments,
    qualityResult: { passed: true, failures: [] },
  })),
}));

vi.mock("@/lib/narrative/compose-report", () => ({
  composeReport: vi.fn(async () => ({
    report: {
      moments: [],
      archetype: "The All-In Kid",
      archetype_fit_tier: "primary",
      parent_instinct: "The Quick Fixer",
      parent_instinct_fit_tier: "primary",
      schema_version: 1,
    },
    specs: {},
  })),
}));

const ASSESSMENT_ROW = {
  id: "assess-00000000-0000-0000-0000-000000000001",
  child_name: "Arjun",
  age_band: "10-11",
  child_gender: "boy",
  parent_name: "Priya",
  archetype: "The All-In Kid",
  parent_pattern: "The Quick Fixer",
  archetype_fit_tier: "primary",
  parent_instinct_fit_tier: "primary",
  answers: {},
  dimensions_json: {},
  weakest_two: [],
  generation_attempts: 0,
};

const VALID_SESSION_ID = "00000000-0000-0000-0000-000000000001";

// Returns a capturing sql mock + the template literal strings from all calls.
function makeRouteSql(
  results: unknown[][] = [
    [ASSESSMENT_ROW],                    // 1. SELECT assessments
    [],                                  // 2. SELECT existing reports (none — not cached)
    [{ generation_attempts: 1 }],        // 3. UPDATE...WHERE generation_attempts < 5 RETURNING → cap not hit
    [],                                  // 4. SELECT prior reports for opening_similarity
    [{ id: "rpt-001" }],                // 5. INSERT INTO reports RETURNING id
  ],
) {
  const capturedStrings: string[][] = [];
  let callIndex = 0;
  const sql = vi.fn().mockImplementation((...args: unknown[]) => {
    capturedStrings.push(Array.from(args[0] as TemplateStringsArray));
    const result = results[callIndex++] ?? [];
    return Promise.resolve(result);
  });
  return { sql, capturedStrings };
}

const TEST_ADMIN_KEY = "test-admin-key";

function makePostRequest(sessionId = VALID_SESSION_ID): NextRequest {
  return new Request(`http://localhost:3007/api/report/generate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${TEST_ADMIN_KEY}`,
    },
    body: JSON.stringify({ sessionId }),
  }) as unknown as NextRequest;
}

function makePostRequestNoAuth(sessionId = VALID_SESSION_ID): NextRequest {
  return new Request(`http://localhost:3007/api/report/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId }),
  }) as unknown as NextRequest;
}

describe("generate route — draft INSERT gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_API_KEY = TEST_ADMIN_KEY;
  });

  it("response always carries status='draft', never 'published'", async () => {
    const { sql } = makeRouteSql();
    _mockSql = sql;

    const { POST } = await import("@/app/api/report/generate/route");
    const res = await POST(makePostRequest());
    const body = await res.json() as { status: string; cached: boolean; reportId: string };

    expect(body.status).toBe("draft");
    expect(body.status).not.toBe("published");
    expect(body.cached).toBe(false);
    expect(body.reportId).toBe("rpt-001");
  });

  it("INSERT SQL template embeds 'draft' and never 'published' as status value", async () => {
    const { sql, capturedStrings } = makeRouteSql();
    _mockSql = sql;

    const { POST } = await import("@/app/api/report/generate/route");
    await POST(makePostRequest());

    // The INSERT call's template literal parts (everything except interpolated values)
    // must contain the literal string 'draft' as the status value.
    const insertCall = capturedStrings.find(parts =>
      parts.some(s => s.includes("INSERT INTO reports")),
    );
    expect(insertCall).toBeDefined();

    const sqlText = insertCall!.join(" ");
    expect(sqlText).toContain("'draft'");
    expect(sqlText).not.toContain("'published'");
  });

  it("INSERT SQL includes quality_check_results column", async () => {
    const { sql, capturedStrings } = makeRouteSql();
    _mockSql = sql;

    const { POST } = await import("@/app/api/report/generate/route");
    await POST(makePostRequest());

    const insertCall = capturedStrings.find(parts =>
      parts.some(s => s.includes("INSERT INTO reports")),
    );
    expect(insertCall).toBeDefined();
    expect(insertCall!.join(" ")).toContain("quality_check_results");
  });

  it("returns 422 and blocks INSERT when Quality Engine reports unresolved failures", async () => {
    const { runQualityEngine } = await import("@/lib/quality/engine");
    vi.mocked(runQualityEngine).mockResolvedValueOnce({
      moments: [],
      qualityResult: {
        passed: false,
        failures: [
          {
            check: "fit_tier_compliance",
            moment_id: "m_02",
            reason: "archetype label absent from Behaviour Pattern despite primary tier",
          },
        ],
      },
    });

    // 422 path: SELECT assessments, SELECT existing (not cached), UPDATE (returns row → not at cap), then 422
    const { sql, capturedStrings } = makeRouteSql([
      [ASSESSMENT_ROW],                  // SELECT assessments
      [],                                // SELECT existing reports (not cached)
      [{ generation_attempts: 1 }],      // UPDATE RETURNING → increment succeeded (counter drains budget even on 422)
    ]);
    _mockSql = sql;

    const { POST } = await import("@/app/api/report/generate/route");
    const res = await POST(makePostRequest());

    expect(res.status).toBe(422);
    const body = await res.json() as { error: string; failures: unknown[] };
    expect(body.error).toBe("quality_check_failed");
    expect(body.failures).toHaveLength(1);

    // generation_attempts was incremented before the quality engine ran —
    // 422-blocked attempts count against the cap the same as successful ones.
    const updateCall = capturedStrings.find(parts =>
      parts.some(s => s.includes("UPDATE assessments")) &&
      parts.some(s => s.includes("generation_attempts")),
    );
    expect(updateCall).toBeDefined();

    // Must not have proceeded to INSERT
    const insertCall = capturedStrings.find(parts =>
      parts.some(s => s.includes("INSERT INTO reports")),
    );
    expect(insertCall).toBeUndefined();
  });

  it("atomic UPDATE SQL template includes generation_attempts < cap in WHERE clause", async () => {
    // Structural guard: confirms the route uses the atomic form, not a separate JS check.
    // If a refactor reverts to `generation_attempts + 1 WHERE id = $1` without the cap guard,
    // this test catches it before concurrency bugs can appear in production.
    const { sql, capturedStrings } = makeRouteSql();
    _mockSql = sql;

    const { POST } = await import("@/app/api/report/generate/route");
    await POST(makePostRequest());

    const updateCall = capturedStrings.find(parts =>
      parts.some(s => s.includes("UPDATE assessments")) &&
      parts.some(s => s.includes("generation_attempts")),
    );
    expect(updateCall).toBeDefined();
    const updateSql = updateCall!.join(" ");
    // Must contain the atomic cap guard in the WHERE clause
    expect(updateSql).toContain("generation_attempts < ");
    // Must use RETURNING so the route can detect cap-hit (0 rows) vs success
    expect(updateSql).toContain("RETURNING");
  });

  it("concurrent: atomic UPDATE lets exactly one of two simultaneous calls succeed near the cap", async () => {
    // Simulates two concurrent requests for the same session, both arriving before either writes.
    // The atomic WHERE generation_attempts < 5 ensures only one can increment:
    //   - First call's UPDATE gets the row back (cap not yet hit) → proceeds to generate
    //   - Second call's UPDATE returns 0 rows (cap now hit) → blocked with 429
    // A content-aware mock is used instead of a sequential index mock so the test is
    // stable regardless of how the two async handlers interleave at await points.
    let updateCallCount = 0;
    const sql = vi.fn().mockImplementation((...args: unknown[]) => {
      const parts = (args[0] as TemplateStringsArray).join(" ");
      if (parts.includes("FROM assessments")) {
        return Promise.resolve([ASSESSMENT_ROW]);
      }
      if (parts.includes("UPDATE assessments")) {
        updateCallCount++;
        return updateCallCount === 1
          ? Promise.resolve([{ generation_attempts: 5 }])  // first call wins
          : Promise.resolve([]);                            // second call: cap already hit
      }
      if (parts.includes("INSERT INTO reports")) {
        return Promise.resolve([{ id: "rpt-concurrent-001" }]);
      }
      // covers: SELECT existing reports, SELECT prior reports, force-regen UPDATE reports
      return Promise.resolve([]);
    });
    _mockSql = sql;

    const { POST } = await import("@/app/api/report/generate/route");
    const [res1, res2] = await Promise.all([
      POST(makePostRequest()),
      POST(makePostRequest()),
    ]);

    const statuses = [res1.status, res2.status].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 429]);

    const [body1, body2] = await Promise.all([res1.json(), res2.json()]) as Record<string, unknown>[];
    const allBodies = [body1, body2];
    expect(allBodies.some(b => b["status"] === "draft")).toBe(true);
    expect(allBodies.some(b => b["error"] === "generation_limit_reached")).toBe(true);
  });

  it("returns cached=true and skips INSERT when a non-superseded report already exists", async () => {
    // When a cached report is found, the route returns early before QE or INSERT.
    const { sql, capturedStrings } = makeRouteSql([
      [ASSESSMENT_ROW],                           // SELECT assessments
      [{ id: "existing-rpt", status: "draft" }],  // SELECT existing reports — found one (early return)
    ]);
    _mockSql = sql;

    const { POST } = await import("@/app/api/report/generate/route");
    const res = await POST(makePostRequest());
    const body = await res.json() as { cached: boolean; reportId: string; status: string };

    expect(body.cached).toBe(true);
    expect(body.reportId).toBe("existing-rpt");

    // No INSERT should have been called
    const insertCall = capturedStrings.find(parts =>
      parts.some(s => s.includes("INSERT INTO reports")),
    );
    expect(insertCall).toBeUndefined();
  });

  it("returns 401 when Authorization header is missing", async () => {
    const { sql } = makeRouteSql([[ASSESSMENT_ROW]]);
    _mockSql = sql;

    const { POST } = await import("@/app/api/report/generate/route");
    const res = await POST(makePostRequestNoAuth());

    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 429 and blocks generation when total attempt cap is reached", async () => {
    // Atomic path: the UPDATE WHERE generation_attempts < 5 returns 0 rows when already at cap.
    // The JS no longer reads generation_attempts from the fetched row — the DB enforces the cap.
    const { sql, capturedStrings } = makeRouteSql([
      [ASSESSMENT_ROW],  // SELECT assessments (generation_attempts value is irrelevant to the route)
      [],                // SELECT existing reports (not cached)
      [],                // UPDATE RETURNING → 0 rows (cap already at max) → 429
    ]);
    _mockSql = sql;

    const { POST } = await import("@/app/api/report/generate/route");
    const res = await POST(makePostRequest());

    expect(res.status).toBe(429);
    const body = await res.json() as { error: string; limit: number };
    expect(body.error).toBe("generation_limit_reached");
    expect(body.limit).toBe(5);

    // The atomic UPDATE was attempted (that's how the cap is enforced now), but INSERT must not follow.
    const updateCall = capturedStrings.find(parts =>
      parts.some(s => s.includes("UPDATE assessments")),
    );
    expect(updateCall).toBeDefined();
    expect(updateCall!.join(" ")).toContain("generation_attempts < ");

    const insertCall = capturedStrings.find(parts =>
      parts.some(s => s.includes("INSERT INTO reports")),
    );
    expect(insertCall).toBeUndefined();
  });
});
