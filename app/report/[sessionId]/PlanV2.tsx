// Plan page (?report=v2&plan=1) — the ONE scrolling plan page (v3 spec §100–121). Rendered for
// BOTH new and old reports (ReportV2.tsx routes every plan request here, regardless of the
// layout marker). Static sections are server-rendered; the interactive bits (view events, sticky
// mobile bar, forked price cards + Razorpay checkout, FAQ accordions, close CTA) live in the
// PlanV3Interactive client island. Copy is VERBATIM from v3-copy.ts, tokens filled server-side.
import { HEAD, BODY } from "@/app/components/FlowShell";
import SiteFooter from "@/app/components/SiteFooter";

// Palette inlined: PlanV2 is a Server Component and reading FLOW (a "use client" export) yields
// undefined server-side. These are the exact FLOW hex values. HEAD/BODY (plain strings) are fine.
const C = {
  cream: "#FBF6EE", navy: "#1E3A5F", gold: "#E8A33D", goldSoft: "#F2C77E",
  ink: "#2E3A4B", dim: "#5B6577", line: "#E7E0D2", sel: "#FFF8EC", onNavy: "#CFE0F2",
} as const;

import { getLmsWeekContent, getDayCard } from "@/lib/lms/content";
import { fillLmsContent } from "@/lib/lms/render";
import { WEEK_TITLES } from "@/lib/report/skills";
import { weekOutcomesFor } from "@/content/report-v2/plan-outcomes";
import { TESTIMONIAL_POOL } from "@/lib/content/report-content";
import { displayChildName, fillTokens, articleFor, type Gender } from "@/lib/report/pronouns";
import type { AgeBand } from "@/content/types";
import type { ReportV2Content } from "@/lib/report-v2/types";
import { bareArchetype } from "@/lib/report-v2/v3-copy";
import { typeName } from "@/lib/report-v2/cards-copy";
import {
  PLAN_HERO_EYEBROW, PLAN_HERO_SUB, PLAN_HERO_CHIPS, PLAN_HERO_BTN,
  PLAN_WORK_TOWARD_LABEL, PLAN_WORK_TOWARD_NOW_HEAD, PLAN_WORK_TOWARD_AFTER_HEAD, PLAN_WORK_TOWARD_SMALL, NOW_AFTER,
  PLAN_WHY_FITS_LABEL, PLAN_WHY_FITS_BODY, PLAN_WHY_FITS_SMALL, REASON,
  PLAN_HOW_LABEL, HOW_IT_WORKS_STEPS, HOW_IT_WORKS_COACH,
  PLAN_SIX_WEEKS_LABEL, PLAN_SIX_WEEKS_SUB,
  PLAN_DAY1_LABEL, PLAN_DAY1_TITLE, PLAN_DAY1_CLOSING,
  PLAN_TESTIMONIALS_LABEL,
  PLAN_CLOSE_HEADLINE, PLAN_CLOSE_BTN_PLAN, PLAN_CLOSE_BTN_CALL,
} from "@/lib/report-v2/v3-copy";
import { PlanV3View, PlanV3StickyBar, PlanV3Pricing, PlanV3Faq, PlanV3Close } from "./PlanV3Interactive";

// Server-side token filler. Delegates pronoun/agreement tokens to the shared fillTokens (same as
// cards-copy makeFiller), then fills the UPPER-CASE {NAME} slot the v3 plan hero/eyebrow use.
function makeServerFiller(name: string, gender: Gender) {
  const base = fillTokens(name, gender);
  const nm = name.trim() ? displayChildName(name) : "Your child";
  return (tmpl: string) => base(tmpl.replace(/\{NAME\}/g, nm.toUpperCase()));
}

// Render **bold** inline (server-safe).
function rich(text: string, key?: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p, i) => p.startsWith("**") && p.endsWith("**")
    ? <strong key={`${key ?? ""}b${i}`} style={{ fontWeight: 700 }}>{p.slice(2, -2)}</strong>
    : <span key={`${key ?? ""}s${i}`}>{p}</span>);
}

