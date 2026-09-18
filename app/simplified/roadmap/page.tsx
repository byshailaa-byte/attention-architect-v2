import { redirect } from "next/navigation";
import { getSql } from "@/lib/db/client";
import SiteFooter from "@/app/components/SiteFooter";
import RoadmapView from "./RoadmapView";
import { WEEK_TITLES, SKILL_NAMES, skillForArchetype } from "@/lib/report/skills";
import { goalsBySkill, GOAL_FRAMING_LINE, GOAL_FRAMING_LINE_STARTING } from "@/content/goals";
import { fillLmsContent } from "@/lib/lms/render";
import { CHILD_NAME_FALLBACK, type Gender } from "@/lib/report/pronouns";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const capitaliseFirst = (s: string): string =>
  s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;

// Positional {{child_name}} for the null-name fallback: "Your child" only at a
// sentence boundary, "your child" mid-sentence (the problem paragraph and method
// point 1 put the name mid-sentence). Real names are proper nouns, kept as given.
function placeName(template: string, name: string): string {
  if (name !== CHILD_NAME_FALLBACK) return template.replace(/\{\{child_name\}\}/g, name);
  return template.replace(/\{\{child_name\}\}/g, (_m, offset: number, full: string) => {
    const before = full.slice(0, offset).replace(/\s+$/, "");
    return before === "" || /[.!?:—]$/.test(before) ? "Your child" : "your child";
  });
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
  // Gate 3: goal_flagged and goal_free_text are deliberately NOT selected.
  const rows = (await sql`
    SELECT
      a.child_name, a.child_gender, a.archetype, a.parent_pattern,
      a.parent_name, a.email, a.phone,
      a.goal_skill, a.goal_key, a.goal_text
    FROM assessments a
    WHERE a.session_id = ${session}::uuid
    LIMIT 1
  `) as {
    child_name: string | null;
    child_gender: string | null;
    archetype: string;
    parent_pattern: string | null;
    parent_name: string | null;
    email: string | null;
    phone: string | null;
    goal_skill: string | null;
    goal_key: string | null;
    goal_text: string | null;
  }[];

  if (rows.length === 0) {
    redirect("/start");
  }

  const row = rows[0];
  const archetype = row.archetype;
  const parentPattern = row.parent_pattern ?? "The Pusher";

  // Untouched sections (ladder, pricing, nav) thread the name through both sentence
  // positions — mid-sentence fallback preserved (group D). Goal copy gets the
  // sentence-initial fallback + gender for token fills.
  const cProp = row.child_name || "your child";
  const gender = (row.child_gender ?? null) as Gender;
  const goalChildName = row.child_name || CHILD_NAME_FALLBACK;
  const fill = (s: string) => fillLmsContent(s, goalChildName, gender);

  // Skill: prefer the stored goal_skill; otherwise derive from the archetype so a
  // goalless session still gets the right six-week plan.
  const storedIdx = row.goal_skill
    ? (SKILL_NAMES as readonly string[]).indexOf(row.goal_skill)
    : -1;
  const skill =
    storedIdx >= 0
      ? { idx: storedIdx, name: SKILL_NAMES[storedIdx] }
      : skillForArchetype(archetype);
  const content = goalsBySkill[skill.name as keyof typeof goalsBySkill];

  // Goal statement: the parent's stored goal_text if present (already name/gender
  // filled and capitalised at write time); otherwise the skill's recommended goal,
  // presented as what the plan works toward — never as a choice the parent made.
  const goalIsChosen = !!row.goal_text;
  const recommended = content.goals.find((g) => g.recommended) ?? content.goals[0];
  const goalStatement = goalIsChosen
    ? row.goal_text!
    : capitaliseFirst(fill(recommended.text));

  // Framing line — same construction as the report goal picker.
  const N = skill.idx + 1;
  const framingRaw =
    skill.idx === 0
      ? GOAL_FRAMING_LINE_STARTING
      : GOAL_FRAMING_LINE
          .replace(/\{\{n\}\}/g, String(skill.idx))
          .replace(/\{\{N\}\}/g, String(N))
          .replace(/\{\{week_title\}\}/g, WEEK_TITLES[N] ?? "");
  const framingLine = fill(framingRaw);

  // Six weeks — objective + two outcome columns, from the skill's authored objectives.
  const weeks = content.objectives.map((o) => ({
    title: WEEK_TITLES[o.week] ?? `Week ${o.week}`,
    objective: fill(o.objective),
    parentOutcome: fill(o.parentOutcome),
    childOutcome: fill(o.childOutcome),
  }));

  // Problem paragraph + method point 1 — the name can sit mid-sentence here, so
  // fill with positional casing (not the plain fill used above).
  const fillName = (s: string) => fillLmsContent(placeName(s, goalChildName), goalChildName, gender);
  const problem = fillName(content.problem);
  const methodPoint1 = fillName(
    skill.idx === 0
      ? "For {{child_name}} the work starts at week one, and the rest builds from there."
      : `{{child_name}} is already steady through week ${skill.idx}, so that ground moves quickly.`,
  );

  return (
    <>
      <RoadmapView
        childName={cProp}
        archetype={archetype}
        parentPattern={parentPattern}
        sessionId={session}
        parentName={row.parent_name ?? ""}
        email={row.email ?? ""}
        phone={row.phone ?? ""}
        goalStatement={goalStatement}
        framingLine={framingLine}
        problem={problem}
        methodPoint1={methodPoint1}
        breakWeek={N}
        weeks={weeks}
      />
      <SiteFooter />
    </>
  );
}
