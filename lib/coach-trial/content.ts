// Trial day content:
//   • Day 1  = the parent's OWN report "try tonight" step (report-v2 card 4: instead / say / 3 steps).
//   • Days 2–4 = LMS Week 1 Day 2, 3, 4 for their archetype × age band (LMS Day 1 is the "Just watch"
//                observation day, which the trial skips — it's available after paying).
import type { AgeBand } from "@/content/types";
import type { Gender } from "@/lib/report/pronouns";
import { getSql } from "@/lib/db/client";
import { readCachedReportV2 } from "@/lib/report-v2/service";
import { getLmsWeekContent, getDayCard } from "@/lib/lms/content";
import { fillLmsContent } from "@/lib/lms/render";

export type TrialDayCard = {
  trialDay: number;            // 1..4
  lmsDay: number | null;       // 2/3/4 for LMS days; null for the report-based Day 1
  source: "report" | "lms";
  title: string;
  instead?: string;            // report Day 1: "Instead of …"
  say?: string;                // report Day 1: the exact words to say
  after?: string;              // report Day 1: "…and after"
  steps?: string[];            // report Day 1: the 3 tonight steps
  body?: string;               // LMS Days 2–4: the full step text (tokens filled)
  fullHref: string;            // "Read the full step"
};

// The LMS day number used for each trial day. Trial Day 1 is the report (null); Days 2–4 map to
// LMS Week 1 Days 2–4 — the "Just watch" LMS Day 1 is intentionally skipped.
const TRIAL_DAY_TO_LMS: Record<number, number | null> = { 1: null, 2: 2, 3: 3, 4: 4 };

export async function resolveTrialDays(opts: {
  sessionId: string;
  archetype: string;
  ageBand: AgeBand;
  childName: string;
  gender: Gender;
}): Promise<TrialDayCard[]> {
  const sql = getSql();
  const cards: TrialDayCard[] = [];

  // Day 1 — from the cached report.
  const report = await readCachedReportV2(sql, opts.sessionId).catch(() => null);
  const reportHref = `/report/${opts.sessionId}?report=v2&card=4`;
  if (report) {
    cards.push({
      trialDay: 1, lmsDay: null, source: "report",
      title: "Tonight's step",
      instead: report.switch.instead, say: report.switch.try, after: report.switch.after,
      steps: [...report.tonight], fullHref: reportHref,
    });
  } else {
    // No cached report yet (shouldn't happen for a real lead) — a minimal placeholder.
    cards.push({
      trialDay: 1, lmsDay: null, source: "report", title: "Tonight's step",
      say: "Tonight, try one small thing from your report and notice what happens.",
      steps: [], fullHref: reportHref,
    });
  }

  // Days 2–4 — from LMS Week 1.
  const week = getLmsWeekContent(opts.archetype, 1, opts.ageBand);
  for (const trialDay of [2, 3, 4]) {
    const lmsDay = TRIAL_DAY_TO_LMS[trialDay]!;
    const card = week ? getDayCard(week, lmsDay) : null;
    const raw = card?.content?.[opts.ageBand] ?? "";
    const body = raw ? fillLmsContent(raw, opts.childName, opts.gender).replace(/[*_]/g, "") : "";
    const title = card ? fillLmsContent(card.title, opts.childName, opts.gender).replace(/[*_]/g, "") : `Day ${trialDay}`;
    cards.push({
      trialDay, lmsDay, source: "lms",
      title, body,
      fullHref: `/lms`, // library (existing LMS page)
    });
  }
  return cards;
}
