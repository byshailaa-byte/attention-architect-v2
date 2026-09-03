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
  1: "Starting without being asked",
  2: "Staying with it when something easier is right there",
  3: "Keeping it going on an ordinary day",
  4: "Coming back after attention slips",
  5: "Using it beyond homework",
  6: "Running it themselves",
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
    SELECT a.child_name, a.archetype, a.parent_pattern, a.parent_name, a.email, a.phone
    FROM assessments a
    WHERE a.session_id = ${session}::uuid
    LIMIT 1
  ` as { child_name: string | null; archetype: string; parent_pattern: string | null; parent_name: string | null; email: string | null; phone: string | null }[];

  if (rows.length === 0) {
    redirect("/start");
  }

  const childName     = rows[0].child_name    || "your child";
  const archetype     = rows[0].archetype     || "The All-In Kid";
  const parentPattern = rows[0].parent_pattern || "The Pusher";
  const parentName    = rows[0].parent_name   || "";
  const email         = rows[0].email         || "";
  const phone         = rows[0].phone         || "";

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
        parentPattern={parentPattern}
        weekContents={weekContents}
        sessionId={session}
        parentName={parentName}
        email={email}
        phone={phone}
      />
      <SiteFooter />
    </>
  );
}
