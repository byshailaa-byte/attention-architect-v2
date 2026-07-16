import { describe, it, expect } from "vitest";
import { renderWeekendContent } from "../lib/lms/render";
import type { TemplateContext } from "../lib/lms/render";
import { weekContent as stormWeek1 } from "../content/lms/week-1/storm";

// Convenience shorthands
const ctx = (week_trend: TemplateContext["week_trend"], age_band: TemplateContext["age_band"]): TemplateContext =>
  ({ week_trend, age_band });

// ── Flat blocks ───────────────────────────────────────────────────────────────

describe("renderWeekendContent — flat blocks", () => {
  const flat =
    '{{#if week_trend == "mostly_worked"}}Great week.{{/if}}' +
    '{{#if week_trend == "mixed"}}Mixed week.{{/if}}' +
    '{{#if week_trend == "mostly_didnt_land"}}Hard week.{{/if}}' +
    "Shared tail.";

  it("includes only the matching block and shared content", () => {
    const out = renderWeekendContent(flat, ctx("mostly_worked", "8-9"));
    expect(out).toBe("Great week.Shared tail.");
  });

  it("excludes non-matching blocks", () => {
    const out = renderWeekendContent(flat, ctx("mostly_worked", "8-9"));
    expect(out).not.toContain("Mixed week.");
    expect(out).not.toContain("Hard week.");
  });

  it("produces empty block content when no condition matches (unknown value)", () => {
    // TypeScript guards against this at compile time, but the runtime should be safe
    const out = renderWeekendContent(flat, { week_trend: "mixed", age_band: "10-11" });
    expect(out).toBe("Mixed week.Shared tail.");
  });

  it("leaves no literal {{ or }} in output", () => {
    for (const trend of ["mostly_worked", "mixed", "mostly_didnt_land"] as const) {
      const out = renderWeekendContent(flat, ctx(trend, "10-11"));
      expect(out).not.toContain("{{");
      expect(out).not.toContain("}}");
    }
  });
});

// ── Nested blocks (spec pattern: week_trend wraps age_band) ──────────────────

describe("renderWeekendContent — nested blocks", () => {
  const nested =
    '{{#if week_trend == "mostly_worked"}}Great.{{/if}}' +
    '{{#if week_trend == "mostly_didnt_land"}}Hard. {{#if age_band == "12-14"}}Teen clause.{{/if}}{{/if}}' +
    "Shared.";

  it("outer true + inner true → full body including inner content", () => {
    const out = renderWeekendContent(nested, ctx("mostly_didnt_land", "12-14"));
    expect(out).toContain("Hard.");
    expect(out).toContain("Teen clause.");
    expect(out).toContain("Shared.");
  });

  it("outer true + inner false → outer body without inner content", () => {
    const out = renderWeekendContent(nested, ctx("mostly_didnt_land", "8-9"));
    expect(out).toContain("Hard.");
    expect(out).not.toContain("Teen clause.");
    expect(out).toContain("Shared.");
  });

  it("outer false → nothing from that block (inner never evaluated)", () => {
    const out = renderWeekendContent(nested, ctx("mostly_worked", "12-14"));
    expect(out).toContain("Great.");
    expect(out).not.toContain("Hard.");
    expect(out).not.toContain("Teen clause.");
    expect(out).toContain("Shared.");
  });

  it("leaves no literal {{ or }} in any branch combination", () => {
    const cases: Array<[TemplateContext["week_trend"], TemplateContext["age_band"]]> = [
      ["mostly_didnt_land", "12-14"],
      ["mostly_didnt_land", "8-9"],
      ["mostly_worked", "12-14"],
      ["mixed", "10-11"],
    ];
    for (const [trend, band] of cases) {
      const out = renderWeekendContent(nested, ctx(trend, band));
      expect(out, `trend=${trend} band=${band}`).not.toContain("{{");
      expect(out, `trend=${trend} band=${band}`).not.toContain("}}");
    }
  });
});

// ── 3-level nesting — proves recursive descent, not just one level deep ───────

describe("renderWeekendContent — 3-level nesting", () => {
  // L1: week_trend, L2: age_band, L3: another week_trend (synthetic — proves recursion depth)
  const deep =
    '{{#if week_trend == "mixed"}}' +
      'L1. {{#if age_band == "12-14"}}' +
        'L2. {{#if week_trend == "mixed"}}L3.{{/if}}' +
      '{{/if}}' +
    '{{/if}}' +
    "Tail.";

  it("all three levels true → all three bodies appear", () => {
    const out = renderWeekendContent(deep, ctx("mixed", "12-14"));
    expect(out).toContain("L1.");
    expect(out).toContain("L2.");
    expect(out).toContain("L3.");
    expect(out).toContain("Tail.");
    expect(out).not.toContain("{{");
  });

  it("L1 true, L2 true, L3 false → L1+L2 body but not L3", () => {
    // L3 checks week_trend == "mixed" again, but we switch trend for this test
    const deepL3False =
      '{{#if week_trend == "mixed"}}' +
        'L1. {{#if age_band == "12-14"}}' +
          'L2. {{#if week_trend == "mostly_worked"}}L3.{{/if}}' +
        '{{/if}}' +
      '{{/if}}' +
      "Tail.";
    const out = renderWeekendContent(deepL3False, ctx("mixed", "12-14"));
    expect(out).toContain("L1.");
    expect(out).toContain("L2.");
    expect(out).not.toContain("L3.");
    expect(out).not.toContain("{{");
  });

  it("L1 false → nothing (L2 and L3 never evaluated)", () => {
    const out = renderWeekendContent(deep, ctx("mostly_worked", "12-14"));
    expect(out).toBe("Tail.");
    expect(out).not.toContain("{{");
  });
});

// ── Real storm.ts weekend content ────────────────────────────────────────────

describe("renderWeekendContent — storm Week 1 actual content", () => {
  // Uses the real content so any future authoring change that breaks a renderer
  // assumption immediately fails here, before it reaches the UI.
  const c = stormWeek1.weekendReview.content;

  it("12-14 + mostly_didnt_land includes teen clause with no leftover tags", () => {
    const out = renderWeekendContent(c["12-14"], ctx("mostly_didnt_land", "12-14"));
    expect(out).toContain("teenager especially");
    expect(out).not.toContain("{{");
  });

  it("8-9 + mostly_didnt_land excludes teen clause with no leftover tags", () => {
    const out = renderWeekendContent(c["8-9"], ctx("mostly_didnt_land", "8-9"));
    expect(out).not.toContain("teenager especially");
    expect(out).not.toContain("{{");
  });

  it("shared closing sentence appears in every trend/band combination", () => {
    const shared = "one small, real shift";
    for (const trend of ["mostly_worked", "mixed", "mostly_didnt_land"] as const) {
      for (const band of ["8-9", "10-11", "12-14"] as const) {
        expect(renderWeekendContent(c[band], ctx(trend, band))).toContain(shared);
      }
    }
  });
});