export default function PlanV2({ sessionId, content: c, goalKey, ageBand, childName, gender, calendlyUrl, parentName = "", email = "", phone = "" }: {
  sessionId: string; content: ReportV2Content; goalKey: string; ageBand: string; childName: string | null;
  gender: Gender; goalOptions: { key: string; text: string }[]; calendlyUrl: string; checkinEnabled: boolean;
  parentName?: string; email?: string; phone?: string;
}) {
  const f = makeServerFiller(childName ?? c.childName, gender);
  const nm = (childName ?? c.childName)?.trim() ? displayChildName(childName ?? c.childName) : "Your child";
  const type = typeName(c.archetype);
  const bare = bareArchetype(c.archetype);

  const band = (["8-9", "10-11", "12-14"].includes(ageBand) ? ageBand : "10-11") as AgeBand;
  const week1 = getLmsWeekContent(c.archetype, 1, band);
  const d1 = week1 ? getDayCard(week1, 1) : null;
  const day1Raw = d1?.content[band] ?? "";
  const day1 = day1Raw ? fillLmsContent(day1Raw, childName ?? c.childName, gender).replace(/[*_]/g, "") : null;

  // Week rows follow the CHOSEN goal's concern key.
  const outcomes = weekOutcomesFor(goalKey);
  const weeks = [1, 2, 3, 4, 5, 6] as const;
  const na = NOW_AFTER[c.concern] ?? NOW_AFTER.other;

  const section: React.CSSProperties = { maxWidth: 560, margin: "0 auto", padding: "0 22px" };
  const eyebrow: React.CSSProperties = { fontFamily: BODY, fontSize: 12, fontWeight: 700, letterSpacing: ".12em", color: C.gold, textTransform: "uppercase" };

  return (
    <main style={{ background: C.cream, color: C.ink, fontFamily: BODY, minHeight: "100dvh", paddingBottom: 72 }}>
      <PlanV3View sessionId={sessionId} />
      <PlanV3StickyBar childName={nm} />

      {/* 1 — navy hero (§104) */}
      <header style={{ backgroundColor: "#1E3A5F", background: "#1E3A5F", color: "#fff", padding: "34px 0 30px" }}>
        <div style={section}>
          <div style={{ ...eyebrow, color: C.goldSoft, marginBottom: 12 }}>{f(PLAN_HERO_EYEBROW)}</div>
          <h1 style={{ fontFamily: HEAD, fontSize: 32, lineHeight: 1.18, fontWeight: 500, margin: "0 0 14px", color: "#fff" }}>{c.goal}</h1>
          <p style={{ fontSize: 16, lineHeight: 1.5, color: "#EAF1F8", margin: "0 0 18px" }}>{rich(f(PLAN_HERO_SUB), "sub")}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {[f(PLAN_HERO_CHIPS[0].replace(/\{article\}/g, articleFor(type)).replace(/\{Type\}/g, type).replace(/\{band\}/g, band)), PLAN_HERO_CHIPS[1]].map((p) => (
              <span key={p} style={{ fontSize: 13, fontWeight: 600, color: C.onNavy, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,.35)", borderRadius: 999, padding: "6px 12px" }}>{p}</span>
            ))}
          </div>
          <a id="plan-hero-cta" href="#price" style={{ display: "block", textAlign: "center", minHeight: 50, lineHeight: "50px", borderRadius: 13, background: C.gold, color: "#1a1a1a", fontWeight: 700, fontSize: 16, textDecoration: "none" }}>{f(PLAN_HERO_BTN)}</a>
        </div>
      </header>

      {/* 2 — NOW / AFTER (§105) */}
      <section style={{ ...section, paddingTop: 34, paddingBottom: 10 }}>
        <div style={eyebrow}>{PLAN_WORK_TOWARD_LABEL}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", color: C.dim, textTransform: "uppercase", marginBottom: 10 }}>{PLAN_WORK_TOWARD_NOW_HEAD}</div>
            {na.now.map((l, i) => (
              <p key={i} style={{ fontSize: 15, lineHeight: 1.45, color: C.dim, margin: "0 0 10px" }}>{f(l)}</p>
            ))}
          </div>
          <div style={{ background: C.sel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", color: "#8A5F0F", textTransform: "uppercase", marginBottom: 10 }}>{PLAN_WORK_TOWARD_AFTER_HEAD}</div>
            {na.after.map((l, i) => (
              <p key={i} style={{ fontSize: 15, lineHeight: 1.45, color: C.navy, margin: "0 0 10px", fontWeight: 600 }}>{f(l)}</p>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 13, color: C.dim, lineHeight: 1.5, marginTop: 12 }}>{PLAN_WORK_TOWARD_SMALL}</p>
      </section>

      {/* 3 — WHY THIS PLAN FITS (§106) */}
      <section style={{ ...section, paddingTop: 26, paddingBottom: 10 }}>
        <div style={eyebrow}>{f(PLAN_WHY_FITS_LABEL)}</div>
        <p style={{ fontFamily: HEAD, fontSize: 21, lineHeight: 1.35, color: C.navy, margin: "14px 0 10px" }}>
          {f(PLAN_WHY_FITS_BODY.replace("{REASON}", REASON[bare] ?? "works in a way of {his} own"))}
        </p>
        <p style={{ fontSize: 13.5, color: C.dim, lineHeight: 1.55 }}>{f(PLAN_WHY_FITS_SMALL)}</p>
      </section>

      {/* 4 — HOW IT WORKS (§107) */}
      <section style={{ ...section, paddingTop: 26, paddingBottom: 10 }}>
        <div style={eyebrow}>{PLAN_HOW_LABEL}</div>
        <ol style={{ listStyle: "none", padding: 0, margin: "16px 0 0" }}>
          {HOW_IT_WORKS_STEPS.map((s, i) => (
            <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 13 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: C.navy, color: "#fff", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
              <span style={{ fontSize: 16, lineHeight: 1.45 }}>{rich(f(s), `how${i}`)}</span>
            </li>
          ))}
        </ol>
        <div style={{ background: "#fff", border: `1.5px solid ${C.line}`, borderLeft: `4px solid ${C.gold}`, borderRadius: "0 12px 12px 0", padding: "14px 16px", marginTop: 8, fontSize: 15, lineHeight: 1.5 }}>
          {rich(f(HOW_IT_WORKS_COACH), "coach")}
        </div>
      </section>

      {/* 5 — THE SIX WEEKS (§108) */}
      <section style={{ ...section, paddingTop: 26, paddingBottom: 10 }}>
        <div style={eyebrow}>{PLAN_SIX_WEEKS_LABEL}</div>
        <p style={{ fontSize: 14.5, color: C.dim, lineHeight: 1.5, margin: "10px 0 6px" }}>{f(PLAN_SIX_WEEKS_SUB)}</p>
        <div style={{ marginTop: 10 }}>
          {weeks.map((w) => (
            <div key={w} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 0", borderBottom: `1px solid ${C.line}` }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: C.sel, border: `1.5px solid ${C.gold}`, color: C.navy, fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{w}</div>
              <div>
                <div style={{ fontFamily: HEAD, fontSize: 17, color: C.navy, lineHeight: 1.3 }}>{WEEK_TITLES[w]}</div>
                <div style={{ fontSize: 15, color: C.dim, marginTop: 3, lineHeight: 1.45 }}>{f(outcomes[w - 1])}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6 — TRY DAY 1 FREE (§109) */}
      {day1 && (
        <section style={{ ...section, paddingTop: 26, paddingBottom: 10 }}>
          <div style={eyebrow}>{PLAN_DAY1_LABEL}</div>
          <div style={{ marginTop: 14, background: "#fff", border: `1.5px solid ${C.line}`, borderLeft: `4px solid ${C.gold}`, borderRadius: "0 14px 14px 0", padding: "18px 20px" }}>
            <div style={{ fontFamily: HEAD, fontSize: 18, color: C.navy, marginBottom: 8 }}>{PLAN_DAY1_TITLE}</div>
            <p style={{ fontSize: 16, lineHeight: 1.55, margin: 0 }}>{day1}</p>
          </div>
          <p style={{ fontSize: 13, color: C.dim, marginTop: 10 }}>{PLAN_DAY1_CLOSING}</p>
        </section>
      )}

      {/* 7 — WHAT PARENTS SAY (§110) — all 8 testimonials, verbatim, horizontal swipe */}
      <section style={{ paddingTop: 26, paddingBottom: 10 }}>
        <div style={{ ...section }}>
          <div style={eyebrow}>{PLAN_TESTIMONIALS_LABEL}</div>
        </div>
        <div style={{ display: "flex", gap: 14, overflowX: "auto", padding: "14px 22px 6px", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}>
          {TESTIMONIAL_POOL.map((t, i) => (
            <div key={i} style={{ scrollSnapAlign: "start", flex: "0 0 86%", maxWidth: 420, background: "#fff", border: `1.5px solid ${C.line}`, borderRadius: 14, padding: "18px 18px" }}>
              <p style={{ fontFamily: HEAD, fontSize: 16.5, lineHeight: 1.5, color: C.navy, margin: "0 0 14px" }}>“{t.quote}”</p>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{t.who}</div>
              <div style={{ fontSize: 13, color: C.dim }}>{t.detail}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 8 — Price (§111–115) */}
      <section id="price" style={{ ...section, paddingTop: 30, paddingBottom: 8, scrollMarginTop: 12 }}>
        <PlanV3Pricing sessionId={sessionId} childName={nm} parentName={parentName} email={email} phone={phone} />
      </section>

      {/* 9 — FAQ (§116–120) */}
      <section style={{ ...section, paddingTop: 30, paddingBottom: 10 }}>
        <PlanV3Faq childName={nm} />
      </section>

      {/* 10 — Close (§121) + disclaimer + footer */}
      <section style={{ ...section, paddingTop: 30, paddingBottom: 10 }}>
        <PlanV3Close sessionId={sessionId} calendlyUrl={calendlyUrl} childName={nm}
          headline={f(PLAN_CLOSE_HEADLINE)} btnPlan={PLAN_CLOSE_BTN_PLAN} btnCall={PLAN_CLOSE_BTN_CALL} />
      </section>
      <section style={{ ...section, paddingTop: 20, paddingBottom: 28 }}>
        <p style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.55 }}>{c.disclaimer}</p>
      </section>
      <SiteFooter />
    </main>
  );
}
