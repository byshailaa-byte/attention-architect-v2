import { notFound } from "next/navigation";
import Link from "next/link";
import { getLmsUserContext } from "@/lib/lms/user-context";
import { getLmsWeekContent, getDayCard } from "@/lib/lms/content";
import { getUserProgress, isDayUnlocked, UNLOCK_DELAY_MS } from "@/lib/lms/progress";
import { renderMarkdown, fillLmsContent } from "@/lib/lms/render";
import DayCardActions from "@/components/lms/DayCardActions";
import type { ReflectionOutcome } from "@/content/types";

type Props = { params: Promise<{ week: string; day: string }> };

export default async function DayCardPage({ params }: Props) {
  const { week: weekStr, day: dayStr } = await params;
  const week = parseInt(weekStr, 10);
  const day = parseInt(dayStr, 10);

  const ctx = await getLmsUserContext();
  const content = getLmsWeekContent(ctx.archetype, week);
  if (!content) notFound();

  const dayCard = getDayCard(content, day);
  if (!dayCard) notFound();

  const now = new Date();
  const progress = await getUserProgress(ctx.userId, week);

  // For week boundaries (Week N Day 1, N > 1), also need the previous week's progress.
  const prevWeekProgress =
    week > 1 && day === 1 ? await getUserProgress(ctx.userId, week - 1) : null;

  const unlocked = isDayUnlocked(day, week, progress, prevWeekProgress, now);
  const alreadyComplete = progress.completedDays.has(day);
  const existingReflection = progress.reflections.get(day) ?? null;

  const fill = (s: string) => fillLmsContent(s, ctx.childName, ctx.childGender);

  // Opening fork: days 3–5 use the prior day's reflection (or "mixed" if not tapped)
  let openingForkText: string | null = null;
  if (day >= 3 && day <= 5) {
    const priorDayCard = getDayCard(content, day - 1);
    const priorOutcome: ReflectionOutcome =
      progress.reflections.get(day - 1) ?? "mixed";
    const rawFork = priorDayCard?.reflection?.nextDayOpening?.[priorOutcome] ?? null;
    openingForkText = rawFork ? fill(rawFork) : null;
  }

  const dayContent = fill(dayCard.content[ctx.ageBand]);
  const reflectionPrompt = dayCard.reflection?.prompt ?? null;

  // Determine where "next" goes after this card
  let nextHref: string;
  if (day === 5) {
    nextHref = `/lms/week/${week}/weekend`;
  } else {
    nextHref = `/lms/week/${week}/day/${day + 1}`;
  }

  if (!unlocked) {
    // Determine why: is the prerequisite day incomplete, or just not yet 24h?
    const prevDay = day === 1 ? 5 : day - 1; // week-boundary: prereq is prev week's Day 5
    const prereqProg = day === 1 && week > 1 ? prevWeekProgress : progress;
    const prereqComplete = prereqProg?.completedDays.has(prevDay) ?? false;

    let heading: string;
    let subtext: string;
    if (!prereqComplete) {
      heading = day === 1
        ? `Complete Week ${week - 1} first`
        : `Day ${prevDay} isn’t complete yet`;
      subtext = "Complete the previous day to continue.";
    } else {
      const prereqTime = prereqProg?.completionTimes.get(prevDay);
      const remainingMs = prereqTime
        ? UNLOCK_DELAY_MS - (now.getTime() - prereqTime.getTime())
        : UNLOCK_DELAY_MS;
      const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
      heading = `Day ${day} isn’t available yet`;
      subtext =
        remainingHours <= 1
          ? "This unlocks in less than an hour — check back soon."
          : `This unlocks in about ${remainingHours} hour${remainingHours === 1 ? "" : "s"}.`;
    }

    return (
      <div
        className="min-h-screen px-5 py-10 mx-auto"
        style={{ maxWidth: 680, background: "var(--paper)", color: "var(--ink)" }}
      >
        <Link href="/lms" className="text-sm mb-8 block" style={{ color: "var(--calm)" }}>
          ← Back
        </Link>
        <div
          className="rounded-xl p-6 text-center"
          style={{ background: "var(--card)", border: "1.5px solid var(--line)" }}
        >
          <p className="text-lg font-semibold mb-2" style={{ color: "var(--ink)" }}>
            {heading}
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--ink-dim)" }}>
            {subtext}
          </p>
          <Link
            href="/lms"
            className="inline-block rounded-lg px-4 py-2 text-sm font-semibold"
            style={{ background: "var(--ink)", color: "#fff" }}
          >
            Back to my program
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-5 py-10 mx-auto"
      style={{ maxWidth: 680, background: "var(--paper)", color: "var(--ink)" }}
    >
      {/* Nav */}
      <div className="flex items-center justify-between mb-8">
        <Link href={`/lms/week/${week}`} className="text-sm" style={{ color: "var(--calm)" }}>
          ← Week {week}
        </Link>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-icon-wordmark.png" alt="Attention Architect" style={{ height: 28, width: "auto" }} />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-dim)" }}>
          Day {day} of 5
        </span>
      </div>

      {/* Opening fork — prior day's reflection shapes today's opening */}
      {openingForkText && (
        <div
          className="rounded-xl px-5 py-4 mb-6"
          style={{ background: "var(--calm-tint)", border: "1px solid var(--calm)", borderColor: "rgba(110,95,176,0.3)" }}
        >
          <p className="text-sm" style={{ color: "var(--calm-text)" }}>
            {openingForkText}
          </p>
        </div>
      )}

      {/* Day card */}
      <div
        className="rounded-xl p-6 mb-6"
        style={{ background: "var(--card)", border: "1.5px solid var(--line)" }}
      >
        <div className="flex items-baseline gap-3 mb-4">
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--ink-dim)" }}
          >
            Action Card — Day {day}
          </span>
        </div>
        <h2 className="text-xl font-bold mb-4" style={{ color: "var(--ink)" }}>
          {fill(dayCard.title)}
        </h2>
        <div
          className="prose-lms"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(dayContent) }}
        />
      </div>

      {/* Day progress dots */}
      <div className="flex gap-2 justify-center mb-2">
        {[1, 2, 3, 4, 5].map((d) => (
          <div
            key={d}
            className="rounded-full"
            style={{
              width: 8,
              height: 8,
              background:
                d < day ? "var(--ink)" :
                d === day ? "var(--marker)" :
                "var(--line)",
            }}
          />
        ))}
      </div>

      {/* Interactive: complete + reflection */}
      <DayCardActions
        week={week}
        day={day}
        reflectionPrompt={reflectionPrompt}
        alreadyComplete={alreadyComplete}
        existingReflection={existingReflection as ReflectionOutcome | null}
        nextHref={nextHref}
      />
    </div>
  );
}
