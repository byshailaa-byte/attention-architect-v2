import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

import { resolveFlowVariant, getFlowSid, FLOW_SID_KEY } from "@/lib/flow/session";
import { deviceFromUA } from "@/lib/flow/device";
import { isValidEmail, isValidIndianMobile, childStepReady, detailsReady } from "@/lib/flow/validate";
import { HALFWAY_FIRST_READ, HALFWAY_FIRST_READ_FALLBACK, fillHalfwayLine } from "@/content/assessment/halfway-first-read";
import { POST as partialArchetypePOST } from "@/app/api/flow/partial-archetype/route";

// ── Flow arm resolution (opt-in: only ?flow=v2) ──────────────────────────────
describe("resolveFlowVariant — new flow is opt-in", () => {
  it("only ?flow=v2 selects v2; default and ?flow=v1 stay v1", () => {
    expect(resolveFlowVariant("v2")).toBe("v2");
    expect(resolveFlowVariant("v1")).toBe("v1");
    expect(resolveFlowVariant(null)).toBe("v1");
    expect(resolveFlowVariant("")).toBe("v1");
    expect(resolveFlowVariant("v3")).toBe("v1");
  });
});

// ── ONE session id across all three routes ───────────────────────────────────
describe("getFlowSid — single unified id carried across routes", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
    });
  });

  it("mints once, then returns the SAME id on every subsequent read (start, assessment, report)", () => {
    const a = getFlowSid(); // /simplified/start
    const b = getFlowSid(); // /assessment
    const c = getFlowSid(); // used for report URL
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(sessionStorage.getItem(FLOW_SID_KEY)).toBe(a);
  });
});

// ── Device class from UA (class only, never raw UA) ──────────────────────────
describe("deviceFromUA", () => {
  it("classifies mobile / tablet / desktop", () => {
    expect(deviceFromUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe("mobile");
    expect(deviceFromUA("Mozilla/5.0 (Linux; Android 13; Pixel 7) ... Mobile Safari")).toBe("mobile");
    expect(deviceFromUA("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("tablet");
    expect(deviceFromUA("Mozilla/5.0 (Linux; Android 13; SM-X200) Safari")).toBe("tablet"); // android, no "mobile"
    expect(deviceFromUA("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe("desktop");
    expect(deviceFromUA("")).toBe("desktop");
    expect(deviceFromUA(null)).toBe("desktop");
  });
});

// ── Step validators (3 / 4 / 7) ───────────────────────────────────────────────
describe("step 3 — child (name + gender both required)", () => {
  it("requires a non-empty name AND a gender", () => {
    expect(childStepReady("", "boy")).toBe(false);
    expect(childStepReady("  ", "boy")).toBe(false);
    expect(childStepReady("Arjun", null)).toBe(false);
    expect(childStepReady("Arjun", "boy")).toBe(true);
    expect(childStepReady("Arjun", "prefer-not-to-say")).toBe(true);
  });
});

describe("step 4 — WhatsApp (Indian mobile)", () => {
  it("accepts 10-digit 6–9 numbers, with/without +91; rejects junk", () => {
    expect(isValidIndianMobile("7389070676")).toBe(true);
    expect(isValidIndianMobile("+91 7389070676")).toBe(true);
    expect(isValidIndianMobile("917389070676")).toBe(true);
    expect(isValidIndianMobile("98765 43210")).toBe(true);
    expect(isValidIndianMobile("1234567890")).toBe(false); // starts < 6
    expect(isValidIndianMobile("738907067")).toBe(false);  // 9 digits
    expect(isValidIndianMobile("abcd")).toBe(false);
  });
});

describe("step 7 — details (parent name + valid email, NO phone)", () => {
  it("requires a name and a valid email", () => {
    expect(isValidEmail("a@b.com")).toBe(true);
    expect(isValidEmail("nope")).toBe(false);
    expect(detailsReady("", "a@b.com")).toBe(false);
    expect(detailsReady("Priya", "nope")).toBe(false);
    expect(detailsReady("Priya", "priya@gmail.com")).toBe(true);
  });
});

// ── 8 halfway "FIRST READ" lines render for boy / girl / name ─────────────────
const ARCHETYPES = [
  "The All-In Kid", "The Inventor", "The Explorer", "The Magnet",
  "The Glue", "The Captain", "The Live Wire", "The Storm",
];

describe("halfway FIRST READ lines", () => {
  it("has exactly one line per archetype (8)", () => {
    expect(Object.keys(HALFWAY_FIRST_READ).sort()).toEqual([...ARCHETYPES].sort());
  });

  it("every line + fallback renders with no leftover {tokens} for boy / girl / prefer-not-to-say", () => {
    const lines = [...Object.values(HALFWAY_FIRST_READ), HALFWAY_FIRST_READ_FALLBACK];
    for (const line of lines) {
      expect(fillHalfwayLine(line, "boy", "Rohan")).not.toMatch(/\{(name|they|them|their)\}/);
      expect(fillHalfwayLine(line, "girl", "Maya")).not.toMatch(/\{(name|they|them|their)\}/);
      expect(fillHalfwayLine(line, null, "Rohan")).not.toMatch(/\{(name|they|them|their)\}/);
    }
  });

  it("substitutes pronouns correctly (The Storm: {name}/{their}/{them})", () => {
    const boy  = fillHalfwayLine(HALFWAY_FIRST_READ["The Storm"], "boy", "Rohan");
    const girl = fillHalfwayLine(HALFWAY_FIRST_READ["The Storm"], "girl", "Maya");
    const none = fillHalfwayLine(HALFWAY_FIRST_READ["The Storm"], "prefer-not-to-say", "Rohan");
    expect(boy).toContain("his idea");
    expect(boy).toContain("give him that");
    expect(girl).toContain("her idea");
    expect(girl).toContain("give her that");
    // prefer-not-to-say falls back to the NAME for singular agreement
    expect(none).toContain("Rohan needs it to be Rohan's idea");
    expect(none).toContain("give Rohan that");
  });
});

// ── Halfway partial-archetype derivation (reuses the scorer, no DB) ───────────
function req(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

describe("POST /api/flow/partial-archetype", () => {
  it("derives the leading archetype from partial shape × driver answers", async () => {
    const res = await partialArchetypePOST(req({
      answers: { A: "narrow-deep", B: "mastery" },
      questionSequence: [
        { id: "A", dimension: "attention_shape" },
        { id: "B", dimension: "reward_driver" },
      ],
    }));
    expect((await res.json()).archetype).toBe("The All-In Kid");
  });

  it("returns null when a grid dimension has no answers yet", async () => {
    const res = await partialArchetypePOST(req({
      answers: { A: "narrow-deep" },
      questionSequence: [{ id: "A", dimension: "attention_shape" }],
    }));
    expect((await res.json()).archetype).toBeNull();
  });
});
