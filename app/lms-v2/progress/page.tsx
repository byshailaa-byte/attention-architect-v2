import Link from "next/link";
import { getLmsUserContext } from "@/lib/lms/user-context";
import { getSql } from "@/lib/db/client";

const BG = `var(--font-bricolage),'Bricolage Grotesque',sans-serif`;

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

function relativeTime(date: Date): string {
  const diffMs = new Date().getTime() - new Date(date).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

const OUTCOME_DOT: Record<string, string> = {
  worked:     "var(--v2-teal)",
  mixed:      "var(--v2-gold)",
  didnt_land: "var(--v2-red)",
};

const OUTCOME_LABELS: Record<string, string> = {
  worked:     "worked",
  mixed:      "mixed",
  didnt_land: "didn't land",
};

export default async function LmsV2ProgressPage() {
  const ctx = await getLmsUserContext();
  const sql = getSql();

  const [progressRows, reflectionRows, weekendRows, timelineRows, streakRows] = await Promise.all([
    sql`
      SELECT week, COUNT(*)::int AS cnt
      FROM lms_progress
      WHERE user_id = ${ctx.userId} AND day BETWEEN 1 AND 5
      GROUP BY week ORDER BY week
    ` as unknown as Promise<{ week: number; cnt: number }[]>,
    sql`
      SELECT outcome, COUNT(*)::int AS cnt
      FROM lms_reflections
      WHERE user_id = ${ctx.userId}
      GROUP BY outcome
    ` as unknown as Promise<{ outcome: string; cnt: number }[]>,
    sql`
      SELECT week FROM lms_progress
      WHERE user_id = ${ctx.userId} AND day = 0
    ` as unknown as Promise<{ week: number }[]>,
    sql`
      SELECT p.week, p.day, p.completed_at, r.outcome
      FROM lms_progress p
      LEFT JOIN lms_reflections r ON r.user_id = p.user_id AND r.week = p.week AND r.day = p.day
      WHERE p.user_id = ${ctx.userId}
      ORDER BY p.completed_at DESC
      LIMIT 10
    ` as unknown as Promise<{ week: number; day: number; completed_at: Date; outcome: string | null }[]>,
    sql`
      SELECT completed_at FROM lms_progress
      WHERE user_id = ${ctx.userId} AND day BETWEEN 1 AND 5
      ORDER BY completed_at DESC
    ` as unknown as Promise<{ completed_at: Date }[]>,
  ]);

  const totalDays     = progressRows.reduce((s, r) => s + r.cnt, 0);
  const totalWeekends = weekendRows.length;
  const streak        = computeStreak(streakRows);

  const reflMap: Record<string, number> = {};
  let totalRefl = 0;
  for (const r of reflectionRows) {
    reflMap[r.outcome] = r.cnt;
    totalRefl += r.cnt;
  }
  const worked    = reflMap["worked"]     ?? 0;
  const mixed     = reflMap["mixed"]      ?? 0;
  const didntLand = reflMap["didnt_land"] ?? 0;

  return (
    <div style={{ background:"var(--v2-bg)", minHeight:"100dvh", fontFamily:"var(--v2-IS)", color:"var(--v2-dim)" }}>

      {/* Top bar */}
      <div style={{
        background:"#fff", borderBottom:"1px solid var(--v2-line)", padding:"12px 28px",
        display:"flex", alignItems:"center", gap:12,
      }}>
        <Link href="/lms-v2" style={{ fontSize:12.5, fontWeight:600, color:"var(--v2-dim2)", textDecoration:"none" }}>← Home</Link>
        <span style={{ fontSize:12.5, color:"var(--v2-dim2)" }}>Track Progress</span>
      </div>

      <div style={{ maxWidth:800, margin:"0 auto", padding:"28px 28px 80px" }}>

        <h1 style={{ fontSize:24, fontWeight:800, marginBottom:6 }}>What&apos;s shifting</h1>
        <p style={{ fontSize:14, color:"var(--v2-dim2)", marginBottom:0 }}>
          A record of what you tried and what happened. Nothing here is a score on {ctx.childName}.
        </p>

        {/* Stat grid */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, margin:"18px 0" }}>
          {[
            { label:"Days completed",   value:totalDays,     sub:`of 30` },
            { label:"Weekend reviews",  value:totalWeekends, sub:`of 6` },
            { label:"Current streak",   value:streak,        sub:"days in a row" },
            { label:"Reflections",      value:totalRefl,     sub:"each one shapes the next day" },
          ].map(({ label, value, sub }) => (
            <div key={label} className="v2-card" style={{ padding:"16px 17px" }}>
              <div style={{ fontSize:11, color:"var(--v2-dim2)", fontWeight:600 }}>{label}</div>
              <div style={{ fontFamily:BG, fontSize:25, fontWeight:800, color:"var(--v2-navy)", marginTop:5, lineHeight:1 }}>{value}</div>
              <div style={{ fontSize:11, marginTop:4, color:"var(--v2-teal-700)", fontWeight:600 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* How changes landed */}
        {totalRefl > 0 && (
          <div className="v2-card" style={{ padding:"18px 19px", marginBottom:14 }}>
            <div style={{ fontSize:10.5, letterSpacing:".1em", textTransform:"uppercase", fontWeight:700, color:"var(--v2-dim2)", marginBottom:11 }}>
              How the changes landed
            </div>
            <div style={{ display:"flex", gap:9, marginTop:13 }}>
              <div style={{ flex:1, borderRadius:11, padding:"13px 15px", background:"var(--v2-teal-tint)", color:"var(--v2-teal-700)" }}>
                <b style={{ display:"block", fontFamily:BG, fontSize:21, marginBottom:1 }}>{worked}</b>
                <span style={{ fontSize:12 }}>Worked</span>
              </div>
              <div style={{ flex:1, borderRadius:11, padding:"13px 15px", background:"var(--v2-gold-tint)", color:"#8A5F0F" }}>
                <b style={{ display:"block", fontFamily:BG, fontSize:21, marginBottom:1 }}>{mixed}</b>
                <span style={{ fontSize:12 }}>Mixed</span>
              </div>
              <div style={{ flex:1, borderRadius:11, padding:"13px 15px", background:"var(--v2-red-tint)", color:"var(--v2-red)" }}>
                <b style={{ display:"block", fontFamily:BG, fontSize:21, marginBottom:1 }}>{didntLand}</b>
                <span style={{ fontSize:12 }}>Didn&apos;t land</span>
              </div>
            </div>
          </div>
        )}

        {/* Recent timeline */}
        {timelineRows.length > 0 && (
          <div className="v2-card" style={{ padding:"18px 19px", marginTop:14 }}>
            <div style={{ fontSize:10.5, letterSpacing:".1em", textTransform:"uppercase", fontWeight:700, color:"var(--v2-dim2)", marginBottom:5 }}>
              Recent
            </div>
            <div style={{ marginTop:5 }}>
              {timelineRows.map((row, idx) => {
                const isWeekend = row.day === 0;
                const dotColor = isWeekend
                  ? "var(--v2-navy)"
                  : row.outcome
                  ? (OUTCOME_DOT[row.outcome] ?? "var(--v2-dim2)")
                  : "var(--v2-dim2)";
                const label = isWeekend
                  ? `Week ${row.week} weekend review complete`
                  : `Week ${row.week}, Day ${row.day}${row.outcome ? ` — ${OUTCOME_LABELS[row.outcome] ?? row.outcome}` : ""}`;
                return (
                  <div key={idx} style={{
                    display:"flex", alignItems:"center", gap:13, padding:"11px 0",
                    borderBottom: idx < timelineRows.length - 1 ? "1px solid var(--v2-line)" : "none",
                  }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0, background:dotColor }} />
                    <div style={{ fontSize:13, color:"var(--v2-navy)", fontWeight:500 }}>{label}</div>
                    <div style={{ marginLeft:"auto", fontSize:11.5, color:"var(--v2-dim2)", whiteSpace:"nowrap" }}>
                      {relativeTime(row.completed_at)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {totalDays === 0 && totalWeekends === 0 && (
          <div style={{ padding:"44px 24px", textAlign:"center", color:"var(--v2-dim2)" }}>
            <b style={{ display:"block", fontFamily:BG, fontSize:16, color:"var(--v2-navy)", marginBottom:6 }}>Nothing here yet</b>
            Complete your first day to start tracking.
          </div>
        )}

      </div>
    </div>
  );
}
