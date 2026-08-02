import { redirect } from "next/navigation";
import { getLmsUserContext } from "@/lib/lms/user-context";
import { getUserProgress, getNextDay, isDayUnlocked } from "@/lib/lms/progress";
import { getLmsWeekContent } from "@/lib/lms/content";

export default async function LmsHomePage() {
  const ctx = await getLmsUserContext();
  const now = new Date();

  // Fetch week 1 and week 2 progress in parallel
  const [week1Progress, week2Progress] = await Promise.all([
    getUserProgress(ctx.userId, 1),
    getUserProgress(ctx.userId, 2),
  ]);

  // Week 2 unlock: requires Week 1 Day 5 complete + 24h elapsed AND content exists
  const week2HasContent = getLmsWeekContent(ctx.archetype, 2) !== null;
  const week2Unlocked =
    week2HasContent && isDayUnlocked(1, 2, week2Progress, week1Progress, now);

  if (week2Unlocked) {
    if (week2Progress.completedDays.size > 0) {
      const nextDay = getNextDay(week2Progress);
      // nextDay === 0 means all 5 days done → route to weekend (done or not)
      if (nextDay === 0) redirect("/lms/week/2/weekend");
      redirect(`/lms/week/2/day/${nextDay}`);
    }
    // Week 2 unlocked but not started — go to day 1
    redirect("/lms/week/2/day/1");
  }

  // Week 2 not yet unlocked — route within week 1
  if (week1Progress.completedDays.size === 0) {
    redirect("/lms/week/1");
  }

  const nextDay = getNextDay(week1Progress);
  if (nextDay === 0) redirect("/lms/week/1/weekend");
  redirect(`/lms/week/1/day/${nextDay}`);
}
