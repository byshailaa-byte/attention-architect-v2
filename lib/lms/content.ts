import type { LmsWeekContent } from "@/content/types";
import { weekContent as stormWeek1 } from "@/content/lms/week-1/storm";
import { weekContent as captainWeek1 } from "@/content/lms/week-1/captain";
import { weekContent as allInKidWeek1 } from "@/content/lms/week-1/all-in-kid";
import { weekContent as explorerWeek1 } from "@/content/lms/week-1/explorer";
import { weekContent as glueWeek1 } from "@/content/lms/week-1/glue";
import { weekContent as inventorWeek1 } from "@/content/lms/week-1/inventor";
import { weekContent as liveWireWeek1 } from "@/content/lms/week-1/live-wire";
import { weekContent as magnetWeek1 } from "@/content/lms/week-1/magnet";

// Static map: (archetype slug, week) → content.
// Extend as authoring docs land for weeks 2–6.
const CONTENT: Partial<Record<string, Partial<Record<number, LmsWeekContent>>>> = {
  storm:       { 1: stormWeek1 },
  captain:     { 1: captainWeek1 },
  "all-in-kid": { 1: allInKidWeek1 },
  explorer:    { 1: explorerWeek1 },
  glue:        { 1: glueWeek1 },
  inventor:    { 1: inventorWeek1 },
  "live-wire": { 1: liveWireWeek1 },
  magnet:      { 1: magnetWeek1 },
};

// Normalises DB display names ("The Storm", "The All-In Kid") and bare slugs
// ("storm") to the content map key ("storm", "all-in-kid").
function toArchetypeKey(archetype: string): string {
  return archetype.toLowerCase().replace(/^the\s+/, "").replace(/\s+/g, "-");
}

export function getLmsWeekContent(archetype: string, week: number): LmsWeekContent | null {
  return CONTENT[toArchetypeKey(archetype)]?.[week] ?? null;
}

// The day in the days array whose `.day` property equals `day`.
export function getDayCard(content: LmsWeekContent, day: number) {
  return content.days.find((d) => d.day === day) ?? null;
}
