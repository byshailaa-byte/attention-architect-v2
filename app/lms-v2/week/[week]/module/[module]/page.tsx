import Link from "next/link";
import { notFound } from "next/navigation";
import { getLmsUserContext } from "@/lib/lms/user-context";
import { getLmsWeekContent } from "@/lib/lms/content";
import { getUserProgress, isWeekUnlocked } from "@/lib/lms/progress";
import { renderMarkdown, fillLmsContent } from "@/lib/lms/render";
import { buildModules } from "@/lib/lms/modules";
import V2ModuleRead from "@/components/lms-v2/V2ModuleRead";
import { LockedWeekCard } from "../../../../LockedWeekCard";
import { V2, HEAD, BODY } from "../../../../v2ui";

export const dynamic = "force-dynamic";

export default async function ModuleReader({ params }: { params: Promise<{ week: string; module: string }> }) {
  const { week: weekStr, module: moduleStr } = await params;
  const week = parseInt(weekStr, 10);
  const moduleNum = parseInt(moduleStr, 10);
  if (!Number.isInteger(week) || week < 1 || week > 6 || !Number.isInteger(moduleNum) || moduleNum < 1 || moduleNum > 4) notFound();

  const ctx = await getLmsUserContext();
  const content = getLmsWeekContent(ctx.archetype, week, ctx.ageBand);
  if (!content) notFound();

  // Week lock: the reading is withheld until the week opens (v2 only).
  const now = new Date();
  const prevProg = week > 1 ? await getUserProgress(ctx.userId, week - 1) : null;
  if (!isWeekUnlocked(week, prevProg, now)) {
    return <LockedWeekCard week={week} prevDay5Time={prevProg?.completionTimes.get(5)} now={now} />;
  }

  const fill = (s: string) => fillLmsContent(s, ctx.childName, ctx.childGender);
  const modules = buildModules(content, ctx.ageBand);
  const m = modules[moduleNum - 1];
  const next = modules[moduleNum]; // undefined when last

  return (
    <div style={{ fontFamily: BODY, color: V2.navy, display: "flex", flexDirection: "column", minHeight: "100dvh", background: V2.cream }}>
      <V2ModuleRead week={week} module={moduleNum} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 22px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href={`/lms-v2/week/${week}`} style={{ fontSize: 14, minHeight: 44, display: "inline-flex", alignItems: "center", color: V2.navy, textDecoration: "none" }}>← Week {week}</Link>
          <span style={{ fontSize: 13, color: V2.dim }}>Module {moduleNum} of 4 · {m.timeRange}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 4, borderRadius: 2, background: i <= moduleNum ? V2.gold : V2.line2 }} />
          ))}
        </div>
      </div>

      <article style={{ padding: "22px 22px 28px", display: "flex", flexDirection: "column", gap: 16, fontSize: 16, lineHeight: 1.6, color: V2.ink, flexGrow: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: V2.darkGold }}>Module {moduleNum}</div>
        <h1 style={{ margin: 0, fontFamily: HEAD, fontSize: 30, lineHeight: 1.15, fontWeight: 600, color: V2.navy }}>{m.title}</h1>

        {/* Module 2 leads with the age-band box, styled per Module.html */}
        {m.ageBox && (
          <section style={{ background: V2.white, border: `1px solid ${V2.line}`, borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: V2.dim, textTransform: "uppercase" }}>{m.ageBox.label}</div>
            <div className="v2-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(fill(m.ageBox.body)) }} />
          </section>
        )}

        <div className="v2-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(fill(m.body)) }} />
      </article>

      <div style={{ marginTop: "auto", padding: "0 22px 26px", display: "flex", flexDirection: "column", gap: 10 }}>
        {next ? (
          <Link prefetch={false} href={`/lms-v2/week/${week}/module/${moduleNum + 1}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 52, borderRadius: 12, background: V2.navy, color: V2.white, fontSize: 16, fontWeight: 600, textDecoration: "none" }}>Next: {next.title} →</Link>
        ) : (
          <Link href={`/lms-v2/week/${week}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 52, borderRadius: 12, background: V2.navy, color: V2.white, fontSize: 16, fontWeight: 600, textDecoration: "none" }}>Back to the week</Link>
        )}
        {next && (
          <Link href={`/lms-v2/week/${week}`} style={{ textAlign: "center", fontSize: 14, color: V2.dim, minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>Back to the week</Link>
        )}
      </div>
    </div>
  );
}
