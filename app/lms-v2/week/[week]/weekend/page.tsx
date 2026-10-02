import Link from "next/link";
import { notFound } from "next/navigation";
import { getLmsUserContext } from "@/lib/lms/user-context";
import { getLmsWeekContent } from "@/lib/lms/content";
import { getUserProgress, isDayUnlocked, computeWeekTrend } from "@/lib/lms/progress";
import { renderWeekendContent, renderMarkdown, fillLmsContent } from "@/lib/lms/render";
import V2WeekendComplete from "@/components/lms-v2/V2WeekendComplete";
import { V2, HEAD, BODY, OUTCOME_LABEL } from "../../../v2ui";

export const dynamic = "force-dynamic";

const TAP_STYLE: Record<string, { bg: string; color: string }> = {
  worked: { bg: V2.tintGreen, color: V2.greenInk },
  mixed: { bg: V2.tintGold, color: "#6E4B12" },
  didnt_land: { bg: "#FBEAE6", color: "#8A3B12" },
  none: { bg: V2.greyCard, color: V2.dim2 },
};

export default async function WeekendPage({ params }: { params: Promise<{ week: string }> }) {
  const { week: weekStr } = await params;
  const week = parseInt(weekStr, 10);
  if (!Number.isInteger(week) || week < 1 || week > 6) notFound();

  const ctx = await getLmsUserContext();
  const content = getLmsWeekContent(ctx.archetype, week, ctx.ageBand);
  if (!content) notFound();

  const now = new Date();
  const progress = await getUserProgress(ctx.userId, week);
  const unlocked = isDayUnlocked(0, week, progress, null, now);
  const alreadyComplete = progress.completedDays.has(0);

  const nextWeek = week < 6 && getLmsWeekContent(ctx.archetype, week + 1, ctx.ageBand) ? week + 1 : null;

  if (!unlocked) {
    return (
      <div style={{ fontFamily: BODY, color: V2.navy, minHeight: "100dvh", background: V2.cream, padding: "40px 22px" }}>
        <Link href={`/lms-v2/week/${week}`} style={{ fontSize: 14, color: V2.dim, textDecoration: "none" }}>← Week {week}</Link>
        <div style={{ marginTop: 24, background: V2.white, border: `1px solid ${V2.line}`, borderRadius: 18, padding: 24, textAlign: "center" }}>
          <p style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>Not quite yet</p>
          <p style={{ margin: 0, fontSize: 14, color: V2.dim }}>Finish Days 1–5 before the weekend review.</p>
        </div>
      </div>
    );
  }

  const trend = computeWeekTrend(progress.reflections);
  const trendCopy = fillLmsContent(
    renderWeekendContent(content.weekendReview.content[ctx.ageBand], { week_trend: trend, age_band: ctx.ageBand }),
    ctx.childName,
    ctx.childGender,
  );

  const taps = [2, 3, 4, 5].map((d) => {
    const outcome = (progress.reflections.get(d) as string | undefined) ?? "none";
    return { day: d, outcome, label: OUTCOME_LABEL[outcome] ?? "—" };
  });

  return (
    <div style={{ fontFamily: BODY, color: V2.navy, minHeight: "100dvh", background: V2.cream, display: "flex", flexDirection: "column" }}>
      <div style={{ background: V2.navy, color: V2.white, padding: "22px 22px 40px", display: "flex", flexDirection: "column", gap: 10 }}>
        <Link href="/lms-v2" style={{ color: V2.onNavy, fontSize: 14, minHeight: 44, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>← Home</Link>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: V2.gold }}>Week {week} complete</div>
        <h1 style={{ margin: 0, fontFamily: HEAD, fontSize: 30, lineHeight: 1.15, fontWeight: 600 }}>That&rsquo;s Week {week}, done.</h1>
      </div>

      <div style={{ marginTop: -18, background: V2.cream, borderRadius: "22px 22px 0 0", padding: "20px 18px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <section style={{ background: V2.white, border: `1px solid ${V2.line}`, borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: V2.dim }}>YOUR WEEK</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, textAlign: "center" }}>
            {taps.map((t) => {
              const s = TAP_STYLE[t.outcome] ?? TAP_STYLE.none;
              return (
                <div key={t.day} style={{ background: s.bg, color: s.color, borderRadius: 10, padding: "8px 0", fontSize: 12, fontWeight: 600 }}>
                  Day {t.day}<br />{t.label}
                </div>
              );
            })}
          </div>
          <div className="v2-prose" style={{ color: V2.ink }} dangerouslySetInnerHTML={{ __html: renderMarkdown(trendCopy) }} />
        </section>

        {/* Phase 2 slot — "Book session 1 of 3" card goes here (intentionally empty until Phase 2) */}

        <V2WeekendComplete week={week} alreadyComplete={alreadyComplete} nextWeek={nextWeek} />
      </div>
    </div>
  );
}
