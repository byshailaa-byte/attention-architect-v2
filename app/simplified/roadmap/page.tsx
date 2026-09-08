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
  1: "Getting started without the push",
  2: "Handling what pulls them away",
  3: "Staying with it on an ordinary day",
  4: "Coming back after a slip",
  5: "Using it beyond homework",
  6: "Running it themselves",
};

// Week 6 universal line — deliberate: week 6 is about not speaking.
const WEEK6_SCRIPT = "Nothing. That is the week.";

// Per-archetype scripts for weeks 1–5. Week 6 is always WEEK6_SCRIPT.
// Index: [w1, w2, w3, w4, w5]
const WHAT_TO_SAY: Record<string, [string, string, string, string, string]> = {
  "The Storm": [
    "Which one first — your call.",
    "You pick the stop time. I'll hold you to it.",
    "Same time tomorrow. Still your call how.",
    "That didn't work. What do you want to do now?",
    "This one's yours to sort out too.",
  ],
  "The All-In Kid": [
    "Take as long as you need. I won't interrupt.",
    "Tell me when you're at a stopping point.",
    "Same block tomorrow. I'll keep it clear.",
    "You got pulled out. Where were you?",
    "Same as at the desk — take your time with it.",
  ],
  "The Inventor": [
    "Do it your way. Show me when you're done.",
    "How do you want to end it?",
    "Same way as yesterday, if that worked.",
    "That approach didn't hold. What's your next one?",
    "Your way works here too. Try it.",
  ],
  "The Explorer": [
    "Write it down, then come back to it.",
    "Park it. It'll still be there.",
    "Notebook first, then the page.",
    "You went somewhere. Where were you before that?",
    "Same trick here — write it, then carry on.",
  ],
  "The Magnet": [
    "I'll be right here. You start.",
    "I'm not going anywhere. Finish your bit.",
    "Same spot, same time. I'll be around.",
    "You stopped. I'm still here — start again.",
    "I'm in the next room. Give it a go.",
  ],
  "The Glue": [
    "We're good. Whenever you're ready.",
    "Nothing's wrong. Finish and come find me.",
    "Same as always. We're fine.",
    "That was a wobble, not a problem. Ready?",
    "Same here as at the table. All fine.",
  ],
  "The Captain": [
    "This one's yours. Tell me what you need.",
    "You decide when it ends.",
    "Still yours all week. I'm not checking.",
    "It went wrong. How do you want to fix it?",
    "You're running this one too.",
  ],
  "The Live Wire": [
    "Ten minutes on the clock — see how far you get.",
    "Beat yesterday's stop time.",
    "Same clock tomorrow. Same target.",
    "Didn't come off. What's the next one?",
    "Set yourself something here too.",
  ],
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
  archetype: string,
): WeekContent {
  const fill  = (s: string) => cleanTitle(s, childName);
  const day2  = content.days.find(d => d.day === 2);
  const day4  = content.days.find(d => d.day === 4);
  const archetypeScripts = WHAT_TO_SAY[archetype];
  const whatToSay = weekNum === 6
    ? WEEK6_SCRIPT
    : (archetypeScripts?.[weekNum - 1] ?? WEEK6_SCRIPT);
  return {
    weekTitle: SHARED_WEEK_TITLES[weekNum] ?? content.weekTitle,
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
    const fallbackScript = w === 6 ? WEEK6_SCRIPT : (WHAT_TO_SAY[fallbackArchetype]?.[w - 1] ?? WEEK6_SCRIPT);
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
