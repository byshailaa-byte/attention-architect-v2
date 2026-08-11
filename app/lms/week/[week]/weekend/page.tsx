import { notFound } from "next/navigation";
import Link from "next/link";
import { getLmsUserContext } from "@/lib/lms/user-context";
import { getLmsWeekContent } from "@/lib/lms/content";
import { getUserProgress, isDayUnlocked, computeWeekTrend, UNLOCK_DELAY_MS } from "@/lib/lms/progress";
import { renderWeekendContent, renderMarkdown, fillLmsContent } from "@/lib/lms/render";
import WeekendCompleteButton from "@/components/lms/WeekendCompleteButton";
import { getSql } from "@/lib/db/client";

type Props = { params: Promise<{ week: string }> };

type NoteRow = { day: number; outcome: string; note: string | null };

export default async function WeekendReviewPage({ params }: Props) {
  const { week: weekStr } = await params;
  const week = parseInt(weekStr, 10);

  const ctx = await getLmsUserContext();
  const content = getLmsWeekContent(ctx.archetype, week);
  if (!content) notFound();

  const now = new Date();
  const progress = await getUserProgress(ctx.userId, week);
  const unlocked = isDayUnlocked(0, week, progress, null, now);
  const alreadyComplete = progress.completedDays.has(0);

  // Determine next-week state for the button's done-state messaging
  const nextWeek = week + 1;
  const nextWeekHasContent = getLmsWeekContent(ctx.archetype, nextWeek) !== null;
  const nextWeekUnlocked = nextWeekHasContent &&
    isDayUnlocked(1, nextWeek, { completedDays: new Set(), completionTimes: new Map(), reflections: new Map() }, progress, now);
  const day5Time = progress.completionTimes.get(5);
  const remainingMs = day5Time
    ? Math.max(0, UNLOCK_DELAY_MS - (now.getTime() - day5Time.getTime()))
    : UNLOCK_DELAY_MS;
  const nextWeekUnlockHours = Math.ceil(remainingMs / (60 * 60 * 1000));

  if (!unlocked) {
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
            Not quite yet
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--ink-dim)" }}>
            Finish Days 1–5 before the weekend review.
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

  const weekTrend = computeWeekTrend(progress.reflections);
  const templateContent = content.weekendReview.content[ctx.ageBand];
  const afterIfBlocks = renderWeekendContent(templateContent, {
    week_trend: weekTrend,
    age_band: ctx.ageBand,
  });
  const renderedContent = fillLmsContent(afterIfBlocks, ctx.childName, ctx.childGender);

  // Load notes written during the week (never parsed, just displayed)
  const sql = getSql();
  const noteRows = (await sql`
    SELECT day, outcome, note FROM lms_reflections
    WHERE user_id = ${ctx.userId}
      AND week = ${week}
      AND note IS NOT NULL
      AND note != ''
    ORDER BY day
  `) as unknown as NoteRow[];

  const OUTCOME_LABELS: Record<string, string> = {
    worked: "Worked",
    mixed: "Mixed",
    didnt_land: "Didn't land",
  };

  return (
    <div
      className="min-h-screen px-5 py-10 mx-auto"
      style={{ maxWidth: 680, background: "var(--paper)", color: "var(--ink)" }}
    >
      {/* Nav */}
      <div className="flex items-center justify-between mb-8">
        <Link href={`/lms/week/${week}/day/5`} className="text-sm" style={{ color: "var(--calm)" }}>
          ← Day 5
        </Link>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-horizontal-icon-wordmark.png" alt="Attention Architect" style={{ height: 20, width: "auto" }} />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-dim)" }}>
          Week {week} — Weekend review
        </span>
      </div>

      <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--ink)" }}>
        No action. Just review.
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--ink-dim)" }}>
        Week 1 complete.
      </p>

      {/* Week trend content */}
      <div
        className="prose-lms mb-8"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(renderedContent) }}
      />

      {/* Reflection notes echoed back */}
      {noteRows.length > 0 && (
        <div className="mb-8">
          <p className="text-sm font-semibold mb-4" style={{ color: "var(--ink)" }}>
            {content.weekendReview.noteReflectionIntro}
          </p>
          <div className="flex flex-col gap-3">
            {noteRows.map(({ day, outcome, note }) => (
              <div
                key={day}
                className="rounded-xl px-4 py-3"
                style={{ background: "var(--card)", border: "1.5px solid var(--line)" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-dim)" }}>
                    Day {day}
                  </span>
                  <span className="text-xs" style={{ color: "var(--calm-text)" }}>
                    {OUTCOME_LABELS[outcome] ?? outcome}
                  </span>
                </div>
                <p className="text-sm" style={{ color: "var(--ink)", lineHeight: 1.6 }}>
                  {note}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tap summary row */}
      <div
        className="rounded-xl p-4 mb-8"
        style={{ background: "var(--marker-tint)", border: "1.5px solid var(--marker)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--marker-text)" }}>
          Your week at a glance
        </p>
        <div className="flex gap-3">
          {[2, 3, 4, 5].map((d) => {
            const outcome = progress.reflections.get(d);
            return (
              <div key={d} className="flex-1 text-center">
                <p className="text-xs mb-1" style={{ color: "var(--ink-dim)" }}>
                  Day {d}
                </p>
                <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                  {outcome ? OUTCOME_LABELS[outcome] : "—"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Complete button */}
      <WeekendCompleteButton
        week={week}
        alreadyComplete={alreadyComplete}
        nextWeek={nextWeekHasContent ? nextWeek : null}
        nextWeekUnlocked={nextWeekUnlocked}
        nextWeekUnlockHours={nextWeekUnlockHours}
      />
    </div>
  );
}
