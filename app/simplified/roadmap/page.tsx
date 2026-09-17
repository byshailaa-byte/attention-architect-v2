import { redirect } from "next/navigation";
import { getSql } from "@/lib/db/client";
import { getLmsWeekContent } from "@/lib/lms/content";
import { SAY_BY_ARCHETYPE, WEEK6_SCRIPT } from "@/content/lms/what-to-say";
import SiteFooter from "@/app/components/SiteFooter";
import RoadmapView from "./RoadmapView";
import type { WeekContent } from "./RoadmapView";
import { WEEK_TITLES } from "@/lib/report/skills";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  archetype: string,
): WeekContent {
  const fill  = (s: string) => cleanTitle(s, childName);
  const day2  = content.days.find(d => d.day === 2);
  const day4  = content.days.find(d => d.day === 4);
  const archetypeScripts = SAY_BY_ARCHETYPE[archetype];
  const whatToSay = weekNum === 6
    ? WEEK6_SCRIPT
    : (archetypeScripts?.[weekNum - 1] ?? WEEK6_SCRIPT);
  return {
    weekTitle: WEEK_TITLES[weekNum] ?? content.weekTitle,
    day2Title: fill(day2?.title ?? ""),
    day4Title: fill(day4?.title ?? ""),
    whatToSay,
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
    const fallbackScript = w === 6 ? WEEK6_SCRIPT : (SAY_BY_ARCHETYPE[fallbackArchetype]?.[w - 1] ?? WEEK6_SCRIPT);
    return wc
      ? extractWeekContent(wc, "your child", w, fallbackArchetype)
      : { weekTitle: `Week ${w}`, day2Title: "", day4Title: "", whatToSay: fallbackScript };
  });

  const weekContents: WeekContent[] = [1, 2, 3, 4, 5, 6].map((w, i) => {
    const wc = getLmsWeekContent(archetype, w);
    return wc ? extractWeekContent(wc, childName, w, archetype) : defaultWeekContents[i];
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
