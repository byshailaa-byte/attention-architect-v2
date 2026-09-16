import { notFound } from "next/navigation";
import Link from "next/link";
import { getLmsUserContext } from "@/lib/lms/user-context";
import { getLmsWeekContent } from "@/lib/lms/content";
import { getUserProgress, isDayUnlocked, computeWeekTrend } from "@/lib/lms/progress";
import { fillLmsContent, renderMarkdown, renderWeekendContent } from "@/lib/lms/render";
import { getSql } from "@/lib/db/client";
import V2WeekendComplete from "@/components/lms-v2/V2WeekendComplete";

const BG = `var(--font-bricolage),'Bricolage Grotesque',sans-serif`;

const OUTCOME_LABELS: Record<string, string> = {
  worked:     "Worked",
  mixed:      "Mixed",
  didnt_land: "Didn't land",
};

type OutcomeColors = { bg: string; text: string };
const OUTCOME_COLORS: Record<string, OutcomeColors> = {
  worked:     { bg:"var(--v2-teal-tint)",  text:"var(--v2-teal-700)" },
  mixed:      { bg:"var(--v2-gold-tint)",  text:"#8A5F0F" },
  didnt_land: { bg:"var(--v2-red-tint)",   text:"var(--v2-red)" },
};

type Props = { params: Promise<{ week: string }> };

