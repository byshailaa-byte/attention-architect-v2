// Grounds Report v2 generation in the actual paid programme (content/lms), not the
// model's general knowledge. For an archetype + age band it returns the canonical
// mechanism (report-content MEANING/PATTERN_LINE) and the Week 1 moves: the week's core
// move (→ the report's "switch") and Day 2's move (→ the report's "tonight"). This makes
// the free report a true preview of Week 1.
import { getLmsWeekContent, getDayCard } from "@/lib/lms/content";
import { fillLmsContent } from "@/lib/lms/render";
import { MEANING, PATTERN_LINE } from "@/lib/content/report-content";
import { ARCHETYPE_DESC } from "@/content/report-v2/fallbacks";
import type { AgeBand } from "@/content/types";
import type { Gender } from "@/lib/report/pronouns";

export type ProgramAnchor = {
  weekTitle: string;
  mechanismLine: string;    // one-line archetype meaning (ARCHETYPE_DESC, filled)
  patternLine: string;      // PATTERN_LINE — how the pattern shows up
  meaning: string[];        // MEANING — 3 concrete lines
  coreMove: string;         // Week 1's governing move (age-calibrated) → switch
  day2Move: string;         // Week 1 Day 2's concrete move → tonight
};

const BANDS: AgeBand[] = ["8-9", "10-11", "12-14"];

function clean(s: string): string {
  return s.replace(/[*_]/g, "").replace(/\s+/g, " ").trim();
}

// Resolve the first age band that actually has Week 1 content for this archetype,
// preferring the child's band, then 10-11, then any.
function resolveBand(archetype: string, preferred: string | null | undefined): AgeBand | null {
  const order = [preferred, "10-11", "8-9", "12-14"].filter(Boolean) as string[];
  for (const b of order) {
    if (BANDS.includes(b as AgeBand) && getLmsWeekContent(archetype, 1, b as AgeBand)) {
      return b as AgeBand;
    }
  }
  return null;
}

export function programFor(
  archetype: string,
  ageBand: string | null | undefined,
  name: string,
  gender: Gender,
): ProgramAnchor | null {
  const band = resolveBand(archetype, ageBand);
  const content = band ? getLmsWeekContent(archetype, 1, band) : null;
  const mechanismLine = clean(fillLmsContent(ARCHETYPE_DESC[archetype] ?? "", name, gender));
  const patternLine = clean(fillLmsContent(PATTERN_LINE[archetype] ?? "", name, gender));
  const meaning = (MEANING[archetype] ?? []).map((m) => clean(fillLmsContent(m, name, gender)));

  if (!content || !band) {
    // No programme content for this archetype — still return mechanism so generation
    // stays on-brand; moves empty so the caller uses mechanism-only guidance.
    if (!PATTERN_LINE[archetype]) return null;
    return { weekTitle: "Getting started without the push", mechanismLine, patternLine, meaning, coreMove: "", day2Move: "" };
  }

  const cal = content.weeklyReading.moveCalibration[band] ?? "";
  const coreMove = clean(`${content.weekTitle}. ${fillLmsContent(cal, name, gender)}`);
  const d2 = getDayCard(content, 2);
  const day2Move = d2
    ? clean(`${fillLmsContent(d2.title, name, gender)} — ${fillLmsContent(d2.content[band] ?? "", name, gender)}`)
    : "";

  return { weekTitle: content.weekTitle, mechanismLine, patternLine, meaning, coreMove, day2Move };
}
