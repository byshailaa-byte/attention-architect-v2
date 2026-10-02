import Link from "next/link";
import { notFound } from "next/navigation";
import { getLmsUserContext } from "@/lib/lms/user-context";
import { getLmsWeekContent, getDayCard } from "@/lib/lms/content";
import { getUserProgress, isDayUnlocked } from "@/lib/lms/progress";
import { fillLmsContent } from "@/lib/lms/render";
import { buildModules, readingTotalRange, BAND_LABEL } from "@/lib/lms/modules";
import { getSql } from "@/lib/db/client";
import { V2, HEAD, BODY } from "../../v2ui";

export const dynamic = "force-dynamic";

const MODULE_TINT = [V2.tintBlue, V2.tintGold, V2.tintGreen, V2.tintPurple];
const MODULE_STROKE = ["#1E3A5F", "#8A6322", "#2F5D3A", "#4A3470"];

// Inline module icons from the approved mockup: circle-burst, arrows, bar chart, heart.
function ModuleIcon({ i }: { i: number }) {
  const common = { width: 28, height: 28, viewBox: "0 0 24 24", fill: "none", stroke: MODULE_STROKE[i], strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const path =
    i === 0 ? <><path d="M12 3v6" /><path d="M5.6 5.6l4.2 4.2" /><path d="M3 12h6" /><circle cx="15" cy="15" r="5" /></>
    : i === 1 ? <><path d="M7 12h4" /><path d="M13 12h4" /><path d="M9 8l-2 4 2 4" /><path d="M15 8l2 4-2 4" /></>
    : i === 2 ? <><path d="M4 18h16" /><path d="M7 18v-4" /><path d="M12 18v-7" /><path d="M17 18v-10" /></>
    : <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" />;
  return (
    <div style={{ width: 60, height: 60, flexShrink: 0, borderRadius: 10, background: MODULE_TINT[i], display: "grid", placeItems: "center" }}>
      <svg {...common}>{path}</svg>
    </div>
  );
}

export default async function WeekOverview({ params }: { params: Promise<{ week: string }> }) {
  const { week: weekStr } = await params;
  const week = parseInt(weekStr, 10);
  if (!Number.isInteger(week) || week < 1 || week > 6) notFound();

  const ctx = await getLmsUserContext();
  const content = getLmsWeekContent(ctx.archetype, week, ctx.ageBand);
  if (!content) notFound();

  const now = new Date();
  const [prog, prevProg, totalRows] = await Promise.all([
    getUserProgress(ctx.userId, week),
    week > 1 ? getUserProgress(ctx.userId, week - 1) : Promise.resolve(null),
    getSql()`SELECT COUNT(*)::int AS cnt FROM lms_progress WHERE user_id = ${ctx.userId} AND day BETWEEN 1 AND 5` as unknown as Promise<{ cnt: number }[]>,
  ]);
  const totalCompleted = totalRows[0]?.cnt ?? 0;

  const fill = (s: string) => fillLmsContent(s, ctx.childName, ctx.childGender);
  const modules = buildModules(content, ctx.ageBand);

  const dayRows = [1, 2, 3, 4, 5].map((d) => ({
    day: d,
    kind: d === 1 ? "OBSERVE" : "TRY",
    title: fill(getDayCard(content, d)?.title ?? `Day ${d}`),
    hint: d === 1 ? "2–5 min, at homework time" : "About 5 min",
    unlocked: isDayUnlocked(d, week, prog, d === 1 ? prevProg : null, now),
    done: prog.completedDays.has(d),
  }));
  const weekendUnlocked = isDayUnlocked(0, week, prog, null, now);

  return (
    <div style={{ fontFamily: BODY, color: V2.navy, display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <div style={{ background: V2.navy, color: V2.white, padding: "22px 22px 40px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/lms-v2" style={{ color: V2.onNavy, fontSize: 14, minHeight: 44, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>← Journey</Link>
          <span style={{ fontSize: 13, color: V2.onNavy }}>Day {totalCompleted} of 30</span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: V2.gold }}>Week {week} of 6</div>
        <h1 style={{ margin: 0, fontFamily: HEAD, fontSize: 31, lineHeight: 1.12, fontWeight: 600 }}>{content.weekTitle}</h1>
        <div style={{ fontSize: 14, color: V2.onNavy }}>Written for {ctx.archetype}, age {BAND_LABEL[ctx.ageBand]}</div>
      </div>

      <div style={{ marginTop: -18, background: V2.cream, borderRadius: "22px 22px 0 0", padding: "20px 18px 24px", display: "flex", flexDirection: "column", gap: 14, flexGrow: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <NavArrow dir="prev" week={week} />
          <span style={{ fontSize: 18, fontWeight: 700 }}>Week {week}</span>
          <NavArrow dir="next" week={week} />
        </div>

        <h2 style={{ margin: "6px 0 0", fontSize: 17, fontWeight: 700 }}>Read</h2>
        {modules.map((m, i) => (
          <Link key={m.index} href={`/lms-v2/week/${week}/module/${m.index}`} style={{ display: "flex", gap: 12, alignItems: "center", background: V2.white, border: `${i === 0 ? 1.5 : 1}px solid ${i === 0 ? V2.gold : V2.line}`, borderRadius: 14, padding: 10, minHeight: 76, textDecoration: "none", color: V2.navy }}>
            <ModuleIcon i={i} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flexGrow: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25 }}>{m.index}. {m.title}</div>
              <div style={{ fontSize: 13, color: V2.dim }}>{m.timeRange}{i === 0 ? " · start here" : ""}</div>
            </div>
          </Link>
        ))}

        <h2 style={{ margin: "10px 0 0", fontSize: 17, fontWeight: 700 }}>Do, one day at a time</h2>
        {dayRows.map((d) => {
          const inner = (
            <div style={{ display: "flex", flexDirection: "column", gap: 3, flexGrow: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: d.unlocked ? (d.kind === "OBSERVE" ? V2.dim : V2.darkGold) : V2.dim2 }}>{d.kind} · DAY {d.day}{d.done ? " · DONE" : ""}</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{d.title}</div>
              <div style={{ fontSize: 13, color: d.unlocked ? V2.dim : V2.dim2 }}>{d.unlocked ? d.hint : "Unlocks a day after the last one"}</div>
            </div>
          );
          const base: React.CSSProperties = { display: "flex", gap: 12, alignItems: "center", borderRadius: 14, padding: 12, minHeight: 64, textDecoration: "none" };
          return d.unlocked ? (
            <Link key={d.day} href={`/lms-v2/week/${week}/day/${d.day}`} style={{ ...base, background: V2.white, border: `1px solid ${V2.line}`, color: V2.navy }}>{inner}</Link>
          ) : (
            <div key={d.day} style={{ ...base, background: V2.greyCard, border: `1px solid ${V2.line}`, color: V2.dim2 }}>{inner}</div>
          );
        })}

        {weekendUnlocked ? (
          <Link href={`/lms-v2/week/${week}/weekend`} style={{ display: "flex", flexDirection: "column", gap: 3, background: V2.white, border: `1px solid ${V2.line}`, borderRadius: 14, padding: 12, textDecoration: "none", color: V2.navy }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: V2.darkGold }}>RECORD · WEEKEND</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Look back at your week</div>
            <div style={{ fontSize: 13, color: V2.dim }}>3–5 min · your notes from each day, read back to you</div>
          </Link>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 3, background: V2.greyCard, border: `1px solid ${V2.line}`, borderRadius: 14, padding: 12, color: V2.dim2 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em" }}>RECORD · WEEKEND</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Look back at your week</div>
            <div style={{ fontSize: 13 }}>Unlocks after Days 1–5</div>
          </div>
        )}

        <div style={{ textAlign: "center", fontSize: 13, color: V2.dim, borderTop: `1px dashed ${V2.line2}`, paddingTop: 14, marginTop: 4 }}>{readingTotalRange(modules)}</div>
      </div>
    </div>
  );
}

function NavArrow({ dir, week }: { dir: "prev" | "next"; week: number }) {
  const disabled = dir === "prev" ? week <= 1 : week >= 6;
  const target = dir === "prev" ? week - 1 : week + 1;
  const glyph = dir === "prev" ? "‹" : "›";
  const style: React.CSSProperties = { width: 44, height: 44, borderRadius: "50%", border: `1px solid ${V2.line2}`, background: V2.white, color: disabled ? "#B7AE9C" : V2.navy, fontSize: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" };
  if (disabled) return <span aria-disabled style={style}>{glyph}</span>;
  return <Link href={`/lms-v2/week/${target}`} aria-label={dir === "prev" ? "Previous week" : "Next week"} style={style}>{glyph}</Link>;
}
