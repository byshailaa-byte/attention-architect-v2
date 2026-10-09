// Trial day content:
//   • Day 1  = the parent's OWN report "try tonight" step (report-v2 card 4: instead / say / 3 steps).
//   • Days 2–4 = LMS Week 1 Day 2, 3, 4 for their archetype × age band (LMS Day 1 is the "Just watch"
//                observation day, which the trial skips — it's available after paying).
import type { AgeBand } from "@/content/types";
import type { Gender } from "@/lib/report/pronouns";
import { getSql } from "@/lib/db/client";
import { getLmsWeekContent, getDayCard } from "@/lib/lms/content";
import { fillLmsContent } from "@/lib/lms/render";
import { CARD4_HEADLINE } from "@/lib/report-v2/v3-copy";

type Sql = ReturnType<typeof getSql>;

// The report's card-4 "try tonight" step, read VERSION-AGNOSTICALLY (the fields exist in both the
// v2 and v3 report shapes). Returns null when the report has no usable card-4 — the grant is
// blocked in that case. title = the report's real card-4 headline.
export type TrialCard4 = { title: string; instead: string; say: string; after: string; steps: string[] };

export async function readTrialCard4(sql: Sql, sessionId: string): Promise<TrialCard4 | null> {
  if (!sessionId) return null;
  const rows = (await sql`
    SELECT content->'switch'->>'instead' instead, content->'switch'->>'try' say,
           content->'switch'->>'after' after,
           (SELECT array_agg(x) FROM jsonb_array_elements_text(content->'tonight') x) steps
    FROM report_v2_content WHERE session_id = ${sessionId}::uuid LIMIT 1
  `) as unknown as { instead: string | null; say: string | null; after: string | null; steps: string[] | null }[];
  const r = rows[0];
  if (!r || !r.instead || !r.say || !r.steps || r.steps.length < 3) return null;
  return { title: CARD4_HEADLINE, instead: r.instead, say: r.say, after: r.after ?? "", steps: r.steps.slice(0, 3) };
}

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

  // Day 1 — the parent's real report card-4 (grant is blocked when this is null, so a real trial
  // always has it; the fallback card is defensive only).
  const card4 = await readTrialCard4(sql, opts.sessionId).catch(() => null);
  const reportHref = `/report/${opts.sessionId}?report=v2&card=4`;
  cards.push(card4
    ? {
        trialDay: 1, lmsDay: null, source: "report",
        title: card4.title, instead: card4.instead, say: card4.say, after: card4.after,
        steps: card4.steps, fullHref: reportHref,
      }
    : {
        trialDay: 1, lmsDay: null, source: "report", title: CARD4_HEADLINE,
        say: "Try one small change to how tonight starts, and notice what happens.",
        steps: [], fullHref: reportHref,
      });

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
