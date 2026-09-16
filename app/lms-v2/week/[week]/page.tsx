import { notFound } from "next/navigation";
import Link from "next/link";
import { getLmsUserContext } from "@/lib/lms/user-context";
import { getLmsWeekContent } from "@/lib/lms/content";
import { getUserProgress, isDayUnlocked } from "@/lib/lms/progress";
import { fillLmsContent, renderMarkdown } from "@/lib/lms/render";

const BG = `var(--font-bricolage),'Bricolage Grotesque',sans-serif`;

type Props = { params: Promise<{ week: string }> };

export default async function LmsV2WeekPage({ params }: Props) {
  const { week: weekStr } = await params;
  const week = parseInt(weekStr, 10);
  if (isNaN(week) || week < 1 || week > 6) notFound();

  const ctx = await getLmsUserContext();
  const content = getLmsWeekContent(ctx.archetype, week, ctx.ageBand);
  if (!content) notFound();

  const now = new Date();
  const [progress, prevProgress] = await Promise.all([
    getUserProgress(ctx.userId, week),
    week > 1 ? getUserProgress(ctx.userId, week - 1) : Promise.resolve(null),
  ]);

  const fill = (s: string) => fillLmsContent(s, ctx.childName, ctx.childGender);

  const dayStates = [1,2,3,4,5].map(day => ({
    day,
    done:     progress.completedDays.has(day),
    unlocked: isDayUnlocked(day, week, progress, prevProgress, now),
  }));
  const weekendDone     = progress.completedDays.has(0);
  const weekendUnlocked = isDayUnlocked(0, week, progress, null, now);

  const introHtml           = renderMarkdown(fill(content.weeklyReading.introShared));
  const forYouHtml          = renderMarkdown(fill(content.weeklyReading.moveCalibration[ctx.ageBand]));
  const outroHtml           = renderMarkdown(fill(content.weeklyReading.moveOutroShared));
  const whatWorkingHtml     = renderMarkdown(fill(content.weeklyReading.whatWorkingLooksLike));
  const thingToHoldOntoHtml = renderMarkdown(fill(content.weeklyReading.thingToHoldOnto));

  return (
    <div style={{ background:"var(--v2-bg)", minHeight:"100dvh", fontFamily:"var(--v2-IS)", color:"var(--v2-dim)" }}>

      {/* Top bar */}
      <div style={{
        background:"#fff", borderBottom:"1px solid var(--v2-line)", padding:"12px 28px",
        display:"flex", alignItems:"center", gap:12, position:"sticky", top:0, zIndex:9,
      }}>
        <Link href="/lms-v2" style={{ fontSize:12.5, fontWeight:600, color:"var(--v2-dim2)", display:"inline-flex", gap:6, textDecoration:"none" }}>
          ← Home
        </Link>
        <span style={{ fontSize:12.5, color:"var(--v2-dim2)" }}>
          My Plan &rsaquo; Week {week}
        </span>
      </div>

      <div style={{ maxWidth:860, margin:"0 auto", padding:"24px 28px 80px" }}>

        <h1 style={{ fontSize:22, fontWeight:800, margin:"0 0 4px" }}>
          Week {week} — {content.weekTitle}
        </h1>
        <div style={{ fontSize:13.5, color:"var(--v2-dim2)", marginBottom:16 }}>
          Weekly reading, then five days and a weekend review.
        </div>

        {/* Day strip */}
        <div className="v2-daystrip">
          {dayStates.map(({ day, done, unlocked }) => {
            const isToday = !done && unlocked;
            const cls = done ? "v2-day done" : isToday ? "v2-day today" : "v2-day locked";
            if (done || unlocked) {
              return (
                <Link key={day} href={`/lms-v2/week/${week}/day/${day}`} className={cls} style={{ textDecoration:"none" }}>
                  <small style={{ display:"block", fontSize:9.5, letterSpacing:".06em", textTransform:"uppercase", color:"var(--v2-dim2)", fontWeight:700 }}>DAY</small>
                  <b style={{ display:"block", fontFamily:BG, fontSize:16, color:"var(--v2-navy)", marginTop:3 }}>{done ? "✓" : day}</b>
                  <span style={{ fontSize:12, marginTop:2, display:"block", color: done ? "var(--v2-teal-700)" : isToday ? "#8A5F0F" : "var(--v2-dim2)" }}>
                    {done ? "done" : "open"}
                  </span>
                </Link>
              );
            }
            return (
              <div key={day} className="v2-day locked">
                <small style={{ display:"block", fontSize:9.5, letterSpacing:".06em", textTransform:"uppercase", color:"var(--v2-dim2)", fontWeight:700 }}>DAY</small>
                <b style={{ display:"block", fontFamily:BG, fontSize:16, color:"var(--v2-navy)", marginTop:3 }}>{day}</b>
                <span style={{ fontSize:12, marginTop:2, display:"block" }}>locked</span>
              </div>
            );
          })}

          {/* Weekend cell */}
          {(weekendDone || weekendUnlocked) ? (
            <Link href={`/lms-v2/week/${week}/weekend`} className={weekendDone ? "v2-day done wknd" : "v2-day today wknd"} style={{ textDecoration:"none" }}>
              <small style={{ display:"block", fontSize:9.5, letterSpacing:".06em", textTransform:"uppercase", color:"var(--v2-dim2)", fontWeight:700 }}>WKD</small>
              <b style={{ display:"block", fontFamily:BG, fontSize:16, color:"var(--v2-navy)", marginTop:3 }}>{weekendDone ? "✓" : "⊕"}</b>
              <span style={{ fontSize:12, marginTop:2, display:"block", color:"#5B4A78" }}>
                {weekendDone ? "done" : "open"}
              </span>
            </Link>
          ) : (
            <div className="v2-day locked wknd">
              <small style={{ display:"block", fontSize:9.5, letterSpacing:".06em", textTransform:"uppercase", color:"var(--v2-dim2)", fontWeight:700 }}>WKD</small>
              <b style={{ display:"block", fontFamily:BG, fontSize:16, color:"var(--v2-navy)", marginTop:3 }}>W</b>
              <span style={{ fontSize:12, marginTop:2, display:"block" }}>locked</span>
            </div>
          )}
        </div>

        <div style={{ fontSize:11.5, color:"var(--v2-dim2)", marginBottom:20 }}>
          Days open 24 hours apart. Missing one doesn&apos;t reset anything.
        </div>

        {/* Lesson card */}
        <div className="v2-card" style={{ padding:"22px 24px", marginTop:15 }}>
          <div style={{ fontSize:10.5, letterSpacing:".1em", textTransform:"uppercase", fontWeight:700, color:"#A3781E" }}>Weekly reading</div>
          <h2 style={{ fontSize:21, margin:"7px 0 12px", fontWeight:800 }}>{content.weekTitle}</h2>

          <div className="v2-prose" dangerouslySetInnerHTML={{ __html: introHtml }} />

          {/* For-you box */}
          <div className="v2-foryou">
            <div style={{ fontFamily:BG, fontSize:11.5, fontWeight:800, color:"#8A5F0F", textTransform:"uppercase", letterSpacing:".07em" }}>
              For {ctx.childName} — {ctx.archetype}, age {ctx.ageBand === "10-11" ? "10–11" : ctx.ageBand === "12-14" ? "12–14" : ctx.ageBand}
            </div>
            <div className="v2-prose" style={{ marginTop:6 }} dangerouslySetInnerHTML={{ __html: forYouHtml }} />
          </div>

          <div className="v2-prose" dangerouslySetInnerHTML={{ __html: outroHtml }} />

          {whatWorkingHtml && (
            <>
              <h3 style={{ fontSize:17, margin:"24px 0 9px", fontFamily:BG, color:"var(--v2-navy)" }}>What working looks like</h3>
              <div className="v2-prose" dangerouslySetInnerHTML={{ __html: whatWorkingHtml }} />
            </>
          )}

          {thingToHoldOntoHtml && (
            <>
              <h3 style={{ fontSize:17, margin:"24px 0 9px", fontFamily:BG, color:"var(--v2-navy)" }}>One thing to hold onto</h3>
              <div className="v2-prose" dangerouslySetInnerHTML={{ __html: thingToHoldOntoHtml }} />
            </>
          )}
        </div>

        {/* CTA to first available day */}
        {(() => {
          const nextDay = dayStates.find(d => !d.done && d.unlocked);
          if (!nextDay) return null;
          return (
            <Link href={`/lms-v2/week/${week}/day/${nextDay.day}`} style={{
              display:"block", textAlign:"center", marginTop:20,
              background:"var(--v2-navy)", color:"#fff",
              borderRadius:10, padding:"13px 20px",
              fontFamily:BG, fontWeight:700, fontSize:14,
            }}>
              {dayStates.some(d => d.done) ? `Continue — Day ${nextDay.day} →` : "Start Day 1 →"}
            </Link>
          );
        })()}
      </div>
    </div>
  );
}
