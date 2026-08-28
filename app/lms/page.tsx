import { redirect } from "next/navigation";
import { getLmsUserContext } from "@/lib/lms/user-context";
import { getUserProgress, isDayUnlocked } from "@/lib/lms/progress";
import { getLmsWeekContent } from "@/lib/lms/content";
import { getSql } from "@/lib/db/client";
import JourneyMap, { type WeekState } from "@/components/lms/JourneyMap";
import Week3Pulse from "@/components/lms/Week3Pulse";

export default async function LmsHomePage() {
  const ctx = await getLmsUserContext();

  // First-time users see the onboarding flow.
  // Exception: users who already have lms_progress are existing mid-program users —
  // auto-complete their onboarding flag so they don't see it retroactively.
  if (!ctx.onboardingCompleted) {
    const sql = getSql();
    const existing = (await sql`
      SELECT COUNT(*)::int AS cnt FROM lms_progress WHERE user_id = ${ctx.userId}
    `) as unknown as { cnt: number }[];
    if ((existing[0]?.cnt ?? 0) > 0) {
      // Backfill: existing user, mark onboarding done silently
      await sql`UPDATE users SET onboarding_completed_at = NOW() WHERE id = ${ctx.userId} AND onboarding_completed_at IS NULL`;
    } else {
      redirect("/lms/onboarding");
    }
  }

  const now = new Date();

  // Load progress for all 6 weeks in parallel
  const [p1, p2, p3, p4, p5, p6] = await Promise.all(
    [1, 2, 3, 4, 5, 6].map((w) => getUserProgress(ctx.userId, w))
  );
  const allProgress = [p1, p2, p3, p4, p5, p6];

  // Check survey state for Week 3 pulse
  const sql = getSql();
  const [pulseRows] = await Promise.all([
    sql`SELECT submitted_at, dismissed_at FROM lms_surveys WHERE user_id = ${ctx.userId} AND survey_type = 'week3_pulse'` as unknown as Promise<{ submitted_at: Date | null; dismissed_at: Date | null }[]>,
  ]);
  const week3PulseDone = !!(pulseRows[0]?.submitted_at || pulseRows[0]?.dismissed_at);

  // Build week states
  const weeks: WeekState[] = [1, 2, 3, 4, 5, 6].map((week) => {
    const prog = allProgress[week - 1];
    const prevProg = week > 1 ? allProgress[week - 2] : null;
    const hasContent = getLmsWeekContent(ctx.archetype, week, ctx.ageBand) !== null;
    const unlocked = hasContent
      ? isDayUnlocked(1, week, prog, prevProg, now)
      : false;

    const completedDays = [1, 2, 3, 4, 5].filter((d) => prog.completedDays.has(d));
    const weekendDone = prog.completedDays.has(0);
    const reflections: Record<number, string> = {};
    for (const [day, outcome] of prog.reflections) {
      reflections[day] = outcome;
    }

    return { week, completedDays, weekendDone, reflections, unlocked, hasContent };
  });

  // Determine current week (first unlocked, not fully complete)
  let currentWeek = 1;
  let currentDay = 1;
  for (const ws of weeks) {
    if (!ws.unlocked) break;
    const allDone = ws.completedDays.length >= 5;
    if (!allDone) {
      currentWeek = ws.week;
      currentDay = (ws.completedDays.length === 0) ? 1 : Math.min(Math.max(...ws.completedDays) + 1, 5);
      break;
    }
    // Week fully complete (weekdays) — move to next
    currentWeek = ws.week;
    currentDay = ws.weekendDone ? 1 : 0; // 0 = weekend pending
  }

  // Aggregate stats
  const totalCompleted = weeks.reduce((sum, ws) => sum + ws.completedDays.length, 0);
  let workedCount = 0;
  let totalReflections = 0;
  for (const ws of weeks) {
    for (const outcome of Object.values(ws.reflections)) {
      totalReflections++;
      if (outcome === "worked") workedCount++;
    }
  }

  // Should we show the Week 3 pulse? Show if week 3 is unlocked AND pulse not done
  const week3Unlocked = weeks[2].unlocked;
  const showPulse = week3Unlocked && !week3PulseDone;

  return (
    <>
      {showPulse && <Week3Pulse childName={ctx.childName} />}
      <JourneyMap
        childName={ctx.childName}
        archetype={ctx.archetype}
        ageBand={ctx.ageBand}
        weeks={weeks}
        currentWeek={currentWeek}
        currentDay={currentDay}
        totalCompleted={totalCompleted}
        workedCount={workedCount}
        totalReflections={totalReflections}
        week3PulseDone={week3PulseDone}
      />
    </>
  );
}
