import { redirect } from "next/navigation";
import { getLmsUserContext } from "@/lib/lms/user-context";
import { getUserProgress, getNextDay, isDayUnlocked } from "@/lib/lms/progress";
import { getLmsWeekContent } from "@/lib/lms/content";

export default async function LmsHomePage() {
  const ctx = await getLmsUserContext();
  const now = new Date();

  const [week1Progress, week2Progress, week3Progress] = await Promise.all([
    getUserProgress(ctx.userId, 1),
    getUserProgress(ctx.userId, 2),
    getUserProgress(ctx.userId, 3),
  ]);

  // Week 3 unlock: requires Week 2 Day 5 complete + 24h elapsed AND content exists
  const week3HasContent = getLmsWeekContent(ctx.archetype, 3) !== null;
  const week3Unlocked =
    week3HasContent && isDayUnlocked(1, 3, week3Progress, week2Progress, now);

  if (week3Unlocked) {
    if (week3Progress.completedDays.size > 0) {
      const nextDay = getNextDay(week3Progress);
      if (nextDay === 0) redirect("/lms/week/3/weekend");
      redirect(`/lms/week/3/day/${nextDay}`);
    }
    redirect("/lms/week/3/day/1");
  }

  // Week 2 unlock: requires Week 1 Day 5 complete + 24h elapsed AND content exists
  const week2HasContent = getLmsWeekContent(ctx.archetype, 2) !== null;
  const week2Unlocked =
    week2HasContent && isDayUnlocked(1, 2, week2Progress, week1Progress, now);

  if (week2Unlocked) {
    if (week2Progress.completedDays.size > 0) {
      const nextDay = getNextDay(week2Progress);
      if (nextDay === 0) redirect("/lms/week/2/weekend");
      redirect(`/lms/week/2/day/${nextDay}`);
    }
    redirect("/lms/week/2/day/1");
  }

  // Week 1 routing
  if (week1Progress.completedDays.size === 0) {
    redirect("/lms/week/1");
  }

  const nextDay = getNextDay(week1Progress);
  if (nextDay === 0) redirect("/lms/week/1/weekend");
  redirect(`/lms/week/1/day/${nextDay}`);
}
