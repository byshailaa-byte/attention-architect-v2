// Plan page (?report=v2&plan=1) — the rebuilt one-page plan (report-fixes-v4 · C). Top to bottom:
//   ← Back to the report · navy hero (kicker + worry headline + subline) · "What changes for you"
//   (2×2 tiles) · "The six weeks" (compact numbered list) · "Pick your plan" (comparison table +
//   two buttons + guarantee) · FAQ · one bottom call line. Testimonials are hidden (item 4B).
//   Removed vs the old plan: NOW/AFTER, "Why this plan fits", the "How it works" block,
//   "Every family follows the same six weeks", and "Try Day 1 free / Just watch".
// Static sections are server-rendered; interactive bits live in the PlanV3Interactive island.
import { HEAD, BODY } from "@/app/components/FlowShell";
import SiteFooter from "@/app/components/SiteFooter";

// Palette inlined: PlanV2 is a Server Component and reading FLOW (a "use client" export) yields
// undefined server-side. These are the exact FLOW hex values.
const C = {
  cream: "#FBF6EE", navy: "#1E3A5F", gold: "#E8A33D", goldSoft: "#F2C77E",
  ink: "#2E3A4B", dim: "#5B6577", line: "#E7E0D2", sel: "#FFF8EC", onNavy: "#CFE0F2",
} as const;

import { WEEK_TITLES } from "@/lib/report/skills";
import { weekOutcomesFor } from "@/content/report-v2/plan-outcomes";
import { displayChildName, fillTokens, type Gender } from "@/lib/report/pronouns";
import type { AgeBand } from "@/content/types";
import type { ReportV2Content } from "@/lib/report-v2/types";
import {
  PLAN_BACK, PLAN_HERO_KICKER, PLAN_HEADLINE, PLAN_HERO_SUBLINE,
  PLAN_CHANGES_LABEL, CHANGES_TILE1, CHANGES_FIXED, PLAN_SIX_WEEKS_LABEL_C,
} from "@/lib/report-v2/v3-copy";
import { PlanV3View, PlanV3StickyBar, PlanV3Pricing, PlanV3Faq, PlanV3BottomCall } from "./PlanV3Interactive";

// Server-side token filler. Delegates pronoun/agreement tokens to the shared fillTokens, then
// fills the UPPER-CASE {NAME} slot the hero kicker uses.
function makeServerFiller(name: string, gender: Gender) {
  const base = fillTokens(name, gender);
  const nm = name.trim() ? displayChildName(name) : "Your child";
  return (tmpl: string) => base(tmpl.replace(/\{NAME\}/g, nm.toUpperCase()));
}

