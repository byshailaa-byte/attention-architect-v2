// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cookieHeaderHasOperator, isOperatorCookieValue } from "@/lib/analytics/operator";
import { track } from "@/lib/analytics/track";

describe("operator detection (aa_internal)", () => {
  it("isOperatorCookieValue reads the value exactly", () => {
    expect(isOperatorCookieValue("1")).toBe(true);
    expect(isOperatorCookieValue("0")).toBe(false);
    expect(isOperatorCookieValue(undefined)).toBe(false);
  });
  it("cookieHeaderHasOperator matches only a real aa_internal=1 cookie", () => {
    expect(cookieHeaderHasOperator("x=y; aa_internal=1; z=2")).toBe(true);
    expect(cookieHeaderHasOperator("aa_internal=1")).toBe(true);
    expect(cookieHeaderHasOperator("aa_internal=0")).toBe(false);
    expect(cookieHeaderHasOperator("other=aa_internal=1")).toBe(false); // substring, not a cookie
    expect(cookieHeaderHasOperator("")).toBe(false);
  });
});

describe("client track() — an operator browser writes NO funnel event", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  const clearCookie = () => { document.cookie = "aa_internal=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"; };
  beforeEach(() => { clearCookie(); fetchSpy = vi.fn(() => Promise.resolve({ ok: true } as Response)); vi.stubGlobal("fetch", fetchSpy); });
  afterEach(() => { vi.unstubAllGlobals(); clearCookie(); });

  const SID = "11111111-1111-4111-8111-111111111111";

  it("aa_internal=1 → no POST to /api/funnel/event", () => {
    document.cookie = "aa_internal=1; path=/";
    track("report_view", { variant: "v2" }, SID);
    track("plan_v2_view", {}, SID);
    track("roadmap_cta_click", { position: "goal" }, SID);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("no aa_internal cookie → the funnel event IS written (unchanged for real parents)", () => {
    track("report_view", { variant: "v2" }, SID);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0][0])).toContain("/api/funnel/event");
  });
});
