import { describe, it, expect } from "vitest";
import { getLmsWeekContent } from "@/lib/lms/content";
import { fillLmsContent, renderWeekendContent } from "@/lib/lms/render";
import type { AgeBand } from "@/content/types";
import type { Gender } from "@/lib/report/pronouns";

const ARCHETYPES = ["The Storm", "The Captain", "The All-In Kid", "The Explorer", "The Glue", "The Inventor", "The Live Wire", "The Magnet"];
const BANDS: AgeBand[] = ["8-9", "10-11", "12-14"];
const GENDERS: { label: string; g: Gender }[] = [
  { label: "boy", g: "boy" },
  { label: "girl", g: "girl" },
  { label: "unknown", g: null },
];
const TRENDS = ["mostly_worked", "mixed", "mostly_didnt_land"] as const;
const NAME = "Shailaa";

// Every rendered string a parent could see for one week, flattened.
function renderWeek(archetype: string, week: number, band: AgeBand, g: Gender): string[] {
  const c = getLmsWeekContent(archetype, week, band);
  if (!c) return [];
  const fill = (s: string) => fillLmsContent(s, NAME, g);
  const out: string[] = [];
  const wr = c.weeklyReading;
  out.push(fill(wr.introShared), fill(wr.moveCalibration[band]), fill(wr.moveOutroShared), fill(wr.whatWorkingLooksLike), fill(wr.thingToHoldOnto));
  for (const d of c.days) {
    out.push(fill(d.title), fill(d.content[band]));
    if (d.reflection) {
      out.push(fill(d.reflection.prompt));
      for (const v of Object.values(d.reflection.nextDayOpening ?? {})) out.push(fill(v));
    }
  }
  // Weekend: resolve {{#if}} per trend first, then fill tokens.
  for (const trend of TRENDS) {
    out.push(fill(renderWeekendContent(c.weekendReview.content[band], { week_trend: trend, age_band: band })));
  }
  out.push(fill(c.weekendReview.noteReflectionIntro));
  return out;
}

describe("LMS pronoun fallback — every archetype × week × band × {boy,girl,unknown}", () => {
  for (const archetype of ARCHETYPES) {
    it(`${archetype}: grammatical for boy, girl and unknown`, () => {
      for (let week = 1; week <= 6; week++) {
        for (const band of BANDS) {
          for (const { label, g } of GENDERS) {
            for (const s of renderWeek(archetype, week, band, g)) {
              const where = `${archetype} wk${week} ${band} ${label}`;
              expect(s.includes("{{"), `leftover token in ${where}: ${s.slice(0, 80)}`).toBe(false);
              expect(/\bthey (is|was|has|does)\b/i.test(s), `"they <sing-verb>" in ${where}: ${s.slice(0, 80)}`).toBe(false);
              expect(/\bthey's/i.test(s), `"they's" in ${where}: ${s.slice(0, 80)}`).toBe(false);
            }
          }
        }
      }
    });
  }
});
