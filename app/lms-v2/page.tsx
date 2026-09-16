import Link from "next/link";
import { getLmsUserContext } from "@/lib/lms/user-context";
import { getUserProgress, isDayUnlocked, UNLOCK_DELAY_MS, type LmsProgress } from "@/lib/lms/progress";
import { getLmsWeekContent } from "@/lib/lms/content";
import { getSql } from "@/lib/db/client";
import { SAY_BY_ARCHETYPE, NOT_THIS_BY_INSTINCT, WEEK6_SCRIPT } from "@/content/lms/what-to-say";

const BG = `var(--font-bricolage),'Bricolage Grotesque',sans-serif`;

// ── Types ─────────────────────────────────────────────────────────────────────

type NextAction =
  | { type: "unlocked"; week: number; day: number | "weekend"; href: string }
  | { type: "locked";   week: number; day: number | "weekend"; hours: number }
  | { type: "all_done" };

type WeekState = {
  week: number;
  title: string;
  subtitle: string;
  hasContent: boolean;
  completedWeekdays: number;
  weekendDone: boolean;
  accessible: boolean;
  allWeekdaysDone: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeNextAction(
  allProgress: LmsProgress[],
  weekStates: WeekState[],
  now: Date,
): NextAction {
  for (const ws of weekStates) {
    if (!ws.hasContent) continue;
    const i    = ws.week - 1;
    const prog = allProgress[i];
    const prev = i > 0 ? allProgress[i - 1] : null;

    for (let day = 1; day <= 5; day++) {
      if (prog.completedDays.has(day)) continue;
      if (isDayUnlocked(day, ws.week, prog, prev, now)) {
        return { type: "unlocked", week: ws.week, day, href: `/lms-v2/week/${ws.week}/day/${day}` };
      }
      const prereqTime =
        day === 1 && ws.week > 1
          ? prev?.completionTimes.get(5)
          : prog.completionTimes.get(day - 1);
      const ms = prereqTime
        ? Math.max(0, UNLOCK_DELAY_MS - (now.getTime() - prereqTime.getTime()))
        : UNLOCK_DELAY_MS;
      return { type: "locked", week: ws.week, day, hours: Math.ceil(ms / 3_600_000) };
    }

    if (!prog.completedDays.has(0)) {
      if (isDayUnlocked(0, ws.week, prog, null, now)) {
        return { type: "unlocked", week: ws.week, day: "weekend", href: `/lms-v2/week/${ws.week}/weekend` };
      }
      const t = prog.completionTimes.get(5);
      const ms = t ? Math.max(0, UNLOCK_DELAY_MS - (now.getTime() - t.getTime())) : UNLOCK_DELAY_MS;
      return { type: "locked", week: ws.week, day: "weekend", hours: Math.ceil(ms / 3_600_000) };
    }
  }
  return { type: "all_done" };
}

function computeStreak(rows: { completed_at: Date }[]): number {
  if (!rows.length) return 0;
  const todayMs = new Date().setHours(0, 0, 0, 0);
  const MS = 86400000;
  const unique = [...new Set(rows.map(r => {
    const d = new Date(r.completed_at); d.setHours(0,0,0,0); return d.getTime();
  }))].sort((a,b) => b - a);
  if ((todayMs - unique[0]) > MS) return 0;
  let s = 1;
  for (let i = 0; i < unique.length - 1; i++) {
    if (Math.round((unique[i] - unique[i+1]) / MS) === 1) s++;
    else break;
  }
  return s;
}

const WEEK_COLORS = ["var(--v2-w1)","var(--v2-w2)","var(--v2-w3)","var(--v2-w4)","var(--v2-w5)","var(--v2-w6)"];

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LmsV2Home() {
  const ctx = await getLmsUserContext();
  const sql = getSql();
  const now = new Date();

  const allProgress = await Promise.all([1,2,3,4,5,6].map(w => getUserProgress(ctx.userId, w)));
  const [parentRows, streakRows, reflCountRows] = await Promise.all([
    sql`SELECT parent_name FROM assessments WHERE id = ${ctx.assessmentId} LIMIT 1` as unknown as Promise<{ parent_name: string | null }[]>,
    sql`SELECT completed_at FROM lms_progress WHERE user_id = ${ctx.userId} AND day BETWEEN 1 AND 5 ORDER BY completed_at DESC` as unknown as Promise<{ completed_at: Date }[]>,
    sql`SELECT outcome, COUNT(*)::int as cnt FROM lms_reflections WHERE user_id = ${ctx.userId} GROUP BY outcome` as unknown as Promise<{ outcome: string; cnt: number }[]>,
  ]);

  const weekContents = [1,2,3,4,5,6].map(w => getLmsWeekContent(ctx.archetype, w, ctx.ageBand));

  const weekStates: WeekState[] = [0,1,2,3,4,5].map(i => {
    const week    = i + 1;
    const prog    = allProgress[i];
    const prev    = i > 0 ? allProgress[i - 1] : null;
    const content = weekContents[i];
    const doneWeekdays = [1,2,3,4,5].filter(d => prog.completedDays.has(d)).length;
    const accessible   = prog.completedDays.size > 0 || week === 1 || isDayUnlocked(1, week, prog, prev, now);
    const allWeekdaysDone = doneWeekdays === 5;
    const done = allWeekdaysDone && prog.completedDays.has(0);
    const subtitle = done
      ? "Complete"
      : accessible
      ? (content?.weeklyReading?.whatWorkingLooksLike?.slice(0, 80) ?? "")
      : `Unlocks after Week ${i}`;
    return {
      week,
      title:            content?.weekTitle ?? `Week ${week}`,
      subtitle,
      hasContent:       content !== null,
      completedWeekdays: doneWeekdays,
      weekendDone:      prog.completedDays.has(0),
      accessible,
      allWeekdaysDone,
    };
  });

  const totalWeekdays  = weekStates.reduce((s, w) => s + w.completedWeekdays, 0);
  const totalWeekends  = weekStates.filter(w => w.weekendDone).length;
  const pct            = Math.round(totalWeekdays / 30 * 100);
  const streak         = computeStreak(streakRows);
  const reflTotal      = reflCountRows.reduce((s, r) => s + r.cnt, 0);

  const nextAction = computeNextAction(allProgress, weekStates, now);
  const currentWeekState = weekStates.find(w => w.hasContent && w.accessible && !(w.allWeekdaysDone && w.weekendDone))
    ?? weekStates.find(w => w.hasContent && w.accessible);

  const currentWeekNum = currentWeekState?.week ?? 1;
  const currentWeekContent = weekContents[currentWeekNum - 1];
  const currentWeekSay = currentWeekNum === 6
    ? WEEK6_SCRIPT
    : (SAY_BY_ARCHETYPE[ctx.archetype]?.[currentWeekNum - 1] ?? null);
  const currentWeekNotThis = currentWeekNum < 6
    ? (NOT_THIS_BY_INSTINCT[ctx.parentPattern]?.[currentWeekNum - 1] ?? null)
    : null;

  const parentName = parentRows[0]?.parent_name ?? "there";
  const ageBandLabel = ctx.ageBand === "10-11" ? "10–11" : ctx.ageBand === "12-14" ? "12–14" : ctx.ageBand;
  const archetypeLabel = ctx.archetype;

  // Next action box content
  let nextBoxHref = "";
  let nextBoxLabel = "";
  let nextBoxSub = "";
  let nextBoxIsOpen = false;
  if (nextAction.type === "unlocked") {
    nextBoxIsOpen = true;
    nextBoxHref = nextAction.href;
    nextBoxLabel = nextAction.day === "weekend"
      ? `Weekend review is open`
      : `Day ${nextAction.day} is open`;
    nextBoxSub = nextAction.day === "weekend"
      ? "All five days complete."
      : nextAction.day === 1 && nextAction.week > 1
      ? `Week ${nextAction.week - 1} complete.`
      : `You completed Day ${(nextAction.day as number) - 1}.`;
  } else if (nextAction.type === "locked") {
    nextBoxIsOpen = false;
    const h = nextAction.hours;
    const timeStr = h <= 1 ? "less than an hour" : `about ${h} hour${h === 1 ? "" : "s"}`;
    nextBoxLabel = nextAction.day === "weekend"
      ? `Weekend review opens in ${timeStr}`
      : `Day ${nextAction.day} opens in ${timeStr}`;
    nextBoxSub = "Days open 24 hours apart.";
  } else {
    nextBoxIsOpen = true;
    nextBoxLabel = "All six weeks complete!";
    nextBoxSub = "30 days and 6 weekend reviews done.";
  }

  const whatToWatch = currentWeekContent?.weeklyReading?.whatWorkingLooksLike
    ? currentWeekContent.weeklyReading.whatWorkingLooksLike.slice(0, 200) + (currentWeekContent.weeklyReading.whatWorkingLooksLike.length > 200 ? "…" : "")
    : null;

  return (
    <div style={{ background:"var(--v2-bg)", minHeight:"100dvh", fontFamily:"var(--v2-IS)", color:"var(--v2-dim)" }}>

      {/* Top bar */}
      <div style={{
        background:"#fff", borderBottom:"1px solid var(--v2-line)", padding:"12px 28px",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        position:"sticky", top:0, zIndex:9,
      }}>
        <span style={{ fontSize:12.5, color:"var(--v2-dim2)" }}>Home</span>
        <div style={{ display:"flex", alignItems:"center", gap:15 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:600, color:"var(--v2-navy)" }}>
            <div style={{
              width:29, height:29, borderRadius:"50%", background:"var(--v2-navy)", color:"#fff",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:11, fontFamily:BG, fontWeight:700,
            }}>
              {parentName.slice(0,2).toUpperCase()}
            </div>
            {parentName}
          </div>
        </div>
      </div>

      {/* Two-column wrap */}
      <div style={{ padding:"24px 28px 60px", display:"grid", gridTemplateColumns:"1fr 330px", gap:20, alignItems:"start", maxWidth:1400 }}>

        {/* ── LEFT COLUMN ── */}
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, margin:0 }}>Welcome back, {parentName}</h1>
          <div style={{ fontSize:14, marginTop:3, color:"var(--v2-dim)" }}>
            Week {currentWeekNum}. {currentWeekContent?.weekTitle ?? ""}
          </div>

          {/* Progress hero card */}
          <div className="v2-card" style={{
            padding:"20px 22px", marginTop:18, marginBottom:0,
            display:"flex", alignItems:"center", gap:22,
            background:"linear-gradient(105deg,#fff 52%,var(--v2-gold-tint))",
          }}>
            <div style={{ flex:1, minWidth:210 }}>
              <div style={{ fontSize:10.5, color:"var(--v2-dim2)", fontWeight:700, textTransform:"uppercase", letterSpacing:".09em" }}>Overall progress</div>
              <div style={{ fontFamily:BG, fontSize:31, fontWeight:800, color:"var(--v2-teal-700)", lineHeight:1, marginTop:3 }}>{pct}%</div>
              <div className="v2-bar" style={{ maxWidth:400, marginTop:10 }}>
                <i style={{ width:`${pct}%` }} />
              </div>
              <div style={{ fontSize:12, color:"var(--v2-dim2)", marginTop:8 }}>
                {totalWeekdays} of 30 days · {totalWeekends} of 6 weekend reviews
              </div>
            </div>
            <div style={{ display:"flex", gap:9, marginLeft:"auto", flexShrink:0 }}>
              <div style={{ background:"#fff", border:"1px solid var(--v2-gold-line)", borderRadius:11, padding:"11px 15px", textAlign:"center", minWidth:78 }}>
                <b style={{ display:"block", fontFamily:BG, fontSize:21, fontWeight:800, color:"var(--v2-navy)", lineHeight:1 }}>{streak}</b>
                <span style={{ fontSize:10.5, color:"var(--v2-dim2)" }}>day streak</span>
              </div>
              <div style={{ background:"#fff", border:"1px solid var(--v2-gold-line)", borderRadius:11, padding:"11px 15px", textAlign:"center", minWidth:78 }}>
                <b style={{ display:"block", fontFamily:BG, fontSize:21, fontWeight:800, color:"var(--v2-navy)", lineHeight:1 }}>{reflTotal}</b>
                <span style={{ fontSize:10.5, color:"var(--v2-dim2)" }}>reflections</span>
              </div>
            </div>
          </div>

          {/* Section head — six weeks */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", margin:"24px 0 11px" }}>
            <h2 style={{ fontSize:16.5 }}>Your six weeks</h2>
            <div style={{ fontSize:12, color:"var(--v2-dim2)" }}>written for {archetypeLabel} · age {ageBandLabel}</div>
          </div>

          {/* Week rows */}
          <div className="v2-card" style={{ padding:0, overflow:"hidden" }}>
            {weekStates.map((ws, i) => {
              const done   = ws.allWeekdaysDone && ws.weekendDone;
              const active = ws.accessible && !done;
              const WrapEl = ws.accessible ? Link : "div";
              const wrapProps = ws.accessible
                ? { href: `/lms-v2/week/${ws.week}`, style: { display:"flex", alignItems:"center", gap:14, padding:"14px 19px", borderBottom: i < 5 ? "1px solid var(--v2-line)" : "none", cursor:"pointer", textDecoration:"none", background: active && ws.week === currentWeekState?.week ? "linear-gradient(90deg,var(--v2-teal-tint),#fff)" : "transparent", transition:"background .12s" } }
                : { style: { display:"flex", alignItems:"center", gap:14, padding:"14px 19px", borderBottom: i < 5 ? "1px solid var(--v2-line)" : "none", opacity:.62, cursor:"default" } };
              return (
                // @ts-expect-error dynamic element
                <WrapEl key={ws.week} {...wrapProps}>
                  {/* Badge */}
                  <div style={{
                    width:42, height:42, borderRadius:11, display:"flex", flexDirection:"column",
                    alignItems:"center", justifyContent:"center", flexShrink:0,
                    background: WEEK_COLORS[i], fontFamily:BG,
                  }}>
                    <small style={{ fontSize:8, letterSpacing:".08em", color:"var(--v2-dim2)", fontWeight:700, textTransform:"uppercase" }}>WEEK</small>
                    <b style={{ fontSize:15.5, fontWeight:800, color:"var(--v2-navy)", lineHeight:1 }}>{ws.week}</b>
                  </div>
                  {/* Title + sub */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <h4 style={{ fontSize:14.8, fontWeight:700, margin:0 }}>{ws.title}</h4>
                    <p style={{ fontSize:12.2, color:"var(--v2-dim2)", marginTop:2, margin:0 }}>
                      {done ? "Complete" : active ? ws.subtitle : `Unlocks after Week ${ws.week - 1}`}
                    </p>
                  </div>
                  {/* Right side */}
                  {active && (
                    <div style={{ width:74, flexShrink:0 }}>
                      <div className="v2-bar" style={{ height:5, margin:0 }}>
                        <i style={{ width:`${Math.round(ws.completedWeekdays / 5 * 100)}%` }} />
                      </div>
                      <span style={{ fontSize:10.5, color:"var(--v2-dim2)", display:"block", textAlign:"right", marginTop:3 }}>
                        {ws.completedWeekdays}/5
                      </span>
                    </div>
                  )}
                  {done && <span className="v2-pill-done">Done</span>}
                  {!ws.accessible && <span className="v2-pill-lock">Locked</span>}
                </WrapEl>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT RAIL ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:15 }}>

          {/* This week's focus card */}
          <div className="v2-card" style={{ padding:"18px 19px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:10.5, letterSpacing:".1em", textTransform:"uppercase" as const, fontWeight:700, color:"var(--v2-dim2)" }}>This week&apos;s focus</span>
              <span style={{ background:"var(--v2-teal-tint)", color:"var(--v2-teal-700)", fontSize:10.5, fontWeight:700, padding:"3px 8px", borderRadius:6, fontFamily:BG }}>Week {currentWeekNum}</span>
            </div>
            <h3 style={{ fontSize:17.5, margin:"9px 0 6px", fontWeight:800, lineHeight:1.2 }}>
              {currentWeekContent?.weekTitle ?? `Week ${currentWeekNum}`}
            </h3>
            <div style={{ fontSize:12.8, lineHeight:1.55 }}>
              {currentWeekContent?.weeklyReading?.introShared?.slice(0, 120) ?? ""}
            </div>

            {/* Next action box */}
            <div style={{
              borderRadius:11, padding:"13px 14px", marginTop:13,
              background: nextBoxIsOpen ? "var(--v2-teal-tint)" : "var(--v2-gold-tint)",
              border: nextBoxIsOpen ? "1px solid rgba(33,163,138,.28)" : "1px solid var(--v2-gold-line)",
            }}>
              <div style={{ fontFamily:BG, fontSize:13.5, fontWeight:800, color:"var(--v2-navy)" }}>{nextBoxLabel}</div>
              <div style={{ fontSize:11.8, marginTop:3, color: nextBoxIsOpen ? "var(--v2-teal-700)" : "#8A6A28" }}>{nextBoxSub}</div>
              {nextBoxHref && (
                <Link href={nextBoxHref} style={{
                  display:"block", width:"100%", textAlign:"center", marginTop:11,
                  background:"var(--v2-navy)", color:"#fff", borderRadius:9, padding:10,
                  fontFamily:BG, fontWeight:700, fontSize:13,
                }}>
                  Go →
                </Link>
              )}
            </div>

            {/* What to watch */}
            {whatToWatch && (
              <div style={{ marginTop:14, paddingTop:13, borderTop:"1px solid var(--v2-line)" }}>
                <div style={{ fontFamily:BG, fontSize:12.5, fontWeight:700, color:"var(--v2-navy)" }}>What to watch for</div>
                <p style={{ fontSize:12.2, marginTop:4 }}>{whatToWatch}</p>
              </div>
            )}
          </div>

          {/* What to say this week card */}
          {currentWeekSay && (
            <div className="v2-card" style={{ padding:"18px 19px" }}>
              <div style={{ fontSize:10.5, letterSpacing:".1em", textTransform:"uppercase" as const, fontWeight:700, color:"var(--v2-dim2)" }}>What to say this week</div>
              <div style={{ fontFamily:BG, fontSize:16, fontWeight:700, color:"var(--v2-navy)", fontStyle:"italic", lineHeight:1.4, marginTop:9 }}>
                &ldquo;{currentWeekSay}&rdquo;
              </div>
              <Link href="/lms-v2/what-to-say" style={{
                display:"flex", alignItems:"center", gap:10, padding:"10px 0", marginTop:11,
                borderTop:"1px solid var(--v2-line)", textDecoration:"none",
              }}>
                <div style={{ width:29, height:29, borderRadius:8, background:"var(--v2-gold-tint)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0 }}>❝</div>
                <div>
                  <b style={{ display:"block", fontFamily:BG, fontSize:12.8, color:"var(--v2-navy)" }}>Plus what not to say</b>
                  {currentWeekNotThis && (
                    <span style={{ fontSize:11.2, color:"var(--v2-dim2)" }}>For your instinct — {ctx.parentPattern}</span>
                  )}
                </div>
                <span style={{ marginLeft:"auto", color:"var(--v2-dim2)", fontSize:14 }}>›</span>
              </Link>
            </div>
          )}

          {/* Quick actions card */}
          <div className="v2-card" style={{ padding:"18px 19px" }}>
            <div style={{ fontSize:10.5, letterSpacing:".1em", textTransform:"uppercase" as const, fontWeight:700, color:"var(--v2-dim2)" }}>Quick actions</div>
            <div style={{ marginTop:7 }}>
              {[
                { href:"/lms-v2/resources",                  icon:"✦", label:"Attention library",    sub:"Articles in plain language" },
                { href:"/lms-v2/progress",                   icon:"◴", label:"Track progress",       sub:"What&apos;s shifted so far" },
                { href:`/lms-v2/week/${currentWeekNum}`,     icon:"▤", label:`Week ${currentWeekNum} reading`, sub:"Before the next day" },
              ].map(({ href, icon, label, sub }, idx, arr) => (
                <Link key={href} href={href} style={{
                  display:"flex", alignItems:"center", gap:10, padding:"10px 0",
                  borderBottom: idx < arr.length - 1 ? "1px solid var(--v2-line)" : "none",
                  textDecoration:"none",
                }}>
                  <div style={{ width:29, height:29, borderRadius:8, background:"var(--v2-gold-tint)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0 }}>{icon}</div>
                  <div>
                    <b style={{ display:"block", fontFamily:BG, fontSize:12.8, color:"var(--v2-navy)" }}>{label}</b>
                    <span style={{ fontSize:11.2, color:"var(--v2-dim2)" }} dangerouslySetInnerHTML={{ __html: sub }} />
                  </div>
                  <span style={{ marginLeft:"auto", color:"var(--v2-dim2)", fontSize:14 }}>›</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Support card */}
          <div className="v2-card" style={{ padding:"18px 19px", background:"var(--v2-navy)", border:"none" }}>
            <b style={{ fontFamily:BG, fontSize:14, color:"#fff", display:"block" }}>Week {currentWeekNum} is the one people stall on</b>
            <p style={{ fontSize:12, color:"#A9B6CC", margin:"5px 0 12px" }}>
              If the ordinary days aren&apos;t landing, that&apos;s worth a conversation.
            </p>
            <a href="#" style={{
              display:"inline-block", background:"linear-gradient(135deg,var(--v2-gold-lt),var(--v2-gold))",
              color:"var(--v2-navy)", borderRadius:9, padding:"9px 15px",
              fontFamily:BG, fontWeight:700, fontSize:12.5,
            }}>
              Book a call →
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
