import Link from "next/link";
import { notFound } from "next/navigation";
import { getLmsUserContext } from "@/lib/lms/user-context";
import { getLmsWeekContent, getDayCard } from "@/lib/lms/content";
import { getUserProgress, isDayUnlocked, isWeekUnlocked, UNLOCK_DELAY_MS } from "@/lib/lms/progress";
import { renderMarkdown, fillLmsContent } from "@/lib/lms/render";
import type { ReflectionOutcome } from "@/content/types";
import { getSql } from "@/lib/db/client";
import { resolveForDay } from "@/lib/plan-adjust/resolve";
import { planTomorrow } from "@/lib/plan-adjust/tomorrow";
import type { ResolvedStep } from "@/lib/plan-adjust/types";
import { CONCERN_CARD_LABELS } from "@/lib/concerns";
import V2DayActions from "@/components/lms-v2/V2DayActions";
import { LockedWeekCard } from "../../../../LockedWeekCard";
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
  const prevWeekProgress = week > 1 ? await getUserProgress(ctx.userId, week - 1) : null;
  // Week lock takes precedence over the per-day card (v2 only).
  if (!isWeekUnlocked(week, prevWeekProgress, now)) {
    return <LockedWeekCard week={week} prevDay5Time={prevWeekProgress?.completionTimes.get(5)} now={now} />;
  }
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
  const nextLabel = day === 5 ? "Back to the week" : `Next: Day ${day + 1} →`;

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
    // Real unlock time from the 24h rule, in IST: previous day's completion + 24h.
    const prereqProg = day === 1 ? prevWeekProgress : progress;
    const prereqDay = day === 1 ? 5 : day - 1;
    const prereqTime = prereqProg?.completionTimes.get(prereqDay);
    return (
      <div style={{ fontFamily: BODY, color: V2.navy, minHeight: "100dvh", background: V2.cream }}>
        {Header}
        <div style={{ padding: "40px 22px" }}>
          <div style={{ background: V2.white, border: `1px solid ${V2.line}`, borderRadius: 18, padding: 24, textAlign: "center" }}>
            <p style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>Day {day} isn&rsquo;t available yet</p>
            <p style={{ margin: "0 0 16px", fontSize: 14, color: V2.dim }}>{unlockLine(day, prereqTime, now)}</p>
            <Link href={`/lms-v2/week/${week}`} style={{ display: "inline-block", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, background: V2.navy, color: V2.white, textDecoration: "none" }}>Back to the week</Link>
          </div>
        </div>
      </div>
    );
  }

  // Adaptive plan (Part A): from Day 2 on, the step is generated from the base day + how yesterday
  // went, and cached. A Coach override wins. null → no adjustment yet → show the base day as-is.
  // Never let a generation/DB hiccup blank the day: fall back to the authored base content.
  let adjusted: ResolvedStep | null = null;
  try {
    const worryRows = (await getSql()`SELECT concerns FROM assessments WHERE id = ${ctx.assessmentId}::uuid LIMIT 1`) as unknown as { concerns: string[] | null }[];
    const worryKey = worryRows[0]?.concerns?.[0] ?? null;
    const worryLabel = (worryKey && CONCERN_CARD_LABELS[worryKey]) || "staying focused";
    adjusted = await resolveForDay({
      userId: ctx.userId, assessmentId: ctx.assessmentId, archetype: ctx.archetype, ageBand: ctx.ageBand,
      childName: ctx.childName, gender: ctx.childGender, worryLabel, week, day,
      baseTitle: fill(dayCard.title), baseText: fill(dayCard.content[ctx.ageBand]),
    });
  } catch (e) {
    console.error("[lms-day] resolveForDay failed:", (e as Error).message);
  }

  return (
    <div style={{ fontFamily: BODY, color: V2.navy, minHeight: "100dvh", background: V2.cream }}>
      {Header}
      <div style={{ padding: "20px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
        {fork && (
          <div className="v2-prose" style={{ background: V2.tintPurple, border: "1px solid #DDD3EE", borderRadius: 12, padding: "14px 18px", fontSize: 14, color: "#4A3470" }} dangerouslySetInnerHTML={{ __html: renderMarkdown(fork) }} />
        )}
        {adjusted ? (
          <AdjustedStepCard adjusted={adjusted} eyebrow={eyebrow} />
        ) : (
          <section style={{ background: V2.white, border: `1px solid ${V2.line}`, borderRadius: 18, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: V2.darkGold }}>{eyebrow}</div>
            <h1 style={{ margin: 0, fontFamily: HEAD, fontSize: 26, lineHeight: 1.18, fontWeight: 600 }}>{fill(dayCard.title)}</h1>
            <div className="v2-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(fill(dayCard.content[ctx.ageBand])) }} />
          </section>
        )}

        <V2DayActions
          week={week}
          day={day}
          childName={ctx.childName}
          reflectionPrompt={dayCard.reflection ? "How did it go?" : null}
          alreadyComplete={alreadyComplete}
          existingReflection={existingReflection}
          nextHref={nextHref}
          nextLabel={nextLabel}
        />
      </div>
    </div>
  );
}

// The adjusted step card (Part A). Shows WHY it changed, then the step in the same shape parents know:
// title, the everyday moment, the exact words in quotes, what to notice, and a ≤5-min promise.
function AdjustedStepCard({ adjusted, eyebrow }: { adjusted: ResolvedStep; eyebrow: string }) {
  const { step, origin, reason, priorOutcome, showCoachLine } = adjusted;
  const line = origin === "coach"
    ? `Updated by your Coach: ${reason ?? ""}`
    : `Adjusted for you: ${planTomorrow(priorOutcome, showCoachLine ? 2 : 1).adjustedForYou}`;
  return (
    <section style={{ background: V2.white, border: `1px solid ${V2.line}`, borderRadius: 18, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      {showCoachLine && origin !== "coach" && (
        <Link href="/lms-v2/coach" style={{ display: "block", background: V2.tintPurple, border: "1px solid #DDD3EE", borderRadius: 12, padding: "12px 14px", fontSize: 13.5, fontWeight: 600, color: "#4A3470", textDecoration: "none" }}>
          Two tough days in a row — it may help to talk it through with your Coach →
        </Link>
      )}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: V2.darkGold }}>{eyebrow}</div>
      <div style={{ alignSelf: "flex-start", background: origin === "coach" ? "#EAF3EC" : V2.tintPurple, color: origin === "coach" ? "#2F6B45" : "#4A3470", border: `1px solid ${origin === "coach" ? "#CFE6D6" : "#DDD3EE"}`, borderRadius: 999, padding: "4px 12px", fontSize: 12.5, fontWeight: 600 }}>
        {line}
      </div>
      <h1 style={{ margin: 0, fontFamily: HEAD, fontSize: 26, lineHeight: 1.18, fontWeight: 600 }}>{step.title}</h1>
      <p style={{ margin: 0, fontSize: 15, color: V2.dim }}>At {step.moment}.</p>
      <div style={{ borderLeft: `3px solid ${V2.gold}`, paddingLeft: 14, display: "flex", flexDirection: "column", gap: 6 }}>
        {step.exactWords.map((w, i) => (
          <p key={i} style={{ margin: 0, fontSize: 16.5, lineHeight: 1.4, fontWeight: 500 }}>&ldquo;{w}&rdquo;</p>
        ))}
      </div>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}><strong>Notice:</strong> {step.notice}</p>
      <div style={{ fontSize: 12.5, color: V2.dim }}>About {step.minutes} min</div>
    </section>
  );
}

// "Day 3 unlocks tomorrow at 9:40 pm" — real 24h-rule time, in IST.
function unlockLine(day: number, prereqTime: Date | undefined, now: Date): string {
  if (!prereqTime) return `Day ${day} unlocks once the previous day is complete.`;
  const unlockAt = new Date(prereqTime.getTime() + UNLOCK_DELAY_MS);
  const istDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const time = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).format(unlockAt).toLowerCase();
  const today = istDay(now);
  const tomorrow = istDay(new Date(now.getTime() + 86_400_000));
  const u = istDay(unlockAt);
  const when = u === today ? "today" : u === tomorrow ? "tomorrow" : `on ${new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" }).format(unlockAt)}`;
  return `Day ${day} unlocks ${when} at ${time}.`;
}
