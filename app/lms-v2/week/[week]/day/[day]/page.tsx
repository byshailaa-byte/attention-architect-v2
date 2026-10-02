import Link from "next/link";
import { notFound } from "next/navigation";
import { getLmsUserContext } from "@/lib/lms/user-context";
import { getLmsWeekContent, getDayCard } from "@/lib/lms/content";
import { getUserProgress, isDayUnlocked } from "@/lib/lms/progress";
import { renderMarkdown, fillLmsContent } from "@/lib/lms/render";
import type { ReflectionOutcome } from "@/content/types";
import { getSql } from "@/lib/db/client";
import V2DayActions from "@/components/lms-v2/V2DayActions";
import { V2, HEAD, BODY } from "../../../../v2ui";

export const dynamic = "force-dynamic";

export default async function DayPage({ params }: { params: Promise<{ week: string; day: string }> }) {
  const { week: weekStr, day: dayStr } = await params;
  const week = parseInt(weekStr, 10);
  const day = parseInt(dayStr, 10);
  if (!Number.isInteger(week) || week < 1 || week > 6 || !Number.isInteger(day) || day < 1 || day > 5) notFound();

  const ctx = await getLmsUserContext();
  const content = getLmsWeekContent(ctx.archetype, week, ctx.ageBand);
  if (!content) notFound();
  const dayCard = getDayCard(content, day);
  if (!dayCard) notFound();

  const now = new Date();
  const progress = await getUserProgress(ctx.userId, week);
  const prevWeekProgress = week > 1 && day === 1 ? await getUserProgress(ctx.userId, week - 1) : null;
  const unlocked = isDayUnlocked(day, week, progress, prevWeekProgress, now);
  const alreadyComplete = progress.completedDays.has(day);
  const existingReflection = (progress.reflections.get(day) ?? null) as ReflectionOutcome | null;

  const fill = (s: string) => fillLmsContent(s, ctx.childName, ctx.childGender);

  const totalRows = (await getSql()`SELECT COUNT(*)::int AS cnt FROM lms_progress WHERE user_id = ${ctx.userId} AND day BETWEEN 1 AND 5`) as unknown as { cnt: number }[];
  const totalCompleted = totalRows[0]?.cnt ?? 0;
  const pct = Math.round((totalCompleted / 30) * 100);

  const kind = day === 1 ? "OBSERVE" : "TRY";
  const eyebrow = `${kind} · DAY ${day}${day === 1 ? "" : " · ABOUT 5 MIN"}`;

  // Opening fork for days 3–5 from the prior day's reflection.
  let fork: string | null = null;
  if (day >= 3 && day <= 5) {
    const prior = getDayCard(content, day - 1);
    const priorOutcome: ReflectionOutcome = (progress.reflections.get(day - 1) ?? "mixed") as ReflectionOutcome;
    const raw = prior?.reflection?.nextDayOpening?.[priorOutcome] ?? null;
    fork = raw ? fill(raw) : null;
  }

  const nextHref = day === 5 ? `/lms-v2/week/${week}/weekend` : `/lms-v2/week/${week}/day/${day + 1}`;
  const unlockHint = day === 5 ? "The weekend review unlocks tomorrow" : `Day ${day + 1} unlocks tomorrow evening`;

  const Header = (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 22px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href={`/lms-v2/week/${week}`} style={{ fontSize: 14, minHeight: 44, display: "inline-flex", alignItems: "center", color: V2.navy, textDecoration: "none" }}>← Week {week}</Link>
        <span style={{ fontSize: 13, color: V2.dim }}>Day {totalCompleted} of 30 done</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: V2.line2 }}><div style={{ width: `${pct}%`, height: 4, borderRadius: 2, background: V2.gold }} /></div>
    </div>
  );

  if (!unlocked) {
    return (
      <div style={{ fontFamily: BODY, color: V2.navy, minHeight: "100dvh", background: V2.cream }}>
        {Header}
        <div style={{ padding: "40px 22px" }}>
          <div style={{ background: V2.white, border: `1px solid ${V2.line}`, borderRadius: 18, padding: 24, textAlign: "center" }}>
            <p style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>Day {day} isn&rsquo;t available yet</p>
            <p style={{ margin: "0 0 16px", fontSize: 14, color: V2.dim }}>Each day unlocks about a day after the last one.</p>
            <Link href={`/lms-v2/week/${week}`} style={{ display: "inline-block", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, background: V2.navy, color: V2.white, textDecoration: "none" }}>Back to the week</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: BODY, color: V2.navy, minHeight: "100dvh", background: V2.cream }}>
      {Header}
      <div style={{ padding: "20px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
        {fork && (
          <div className="v2-prose" style={{ background: V2.tintPurple, border: "1px solid #DDD3EE", borderRadius: 12, padding: "14px 18px", fontSize: 14, color: "#4A3470" }} dangerouslySetInnerHTML={{ __html: renderMarkdown(fork) }} />
        )}
        <section style={{ background: V2.white, border: `1px solid ${V2.line}`, borderRadius: 18, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: V2.darkGold }}>{eyebrow}</div>
          <h1 style={{ margin: 0, fontFamily: HEAD, fontSize: 26, lineHeight: 1.18, fontWeight: 600 }}>{fill(dayCard.title)}</h1>
          <div className="v2-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(fill(dayCard.content[ctx.ageBand])) }} />
        </section>

        <V2DayActions
          week={week}
          day={day}
          reflectionPrompt={dayCard.reflection?.prompt ?? null}
          alreadyComplete={alreadyComplete}
          existingReflection={existingReflection}
          nextHref={nextHref}
          unlockHint={unlockHint}
        />
      </div>
    </div>
  );
}
