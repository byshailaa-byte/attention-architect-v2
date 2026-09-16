import { notFound } from "next/navigation";
import Link from "next/link";
import { getLmsUserContext } from "@/lib/lms/user-context";
import { getLmsWeekContent, getDayCard } from "@/lib/lms/content";
import { getUserProgress, isDayUnlocked, UNLOCK_DELAY_MS } from "@/lib/lms/progress";
import { fillLmsContent, renderMarkdown } from "@/lib/lms/render";
import { SAY_BY_ARCHETYPE, NOT_THIS_BY_INSTINCT, WEEK6_SCRIPT } from "@/content/lms/what-to-say";
import V2DayActions from "@/components/lms-v2/V2DayActions";
import type { ReflectionOutcome } from "@/content/types";

const BG = `var(--font-bricolage),'Bricolage Grotesque',sans-serif`;

const OUTCOME_LABELS: Record<string, string> = {
  worked:     "it worked",
  mixed:      "it was mixed",
  didnt_land: "it didn't land",
};

type Props = { params: Promise<{ week: string; day: string }> };

export default async function LmsV2DayPage({ params }: Props) {
  const { week: weekStr, day: dayStr } = await params;
  const week = parseInt(weekStr, 10);
  const day  = parseInt(dayStr, 10);
  if (isNaN(week) || isNaN(day) || week < 1 || week > 6 || day < 1 || day > 5) notFound();

  const ctx = await getLmsUserContext();
  const content = getLmsWeekContent(ctx.archetype, week, ctx.ageBand);
  if (!content) notFound();

  const dayCard = getDayCard(content, day);
  if (!dayCard) notFound();

  const now = new Date();
  const [progress, prevWeekProgress] = await Promise.all([
    getUserProgress(ctx.userId, week),
    week > 1 && day === 1 ? getUserProgress(ctx.userId, week - 1) : Promise.resolve(null),
  ]);

  const unlocked        = isDayUnlocked(day, week, progress, prevWeekProgress, now);
  const alreadyComplete = progress.completedDays.has(day);
  const existingRef     = progress.reflections.get(day) ?? null;
  const fill = (s: string) => fillLmsContent(s, ctx.childName, ctx.childGender);

  // Opening fork
  let openingFork: { priorOutcomeLabel: string; text: string } | null = null;
  if (day >= 3 && day <= 5) {
    const priorOutcome: ReflectionOutcome = progress.reflections.get(day - 1) ?? "mixed";
    const priorCard = getDayCard(content, day - 1);
    const rawFork   = priorCard?.reflection?.nextDayOpening?.[priorOutcome] ?? null;
    if (rawFork) {
      openingFork = {
        priorOutcomeLabel: OUTCOME_LABELS[priorOutcome] ?? priorOutcome,
        text: fill(rawFork),
      };
    }
  }

  const dayContentHtml  = renderMarkdown(fill(dayCard.content[ctx.ageBand]));
  const reflectionPrompt = dayCard.reflection?.prompt ?? null;
  const nextHref = day === 5 ? `/lms-v2/week/${week}/weekend` : `/lms-v2/week/${week}/day/${day + 1}`;

  const weekSay = week === 6
    ? WEEK6_SCRIPT
    : (SAY_BY_ARCHETYPE[ctx.archetype]?.[week - 1] ?? null);
  const weekNotThis = week === 6
    ? null
    : (NOT_THIS_BY_INSTINCT[ctx.parentPattern]?.[week - 1] ?? null);

  if (!SAY_BY_ARCHETYPE[ctx.archetype]) {
    console.warn(`[lms-v2 day] No SAY entry for archetype: ${ctx.archetype}`);
  }

  // ── Locked state ─────────────────────────────────────────────────────────────
  if (!unlocked) {
    const prereqComplete =
      day === 1 && week > 1
        ? (prevWeekProgress?.completedDays.has(5) ?? false)
        : progress.completedDays.has(day - 1);
    const prereqTime =
      day === 1 && week > 1
        ? prevWeekProgress?.completionTimes.get(5)
        : progress.completionTimes.get(day - 1);
    const ms    = prereqTime ? Math.max(0, UNLOCK_DELAY_MS - (now.getTime() - prereqTime.getTime())) : UNLOCK_DELAY_MS;
    const hours = Math.ceil(ms / 3_600_000);
    const timeStr = hours <= 1 ? "less than an hour" : `about ${hours} hour${hours === 1 ? "" : "s"}`;

    return (
      <div style={{ minHeight:"100dvh", background:"var(--v2-bg)", fontFamily:"var(--v2-IS)", color:"var(--v2-dim)" }}>
        <div style={{
          background:"#fff", borderBottom:"1px solid var(--v2-line)", padding:"12px 28px",
          display:"flex", gap:12, alignItems:"center",
        }}>
          <Link href={`/lms-v2/week/${week}`} style={{ fontSize:12.5, fontWeight:600, color:"var(--v2-dim2)", textDecoration:"none" }}>
            ← Week {week}
          </Link>
          <span style={{ fontSize:12.5, color:"var(--v2-dim2)" }}>My Plan &rsaquo; Week {week} &rsaquo; Day {day}</span>
        </div>
        <div style={{ maxWidth:600, margin:"0 auto", padding:"60px 24px" }}>
          <div className="v2-card" style={{ padding:"36px 32px" }}>
            <h2 style={{ fontSize:22, fontWeight:800, marginBottom:14, lineHeight:1.25 }}>
              {prereqComplete
                ? `Day ${day} opens in ${timeStr}`
                : day === 1 && week > 1
                ? `Complete Week ${week - 1} Day 5 first`
                : `Complete Day ${day - 1} first`}
            </h2>
            <p style={{ fontSize:15, color:"var(--v2-dim)", lineHeight:1.7 }}>
              {prereqComplete
                ? "The gap between days is built in, not a wait. What you tried yesterday is still settling. Come back when it opens."
                : "Complete the previous day to continue."}
            </p>
            <Link href="/lms-v2" style={{
              display:"inline-block", marginTop:28, background:"var(--v2-navy)", color:"#fff",
              borderRadius:10, padding:"12px 24px", fontFamily:BG, fontWeight:700, fontSize:14, textDecoration:"none",
            }}>
              Back to home →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Unlocked day view ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100dvh", background:"var(--v2-bg)", fontFamily:"var(--v2-IS)", color:"var(--v2-dim)" }}>

      {/* Top bar */}
      <div style={{
        background:"#fff", borderBottom:"1px solid var(--v2-line)", padding:"12px 28px",
        display:"flex", alignItems:"center", gap:14, position:"sticky", top:0, zIndex:9,
      }}>
        <Link href={`/lms-v2/week/${week}`} style={{ fontSize:12.5, fontWeight:600, color:"var(--v2-dim2)", textDecoration:"none", whiteSpace:"nowrap" }}>
          ← Week {week}
        </Link>
        <span style={{ fontSize:12.5, color:"var(--v2-dim2)" }}>My Plan &rsaquo; Week {week} &rsaquo; Day {day}</span>
      </div>

      <div style={{ maxWidth:700, margin:"0 auto", padding:"24px 28px 100px" }}>

        {/* Lesson card */}
        <div className="v2-card" style={{ padding:"22px 24px", marginTop:16 }}>

          {/* Fork line */}
          {openingFork && (
            <div className="v2-forkline">
              ↳ This opening is here because you logged{" "}
              <b>&nbsp;&ldquo;{openingFork.priorOutcomeLabel}&rdquo;&nbsp;</b>{" "}
              after Day {day - 1}.
            </div>
          )}

          <div style={{ fontSize:10.5, letterSpacing:".1em", textTransform:"uppercase", fontWeight:700, color:"#A3781E" }}>
            Day {day} of 5
          </div>
          <h2 style={{ fontSize:21, margin:"7px 0 12px", fontWeight:800 }}>{fill(dayCard.title)}</h2>

          <div className="v2-prose" dangerouslySetInnerHTML={{ __html: dayContentHtml }} />
        </div>

        {/* Say card */}
        {weekSay && (
          <div className="v2-card" style={{ padding:"20px 22px", marginTop:12, marginBottom:12 }}>
            <div style={{ fontSize:10.5, letterSpacing:".1em", textTransform:"uppercase", fontWeight:700, color:"var(--v2-teal-700)", marginBottom:7 }}>
              Say this — Week {week}
            </div>
            <div style={{ fontFamily:BG, fontSize:19, fontWeight:700, color:"var(--v2-navy)", lineHeight:1.38 }}>
              &ldquo;{weekSay}&rdquo;
            </div>

            {weekNotThis && (
              <div style={{ background:"var(--v2-red-tint)", border:"1px solid rgba(217,97,74,.22)", borderRadius:12, padding:"16px 18px", marginTop:14 }}>
                <div style={{ fontSize:10.5, letterSpacing:".1em", textTransform:"uppercase", fontWeight:700, color:"var(--v2-red)", marginBottom:7 }}>
                  Not this — {ctx.parentPattern}
                </div>
                <div style={{ fontFamily:BG, fontSize:16.5, fontWeight:700, color:"#96382A", lineHeight:1.38 }}>
                  &ldquo;{weekNotThis.phrase}&rdquo;
                </div>
                <div style={{ fontSize:13.2, marginTop:9, color:"var(--v2-dim)" }}>
                  {weekNotThis.why}
                </div>
              </div>
            )}

            <Link href="/lms-v2/what-to-say" style={{ display:"block", marginTop:12, fontSize:12, color:"var(--v2-teal-700)", fontWeight:600 }}>
              See all weeks →
            </Link>
          </div>
        )}

        {/* Reflection / complete */}
        <V2DayActions
          week={week}
          day={day}
          reflectionPrompt={reflectionPrompt}
          alreadyComplete={alreadyComplete}
          existingReflection={existingRef as ReflectionOutcome | null}
          nextHref={nextHref}
        />
      </div>
    </div>
  );
}
