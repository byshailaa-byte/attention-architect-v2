// Splits a week's reading into the four v2 reading modules (option 1 — purely
// mechanical, no new course copy). Titles are fixed UI strings; bodies are the
// existing LmsWeekContent fields. Pure + unit-tested.

import type { LmsWeekContent, AgeBand } from "@/content/types";

export const BAND_LABEL: Record<AgeBand, string> = {
  "8-9": "8–9",
  "10-11": "10–11",
  "12-14": "12–14",
};

export type LmsModule = {
  index: 1 | 2 | 3 | 4;
  title: string;
  // Rendered body pieces (markdown strings, tokens NOT yet filled).
  // M1/M3/M4 use `body`; M2 uses `ageBox` + `body` (moveOutroShared).
  body: string;
  ageBox?: { label: string; body: string }; // M2 only — the age-band calibration box
  words: number;
  timeRange: string; // e.g. "4–6 min"
};

// Count words in authored content: drop {{tokens}} and markdown markers, then
// count whitespace-separated runs. Approximate on purpose (drives time ranges).
export function countWords(...parts: (string | undefined)[]): number {
  const text = parts.filter(Boolean).join(" ")
    .replace(/\{\{[^}]*\}\}/g, " ")   // template tokens
    .replace(/[*_`#>-]/g, " ")        // markdown punctuation
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return 0;
  return text.split(" ").length;
}

// words → "a–b min" at 230–170 wpm, each bound floored at 1 minute.
// Collapses to "N min" when both bounds match.
export function timeRange(words: number): string {
  const fast = Math.max(1, Math.ceil(words / 230));
  const slow = Math.max(1, Math.ceil(words / 170));
  return fast === slow ? `${fast} min` : `${fast}–${slow} min`;
}

// The four modules for a given week + age band. Works for all 48 content files
// because it keys off the structured fields, not any in-prose heading.
export function buildModules(content: LmsWeekContent, band: AgeBand): LmsModule[] {
  const wr = content.weeklyReading;
  const bandLabel = BAND_LABEL[band];
  const calibration = wr.moveCalibration[band] ?? "";

  const m1Words = countWords(wr.introShared);
  const m2Words = countWords(calibration, wr.moveOutroShared);
  const m3Words = countWords(wr.whatWorkingLooksLike);
  const m4Words = countWords(wr.thingToHoldOnto);

  return [
    { index: 1, title: "This week's idea", body: wr.introShared, words: m1Words, timeRange: timeRange(m1Words) },
    {
      index: 2,
      title: `Doing it at ${bandLabel}`,
      body: wr.moveOutroShared,
      ageBox: { label: `For age ${bandLabel}`, body: calibration },
      words: m2Words,
      timeRange: timeRange(m2Words),
    },
    { index: 3, title: "What working looks like", body: wr.whatWorkingLooksLike, words: m3Words, timeRange: timeRange(m3Words) },
    { index: 4, title: "The thing to hold onto", body: wr.thingToHoldOnto, words: m4Words, timeRange: timeRange(m4Words) },
  ];
}

// Footer line: "About X–Y min of reading, then 5 minutes a day".
// X = sum of fast bounds, Y = sum of slow bounds across the 4 modules.
export function readingTotalRange(modules: LmsModule[]): string {
  let fast = 0;
  let slow = 0;
  for (const m of modules) {
    fast += Math.max(1, Math.ceil(m.words / 230));
    slow += Math.max(1, Math.ceil(m.words / 170));
  }
  const range = fast === slow ? `${fast} min` : `${fast}–${slow} min`;
  return `About ${range} of reading, then 5 minutes a day`;
}
