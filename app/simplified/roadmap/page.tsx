import { redirect } from "next/navigation";
import { getSql } from "@/lib/db/client";
import { getLmsWeekContent } from "@/lib/lms/content";
import SiteFooter from "@/app/components/SiteFooter";
import RoadmapView from "./RoadmapView";
import type { WeekContent } from "./RoadmapView";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Six shared week titles — same for every parent. Source: THE_PLAN.pdf.
// The personalisation lives underneath each title in the card (WHAT YOU DO = per-archetype
// LMS content for all 6 weeks; WHAT TO WATCH FOR = per-archetype signals).
const SHARED_WEEK_TITLES: Record<number, string> = {
  1: "Getting started without a fight",
  2: "Screens, without the daily argument",
  3: "Making it stick on a normal day",
  4: "When it falls apart",
  5: "Beyond homework",
  6: "When they do it on their own",
};

// Source: UPDATED_WEBSITE.pdf — what to say each week, shared across all archetypes.
const PDF_SCRIPTS: Record<number, string> = {
  1: "Just the first question. Then we look at it together.",
  2: "Five more minutes. I will tell you when.",
  3: "I am here. You start.",
  4: "You stopped. That is fine. Where did it get hard?",
  5: "Same as last night. First step only.",
  6: "Nothing. That is the week.",
};

// Resolve template variables to gender-neutral fallbacks for the roadmap context.
function cleanTitle(title: string, childName: string): string {
  return title
    .replace(/{{child_name}}/g, childName)
    .replace(/{{child_pronoun_subj}}/g, "they")
    .replace(/{{child_pronoun_obj}}/g, "them")
    .replace(/{{child_pronoun_poss}}/g, "their")
    .replace(/{{child_pronoun_reflexive}}/g, "themselves")
    .replace(/\*"(.+?)"\*/g, '"$1"')  // strip markdown emphasis from spoken scripts
    .replace(/{{[^}]+}}/g, "");
}

function extractWeekContent(
  content: NonNullable<ReturnType<typeof getLmsWeekContent>>,
  childName: string,
  weekNum: number,
): WeekContent {
  const fill  = (s: string) => cleanTitle(s, childName);
  const day2  = content.days.find(d => d.day === 2);
  const day4  = content.days.find(d => d.day === 4);
  return {
    weekTitle: SHARED_WEEK_TITLES[weekNum] ?? content.weekTitle,
    day2Title: fill(day2?.title ?? ""),
    day4Title: fill(day4?.title ?? ""),
    whatToSay: PDF_SCRIPTS[weekNum] ?? "",
  };
}

export default async function RoadmapPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session } = await searchParams;

  if (!session || !UUID_RE.test(session)) {
    redirect("/start");
  }

  const sql = getSql();
  const rows = await sql`
    SELECT a.child_name, a.archetype
    FROM assessments a
    WHERE a.session_id = ${session}::uuid
    LIMIT 1
  ` as { child_name: string | null; archetype: string }[];

  if (rows.length === 0) {
    redirect("/start");
  }

  const childName = rows[0].child_name || "your child";
  const archetype = rows[0].archetype  || "The All-In Kid";

  const fallbackArchetype = "The All-In Kid";
  const defaultWeekContents: WeekContent[] = [1, 2, 3, 4, 5, 6].map(w => {
    const wc = getLmsWeekContent(fallbackArchetype, w);
    return wc
      ? extractWeekContent(wc, "your child", w)
      : { weekTitle: `Week ${w}`, day2Title: "", day4Title: "", whatToSay: PDF_SCRIPTS[w] ?? "" };
  });

  const weekContents: WeekContent[] = [1, 2, 3, 4, 5, 6].map((w, i) => {
    const wc = getLmsWeekContent(archetype, w);
    return wc ? extractWeekContent(wc, childName, w) : defaultWeekContents[i];
  });

  return (
    <>
      <RoadmapView
        childName={childName}
        archetype={archetype}
        weekContents={weekContents}
        sessionId={session}
      />
      <SiteFooter />
    </>
  );
}
