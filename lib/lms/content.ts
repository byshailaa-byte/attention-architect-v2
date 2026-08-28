import type { LmsWeekContent, AgeBand } from "@/content/types";
import { weekContent as stormWeek1 } from "@/content/lms/week-1/storm";
import { weekContent as captainWeek1 } from "@/content/lms/week-1/captain";
import { weekContent as allInKidWeek1 } from "@/content/lms/week-1/all-in-kid";
import { weekContent as explorerWeek1 } from "@/content/lms/week-1/explorer";
import { weekContent as glueWeek1 } from "@/content/lms/week-1/glue";
import { weekContent as inventorWeek1 } from "@/content/lms/week-1/inventor";
import { weekContent as liveWireWeek1 } from "@/content/lms/week-1/live-wire";
import { weekContent as magnetWeek1 } from "@/content/lms/week-1/magnet";
import { weekContent as stormWeek2 } from "@/content/lms/week-2/storm";
import { weekContent as captainWeek2 } from "@/content/lms/week-2/captain";
import { weekContent as allInKidWeek2 } from "@/content/lms/week-2/all-in-kid";
import { weekContent as explorerWeek2 } from "@/content/lms/week-2/explorer";
import { weekContent as glueWeek2 } from "@/content/lms/week-2/glue";
import { weekContent as inventorWeek2 } from "@/content/lms/week-2/inventor";
import { weekContent as liveWireWeek2 } from "@/content/lms/week-2/live-wire";
import { weekContent as magnetWeek2 } from "@/content/lms/week-2/magnet";
import { weekContent as stormWeek3 } from "@/content/lms/week-3/storm";
import { weekContent as captainWeek3 } from "@/content/lms/week-3/captain";
import { weekContent as allInKidWeek3 } from "@/content/lms/week-3/all-in-kid";
import { weekContent as explorerWeek3 } from "@/content/lms/week-3/explorer";
import { weekContent as glueWeek3 } from "@/content/lms/week-3/glue";
import { weekContent as inventorWeek3 } from "@/content/lms/week-3/inventor";
import { weekContent as liveWireWeek3 } from "@/content/lms/week-3/live-wire";
import { weekContent as magnetWeek3 } from "@/content/lms/week-3/magnet";
import { weekContent as stormWeek4 } from "@/content/lms/week-4/storm";
import { weekContent as captainWeek4 } from "@/content/lms/week-4/captain";
import { weekContent as allInKidWeek4 } from "@/content/lms/week-4/all-in-kid";
import { weekContent as explorerWeek4 } from "@/content/lms/week-4/explorer";
import { weekContent as glueWeek4 } from "@/content/lms/week-4/glue";
import { weekContent as inventorWeek4 } from "@/content/lms/week-4/inventor";
import { weekContent as liveWireWeek4 } from "@/content/lms/week-4/live-wire";
import { weekContent as magnetWeek4 } from "@/content/lms/week-4/magnet";
import { weekContent as stormWeek5 } from "@/content/lms/week-5/storm";
import { weekContent as captainWeek5 } from "@/content/lms/week-5/captain";
import { weekContent as allInKidWeek5 } from "@/content/lms/week-5/all-in-kid";
import { weekContent as explorerWeek5 } from "@/content/lms/week-5/explorer";
import { weekContent as glueWeek5 } from "@/content/lms/week-5/glue";
import { weekContent as inventorWeek5 } from "@/content/lms/week-5/inventor";
import { weekContent as liveWireWeek5 } from "@/content/lms/week-5/live-wire";
import { weekContent as magnetWeek5 } from "@/content/lms/week-5/magnet";
import { weekContent as stormWeek6 } from "@/content/lms/week-6/storm";
import { weekContent as captainWeek6 } from "@/content/lms/week-6/captain";
import { weekContent as allInKidWeek6 } from "@/content/lms/week-6/all-in-kid";
import { weekContent as explorerWeek6 } from "@/content/lms/week-6/explorer";
import { weekContent as glueWeek6 } from "@/content/lms/week-6/glue";
import { weekContent as inventorWeek6 } from "@/content/lms/week-6/inventor";
import { weekContent as liveWireWeek6 } from "@/content/lms/week-6/live-wire";
import { weekContent as magnetWeek6 } from "@/content/lms/week-6/magnet";

// Static map: (archetype slug, week) → content.
// Extend as authoring docs land for week 6.
const CONTENT: Partial<Record<string, Partial<Record<number, LmsWeekContent>>>> = {
  storm:        { 1: stormWeek1,    2: stormWeek2,    3: stormWeek3,    4: stormWeek4,    5: stormWeek5,    6: stormWeek6 },
  captain:      { 1: captainWeek1,  2: captainWeek2,  3: captainWeek3,  4: captainWeek4,  5: captainWeek5,  6: captainWeek6 },
  "all-in-kid": { 1: allInKidWeek1, 2: allInKidWeek2, 3: allInKidWeek3, 4: allInKidWeek4, 5: allInKidWeek5, 6: allInKidWeek6 },
  explorer:     { 1: explorerWeek1, 2: explorerWeek2, 3: explorerWeek3, 4: explorerWeek4, 5: explorerWeek5, 6: explorerWeek6 },
  glue:         { 1: glueWeek1,     2: glueWeek2,     3: glueWeek3,     4: glueWeek4,     5: glueWeek5,     6: glueWeek6 },
  inventor:     { 1: inventorWeek1, 2: inventorWeek2, 3: inventorWeek3, 4: inventorWeek4, 5: inventorWeek5, 6: inventorWeek6 },
  "live-wire":  { 1: liveWireWeek1, 2: liveWireWeek2, 3: liveWireWeek3, 4: liveWireWeek4, 5: liveWireWeek5, 6: liveWireWeek6 },
  magnet:       { 1: magnetWeek1,   2: magnetWeek2,   3: magnetWeek3,   4: magnetWeek4,   5: magnetWeek5,   6: magnetWeek6 },
};

// Normalises DB display names ("The Storm", "The All-In Kid") and bare slugs
// ("storm") to the content map key ("storm", "all-in-kid").
function toArchetypeKey(archetype: string): string {
  return archetype.toLowerCase().replace(/^the\s+/, "").replace(/\s+/g, "-");
}

// Returns false when any band-specific field for the given ageBand is an empty string.
// Catches authored-but-incomplete weeks (e.g. week 3, bands 8-9 and 10-11) that are
// wired into the CONTENT map but would otherwise render blank pages rather than 404.
function isBandComplete(content: LmsWeekContent, ageBand: AgeBand): boolean {
  if (!content.weeklyReading.moveCalibration[ageBand]) return false;
  if (content.days.some(d => !d.content[ageBand])) return false;
  if (!content.weekendReview.content[ageBand]) return false;
  return true;
}

// When ageBand is provided, returns null if the week's band-specific content is
// incomplete — treating it identically to a missing week (404 / locked on dashboard).
export function getLmsWeekContent(archetype: string, week: number, ageBand?: AgeBand): LmsWeekContent | null {
  const content = CONTENT[toArchetypeKey(archetype)]?.[week] ?? null;
  if (!content) return null;
  if (ageBand && !isBandComplete(content, ageBand)) return null;
  return content;
}

// The day in the days array whose `.day` property equals `day`.
export function getDayCard(content: LmsWeekContent, day: number) {
  return content.days.find((d) => d.day === day) ?? null;
}
