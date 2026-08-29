import { redirect } from "next/navigation";
import { getSql } from "@/lib/db/client";
import SiteFooter from "@/app/components/SiteFooter";
import ProfileView from "./ProfileView";
import { archetypeContent, patternContent, fitContent } from "@/content";
import { fillTokens } from "@/lib/report/tokens";
import { buildPronounTokens } from "@/lib/report/pronouns";
import type { Gender } from "@/lib/report/pronouns";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Break-point index (0-based) per archetype.
// Source of truth: app/simplified/children/page.tsx ARCHETYPES[].breaks
const BREAK_IDX: Record<string, number> = {
  "The Storm":      0,
  "The All-In Kid": 4,
  "The Inventor":   0,
  "The Explorer":   1,
  "The Magnet":     5,
  "The Glue":       1,
  "The Captain":    5,
  "The Live Wire":  2,
};

const SKILL_NAMES = [
  "Starting",
  "Holding on",
  "Staying with it",
  "Recovering",
  "Carrying it over",
  "Running it themselves",
];

// Archetype-specific SceneCard closing line — what the parent didn't know.
const SCENE_CLOSINGS: Record<string, string> = {
  "The Storm":      "You already knew all of that. What you didn't know is that the request is the part that ends it.",
  "The All-In Kid": "You already knew all of that. What you didn't know is that the suggestion is the part that ends it.",
  "The Inventor":   "You already knew all of that. What you didn't know is that the instruction is the part that ends it.",
  "The Explorer":   "You already knew all of that. What you didn't know is that the interruption is the part that starts them again — somewhere else.",
  "The Magnet":     "You already knew all of that. What you didn't know is that your moving away is the part that ends it.",
  "The Glue":       "You already knew all of that. What you didn't know is that the tension in the room is the part that ends it.",
  "The Captain":    "You already knew all of that. What you didn't know is that the override is the part that ends it.",
  "The Live Wire":  "You already knew all of that. What you didn't know is that the stakes dropping is the part that ends it.",
};

const CONCERN_LABELS: Record<string, string> = {
  homework:   "Homework",
  reminders:  "Focus",
  screens:    "Screens",
  confidence: "Confidence",
  giveup:     "Giving up",
  finish:     "Finishing",
};

type Row = {
  child_name: string | null;
  age_band: string;
  archetype: string | null;
  parent_pattern: string | null;
  concerns: string[];
  worry_followup: string | null;
  child_gender: string | null;
};

export default async function ProfilePage({
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
    SELECT child_name, age_band, archetype, parent_pattern,
           concerns, worry_followup, child_gender
    FROM assessments
    WHERE session_id = ${session}::uuid
    LIMIT 1
  ` as Row[];

  if (rows.length === 0) {
    redirect("/start");
  }

  const row = rows[0];
  const childName    = row.child_name    || "your child";
  const ageBand      = (row.age_band     || "10-11") as "8-9" | "10-11" | "12-14";
  const archetype    = row.archetype     || "The All-In Kid";
  const parentPattern= row.parent_pattern|| "The Pusher";
  const concerns     = row.concerns      ?? [];
  const worryFollowup= row.worry_followup ?? null;
  const gender       = (row.child_gender as Gender) ?? null;

  const archC = archetypeContent[archetype]   ?? archetypeContent["The All-In Kid"];
  const pattC = patternContent[parentPattern] ?? patternContent["The Pusher"];
  const fitC  = fitContent[`${archetype}|${parentPattern}`] ?? { fitReveal: "" };

  const pronouns     = buildPronounTokens(gender);
  const baseTokens   = { ...pronouns, child_name: childName };
  // s4ReframeClose may itself contain pronoun tokens — fill those before using it as a substitution value.
  const reframeClose = fillTokens(archC.s4ReframeClose, baseTokens);
  const tokens       = { ...baseTokens, child_reframe_close: reframeClose };
  const fill         = (s: string) => fillTokens(s, tokens);

  const breakIdx    = BREAK_IDX[archetype] ?? 1;
  const breakName   = SKILL_NAMES[breakIdx];
  const sceneClosing= SCENE_CLOSINGS[archetype] ?? SCENE_CLOSINGS["The All-In Kid"];
  const concernLabel= CONCERN_LABELS[concerns[0]] ?? "Focus";

  const evidenceItems = [
    concernLabel,
    worryFollowup ?? "It depends on the day",
    pattC.displayName,
  ];

  return (
    <>
      <ProfileView
        childName={childName}
        ageBand={ageBand}
        archetypeName={archC.displayName}
        patternName={pattC.displayName}
        evidenceItems={evidenceItems}
        sceneClosing={sceneClosing}
        anecdote={fill(archC.s2Anecdote)}
        pullquote={fill(archC.s2Pullquote)}
        strength={fill(archC.s2Strength)}
        shadow={fill(archC.s2Shadow)}
        analysis0={fill(archC.s4Analysis[0])}
        analysis1={fill(archC.s4Analysis[1])}
        mechanism={fill(pattC.s4MechanismTemplate)}
        disarm={fill(pattC.s3Disarm)}
        fitReveal={fill(fitC.fitReveal)}
        futureScene={fill(archC.s6FutureScene)}
        breakIdx={breakIdx}
        breakName={breakName}
        sessionId={session}
      />
      <SiteFooter />
    </>
  );
}