export default async function LmsV2WeekendPage({ params }: Props) {
  const { week: weekStr } = await params;
  const week = parseInt(weekStr, 10);
  if (isNaN(week) || week < 1 || week > 6) notFound();

  const ctx = await getLmsUserContext();
  const content = getLmsWeekContent(ctx.archetype, week, ctx.ageBand);
  if (!content) notFound();

  const now      = new Date();
  const progress = await getUserProgress(ctx.userId, week);
  const unlocked = isDayUnlocked(0, week, progress, null, now);
  const alreadyComplete = progress.completedDays.has(0);

  // ── Locked state ──────────────────────────────────────────────────────────────
  if (!unlocked) {
    const allDaysDone = [1,2,3,4,5].every(d => progress.completedDays.has(d));
    return (
      <div style={{ minHeight:"100dvh", background:"var(--v2-bg)", fontFamily:"var(--v2-IS)", color:"var(--v2-dim)" }}>
        <div style={{
          background:"#fff", borderBottom:"1px solid var(--v2-line)", padding:"12px 28px",
          display:"flex", gap:12, alignItems:"center",
        }}>
          <Link href="/lms-v2" style={{ fontSize:12.5, fontWeight:600, color:"var(--v2-dim2)", textDecoration:"none" }}>← Home</Link>
          <span style={{ fontSize:12.5, color:"var(--v2-dim2)" }}>Week {week} &rsaquo; Weekend</span>
        </div>
        <div style={{ maxWidth:600, margin:"0 auto", padding:"60px 24px" }}>
          <div className="v2-card" style={{ padding:"36px 32px" }}>
            <h2 style={{ fontSize:22, fontWeight:800, marginBottom:14 }}>
              {allDaysDone ? "Almost there" : "Finish Days 1–5 first"}
            </h2>
            <p style={{ fontSize:15, lineHeight:1.7 }}>
              {allDaysDone
                ? "The weekend review opens 24 hours after Day 5. It's worth the wait — this is the strongest part of the week."
                : "Complete all five weekdays before the weekend review unlocks."}
            </p>
            <Link href="/lms-v2" style={{
              display:"inline-block", marginTop:28, background:"var(--v2-navy)", color:"#fff",
              borderRadius:10, padding:"12px 24px", fontFamily:BG, fontWeight:700, fontSize:14, textDecoration:"none",
            }}>
              Back to home →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Unlocked review ───────────────────────────────────────────────────────────
  const weekTrend           = computeWeekTrend(progress.reflections);
  const template            = content.weekendReview.content[ctx.ageBand];
  const afterConditionals   = renderWeekendContent(template, { week_trend: weekTrend, age_band: ctx.ageBand });
  const reviewHtml          = renderMarkdown(fillLmsContent(afterConditionals, ctx.childName, ctx.childGender));

  const sql = getSql();
  const noteRows = (await sql`
    SELECT day, outcome, note FROM lms_reflections
    WHERE user_id = ${ctx.userId} AND week = ${week}
      AND note IS NOT NULL AND note != ''
    ORDER BY day
  `) as unknown as { day: number; outcome: string; note: string }[];

  const trendLabel = weekTrend === "mostly_worked"
    ? "Mostly worked"
    : weekTrend === "mostly_didnt_land"
    ? "Mostly didn't land"
    : "Mixed";

  const trendColors: OutcomeColors =
    weekTrend === "mostly_worked"     ? { bg:"var(--v2-teal-tint)", text:"var(--v2-teal-700)" } :
    weekTrend === "mostly_didnt_land" ? { bg:"var(--v2-red-tint)",  text:"var(--v2-red)" }      :
                                        { bg:"var(--v2-gold-tint)", text:"#8A5F0F" };

  return (
    <div style={{ minHeight:"100dvh", background:"var(--v2-bg)", fontFamily:"var(--v2-IS)", color:"var(--v2-dim)" }}>

      {/* Top bar */}
      <div style={{
        background:"#fff", borderBottom:"1px solid var(--v2-line)", padding:"12px 28px",
        display:"flex", alignItems:"center", gap:14, position:"sticky", top:0, zIndex:9,
      }}>
        <Link href={`/lms-v2/week/${week}`} style={{ fontSize:12.5, fontWeight:600, color:"var(--v2-dim2)", textDecoration:"none", whiteSpace:"nowrap" }}>
          ← Week {week}
        </Link>
        <span style={{ fontSize:12.5, color:"var(--v2-dim2)", flex:1 }}>Weekend review</span>
        {alreadyComplete && (
          <span style={{ fontSize:11, fontWeight:700, background:"var(--v2-teal-tint)", color:"var(--v2-teal-700)", borderRadius:6, padding:"3px 8px", flexShrink:0 }}>
            Complete ✓
          </span>
        )}
      </div>

      <div style={{ maxWidth:760, margin:"0 auto", padding:"28px 28px 100px" }}>

        {/* Header */}
        <p style={{ fontSize:10.5, fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", color:"var(--v2-teal-700)", marginBottom:10 }}>
          Week {week} — Weekend review
        </p>
        <h1 style={{ fontSize:26, fontWeight:800, lineHeight:1.1, marginBottom:8 }}>
          No action. Just look back.
        </h1>
        <p style={{ fontSize:14.5, color:"var(--v2-dim2)", marginBottom:32, lineHeight:1.6 }}>
          {content.weekTitle}
        </p>

        {/* Outcome strip */}
        <div className="v2-card" style={{ padding:"22px 22px", marginBottom:24 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:18 }}>
            <p style={{ fontSize:10.5, fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", color:"var(--v2-dim2)" }}>
              Your week at a glance
            </p>
            <span style={{
              fontSize:11, fontWeight:700, color:trendColors.text,
              background:trendColors.bg, borderRadius:6, padding:"3px 8px",
              fontFamily:BG,
            }}>
              {trendLabel}
            </span>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {[2,3,4,5].map(d => {
              const outcome = progress.reflections.get(d);
              const colors: OutcomeColors | null = outcome ? (OUTCOME_COLORS[outcome] ?? null) : null;
              return (
                <div key={d} style={{ flex:1, textAlign:"center" }}>
                  <p style={{ fontSize:11, color:"var(--v2-dim2)", marginBottom:6 }}>Day {d}</p>
                  <div style={{
                    borderRadius:10, padding:"8px 4px",
                    background: colors?.bg ?? "#F1EFEA",
                  }}>
                    <p style={{ fontSize:12, fontWeight:700, color: colors?.text ?? "var(--v2-dim2)" }}>
                      {outcome ? OUTCOME_LABELS[outcome] : "—"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main review content */}
        <div className="v2-card" style={{ padding:"28px 28px", marginBottom:24 }}>
          <div
            className="v2-prose"
            dangerouslySetInnerHTML={{ __html: reviewHtml }}
          />
        </div>

        {/* Notes from the week */}
        {noteRows.length > 0 && (
          <div style={{ marginBottom:24 }}>
            <p style={{ fontSize:14, fontWeight:600, color:"var(--v2-navy)", marginBottom:14, lineHeight:1.4 }}>
              {content.weekendReview.noteReflectionIntro}
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {noteRows.map(({ day, outcome, note }) => {
                const colors: OutcomeColors | null = OUTCOME_COLORS[outcome] ?? null;
                return (
                  <div key={day} className="v2-card" style={{ padding:"14px 18px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                      <span style={{ fontSize:10.5, fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", color:"var(--v2-dim2)" }}>
                        Day {day}
                      </span>
                      {colors && (
                        <span style={{ fontSize:11, fontWeight:700, color:colors.text, background:colors.bg, borderRadius:5, padding:"2px 7px", fontFamily:BG }}>
                          {OUTCOME_LABELS[outcome] ?? outcome}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize:14.5, lineHeight:1.65, color:"var(--v2-dim)" }}>{note}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Complete button */}
        <V2WeekendComplete week={week} alreadyComplete={alreadyComplete} />

      </div>
    </div>
  );
}
