import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

import { resolveFlowVariant, getFlowSid, FLOW_SID_KEY } from "@/lib/flow/session";
import { deviceFromUA } from "@/lib/flow/device";
import { isValidEmail, isValidIndianMobile, childStepReady, contactReady, isOobAgeChoice, IN_RANGE_AGE_BANDS } from "@/lib/flow/validate";
import { HALFWAY_FIRST_READ, HALFWAY_FIRST_READ_FALLBACK, fillHalfwayLine } from "@/content/assessment/halfway-first-read";
import { POST as partialArchetypePOST } from "@/app/api/flow/partial-archetype/route";
import { GET as thankyouPreviewGET } from "@/app/api/flow/thankyou-preview/route";
import { WEEK_TITLES } from "@/lib/report/skills";
import * as emailModule from "@/lib/auth/email";

// ── Flow arm resolution (opt-in: only ?flow=v2) ──────────────────────────────
describe("resolveFlowVariant — new flow is opt-in", () => {
  it("only ?flow=v2 selects v2; default and ?flow=v1 stay v1", () => {
    expect(resolveFlowVariant("v2")).toBe("v2");
    expect(resolveFlowVariant("v1")).toBe("v1");
    expect(resolveFlowVariant(null)).toBe("v1");
    expect(resolveFlowVariant("")).toBe("v1");
  });
});

// ── ONE session id across all routes ─────────────────────────────────────────
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
  it("mints once, then returns the SAME id on every subsequent read", () => {
    const a = getFlowSid(), b = getFlowSid(), c = getFlowSid();
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(sessionStorage.getItem(FLOW_SID_KEY)).toBe(a);
  });
});

// ── Device class from UA ─────────────────────────────────────────────────────
describe("deviceFromUA", () => {
  it("classifies mobile / tablet / desktop", () => {
    expect(deviceFromUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe("mobile");
    expect(deviceFromUA("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("tablet");
    expect(deviceFromUA("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe("desktop");
    expect(deviceFromUA("")).toBe("desktop");
  });
});

// ── Step 3 — child (name + gender both required) ──────────────────────────────
describe("step 3 — child validation", () => {
  it("requires a non-empty name AND a gender", () => {
    expect(childStepReady("", "boy")).toBe(false);
    expect(childStepReady("Arjun", null)).toBe(false);
    expect(childStepReady("Arjun", "boy")).toBe(true);
  });
});

// ── Step 6 — contact (WhatsApp + name + email, ALL required) ──────────────────
describe("step 6 — contact validation", () => {
  it("requires a valid phone AND name AND valid email", () => {
    expect(contactReady("7389070676", "Priya", "p@x.com")).toBe(true);
    expect(contactReady("123", "Priya", "p@x.com")).toBe(false);        // bad phone
    expect(contactReady("7389070676", "", "p@x.com")).toBe(false);      // no name
    expect(contactReady("7389070676", "Priya", "nope")).toBe(false);    // bad email
    expect(isValidIndianMobile("+91 7389070676")).toBe(true);
    expect(isValidEmail("p@x.com")).toBe(true);
  });
});

// ── Age popup stops the flow ──────────────────────────────────────────────────
describe("step 2 — age popup stops the flow", () => {
  it("in-range bands advance; younger/older are OOB (open popup, no advance)", () => {
    expect(IN_RANGE_AGE_BANDS).toEqual(["8-9", "10-11", "12-14"]);
    expect(isOobAgeChoice("younger")).toBe(true);
    expect(isOobAgeChoice("older")).toBe(true);
    for (const b of IN_RANGE_AGE_BANDS) expect(isOobAgeChoice(b)).toBe(false);
  });
});

// ── 8 halfway lines render for boy / girl / name ──────────────────────────────
const ARCHETYPES = ["The All-In Kid", "The Inventor", "The Explorer", "The Magnet", "The Glue", "The Captain", "The Live Wire", "The Storm"];
describe("halfway FIRST READ lines", () => {
  it("has exactly one line per archetype (8)", () => {
    expect(Object.keys(HALFWAY_FIRST_READ).sort()).toEqual([...ARCHETYPES].sort());
  });
  it("render with no leftover {tokens} for boy / girl / prefer-not-to-say", () => {
    for (const line of [...Object.values(HALFWAY_FIRST_READ), HALFWAY_FIRST_READ_FALLBACK]) {
      expect(fillHalfwayLine(line, "boy", "Rohan")).not.toMatch(/\{(name|they|them|their)\}/);
      expect(fillHalfwayLine(line, "girl", "Maya")).not.toMatch(/\{(name|they|them|their)\}/);
      expect(fillHalfwayLine(line, null, "Rohan")).not.toMatch(/\{(name|they|them|their)\}/);
    }
  });
});

// ── Halfway partial-archetype derivation ──────────────────────────────────────
function jsonReq(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}
describe("POST /api/flow/partial-archetype", () => {
  it("derives the leading archetype from partial shape × driver answers", async () => {
    const res = await partialArchetypePOST(jsonReq({
      answers: { A: "narrow-deep", B: "mastery" },
      questionSequence: [{ id: "A", dimension: "attention_shape" }, { id: "B", dimension: "reward_driver" }],
    }));
    expect((await res.json()).archetype).toBe("The All-In Kid");
  });
  it("returns null when a grid dimension has no answers yet", async () => {
    const res = await partialArchetypePOST(jsonReq({ answers: { A: "narrow-deep" }, questionSequence: [{ id: "A", dimension: "attention_shape" }] }));
    expect((await res.json()).archetype).toBeNull();
  });
});

// ── No email is sent in v2 ────────────────────────────────────────────────────
describe("v2 has no report-ready email", () => {
  it("sendReportReadyEmail is no longer exported", () => {
    expect((emailModule as Record<string, unknown>).sendReportReadyEmail).toBeUndefined();
  });
});

// ── Thank-you preview pulls correct LMS data (2 archetype × age-band combos) ──
function urlReq(qs: string): NextRequest {
  return { nextUrl: new URL(`http://localhost/api/flow/thankyou-preview?${qs}`) } as unknown as NextRequest;
}
describe("GET /api/flow/thankyou-preview — real week/module/Day 2 data", () => {
  it("The Storm · 10-11", async () => {
    const res = await thankyouPreviewGET(urlReq("archetype=The%20Storm&ageBand=10-11&name=Rohan&gender=boy"));
    const d = await res.json();
    expect(d.ok).toBe(true);
    expect(d.weekTitle).toBe(WEEK_TITLES[1]);
    expect(d.modules).toHaveLength(4);
    expect(d.modules[1].title).toBe("Doing it at 10–11");
    expect(typeof d.day2Title).toBe("string");
    expect(d.day2Title.length).toBeGreaterThan(0);
    expect(d.weeks.map((w: { title: string }) => w.title)).toEqual([WEEK_TITLES[1], WEEK_TITLES[2], WEEK_TITLES[3]]);
  });
  it("The All-In Kid · 8-9", async () => {
    const res = await thankyouPreviewGET(urlReq("archetype=The%20All-In%20Kid&ageBand=8-9&name=Maya&gender=girl"));
    const d = await res.json();
    expect(d.ok).toBe(true);
    expect(d.weekTitle).toBe(WEEK_TITLES[1]);
    expect(d.modules[1].title).toBe("Doing it at 8–9");
    expect(d.day2Title.length).toBeGreaterThan(0);
  });
});
