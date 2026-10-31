// Server wrapper for the v3 report: builds the facts bundle (incl. tonight's step from report_v2) and
// the REAL Week-1 LMS day-by-day for this child's pattern + age (name-free rewritten content, filled),
// then renders the client deck. Everything else is approved copy inside ReportV3.
import "server-only";
import { buildV3Facts } from "@/lib/report-v3/facts";
import { getLmsWeekContent, getDayCard } from "@/lib/lms/content";
import { fillLmsContent } from "@/lib/lms/render";
import type { AgeBand } from "@/content/types";
import type { Gender } from "@/lib/report/pronouns";
import ReportV3 from "./ReportV3";

type Row = { child_name: string | null; child_gender: string | null; age_band: string; archetype: string | null; concerns: string[] | null };

// First sentence of a day's content, markdown-stripped and trimmed — the one-line teaser under each day.
function teaser(text: string): string {
  const t = text.replace(/[*_#>`]/g, "").replace(/\s+/g, " ").trim();
  const end = t.search(/[.?!]\s/);
  const s = end > 0 ? t.slice(0, end + 1) : t;
  return s.length > 120 ? s.slice(0, 117).trimEnd() + "…" : s;
}

export default async function ReportV3Server({ sessionId, row }: { sessionId: string; row: Row }) {
  const facts = await buildV3Facts(sessionId, row);
  const fill = (s: string) => fillLmsContent(s, facts.name, (facts.gender ?? null) as Gender);

  const wk = getLmsWeekContent(facts.archKey, 1, facts.band as AgeBand) ?? getLmsWeekContent(facts.archKey, 1);
  const week1Days = wk
    ? wk.days.map((d) => {
        const card = getDayCard(wk, d.day)!;
        const body = card.content[facts.band as AgeBand] ?? card.content["10-11"] ?? "";
        return { day: d.day, title: fill(card.title), teaser: teaser(fill(body)), observe: d.day === 1 };
      })
    : [];

  return <ReportV3 sessionId={sessionId} facts={facts} week1Days={week1Days} />;
}
