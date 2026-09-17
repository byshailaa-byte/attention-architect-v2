import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { SAFEGUARDING_RESPONSE } from "@/content/goals";

// Module-level sql mock, closed over by the getSql factory. Reset per test.
let _mockSql: ReturnType<typeof vi.fn>;
let _capturedSql: string[] = [];

vi.mock("@/lib/db/client", () => ({ getSql: () => _mockSql }));
vi.mock("@/lib/boot-guard", () => ({ assertBootGuards: vi.fn() }));

// Import the route AFTER the mocks are registered.
import { POST } from "@/app/api/report/goal/route";

const VALID_SESSION = "00000000-0000-0000-0000-000000000001";

// Returns a tagged-template sql mock that yields `results` in call order and
// records each statement's SQL text (for asserting which write happened).
function makeSql(results: unknown[][]) {
  _capturedSql = [];
  let i = 0;
  return vi.fn().mockImplementation((strings: TemplateStringsArray) => {
    _capturedSql.push(strings.join(" ? "));
    return Promise.resolve(results[i++] ?? []);
  });
}

function post(body: Record<string, unknown>): NextRequest {
  return new Request("http://localhost:3007/api/report/goal", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/report/goal", () => {
  it("valid recommended write: stores authored goal, returns rendered text (no Gate-3 fields)", async () => {
    _mockSql = makeSql([
      [{ child_name: "Arjun", child_gender: "boy" }], // SELECT child identity
      [{ id: "a" }],                                  // UPDATE ... RETURNING id
    ]);
    const res = await POST(post({ sessionId: VALID_SESSION, skill: "Starting", goalKey: "starting-1", source: "recommended" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.skill).toBe("Starting");
    expect(json.goalKey).toBe("starting-1");
    // child name substituted, no leftover tokens
    expect(json.goalText).toContain("Arjun");
    expect(json.goalText).not.toContain("{{");
    // Gate 3: response must not carry these
    expect(json).not.toHaveProperty("goal_flagged");
    expect(json).not.toHaveProperty("goal_free_text");
    // the write set goal_flagged = false, not true
    expect(_capturedSql.some((s) => /goal_key\s*=/.test(s) && /goal_flagged\s*=\s*false/.test(s))).toBe(true);
  });

  it("valid free_text write: goalKey null, goal_text is the typed text (no SELECT/render)", async () => {
    _mockSql = makeSql([[{ id: "a" }]]); // single UPDATE ... RETURNING id, no child SELECT
    const typed = "I just want him to sit down without a fight";
    const res = await POST(post({ sessionId: VALID_SESSION, skill: "Starting", source: "free_text", freeText: typed }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.skill).toBe("Starting");
    expect(json.goalKey).toBeNull();
    expect(json.goalText).toBe(typed); // parent's own words, not run through fillLmsContent
    expect(_mockSql).toHaveBeenCalledTimes(1); // no child-identity SELECT for free_text
  });

  it("free_text with a goalKey: rejected", async () => {
    _mockSql = makeSql([]);
    const res = await POST(post({ sessionId: VALID_SESSION, skill: "Starting", goalKey: "starting-1", source: "free_text", freeText: "my own goal" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/goalKey.*free_text/i);
    expect(_mockSql).not.toHaveBeenCalled();
  });

  it("free_text with empty text: rejected (a free-text goal needs text)", async () => {
    _mockSql = makeSql([]);
    const res = await POST(post({ sessionId: VALID_SESSION, skill: "Starting", source: "free_text", freeText: "   " }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/freeText.*required/i);
  });

  it("recommended with freeText: rejected (freeText belongs only to free_text)", async () => {
    _mockSql = makeSql([]);
    const res = await POST(post({ sessionId: VALID_SESSION, skill: "Starting", goalKey: "starting-1", source: "recommended", freeText: "extra note" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/freeText.*not allowed/i);
  });

  it("flagged text: records only goal_flagged, returns fixed copy, nothing else (skips validation)", async () => {
    _mockSql = makeSql([[]]); // UPDATE goal_flagged = true
    // deliberately pass an INVALID skill to prove the screen precedes validation
    const res = await POST(post({ sessionId: VALID_SESSION, skill: "NotASkill", goalKey: "x", source: "bogus", freeText: "he keeps saying he wants to hurt himself" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.safeguarding).toBe(SAFEGUARDING_RESPONSE);
    // Gate 3: no reason category, no flag boolean, no echo of the input
    expect(JSON.stringify(json)).not.toContain("self_harm");
    expect(JSON.stringify(json)).not.toContain("hurt himself");
    expect(json).not.toHaveProperty("reason");
    expect(json).not.toHaveProperty("flagged");
    // only the flag write happened — no goal_skill/key/text/source write
    expect(_capturedSql.some((s) => /goal_flagged\s*=\s*true/.test(s))).toBe(true);
    expect(_capturedSql.some((s) => /goal_key\s*=/.test(s))).toBe(false);
  });

  it("over-200 free text: rejected, not truncated", async () => {
    _mockSql = makeSql([]);
    const res = await POST(post({ sessionId: VALID_SESSION, skill: "Starting", goalKey: "starting-1", source: "free_text", freeText: "a".repeat(201) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/200/);
    expect(_mockSql).not.toHaveBeenCalled(); // no DB write on rejection
  });

  it("unknown skill: 400", async () => {
    _mockSql = makeSql([]);
    const res = await POST(post({ sessionId: VALID_SESSION, skill: "Flying", goalKey: "starting-1", source: "recommended" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/skill/i);
  });

  it("unknown goalKey for a valid skill: 400", async () => {
    _mockSql = makeSql([]);
    const res = await POST(post({ sessionId: VALID_SESSION, skill: "Starting", goalKey: "starting-99", source: "recommended" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/goalKey/i);
  });

  it("unknown source: 400", async () => {
    _mockSql = makeSql([]);
    const res = await POST(post({ sessionId: VALID_SESSION, skill: "Starting", goalKey: "starting-1", source: "made-up" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/source/i);
  });
});
