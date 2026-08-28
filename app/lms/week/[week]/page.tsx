import { notFound } from "next/navigation";
import Link from "next/link";
import { getLmsUserContext } from "@/lib/lms/user-context";
import { getLmsWeekContent } from "@/lib/lms/content";
import { getUserProgress } from "@/lib/lms/progress";
import { renderMarkdown, fillLmsContent } from "@/lib/lms/render";
import SkipAhead from "@/components/lms/SkipAhead";

type Props = { params: Promise<{ week: string }> };

export default async function WeekReadingPage({ params }: Props) {
  const { week: weekStr } = await params;
  const week = parseInt(weekStr, 10);

  const ctx = await getLmsUserContext();
  const content = getLmsWeekContent(ctx.archetype, week, ctx.ageBand);
  if (!content) notFound();

  const progress = await getUserProgress(ctx.userId, week);
  const hasDayProgress = progress.completedDays.size > 0;

  const { weeklyReading } = content;
  const fill = (s: string) => fillLmsContent(s, ctx.childName, ctx.childGender);
  const calibration = fill(weeklyReading.moveCalibration[ctx.ageBand]);

  return (
    <div
      className="min-h-screen px-5 py-10 mx-auto"
      style={{ maxWidth: 680, background: "var(--paper)", color: "var(--ink)" }}
    >
      {/* Header */}
      <div className="mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-horizontal-icon-wordmark.png" alt="Attention Architect" style={{ height: 24, width: "auto", marginBottom: 16 }} />
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--ink-dim)" }}>
          Week {week}
        </p>
        <h1 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>
          {content.weekTitle}
        </h1>
        {week === 1 && (
          <p className="mt-2 text-sm" style={{ color: "var(--ink-dim)" }}>
            This is the training program for what your report called your child&apos;s attention health — six weeks of small, real moves that build it.
          </p>
        )}
      </div>

      {/* Build note exclusion enforced: age-band calibration renders ONE block only */}

      {/* Intro */}
      <div
        className="prose-lms mb-8"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(fill(weeklyReading.introShared)) }}
      />

      {/* Age-band calibration — exactly one block, selected server-side */}
      <div
        className="rounded-xl p-5 mb-8"
        style={{ background: "var(--marker-tint)", border: "1.5px solid var(--marker)" }}
      >
        <div
          className="prose-lms"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(calibration) }}
        />
      </div>

      {/* Move outro */}
      <div
        className="prose-lms mb-8"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(fill(weeklyReading.moveOutroShared)) }}
      />

      {/* What working looks like */}
      <div
        className="prose-lms mb-8"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(fill(weeklyReading.whatWorkingLooksLike)) }}
      />

      {/* Thing to hold onto */}
      <div
        className="prose-lms mb-10"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(fill(weeklyReading.thingToHoldOnto)) }}
      />

      {/* CTA */}
      <div
        className="rounded-xl p-5 mb-4"
        style={{ background: "var(--card)", border: "1.5px solid var(--line)" }}
      >
        <p className="font-semibold mb-4" style={{ color: "var(--ink)" }}>
          Ready to start?
        </p>
        {hasDayProgress ? (
          <Link
            href="/lms"
            className="block w-full text-center rounded-lg px-4 py-3 text-base font-semibold"
            style={{ background: "var(--ink)", color: "#fff" }}
          >
            Continue where I left off →
          </Link>
        ) : (
          <Link
            href={`/lms/week/${week}/day/1`}
            className="block w-full text-center rounded-lg px-4 py-3 text-base font-semibold"
            style={{ background: "var(--ink)", color: "#fff" }}
          >
            Start Day 1 →
          </Link>
        )}
      </div>

      {/* Skip-to-today escape hatch */}
      {!hasDayProgress && (
        <SkipAhead week={week} />
      )}
    </div>
  );
}
