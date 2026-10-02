import Link from "next/link";
import { redirect } from "next/navigation";
import { getLmsUserContext } from "@/lib/lms/user-context";
import { getUserProgress, isDayUnlocked } from "@/lib/lms/progress";
import { getLmsWeekContent, getDayCard } from "@/lib/lms/content";
import { fillLmsContent } from "@/lib/lms/render";
import { WEEK_TITLES } from "@/lib/report/skills";
import { BAND_LABEL } from "@/lib/lms/modules";
import { getSql } from "@/lib/db/client";
import { V2, HEAD, BODY } from "./v2ui";

export const dynamic = "force-dynamic";

export default async function LmsV2Home() {
  const ctx = await getLmsUserContext();
  const sql = getSql();

  // Onboarding gate (mirrors v1): first-time users onboard; existing-progress
  // users are silently marked done so they don't see it retroactively.
  if (!ctx.onboardingCompleted) {
    const existing = (await sql`SELECT COUNT(*)::int AS cnt FROM lms_progress WHERE user_id = ${ctx.userId}`) as unknown as { cnt: number }[];
    if ((existing[0]?.cnt ?? 0) > 0) {
      await sql`UPDATE users SET onboarding_completed_at = NOW() WHERE id = ${ctx.userId} AND onboarding_completed_at IS NULL`;
    } else {
      redirect("/lms-v2/onboarding");
    }
  }

  const now = new Date();
  const allProgress = await Promise.all([1, 2, 3, 4, 5, 6].map((w) => getUserProgress(ctx.userId, w)));
  const weeks = [1, 2, 3, 4, 5, 6].map((week) => {
    const prog = allProgress[week - 1];
    const prevProg = week > 1 ? allProgress[week - 2] : null;
    const hasContent = getLmsWeekContent(ctx.archetype, week, ctx.ageBand) !== null;
    const unlocked = hasContent ? isDayUnlocked(1, week, prog, prevProg, now) : false;
    const completedDays = [1, 2, 3, 4, 5].filter((d) => prog.completedDays.has(d));
    return { week, completedDays, weekendDone: prog.completedDays.has(0), unlocked, hasContent };
  });

  let currentWeek = 1;
  let currentDay = 1;
  for (const ws of weeks) {
    if (!ws.unlocked) break;
    if (ws.completedDays.length < 5) {
      currentWeek = ws.week;
      currentDay = ws.completedDays.length === 0 ? 1 : Math.min(Math.max(...ws.completedDays) + 1, 5);
      break;
    }
    currentWeek = ws.week;
    currentDay = ws.weekendDone ? 1 : 0; // 0 = weekend pending
  }

  const totalCompleted = weeks.reduce((s, ws) => s + ws.completedDays.length, 0);

  const readRows = (await sql`SELECT COUNT(*)::int AS cnt FROM lms_module_reads WHERE user_id = ${ctx.userId} AND week = ${currentWeek}`) as unknown as { cnt: number }[];
  const readCount = Math.min(4, readRows[0]?.cnt ?? 0);

  const curContent = getLmsWeekContent(ctx.archetype, currentWeek, ctx.ageBand);
  const fill = (s: string) => fillLmsContent(s, ctx.childName, ctx.childGender);
  const isWeekend = currentDay === 0;
  const tonightTitle = isWeekend ? "Look back at your week" : fill(getDayCard(curContent!, currentDay)?.title ?? `Day ${currentDay}`);
  const tonightHref = isWeekend ? `/lms-v2/week/${currentWeek}/weekend` : `/lms-v2/week/${currentWeek}/day/${currentDay}`;
  const tonightEyebrow = isWeekend ? `TONIGHT · WEEK ${currentWeek} · WEEKEND` : `TONIGHT · WEEK ${currentWeek} · DAY ${currentDay} · ABOUT 5 MIN`;

  const R = 31;
  const C = 2 * Math.PI * R;
  const frac = Math.max(0, Math.min(1, totalCompleted / 30));

  return (
    <div style={{ fontFamily: BODY, color: V2.navy, display: "flex", flexDirection: "column" }}>
      <div style={{ background: V2.navy, color: V2.white, padding: "22px 22px 46px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Attention Architect</span>
        </div>
        <div style={{ fontSize: 15, color: V2.onNavy }}>Welcome back</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="74" height="74" viewBox="0 0 74 74" aria-hidden>
            <circle cx="37" cy="37" r={R} fill="none" stroke="#3C5778" strokeWidth="7" />
            <circle cx="37" cy="37" r={R} fill="none" stroke={V2.gold} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(frac * C).toFixed(1)} ${C.toFixed(1)}`} transform="rotate(-90 37 37)" />
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontFamily: HEAD, fontSize: 26, fontWeight: 600 }}>Day {totalCompleted} of 30</div>
            <div style={{ fontSize: 14, color: V2.onNavy }}>{ctx.childName} · {ctx.archetype} · {BAND_LABEL[ctx.ageBand]}</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: -22, padding: "0 18px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <Link href={tonightHref} style={{ display: "flex", flexDirection: "column", gap: 10, background: V2.white, border: `1.5px solid ${V2.gold}`, borderRadius: 18, padding: 18, boxShadow: "0 6px 18px rgba(30,58,95,0.08)", textDecoration: "none", color: V2.navy }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: V2.darkGold }}>{tonightEyebrow}</div>
          <div style={{ fontFamily: HEAD, fontSize: 23, lineHeight: 1.2, fontWeight: 600 }}>{tonightTitle}</div>
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 48, borderRadius: 12, background: V2.navy, color: V2.white, fontSize: 15, fontWeight: 600 }}>{isWeekend ? "Open the weekend review" : "Open tonight's move"}</span>
        </Link>

        <Link href={`/lms-v2/week/${currentWeek}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: V2.white, border: `1px solid ${V2.line}`, borderRadius: 14, padding: 14, minHeight: 56, textDecoration: "none", color: V2.navy }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>This week&rsquo;s reading</div>
            <div style={{ fontSize: 13, color: V2.dim }}>{readCount} of 4 modules read</div>
          </div>
          <span style={{ fontSize: 18, color: V2.dim }}>›</span>
        </Link>

        <h2 style={{ margin: "6px 0 0", fontSize: 17, fontWeight: 700 }}>Your six weeks</h2>
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
          {weeks.map((ws) => {
            const title = WEEK_TITLES[ws.week] ?? `Week ${ws.week}`;
            const isNow = ws.week === currentWeek;
            const done = ws.weekendDone; // week fully complete once the weekend review is recorded (E3)
            const inner = (
              <>
                <span style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, background: done ? V2.tintGreen : isNow ? V2.gold : "transparent", color: done ? V2.green : isNow ? V2.navy : V2.dim2, border: done || isNow ? "none" : "1px solid #CFC6B4" }}>{done ? "✓" : ws.week}</span>
                <span style={{ flexGrow: 1, fontSize: 15, fontWeight: isNow ? 600 : 400 }}>{title}</span>
                {isNow && !done && <span style={{ fontSize: 12, fontWeight: 700, color: V2.darkGold }}>NOW</span>}
              </>
            );
            const base: React.CSSProperties = { display: "flex", gap: 12, alignItems: "center", borderRadius: 12, padding: 12, minHeight: 52, textDecoration: "none" };
            return (
              <li key={ws.week}>
                {ws.unlocked ? (
                  <Link href={`/lms-v2/week/${ws.week}`} style={{ ...base, background: V2.white, border: `1px solid ${V2.line}`, color: V2.navy }}>{inner}</Link>
                ) : (
                  <div style={{ ...base, background: V2.greyCard, color: V2.dim2 }}>{inner}</div>
                )}
              </li>
            );
          })}
        </ol>

        {/* Phase 2 slot — 1:1 sessions / upgrade card goes here (intentionally empty until Phase 2) */}

        <Link href="/lms-v2/what-to-say" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: V2.white, border: `1px solid ${V2.line}`, borderRadius: 14, padding: 14, minHeight: 56, textDecoration: "none", color: V2.navy }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>What to say</span>
            <span style={{ fontSize: 13, color: V2.dim }}>The exact words for each week</span>
          </div>
          <span style={{ fontSize: 18, color: V2.dim }}>›</span>
        </Link>

        <Link href="/contact" style={{ textAlign: "center", fontSize: 14, color: V2.dim, minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>Need help? Contact us</Link>
      </div>
    </div>
  );
}
