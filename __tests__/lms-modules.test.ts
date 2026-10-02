import { describe, it, expect } from "vitest";
import { buildModules, timeRange, readingTotalRange, BAND_LABEL, countWords, type LmsModule } from "@/lib/lms/modules";
import { getLmsWeekContent } from "@/lib/lms/content";
import type { AgeBand } from "@/content/types";

const ARCHETYPES = ["The Storm", "The Explorer", "The Glue"];
const BANDS: AgeBand[] = ["8-9", "10-11", "12-14"];

describe("buildModules — split for 3 archetypes × 3 bands", () => {
  for (const archetype of ARCHETYPES) {
    for (const band of BANDS) {
      it(`${archetype} · ${band}: four modules mapped to the right fields`, () => {
        const content = getLmsWeekContent(archetype, 1, band);
        expect(content).not.toBeNull();
        const mods = buildModules(content!, band);

        expect(mods).toHaveLength(4);
        expect(mods.map((m) => m.title)).toEqual([
          "This week's idea",
          `Doing it at ${BAND_LABEL[band]}`,
          "What working looks like",
          "The thing to hold onto",
        ]);

        const wr = content!.weeklyReading;
        expect(mods[0].body).toBe(wr.introShared);                 // M1 = whole introShared
        expect(mods[1].ageBox?.body).toBe(wr.moveCalibration[band]); // M2 = age box …
        expect(mods[1].body).toBe(wr.moveOutroShared);             //       … + moveOutroShared
        expect(mods[2].body).toBe(wr.whatWorkingLooksLike);        // M3
        expect(mods[3].body).toBe(wr.thingToHoldOnto);             // M4

        // Every module has a well-formed, ≥1-minute time range.
        for (const m of mods) {
          expect(m.timeRange).toMatch(/^\d+( min|–\d+ min)$/);
          expect(m.words).toBeGreaterThanOrEqual(0);
        }
      });
    }
  }
});

describe("timeRange — 230–170 wpm, floored at 1 min", () => {
  it("0 words → 1 min", () => expect(timeRange(0)).toBe("1 min"));
  it("230 words → 1–2 min", () => expect(timeRange(230)).toBe("1–2 min"));
  it("500 words → 3 min (bounds collapse)", () => expect(timeRange(500)).toBe("3 min"));
  it("1000 words → 5–6 min", () => expect(timeRange(1000)).toBe("5–6 min"));
  it("countWords strips tokens + markdown", () => {
    expect(countWords("**Hello** {{child_name}} there")).toBe(2); // "Hello" + "there"
  });
});

describe("readingTotalRange — footer total", () => {
  const mk = (words: number): LmsModule => ({ index: 1, title: "x", body: "", words, timeRange: timeRange(words) });
  it("four empty modules → About 4 min", () => {
    expect(readingTotalRange([mk(0), mk(0), mk(0), mk(0)])).toBe("About 4 min of reading, then 5 minutes a day");
  });
  it("four 500-word modules → About 12 min", () => {
    expect(readingTotalRange([mk(500), mk(500), mk(500), mk(500)])).toBe("About 12 min of reading, then 5 minutes a day");
  });
  it("mixed → ranged total", () => {
    // words 1000 (5–6) ×2 + 100 (1) ×2 → fast 5+5+1+1=12, slow 6+6+1+1=14
    expect(readingTotalRange([mk(1000), mk(1000), mk(100), mk(100)])).toBe("About 12–14 min of reading, then 5 minutes a day");
  });
});
