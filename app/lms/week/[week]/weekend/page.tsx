import { notFound } from "next/navigation";
import Link from "next/link";
import { getLmsUserContext } from "@/lib/lms/user-context";
import { getLmsWeekContent } from "@/lib/lms/content";
import { getUserProgress, isDayUnlocked, computeWeekTrend, UNLOCK_DELAY_MS } from "@/lib/lms/progress";
import { renderWeekendContent, renderMarkdown, fillLmsContent } from "@/lib/lms/render";
import { getSql } from "@/lib/db/client";
import WeekendCompleteButton from "@/components/lms/WeekendCompleteButton";
import Week6WeekendWrapper from "@/components/lms/Week6WeekendWrapper";

type Props = { params: Promise<{ week: string }> };
type NoteRow = { day: number; outcome: string; note: string | null };

export default async function WeekendReviewPage({ params }: Props) {
  const { week: weekStr } = await params;
  const week = parseInt(weekStr, 10);

  const ctx = await getLmsUserContext();
  const content = getLmsWeekContent(ctx.archetype, week, ctx.ageBand);
  if (!content) notFound();

  const now = new Date();
  const progress = await getUserProgress(ctx.userId, week);
  const unlocked = isDayUnlocked(0, week, progress, null, now);
  const alreadyComplete = progress.completedDays.has(0);

  const nextWeek = week + 1;
  const nextWeekHasContent = getLmsWeekContent(ctx.archetype, nextWeek, ctx.ageBand) !== null;
  const nextWeekUnlocked = nextWeekHasContent &&
    isDayUnlocked(1, nextWeek, { completedDays: new Set(), completionTimes: new Map(), reflections: new Map() }, progress, now);
  const day5Time = progress.completionTimes.get(5);
  const remainingMs = day5Time
    ? Math.max(0, UNLOCK_DELAY_MS - (now.getTime() - day5Time.getTime()))
    : UNLOCK_DELAY_MS;
  const nextWeekUnlockHours = Math.ceil(remainingMs / (60 * 60 * 1000));

  // Overall progress for top bar
  const sql = getSql();
  const [countRow, week6SurveyRows] = await Promise.all([
    sql`SELECT COUNT(*)::int as cnt FROM lms_progress WHERE user_id = ${ctx.userId} AND day BETWEEN 1 AND 5` as unknown as Promise<{ cnt: number }[]>,
    week === 6
      ? sql`SELECT submitted_at, dismissed_at FROM lms_surveys WHERE user_id = ${ctx.userId} AND survey_type = 'week6_comprehensive'` as unknown as Promise<{ submitted_at: Date | null; dismissed_at: Date | null }[]>
      : Promise.resolve([] as { submitted_at: Date | null; dismissed_at: Date | null }[]),
  ]);
  const totalCompleted = countRow[0]?.cnt ?? 0;
  const progressPct = Math.round((totalCompleted / 30) * 100);
  const week6SurveyDone = !!(week6SurveyRows[0]?.submitted_at || week6SurveyRows[0]?.dismissed_at);

  if (!unlocked) {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--jm-paper)", color: "var(--jm-ink)", fontFamily: `'Public Sans', 'Inter', system-ui, sans-serif` }}>
        <div style={{ background: "var(--jm-white)", borderBottom: "1px solid var(--jm-rule)", padding: "12px 20px", display: "flex", alignItems: "center", gap: 14, position: "sticky", top: 0, zIndex: 10 }}>
          <Link href="/lms" style={{ fontSize: 13, color: "var(--jm-accent-b)", fontWeight: 700, whiteSpace: "nowrap", textDecoration: "none" }}>← Journey</Link>
          <div style={{ flex: 1, height: 5, background: "var(--jm-paper2)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ background: "var(--jm-accent-b)", height: "100%", width: `${progressPct}%` }} />
          </div>
          <span style={{ fontSize: 12, color: "var(--jm-ink-faint)", whiteSpace: "nowrap" }}>Week {week} · Weekend</span>
        </div>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 24px" }}>
          <div style={{ borderRadius: 12, padding: 24, textAlign: "center", background: "var(--jm-white)", border: "1.5px solid var(--jm-rule)" }}>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Not quite yet</p>
            <p style={{ fontSize: 14, color: "var(--jm-ink-soft)", marginBottom: 16 }}>Finish Days 1–5 before the weekend review.</p>
            <Link href="/lms" style={{ display: "inline-block", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, background: "var(--jm-ink)", color: "#fff", textDecoration: "none" }}>
              Back to journey map
            </Link>
          </div>
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
    <div style={{ minHeight: "100dvh", background: "var(--jm-paper)", color: "var(--jm-ink)", fontFamily: `'Public Sans', 'Inter', system-ui, sans-serif` }}>
      {/* Top bar */}
      <div style={{ background: "var(--jm-white)", borderBottom: "1px solid var(--jm-rule)", padding: "12px 20px", display: "flex", alignItems: "center", gap: 14, position: "sticky", top: 0, zIndex: 10 }}>
        <Link href="/lms" style={{ fontSize: 13, color: "var(--jm-accent-b)", fontWeight: 700, whiteSpace: "nowrap", textDecoration: "none" }}>← Journey</Link>
        <div style={{ flex: 1, height: 5, background: "var(--jm-paper2)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ background: "var(--jm-accent-b)", height: "100%", width: `${progressPct}%` }} />
        </div>
        <span style={{ fontSize: 12, color: "var(--jm-ink-faint)", whiteSpace: "nowrap" }}>Week {week} · Weekend</span>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 24px" }}>
        <h1 style={{ fontFamily: `'Bricolage Grotesque', system-ui, sans-serif`, fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
          No action. Just review.
        </h1>
        <p style={{ fontSize: 14, color: "var(--jm-ink-faint)", marginBottom: 32 }}>
          Week {week} complete.
        </p>

        <div
          className="prose-lms"
          style={{ marginBottom: 32 }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(renderedContent) }}
        />

        {noteRows.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
              {content.weekendReview.noteReflectionIntro}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {noteRows.map(({ day, outcome, note }) => (
                <div key={day} style={{ background: "var(--jm-white)", border: "1.5px solid var(--jm-rule)", borderRadius: 12, padding: "12px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".05em", color: "var(--jm-ink-faint)" }}>Day {day}</span>
                    <span style={{ fontSize: 11, color: "var(--jm-accent-b)" }}>{OUTCOME_LABELS[outcome] ?? outcome}</span>
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.6 }}>{note}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tap summary row */}
        <div style={{ background: "var(--marker-tint)", border: "1.5px solid var(--marker)", borderRadius: 12, padding: 16, marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".05em", color: "var(--marker-text)", marginBottom: 12 }}>
            Your week at a glance
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            {[2, 3, 4, 5].map((d) => {
              const outcome = progress.reflections.get(d);
              return (
                <div key={d} style={{ flex: 1, textAlign: "center" as const }}>
                  <p style={{ fontSize: 11, color: "var(--jm-ink-faint)", marginBottom: 4 }}>Day {d}</p>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>{outcome ? OUTCOME_LABELS[outcome] : "—"}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Complete button — Week 6 gets survey wrapper, others get standard button */}
        {week === 6 ? (
          <Week6WeekendWrapper
            alreadyComplete={alreadyComplete}
            surveyAlreadyDone={week6SurveyDone}
            childName={ctx.childName}
          />
        ) : (
          <WeekendCompleteButton
            week={week}
            alreadyComplete={alreadyComplete}
            nextWeek={nextWeekHasContent ? nextWeek : null}
            nextWeekUnlocked={nextWeekUnlocked}
            nextWeekUnlockHours={nextWeekUnlockHours}
          />
        )}
      </div>
    </div>
  );
}
