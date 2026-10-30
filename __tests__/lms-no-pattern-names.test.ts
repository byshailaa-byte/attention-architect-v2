import { describe, it, expect } from "vitest";
import { getLmsWeekContent } from "@/lib/lms/content";
import { SAY_BY_ARCHETYPE } from "@/content/lms/what-to-say";

// Parent-facing LMS copy must NEVER contain an archetype name (decision 2). Internal keys — the
// CONTENT map key, the `archetype` field, the SAY_BY_ARCHETYPE object keys — are allowed.
const PATTERN_NAMES = /\b(The\s+)?(Storm|Explorer|Captain|Inventor|All-?In(\s+Kid)?|Live\s*Wire|Magnet|Glue)\b/;
const CONTENT_KEYS = ["storm", "captain", "all-in-kid", "explorer", "glue", "inventor", "live-wire", "magnet"];

// Every string leaf of a content object EXCEPT the internal `archetype` field.
function strings(obj: unknown, key = ""): string[] {
  if (typeof obj === "string") return key === "archetype" ? [] : [obj];
  if (Array.isArray(obj)) return obj.flatMap((v) => strings(v, key));
  if (obj && typeof obj === "object") return Object.entries(obj).flatMap(([k, v]) => strings(v, k));
  return [];
}

describe("LMS content shows NO archetype name to parents (decision 2)", () => {
  let scanned = 0;
  for (const key of CONTENT_KEYS) {
    for (let week = 1; week <= 6; week++) {
      const content = getLmsWeekContent(key, week);
      if (!content) continue;
      it(`${key} week ${week} is free of pattern names`, () => {
        for (const s of strings(content)) {
          scanned++;
          expect(s, `pattern name leaked: "${s.match(PATTERN_NAMES)?.[0]}" in\n${s.slice(0, 160)}`).not.toMatch(PATTERN_NAMES);
        }
      });
    }
  }

  it("the 'what to say' phrases (values, not keys) are free of pattern names", () => {
    for (const phrases of Object.values(SAY_BY_ARCHETYPE)) {
      for (const p of phrases) expect(p, `pattern name in say-phrase: ${p}`).not.toMatch(PATTERN_NAMES);
    }
  });

  it("scanned a meaningful amount of content", () => {
    expect(strings(getLmsWeekContent("storm", 1)).length).toBeGreaterThan(10);
  });
});