export default function PlanV2({ sessionId, content: c, goalKey, ageBand, childName, gender, calendlyUrl, parentName = "", email = "", phone = "" }: {
  sessionId: string; content: ReportV2Content; goalKey: string; ageBand: string; childName: string | null;
  gender: Gender; goalOptions: { key: string; text: string }[]; calendlyUrl: string; checkinEnabled: boolean;
  parentName?: string; email?: string; phone?: string;
}) {
  const f = makeServerFiller(childName ?? c.childName, gender);
  const nm = (childName ?? c.childName)?.trim() ? displayChildName(childName ?? c.childName) : "Your child";
  const band = (["8-9", "10-11", "12-14"].includes(ageBand) ? ageBand : "10-11") as AgeBand;

  const headline = f((PLAN_HEADLINE[c.concern] ?? PLAN_HEADLINE.other));
  const tile1 = CHANGES_TILE1[c.concern] ?? CHANGES_TILE1.other;
  const tiles = [tile1, ...CHANGES_FIXED];

  // The six weeks follow the chosen goal's concern key.
  const outcomes = weekOutcomesFor(goalKey);
  const weeks = [1, 2, 3, 4, 5, 6] as const;

  const section: React.CSSProperties = { maxWidth: 560, margin: "0 auto", padding: "0 22px" };
  const eyebrow: React.CSSProperties = { fontFamily: BODY, fontSize: 12, fontWeight: 700, letterSpacing: ".12em", color: C.gold, textTransform: "uppercase" };

  return (
    <main style={{ background: C.cream, color: C.ink, fontFamily: BODY, minHeight: "100dvh", paddingBottom: 72 }}>
      <PlanV3View sessionId={sessionId} />
      <PlanV3StickyBar childName={nm} />

      {/* ← Back to the report */}
      <div style={{ ...section, paddingTop: 8 }}>
        <a href="?report=v2&c=5" style={{ display: "inline-flex", alignItems: "center", minHeight: 44, padding: "11px 0", fontSize: 14, fontWeight: 700, color: C.dim, textDecoration: "none" }}>{PLAN_BACK}</a>
      </div>

      {/* navy hero: kicker + worry headline + subline */}
      <header style={{ backgroundColor: "#1E3A5F", background: "#1E3A5F", color: "#fff", padding: "22px 0 28px", margin: "14px 0 0" }}>
        <div style={section}>
          <div style={{ ...eyebrow, color: C.goldSoft, marginBottom: 12 }}>{f(PLAN_HERO_KICKER).replace(/\{band\}/g, band)}</div>
          <h1 style={{ fontFamily: HEAD, fontSize: 30, lineHeight: 1.22, fontWeight: 500, margin: "0 0 14px", color: "#fff" }}>{headline}</h1>
          <p style={{ fontSize: 16, lineHeight: 1.5, color: "#EAF1F8", margin: 0 }}>{f(PLAN_HERO_SUBLINE)}</p>
          {/* sentinel for the sticky bar (shows once the hero scrolls out of view) */}
          <div id="plan-hero-cta" style={{ height: 1 }} />
        </div>
      </header>

      {/* What changes for you — 2×2 tiles */}
      <section style={{ ...section, paddingTop: 30, paddingBottom: 6 }}>
        <div style={eyebrow}>{PLAN_CHANGES_LABEL}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
          {tiles.map((t, i) => (
            <div key={i} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: "14px 15px" }}>
              <div style={{ fontFamily: HEAD, fontSize: 16, lineHeight: 1.25, color: C.navy, marginBottom: 6 }}>{f(t.title)}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.4, color: C.dim }}>{f(t.line)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* The six weeks — compact numbered list */}
      <section style={{ ...section, paddingTop: 28, paddingBottom: 6 }}>
        <div style={eyebrow}>{PLAN_SIX_WEEKS_LABEL_C}</div>
        <ol style={{ listStyle: "none", padding: 0, margin: "14px 0 0" }}>
          {weeks.map((w) => (
            <li key={w} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: w < 6 ? `1px solid ${C.line}` : "none" }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, background: C.sel, border: `1.5px solid ${C.gold}`, color: C.navy, fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{w}</span>
              <div>
                <span style={{ fontFamily: HEAD, fontSize: 15.5, color: C.navy }}>{WEEK_TITLES[w]}</span>
                <span style={{ fontSize: 14.5, color: C.dim }}> — {f(outcomes[w - 1])}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Pick your plan — comparison table + buttons + guarantee */}
      <section id="price" style={{ ...section, paddingTop: 30, paddingBottom: 8, scrollMarginTop: 12 }}>
        <PlanV3Pricing sessionId={sessionId} childName={nm} parentName={parentName} email={email} phone={phone} />
      </section>

      {/* FAQ */}
      <section style={{ ...section, paddingTop: 30, paddingBottom: 10 }}>
        <PlanV3Faq childName={nm} />
      </section>

      {/* one bottom line */}
      <section style={{ ...section, paddingTop: 24, paddingBottom: 10 }}>
        <PlanV3BottomCall sessionId={sessionId} calendlyUrl={calendlyUrl} />
      </section>

      <section style={{ ...section, paddingTop: 18, paddingBottom: 28 }}>
        <p style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.55 }}>{c.disclaimer}</p>
      </section>
      <SiteFooter />
    </main>
  );
}
