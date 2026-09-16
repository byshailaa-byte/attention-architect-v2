import Link from "next/link";
import { getLmsUserContext } from "@/lib/lms/user-context";
import { getSql } from "@/lib/db/client";
import { getLmsWeekContent } from "@/lib/lms/content";
import { SAY_BY_ARCHETYPE, NOT_THIS_BY_INSTINCT, WEEK6_SCRIPT } from "@/content/lms/what-to-say";

const BG = `var(--font-bricolage),'Bricolage Grotesque',sans-serif`;

const WEEK_TITLES: Record<number, string> = {
  1: "Getting started without the push",
  2: "Handling what pulls them away",
  3: "Staying with it on an ordinary day",
  4: "Coming back after a slip",
  5: "Using it beyond homework",
  6: "Running it themselves",
};

type WeekEntry = {
  week: number;
  title: string;
  say: string;
  notThis: { phrase: string; why: string } | null;
};

export default async function WhatToSayPage() {
  const ctx = await getLmsUserContext();
  const sql = getSql();

  const progressRows = await sql`
    SELECT DISTINCT week FROM lms_progress WHERE user_id = ${ctx.userId} ORDER BY week
  ` as unknown as { week: number }[];

  const weeksWithProgress = new Set(progressRows.map(r => r.week));
  const maxWeek = weeksWithProgress.size > 0 ? Math.max(...weeksWithProgress) : 1;
  const currentWeek = Math.min(maxWeek, 6);

  const archetypeScripts = SAY_BY_ARCHETYPE[ctx.archetype];
  if (!archetypeScripts) {
    console.warn(`[what-to-say] No SAY entry for archetype: ${ctx.archetype}`);
  }
  const instinctScripts = NOT_THIS_BY_INSTINCT[ctx.parentPattern];
  if (!instinctScripts) {
    console.warn(`[what-to-say] No NOT_THIS entry for parentPattern: ${ctx.parentPattern}`);
  }

  const entries: WeekEntry[] = [];
  for (let w = 1; w <= currentWeek; w++) {
    const say = w === 6
      ? WEEK6_SCRIPT
      : (archetypeScripts?.[w - 1] ?? null);
    const notThis = (w === 6 || !instinctScripts)
      ? null
      : (instinctScripts[w - 1] ?? null);
    if (!say) continue;
    entries.push({
      week: w,
      title: getLmsWeekContent(ctx.archetype, w, ctx.ageBand)?.weekTitle ?? WEEK_TITLES[w] ?? `Week ${w}`,
      say,
      notThis,
    });
  }

  const featured = entries[entries.length - 1];
  const prior    = entries.slice(0, -1).reverse();

  return (
    <div style={{ background:"var(--v2-bg)", minHeight:"100dvh", fontFamily:"var(--v2-IS)", color:"var(--v2-dim)" }}>

      {/* Top bar */}
      <div style={{
        background:"#fff", borderBottom:"1px solid var(--v2-line)", padding:"12px 28px",
        display:"flex", alignItems:"center", gap:12, position:"sticky", top:0, zIndex:9,
      }}>
        <Link href="/lms-v2" style={{ fontSize:12.5, fontWeight:600, color:"var(--v2-dim2)", textDecoration:"none" }}>← Home</Link>
        <span style={{ fontSize:12.5, color:"var(--v2-dim2)" }}>What to say</span>
      </div>

      <div style={{ maxWidth:680, margin:"0 auto", padding:"28px 28px 80px" }}>

        <h1 style={{ fontSize:24, fontWeight:800, marginBottom:6 }}>What to say</h1>
        <p style={{ fontSize:14, color:"var(--v2-dim2)", marginBottom:32, lineHeight:1.6 }}>
          One phrase a week for {ctx.childName}. One thing to avoid, for your instinct.
        </p>

        {/* Featured current week */}
        {featured && (
          <div style={{ marginBottom:36 }}>
            <div className="v2-card" style={{ padding:"20px 22px", border:"2px solid var(--v2-gold)" }}>
              <div style={{ fontSize:10.5, letterSpacing:".1em", textTransform:"uppercase", fontWeight:700, color:"#A3781E" }}>
                This week &middot; Week {featured.week}
              </div>
              <div style={{ fontSize:10.5, letterSpacing:".1em", textTransform:"uppercase", fontWeight:700, color:"var(--v2-teal-700)", marginTop:12, marginBottom:7 }}>
                Say this
              </div>
              <div style={{ fontFamily:BG, fontSize:19, fontWeight:700, color:"var(--v2-navy)", lineHeight:1.38 }}>
                &ldquo;{featured.say}&rdquo;
              </div>

              {featured.notThis && (
                <div style={{ background:"var(--v2-red-tint)", border:"1px solid rgba(217,97,74,.22)", borderRadius:12, padding:"16px 18px", marginTop:14 }}>
                  <div style={{ fontSize:10.5, letterSpacing:".1em", textTransform:"uppercase", fontWeight:700, color:"var(--v2-red)", marginBottom:7 }}>
                    Not this — {ctx.parentPattern}
                  </div>
                  <div style={{ fontFamily:BG, fontSize:16.5, fontWeight:700, color:"#96382A", lineHeight:1.38 }}>
                    &ldquo;{featured.notThis.phrase}&rdquo;
                  </div>
                  <div style={{ fontSize:13.2, marginTop:9, color:"var(--v2-dim)" }}>
                    {featured.notThis.why}
                  </div>
                </div>
              )}

              {featured.week === 6 && (
                <div style={{ marginTop:14, padding:"14px 16px", background:"var(--v2-gold-tint)", border:"1px solid var(--v2-gold-line)", borderRadius:10 }}>
                  <p style={{ fontSize:13.5, color:"#8A6A28", lineHeight:1.6 }}>
                    Week 6 has no not-this. The whole week is about not speaking. Adding a thing-not-to-say would undercut it.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Earlier weeks */}
        {prior.length > 0 && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:14 }}>
              <h2 style={{ fontSize:16.5 }}>Earlier weeks</h2>
              <span style={{ fontSize:12, color:"var(--v2-dim2)" }}>weeks you&apos;ve reached</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {prior.map(entry => (
                <div key={entry.week} className="v2-card" style={{ padding:"16px 20px" }}>
                  <div style={{ fontSize:10.5, letterSpacing:".08em", textTransform:"uppercase", fontWeight:700, color:"#A3781E", marginBottom:3 }}>
                    Week {entry.week} — {entry.title}
                  </div>
                  <div style={{ fontFamily:BG, fontSize:16.5, fontWeight:700, color:"var(--v2-navy)", lineHeight:1.3, marginTop:9 }}>
                    &ldquo;{entry.say}&rdquo;
                  </div>
                  {entry.notThis && (
                    <div style={{ fontSize:13, marginTop:10, color:"var(--v2-dim)" }}>
                      <b style={{ color:"var(--v2-red)" }}>Not this:</b>{" "}
                      &ldquo;{entry.notThis.phrase}&rdquo; — {entry.notThis.why}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {prior.length === 0 && !featured && (
          <div className="v2-card" style={{ padding:"16px 20px", fontSize:12.5, color:"var(--v2-dim2)" }}>
            Weeks open as you reach them.
          </div>
        )}

      </div>
    </div>
  );
}
