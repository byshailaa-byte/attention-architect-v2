import { redirect } from "next/navigation";
import { getLmsUserContext } from "@/lib/lms/user-context";
import { getUserProgress, getNextDay } from "@/lib/lms/progress";

export default async function LmsHomePage() {
  const ctx = await getLmsUserContext();
  const progress = await getUserProgress(ctx.userId, 1);

  if (progress.completedDays.size === 0) {
    // First visit — show the weekly reading
    redirect("/lms/week/1");
  }

  const nextDay = getNextDay(progress);
  if (nextDay === 0) {
    redirect("/lms/week/1/weekend");
  }
  redirect(`/lms/week/1/day/${nextDay}`);
}
