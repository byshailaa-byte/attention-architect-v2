// Plan v2 (?report=v2&plan=1) — scrolling plan page. Static content is server-rendered;
// the pricing CTAs, free-call links and view events live in the client island below.
// Default report stays v1. No invented testimonials (none rendered — no real source yet).
import { FLOW, HEAD, BODY } from "@/app/components/FlowShell";
import SiteFooter from "@/app/components/SiteFooter";
import { getLmsWeekContent, getDayCard } from "@/lib/lms/content";
import { fillLmsContent } from "@/lib/lms/render";
import { WEEK_TITLES } from "@/lib/report/skills";
import { weekOutcomesFor } from "@/content/report-v2/plan-outcomes";
import type { AgeBand } from "@/content/types";
import type { Gender } from "@/lib/report/pronouns";
import type { ReportV2Content } from "@/lib/report-v2/types";
import { PlanView, PlanPricing, PlanCallCard } from "./PlanInteractive";

export default function PlanV2({ sessionId, content: c, ageBand, childName, gender, calendlyUrl }: {
  sessionId: string; content: ReportV2Content; ageBand: string; childName: string | null;
  gender: Gender; goalOptions: { key: string; text: string }[]; calendlyUrl: string; checkinEnabled: boolean;
}) {
  const band = (["8-9", "10-11", "12-14"].includes(ageBand) ? ageBand : "10-11") as AgeBand;
  const week1 = getLmsWeekContent(c.archetype, 1, band);
  const d1 = week1 ? getDayCard(week1, 1) : null;
  const day1Raw = d1?.content[band] ?? "";
  const day1 = day1Raw ? fillLmsContent(day1Raw, childName ?? c.childName, gender).replace(/[*_]/g, "") : null;
  const outcomes = weekOutcomesFor(c.concern);
  const weeks = [1, 2, 3, 4, 5, 6] as const;

  const section: React.CSSProperties = { maxWidth: 560, margin: "0 auto", padding: "0 22px" };
  const eyebrow: React.CSSProperties = { fontFamily: BODY, fontSize: 12, fontWeight: 700, letterSpacing: ".12em", color: FLOW.gold, textTransform: "uppercase" };

  return (
    <main style={{ background: FLOW.cream, color: FLOW.ink, fontFamily: BODY, minHeight: "100dvh" }}>
      <PlanView sessionId={sessionId} />

      {/* 1 — navy header */}
      <header style={{ background: FLOW.navy, color: "#fff", padding: "34px 0 30px" }}>
        <div style={section}>
          <div style={{ ...eyebrow, color: FLOW.goldSoft, marginBottom: 12 }}>{(childName ?? c.childName)}’s six-week plan</div>
          <h1 style={{ fontFamily: HEAD, fontSize: 32, lineHeight: 1.18, fontWeight: 500, margin: "0 0 18px" }}>{c.goal}</h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["5 min a day", "10 min reading a week", `Written for ${c.archetype}`].map((p) => (
              <span key={p} style={{ fontSize: 13, fontWeight: 600, color: FLOW.onNavy, border: "1px solid rgba(255,255,255,.25)", borderRadius: 999, padding: "6px 12px" }}>{p}</span>
            ))}
          </div>
        </div>
      </header>

      {/* 2 — what changes, week by week */}
      <section style={{ ...section, paddingTop: 34, paddingBottom: 10 }}>
        <div style={eyebrow}>What changes, week by week</div>
        <div style={{ marginTop: 16 }}>
          {weeks.map((w) => (
            <div key={w} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 0", borderBottom: `1px solid ${FLOW.line}` }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: FLOW.sel, border: `1.5px solid ${FLOW.gold}`, color: FLOW.navy, fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{w}</div>
              <div>
                <div style={{ fontFamily: HEAD, fontSize: 17, color: FLOW.navy, lineHeight: 1.3 }}>{WEEK_TITLES[w]}</div>
                <div style={{ fontSize: 15, color: FLOW.dim, marginTop: 3, lineHeight: 1.45 }}>{outcomes[w - 1]}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3 — Week 1 · Day 1 preview */}
      {day1 && (
        <section style={{ ...section, paddingTop: 26, paddingBottom: 10 }}>
          <div style={eyebrow}>Week 1 · Day 1 preview</div>
          <div style={{ marginTop: 14, background: "#fff", border: `1.5px solid ${FLOW.line}`, borderLeft: `4px solid ${FLOW.gold}`, borderRadius: "0 14px 14px 0", padding: "18px 20px" }}>
            {d1?.title && <div style={{ fontFamily: HEAD, fontSize: 18, color: FLOW.navy, marginBottom: 8 }}>{fillLmsContent(d1.title, childName ?? c.childName, gender).replace(/[*_]/g, "")}</div>}
            <p style={{ fontSize: 16, lineHeight: 1.55, margin: 0 }}>{day1}</p>
          </div>
          <p style={{ fontSize: 13, color: FLOW.dim, marginTop: 10 }}>This is Day 1. The full six weeks unlock with the plan.</p>
        </section>
      )}

      {/* 4 — pricing */}
      <section style={{ ...section, paddingTop: 30, paddingBottom: 8 }}>
        <div style={{ ...eyebrow, marginBottom: 16 }}>Get the plan</div>
        <PlanPricing sessionId={sessionId} calendlyUrl={calendlyUrl} childName={childName ?? c.childName} />
      </section>

      {/* 6 — not sure yet */}
      <section style={{ ...section, paddingTop: 22, paddingBottom: 10 }}>
        <PlanCallCard sessionId={sessionId} calendlyUrl={calendlyUrl} />
      </section>

      {/* 7 — disclaimer + footer */}
      <section style={{ ...section, paddingTop: 20, paddingBottom: 28 }}>
        <p style={{ fontSize: 12.5, color: FLOW.dim, lineHeight: 1.55 }}>{c.disclaimer}</p>
      </section>
      <SiteFooter />
    </main>
  );
}
