import { notFound } from "next/navigation";
import Link from "next/link";
import { getLmsUserContext } from "@/lib/lms/user-context";
import { getLmsWeekContent, getDayCard } from "@/lib/lms/content";
import { getUserProgress, isDayUnlocked, UNLOCK_DELAY_MS } from "@/lib/lms/progress";
import { renderMarkdown, fillLmsContent } from "@/lib/lms/render";
import { getSql } from "@/lib/db/client";
import DayCardActions from "@/components/lms/DayCardActions";
import ShareNudge from "@/components/lms/ShareNudge";
import type { ReflectionOutcome } from "@/content/types";

type Props = { params: Promise<{ week: string; day: string }> };

const OUTCOME_LABELS: Record<string, string> = {
  worked: "worked",
  mixed: "mixed",
  didnt_land: "didn't land",
};

export default async function DayCardPage({ params }: Props) {
  const { week: weekStr, day: dayStr } = await params;
  const week = parseInt(weekStr, 10);
  const day = parseInt(dayStr, 10);

  const ctx = await getLmsUserContext();
  const content = getLmsWeekContent(ctx.archetype, week, ctx.ageBand);
  if (!content) notFound();

  const dayCard = getDayCard(content, day);
  if (!dayCard) notFound();

  const now = new Date();
  const progress = await getUserProgress(ctx.userId, week);

  const prevWeekProgress =
    week > 1 && day === 1 ? await getUserProgress(ctx.userId, week - 1) : null;

  const unlocked = isDayUnlocked(day, week, progress, prevWeekProgress, now);
  const alreadyComplete = progress.completedDays.has(day);
  const existingReflection = progress.reflections.get(day) ?? null;

  const fill = (s: string) => fillLmsContent(s, ctx.childName, ctx.childGender);

  // Opening fork: days 3–5 use the prior day's reflection
  let openingForkText: string | null = null;
  if (day >= 3 && day <= 5) {
    const priorDayCard = getDayCard(content, day - 1);
    const priorOutcome: ReflectionOutcome =
      progress.reflections.get(day - 1) ?? "mixed";
    const rawFork = priorDayCard?.reflection?.nextDayOpening?.[priorOutcome] ?? null;
    openingForkText = rawFork ? fill(rawFork) : null;
  }

  // Previous day reflection label (shown as a simple note line)
  const prevDayOutcome = day >= 2 ? (progress.reflections.get(day - 1) ?? null) : null;

  const dayContent = fill(dayCard.content[ctx.ageBand]);
  const reflectionPrompt = dayCard.reflection?.prompt ?? null;

  // Total days completed across all weeks for share nudge
  const sql = getSql();
  const countRow = (await sql`
    SELECT COUNT(*)::int as cnt FROM lms_progress
    WHERE user_id = ${ctx.userId} AND day BETWEEN 1 AND 5
  `) as unknown as { cnt: number }[];
  const totalCompleted = countRow[0]?.cnt ?? 0;

  // Overall progress for top bar (days completed / 30)
  const progressPct = Math.round((totalCompleted / 30) * 100);

  let nextHref: string;
  if (day === 5) {
    nextHref = `/lms/week/${week}/weekend`;
  } else {
    nextHref = `/lms/week/${week}/day/${day + 1}`;
  }

  if (!unlocked) {
    const prevDay = day === 1 ? 5 : day - 1;
    const prereqProg = day === 1 && week > 1 ? prevWeekProgress : progress;
    const prereqComplete = prereqProg?.completedDays.has(prevDay) ?? false;

    let heading: string;
    let subtext: string;
    if (!prereqComplete) {
      heading = day === 1
        ? `Complete Week ${week - 1} first`
        : `Day ${prevDay} isn't complete yet`;
      subtext = "Complete the previous day to continue.";
    } else {
      const prereqTime = prereqProg?.completionTimes.get(prevDay);
      const remainingMs = prereqTime
        ? UNLOCK_DELAY_MS - (now.getTime() - prereqTime.getTime())
        : UNLOCK_DELAY_MS;
      const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
      heading = `Day ${day} isn't available yet`;
      subtext =
        remainingHours <= 1
          ? "This unlocks in less than an hour — check back soon."
          : `This unlocks in about ${remainingHours} hour${remainingHours === 1 ? "" : "s"}.`;
    }

    return (
      <div style={{ minHeight: "100dvh", background: "var(--jm-paper)", color: "var(--jm-ink)", fontFamily: `'Public Sans', 'Inter', system-ui, sans-serif` }}>
        {/* Top bar */}
        <div style={{ background: "var(--jm-white)", borderBottom: "1px solid var(--jm-rule)", padding: "12px 20px", display: "flex", alignItems: "center", gap: 14, position: "sticky", top: 0, zIndex: 10 }}>
          <Link href="/lms" style={{ fontSize: 13, color: "var(--jm-accent-b)", fontWeight: 700, whiteSpace: "nowrap", textDecoration: "none" }}>← Journey</Link>
          <div style={{ flex: 1, height: 5, background: "var(--jm-paper2)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ background: "var(--jm-accent-b)", height: "100%", width: `${progressPct}%` }} />
          </div>
          <span style={{ fontSize: 12, color: "var(--jm-ink-faint)", whiteSpace: "nowrap" }}>Week {week} · Day {day}</span>
        </div>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 24px" }}>
          <div style={{ borderRadius: 12, padding: "24px", textAlign: "center", background: "var(--jm-white)", border: "1.5px solid var(--jm-rule)" }}>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{heading}</p>
            <p style={{ fontSize: 14, color: "var(--jm-ink-soft)", marginBottom: 16 }}>{subtext}</p>
            <Link href="/lms" style={{ display: "inline-block", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, background: "var(--jm-ink)", color: "#fff", textDecoration: "none" }}>
              Back to journey map
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "var(--jm-paper)", color: "var(--jm-ink)", fontFamily: `'Public Sans', 'Inter', system-ui, sans-serif` }}>
      {/* Persistent top bar */}
      <div style={{ background: "var(--jm-white)", borderBottom: "1px solid var(--jm-rule)", padding: "12px 20px", display: "flex", alignItems: "center", gap: 14, position: "sticky", top: 0, zIndex: 10 }}>
        <Link href="/lms" style={{ fontSize: 13, color: "var(--jm-accent-b)", fontWeight: 700, whiteSpace: "nowrap", textDecoration: "none" }}>← Journey</Link>
        <div style={{ flex: 1, height: 5, background: "var(--jm-paper2)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ background: "var(--jm-accent-b)", height: "100%", width: `${progressPct}%` }} />
        </div>
        <span style={{ fontSize: 12, color: "var(--jm-ink-faint)", whiteSpace: "nowrap" }}>Week {week} · Day {day}</span>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 24px" }}>
        {/* Opening fork — content-authored branch from prior day reflection */}
        {openingForkText && (
          <div style={{ background: "var(--calm-tint)", border: "1px solid rgba(110,95,176,0.3)", borderRadius: 12, padding: "16px 20px", marginBottom: 24 }}>
            <p style={{ fontSize: 14, color: "var(--calm-text)" }}>{openingForkText}</p>
          </div>
        )}

        {/* Day card */}
        <div style={{ background: "var(--card)", border: "1.5px solid var(--line)", borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".13em", color: "var(--jm-accent-b)", marginBottom: 14 }}>
            Day {day} — {fill(dayCard.title)}
          </div>
          <div
            className="prose-lms"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(dayContent) }}
          />
          {/* Previous day reflection note */}
          {prevDayOutcome && !openingForkText && (
            <p style={{ fontSize: 13, color: "var(--jm-ink-faint)", marginTop: 16, fontStyle: "italic" }}>
              Yesterday: {OUTCOME_LABELS[prevDayOutcome] ?? prevDayOutcome}.
            </p>
          )}
        </div>

        {/* Day progress dots */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
          {[1, 2, 3, 4, 5].map((d) => (
            <div
              key={d}
              style={{
                width: 8, height: 8, borderRadius: "50%",
                background: d < day ? "var(--jm-ink)" : d === day ? "var(--jm-accent-b)" : "var(--jm-rule)",
              }}
            />
          ))}
        </div>

        {/* Complete + reflection */}
        <DayCardActions
          week={week}
          day={day}
          reflectionPrompt={reflectionPrompt}
          alreadyComplete={alreadyComplete}
          existingReflection={existingReflection as ReflectionOutcome | null}
          nextHref={nextHref}
        />

        {/* Share nudge — shown after completing at least a few days */}
        {alreadyComplete && totalCompleted >= 3 && (
          <ShareNudge totalDays={totalCompleted} />
        )}
      </div>
    </div>
  );
}
