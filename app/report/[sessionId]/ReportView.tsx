import fs from "fs";
import path from "path";
import {
  archetypeContent,
  patternContent,
  objectivePhrases,
  getFitContent,
} from "@/content";
import { reliefMessages } from "@/content/report/relief";
import { tonightTips } from "@/content/report/tonight";
import { timelineScenes } from "@/content/report/timeline";
import { fillTokens } from "@/lib/report/tokens";
import { buildPronounTokens, type Gender } from "@/lib/report/pronouns";
import { TODO } from "@/lib/content/todo";
import type { AxisResult } from "@/lib/engine/scorer";
import PriceCards from "./PriceCards";
import ClosingCtaButton from "./ClosingCtaButton";
import ReportViewTracker from "./ReportViewTracker";
import ExitIntentPopup from "./ExitIntentPopup";
import StickyCta from "./StickyCta";

const BG = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";

// Inline-embed founder photo as base64 (accepted tradeoff — avoids CDN dependency)
const founderB64 = (() => {
  try {
    return fs
      .readFileSync(path.join(process.cwd(), "public/founder.jpg"))
      .toString("base64");
  } catch {
    return "";
  }
})();

type AssessmentRow = {
  session_id: string;
  child_name: string | null;
  age_band: string;
  child_gender: string | null;
  archetype: string;
  parent_pattern: string;
  axes: {
    stability: AxisResult;
    resistance: AxisResult;
    recovery: AxisResult;
  };
  weakest_two: string[];
  parent_name: string;
  email: string | null;
  phone: string | null;
  concerns: string[];
  tried: string[] | null;
  better: string[] | null;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function firstSentence(filled: string): string {
  const plain = filled
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1");
  const dot = plain.indexOf(". ");
  return dot === -1 ? plain.trim() : plain.slice(0, dot + 1).trim();
}

function stripMd(s: string): string {
  return s.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
}

function Eyebrow({ text }: { text: string }) {
  return (
    <div style={{ fontSize: "11px", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--marker)", fontWeight: 600, marginBottom: "14px" }}>
      {text}
    </div>
  );
}

function EyebrowLight({ text }: { text: string }) {
  return (
    <div style={{ fontSize: "11px", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--calm)", fontWeight: 600, marginBottom: "14px" }}>
      {text}
    </div>
  );
}

function AxisRow({
  label, axis, description, showBar = true,
}: {
  label: string;
  axis: AxisResult;
  description: string;
  showBar?: boolean;
}) {
  const band = axis.eligible ? axis.band : "Ineligible";
  const pct  = axis.eligible ? Math.round(axis.norm * 100) : 0;
  const badgeBg    = band === "Strong"    ? "rgba(63,190,122,.15)"
                   : band === "Low"       ? "rgba(232,101,79,.15)"
                   : "rgba(255,255,255,.08)";
  const badgeColor = band === "Strong"    ? "#8fe0b6"
                   : band === "Low"       ? "#f0a08f"
                   : "#c9c7d1";

  return (
    <div style={{ padding: "18px 0", borderTop: "1px solid rgba(255,255,255,.09)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontSize: "14.5px", fontWeight: 700, color: "#e5e3ea" }}>{label}</span>
        <span style={{ background: badgeBg, color: badgeColor, fontSize: "10.5px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", textTransform: "uppercase", letterSpacing: ".03em" }}>
          {band}
        </span>
      </div>
      {showBar && axis.eligible && (
        <div style={{ height: "6px", background: "rgba(255,255,255,.1)", borderRadius: "4px", overflow: "hidden", marginBottom: "10px" }}>
          <div style={{ height: "100%", borderRadius: "4px", background: "linear-gradient(90deg,#8B7FD4,#a89bf0)", width: `${pct}%` }} />
        </div>
      )}
      <p style={{ fontSize: "13px", color: "#b8b6c0", lineHeight: 1.5 }}>{description}</p>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ReportView({ assessment: a }: { assessment: AssessmentRow }) {
  const arch    = archetypeContent[a.archetype];
  const pattern = patternContent[a.parent_pattern];

  const childName  = a.child_name || "your child";
  const parentName = a.parent_name;

  const objectiveKey    = a.concerns?.[0] ?? "";
  const hasObjective    = objectiveKey !== "";
  const objectivePhrase = hasObjective
    ? (objectivePhrases[objectiveKey]?.display ?? TODO(`objective/${objectiveKey}`))
    : null;

  const tokens: Record<string, string> = {
    child_name: childName,
    name: parentName,
    ...buildPronounTokens(a.child_gender as Gender),
  };

  function fill(text: string): string {
    return fillTokens(text, tokens);
  }

  const flavorFilled = fill(arch?.s1FlavorPhrase ?? TODO("archetypes/s1FlavorPhrase"));

  const axisStability  = firstSentence(fill(arch?.s5AxisDescriptions?.stability  ?? TODO("archetypes/s5AxisDescriptions.stability")));
  const axisResistance = firstSentence(fill(arch?.s5AxisDescriptions?.resistance ?? TODO("archetypes/s5AxisDescriptions.resistance")));
  const axisRecovery   = firstSentence(fill(arch?.s5AxisDescriptions?.recovery   ?? TODO("archetypes/s5AxisDescriptions.recovery")));

  // §4 WHY THIS HAPPENS — full axis descriptions keyed by name
  const axisFullStability  = stripMd(fill(arch?.s5AxisDescriptions?.stability  ?? TODO("archetypes/s5AxisDescriptions.stability")));
  const axisFullResistance = stripMd(fill(arch?.s5AxisDescriptions?.resistance ?? TODO("archetypes/s5AxisDescriptions.resistance")));
  const axisFullRecovery   = stripMd(fill(arch?.s5AxisDescriptions?.recovery   ?? TODO("archetypes/s5AxisDescriptions.recovery")));
  const axisFullMap: Record<string, string> = { Stability: axisFullStability, Resistance: axisFullResistance, Recovery: axisFullRecovery };
  const whyParagraph = axisFullMap[(a.weakest_two ?? [])[0] ?? "Stability"];
  const whyPullquote = firstSentence(axisFullMap[(a.weakest_two ?? [])[1] ?? "Resistance"]);

  const fitContent = getFitContent(a.archetype, a.parent_pattern);
  const reliefMsg = fill(reliefMessages[a.parent_pattern] ?? TODO(`relief/${a.parent_pattern}`));
  const tip       = tonightTips[a.archetype];
  const scene     = timelineScenes[a.archetype];

  const founderSrc = founderB64
    ? `data:image/jpeg;base64,${founderB64}`
    : "/founder.jpg";

  return (
    <main style={{ background: "var(--ink)", fontFamily: "var(--font-instrument), 'Instrument Sans', sans-serif" }}>
      <ReportViewTracker archetype={a.archetype} />
      <ExitIntentPopup sessionId={a.session_id} />

      {/* ── §1 RECOGNITION ────────────────────────────────────────────── */}
      <section style={{ padding: "44px 0" }}>
        <div className="rep-shell">
          <Eyebrow text="WHAT WE FOUND" />
          <h1 style={{ fontFamily: BG, fontWeight: 800, fontSize: "28px", lineHeight: 1.18, color: "#f2f1ed", marginBottom: "14px" }}>
            {hasObjective ? (
              <>It&rsquo;s not {objectivePhrase}. <span style={{ color: "var(--marker)" }}>It&rsquo;s {flavorFilled}.</span></>
            ) : (
              <span style={{ color: "var(--marker)" }}>It&rsquo;s {flavorFilled}.</span>
            )}
          </h1>
          <p style={{ color: "#c9c7d1", fontSize: "15px", marginBottom: "0" }}>
            {parentName}, you told us {objectivePhrase ?? "attention"} was the thing bothering you most. For {childName}, that&rsquo;s rarely the real story — it&rsquo;s {flavorFilled}.
          </p>
          <div className="combo-row-rep" style={{ marginTop: "18px" }}>
            <div style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.09)", borderRadius: "12px", padding: "14px 16px" }}>
              <div style={{ fontSize: "10.5px", color: "#9c9aa8", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "4px" }}>{childName}&rsquo;s Attention Type</div>
              <div style={{ fontFamily: BG, fontWeight: 800, fontSize: "17px", color: "var(--marker)" }}>{a.archetype}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.09)", borderRadius: "12px", padding: "14px 16px" }}>
              <div style={{ fontSize: "10.5px", color: "#9c9aa8", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "4px" }}>Your Parent Pattern</div>
              <div style={{ fontFamily: BG, fontWeight: 800, fontSize: "17px", color: "var(--marker)" }}>{a.parent_pattern}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── §2 THE FIT ────────────────────────────────────────────────── */}
      <section style={{ padding: "44px 0", borderTop: "1px dashed rgba(255,255,255,.12)" }}>
        <div className="rep-shell">
          <Eyebrow text="THE FIT" />
          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "22px", lineHeight: 1.2, color: "#f2f1ed", marginBottom: "12px" }}>
            {childName}&rsquo;s pattern, and yours
          </h2>

          <div style={{ background: "rgba(240,197,80,.08)", border: "1px solid rgba(240,197,80,.25)", borderRadius: "14px", padding: "18px 20px", marginTop: "16px" }}>
            <div style={{ fontSize: "11px", color: "var(--marker)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "8px" }}>
              {childName} → {a.archetype}
            </div>
            <p style={{ color: "#e5e3ea", fontSize: "14.5px" }}>
              {fill(arch?.beatFitChild ?? TODO("archetypes/beatFitChild"))}
            </p>
          </div>

          <div style={{ background: "rgba(240,197,80,.08)", border: "1px solid rgba(240,197,80,.25)", borderRadius: "14px", padding: "18px 20px", marginTop: "16px" }}>
            <div style={{ fontSize: "11px", color: "var(--marker)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "8px" }}>
              You → {a.parent_pattern}
            </div>
            <p style={{ color: "#e5e3ea", fontSize: "14.5px" }}>
              {fill(pattern?.beatFitParent ?? TODO("patterns/beatFitParent"))}
            </p>
          </div>

          <p style={{ marginTop: "14px", color: "#c9c7d1", fontSize: "15px" }}>
            {fill(fitContent?.fitReveal ?? TODO(`fits/${a.archetype}|${a.parent_pattern}`))}
          </p>
        </div>
      </section>

      {/* ── §3 RELIEF ─────────────────────────────────────────────────── */}
      <section style={{ background: "var(--paper)", padding: "44px 0", borderTop: "1px solid rgba(28,28,36,.1)", borderBottom: "1px solid rgba(28,28,36,.1)" }}>
        <div className="rep-shell">
          <EyebrowLight text="BEFORE ANYTHING ELSE" />
          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "22px", lineHeight: 1.2, color: "var(--ink)", marginBottom: "14px" }}>
            You are not failing. {childName} is not broken.
          </h2>
          <p style={{ fontSize: "15px", color: "var(--ink)", lineHeight: 1.7, fontStyle: "italic", marginBottom: "16px" }}>
            {reliefMsg}
          </p>
          <div style={{ background: "rgba(240,197,80,.18)", border: "1px solid rgba(240,197,80,.5)", borderRadius: "12px", padding: "14px 18px" }}>
            <p style={{ fontSize: "14px", color: "var(--ink)", fontWeight: 600, margin: 0 }}>
              You just haven&rsquo;t had the map yet. This is that map.
            </p>
          </div>
          <p style={{ fontSize: "13.5px", color: "var(--ink-dim)", lineHeight: 1.6, marginTop: "14px" }}>
            Every parent who&rsquo;s tried reward charts, routines, and gentle-parenting advice and still felt stuck — this is usually why.
          </p>
        </div>
      </section>

      {/* ── §4 UNDERSTANDING ──────────────────────────────────────────── */}
      <section style={{ padding: "44px 0", borderBottom: "1px dashed rgba(255,255,255,.12)" }}>
        <div className="rep-shell">
          <Eyebrow text="WHY THIS HAPPENS" />
          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "22px", lineHeight: 1.2, color: "#f2f1ed", marginBottom: "16px" }}>
            The inconsistency isn&rsquo;t random. It&rsquo;s the clue.
          </h2>
          <p style={{ color: "#c9c7d1", fontSize: "15px", lineHeight: 1.65, marginBottom: "20px" }}>
            {whyParagraph}
          </p>
          <div style={{ borderLeft: "3px solid var(--marker)", paddingLeft: "16px" }}>
            <p style={{ color: "#e5e3ea", fontSize: "15px", fontStyle: "italic", lineHeight: 1.6, margin: 0 }}>
              &ldquo;{whyPullquote}&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* ── §5 HOPE / TIMELINE ────────────────────────────────────────── */}
      <section style={{ background: "var(--paper)", padding: "44px 0", borderTop: "1px solid rgba(28,28,36,.1)", borderBottom: "1px solid rgba(28,28,36,.1)" }}>
        <div className="rep-shell">
          <div style={{ fontSize: "11px", letterSpacing: ".14em", textTransform: "uppercase", color: "#b8862e", fontWeight: 600, marginBottom: "14px" }}>
            THE NEXT SIX WEEKS
          </div>
          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "22px", lineHeight: 1.2, color: "var(--ink)", marginBottom: "12px" }}>
            Not a course. A different kind of evening.
          </h2>
          <div style={{ borderTop: "1px solid rgba(28,28,36,.08)", paddingTop: "20px" }}>
            <div style={{ fontSize: "11.5px", color: "#7a7870", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700, marginBottom: "14px" }}>
              How it typically unfolds — {a.archetype}
            </div>
            {[
              { label: "Today",  text: fill(scene?.today ?? TODO(`timeline/${a.archetype}/today`)) },
              { label: "Week 1", text: fill(scene?.wk1   ?? TODO(`timeline/${a.archetype}/wk1`)) },
              { label: "Week 2", text: fill(scene?.wk2   ?? TODO(`timeline/${a.archetype}/wk2`)) },
              { label: "Week 3", text: fill(scene?.wk3   ?? TODO(`timeline/${a.archetype}/wk3`)) },
              { label: "Week 4", text: fill(scene?.wk4   ?? TODO(`timeline/${a.archetype}/wk4`)) },
              { label: "Week 5", text: fill(scene?.wk5   ?? TODO(`timeline/${a.archetype}/wk5`)) },
              { label: "Week 6", text: fill(scene?.wk6   ?? TODO(`timeline/${a.archetype}/wk6`)) },
            ].map(({ label, text }, i, arr) => (
              <div
                key={label}
                style={{ display: "flex", gap: "14px", padding: "12px 0", borderBottom: i < arr.length - 1 ? "1px solid rgba(28,28,36,.07)" : "none", alignItems: "baseline" }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#b8862e", width: "52px", flexShrink: 0, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
                <div style={{ fontSize: "13.5px", color: "#3d3a30", lineHeight: 1.55 }}>{text}</div>
              </div>
            ))}
            <p style={{ marginTop: "14px", fontSize: "11.5px", color: "#7a7870", fontStyle: "italic" }}>
              Not guaranteed, and not the same for every child. This is what&rsquo;s possible — the actual pace depends on {childName}, and on the week.
            </p>
          </div>
        </div>
      </section>

      {/* ── §6 TRY THIS TONIGHT ───────────────────────────────────────── */}
      <section style={{ padding: "44px 0", borderTop: "1px dashed rgba(255,255,255,.12)" }}>
        <div className="rep-shell">
          <Eyebrow text="TRY THIS TONIGHT" />
          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "22px", lineHeight: 1.2, color: "#f2f1ed", marginBottom: "20px" }}>
            One small thing, before you decide anything else.
          </h2>

          {[
            { label: "Instead of",   text: fill(tip?.instead ?? TODO(`tonight/${a.archetype}/instead`)) },
            { label: "Try",          text: fill(tip?.try     ?? TODO(`tonight/${a.archetype}/try`)) },
            { label: "Why it works", text: fill(tip?.why     ?? TODO(`tonight/${a.archetype}/why`)) },
          ].map(({ label, text }) => (
            <div key={label} style={{ display: "flex", gap: "14px", padding: "14px 0", borderTop: "1px solid rgba(255,255,255,.09)" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--marker)", width: "88px", flexShrink: 0, textTransform: "uppercase", letterSpacing: ".04em", paddingTop: "2px" }}>{label}</div>
              <div style={{ fontSize: "14px", color: "#c9c7d1", lineHeight: 1.6 }}>{text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── §7 FOUNDER ────────────────────────────────────────────────── */}
      <section style={{ background: "var(--paper)", padding: "48px 0", borderTop: "1px solid rgba(28,28,36,.1)", borderBottom: "1px solid rgba(28,28,36,.1)" }}>
        <div className="rep-shell">
          <div style={{ display: "flex", gap: "20px", alignItems: "center", marginBottom: "16px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={founderSrc}
              alt="Shashank Agrawal"
              style={{ width: "76px", height: "76px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            />
            <div>
              <div style={{ fontFamily: BG, fontWeight: 800, fontSize: "16px", color: "var(--ink)", lineHeight: 1.3 }}>
                Shashank Agrawal · Founder, Attention Architect™
              </div>
              <div style={{ marginTop: "8px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(240,197,80,.18)", border: "1px solid rgba(240,197,80,.4)", borderRadius: "999px", padding: "3px 10px", fontSize: "11.5px", fontWeight: 600, color: "#9a7c10" }}>
                  🎓 IIM Rohtak Alumnus
                </span>
              </div>
            </div>
          </div>
          <div style={{ fontSize: "13.5px", color: "var(--ink-dim)", lineHeight: 1.55, fontStyle: "italic", marginBottom: "12px" }}>
            &ldquo;I built Attention Architect because I realised parents are often trying harder when what they actually need is a better map.&rdquo;
          </div>
          <p style={{ fontSize: "13.5px", color: "var(--ink-dim)", lineHeight: 1.6, margin: 0 }}>
            This started as an obsession, not a business plan — years spent trying to understand why the same advice works for one child and does nothing for another.
          </p>
        </div>
      </section>

      {/* ── §8 BUILT DIFFERENTLY ──────────────────────────────────────── */}
      <section style={{ background: "var(--ink2)", padding: "48px 0" }}>
        <div className="rep-shell">
          <Eyebrow text="BUILT DIFFERENTLY" />
          <h3 style={{ fontFamily: BG, fontWeight: 800, fontSize: "19px", color: "#f2f1ed", marginBottom: "14px" }}>
            How this was actually built
          </h3>
          <p style={{ color: "#c9c7d1", fontSize: "14px", marginBottom: "14px" }}>
            Attention Architect isn&rsquo;t a chatbot guessing at your child. It&rsquo;s a structured system, built in deliberate stages:
          </p>
          <div style={{ marginTop: "18px" }}>
            {[
              {
                num: "1",
                title: "Design the attention framework",
                desc: "Built from studying how attention and habit actually form in children — before a single question was written.",
              },
              {
                num: "2",
                title: "Map the behavioral dimensions",
                desc: "Identifying the distinct, observable signals that actually differ from child to child.",
              },
              {
                num: "3",
                title: "Build the assessment",
                desc: "Each question isolates one specific signal — tested and refined, not generated on the fly.",
              },
              {
                num: "4",
                title: "Generate the personalized plan",
                desc: "Your answers are matched against that fixed framework — software doing matching, not an AI improvising about your child.",
              },
            ].map(({ num, title, desc }, i) => (
              <div key={num} style={{ display: "flex", gap: "14px", padding: "14px 0", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,.09)" }}>
                <div style={{ fontFamily: BG, fontWeight: 800, color: "var(--marker)", fontSize: "18px", width: "24px", flexShrink: 0 }}>{num}</div>
                <div>
                  <div style={{ fontSize: "13.5px", color: "#e5e3ea", fontWeight: 600, marginBottom: "3px" }}>{title}</div>
                  <div style={{ fontSize: "12.5px", color: "#a8a6b0", lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── §9 PRICING ────────────────────────────────────────────────── */}
      <section className="rep-price" style={{ background: "var(--ink)", padding: "48px 0" }}>
        <div className="rep-shell">
          <Eyebrow text="CHAPTER TWO" />
          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "24px", color: "#f2f1ed", marginBottom: "24px", letterSpacing: "-.01em" }}>
            The report showed you {childName}&rsquo;s pattern. This is where you use it.
          </h2>
          {/* Unlock checklist */}
          <div style={{ marginBottom: "24px" }}>
            {[
              `A personalized 6-week roadmap, sequenced for ${childName} specifically`,
              `One weekly step — never a 20-item plan dropped on you at once`,
              `Environment and routine changes specific to ${tokens.child_pronoun_obj}`,
              `The reasoning behind each step, not just instructions`,
              `Yours to keep and revisit, no expiry`,
            ].map((item) => (
              <div key={item} style={{ display: "flex", gap: "10px", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                <span style={{ color: "var(--marker)", fontWeight: 700, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: "14px", color: "#c9c7d1", lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>

          {/* Value comparison */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "28px", flexWrap: "wrap" }}>
            {[
              { label: "Month of Tuition", price: "₹3–8K", what: "Teaches one subject", highlight: false },
              { label: "Behavior Consult",  price: "₹1,500+", what: "One conversation",   highlight: false },
              { label: "Full Roadmap",      price: "₹999",   what: `Six weeks, ${tokens.child_pronoun_poss}`, highlight: true  },
            ].map(({ label, price, what, highlight }) => (
              <div key={label} style={{ flex: "1 1 130px", background: highlight ? "rgba(240,197,80,.08)" : "rgba(255,255,255,.05)", border: highlight ? "1px solid rgba(240,197,80,.3)" : "1px solid rgba(255,255,255,.09)", borderRadius: "12px", padding: "16px", minWidth: "0" }}>
                <div style={{ fontSize: "11.5px", color: highlight ? "var(--marker)" : "#9c9aa8", fontWeight: highlight ? 700 : 400, marginBottom: "4px" }}>{label}</div>
                <div style={{ fontFamily: BG, fontWeight: 800, fontSize: "18px", color: "#f2f1ed", marginBottom: "4px" }}>{price}</div>
                <div style={{ fontSize: "12px", color: "#a8a6b0" }}>{what}</div>
              </div>
            ))}
          </div>

          <PriceCards
            sessionId={a.session_id}
            childName={childName}
            weakestFirst={(a.weakest_two ?? [])[0] ?? "Stability"}
            parentName={parentName}
            email={a.email ?? ""}
            phone={a.phone ?? ""}
          />
        </div>
      </section>

      {/* ── §10 TESTIMONIALS ──────────────────────────────────────────── */}
      <section style={{ background: "var(--ink2)", padding: "48px 0" }}>
        <div className="rep-shell">
          <h3 style={{ fontFamily: BG, fontWeight: 800, fontSize: "19px", color: "#f2f1ed", marginBottom: "20px" }}>
            What other parents found
          </h3>
          {[
            {
              before: "We believed our son just needed more discipline.",
              after:  "This completely changed our perspective. A few simple changes reduced the daily arguments, and studying no longer feels like a battle.",
              who:    "Sandeel Shukla, Parent of a 14-year-old Son · Raipur",
            },
            {
              before: "We thought our son was just being lazy or spending too much time on screens.",
              after:  "This helped us understand what was really happening. Homework became much calmer, and so did our evenings.",
              who:    "Manya Gangele, Parent of an 11-year-old Son · Indore",
            },
            {
              before: "I was constantly reminding my daughter to stay on task.",
              after:  "Small changes in how we approached things at home made a huge difference. She’s much more independent now.",
              who:    "Suchitra Mehta, Parent of an 8-year-old Daughter · Mumbai",
            },
          ].map(({ before, after, who }) => (
            <div key={who} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", borderRadius: "14px", padding: "20px", marginBottom: "14px" }}>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "10.5px", color: "#6a6874", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "5px" }}>Before</div>
                <p style={{ color: "#a8a6b0", fontSize: "13.5px", fontStyle: "italic", marginBottom: 0 }}>&ldquo;{before}&rdquo;</p>
              </div>
              <div style={{ borderTop: "1px solid rgba(255,255,255,.09)", paddingTop: "12px", marginBottom: "10px" }}>
                <div style={{ fontSize: "10.5px", color: "var(--marker)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "5px" }}>After</div>
                <p style={{ color: "#e5e3ea", fontSize: "14px", fontStyle: "italic", marginBottom: 0 }}>&ldquo;{after}&rdquo;</p>
              </div>
              <div style={{ color: "#9c9aa8", fontSize: "12.5px", fontWeight: 600 }}>— {who}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── §11 FAQ ───────────────────────────────────────────────────── */}
      <section style={{ background: "var(--ink)", padding: "48px 0" }}>
        <div className="rep-shell">
          <h3 style={{ fontFamily: BG, fontWeight: 800, fontSize: "19px", color: "#f2f1ed", marginBottom: "18px" }}>
            Questions
          </h3>
          {[
            {
              q: "Is this just AI guessing at my child?",
              a: "No. The framework and every question were designed deliberately, ahead of time. What you get back is your specific answers matched against that fixed system — nothing is improvised about your child.",
            },
            {
              q: "Is this a diagnosis?",
              a: `No. Not a diagnosis, not a verdict — a map. Nothing here labels ${childName}; it shows how ${tokens.child_pronoun_poss} attention actually works and what to do about it.`,
            },
            {
              q: `What if ${childName} doesn't cooperate?`,
              a: `The first moves are yours to make — the environment and routine changes in Week 1 don't need ${tokens.child_pronoun_poss} buy-in to start. Participation tends to grow as the friction shrinks, not the other way around.`,
            },
            {
              q: "How much time does this take each week?",
              a: "One practical step, not a curriculum. Most weeks take 15–20 minutes to read and a few minutes a day to actually do.",
            },
            {
              q: "What age range is this designed for?",
              a: "The program adjusts its language and specific suggestions across three age bands, roughly 8–14, so what you read is calibrated to your child's actual age.",
            },
            {
              q: "Can I do this if my child has an existing diagnosis (like ADHD)?",
              a: "Yes — this works alongside any existing support or diagnosis your child has, and doesn't replace medical or clinical guidance.",
            },
            {
              q: "What happens after the 6 weeks?",
              a: "You'll have a real, practical understanding of what actually moves your child's attention — that doesn't expire.",
            },
            {
              q: "Is my payment and data secure?",
              a: "Payments are processed by Razorpay. Your data is never sold or shared with third parties.",
            },
            {
              q: "What if my child is already seeing a therapist?",
              a: "This works alongside any existing support your child has — it's a practical, at-home layer, not a substitute for professional care.",
            },
            {
              q: "Can grandparents follow this too?",
              a: "Yes — anyone involved in your child's daily routine can read and follow the weekly steps.",
            },
            {
              q: "What if we miss a week?",
              a: "No pressure — pick back up whenever you're ready. The roadmap waits for you, not the other way around.",
            },
            {
              q: "How personalized is it, really?",
              a: `Every section is generated from your child's actual assessment answers — their archetype, their patterns, their specific dimensions. It isn't reusable for another child.`,
            },
          ].map(({ q, a }) => (
            <details key={q} style={{ borderBottom: "1px solid rgba(255,255,255,.09)" }}>
              <summary style={{ listStyle: "none", cursor: "pointer", padding: "16px 0", color: "#f2f1ed", fontSize: "14.5px", fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <span>{q}</span>
                <span style={{ fontSize: "20px", fontWeight: 400, color: "var(--marker)", flexShrink: 0 }}>+</span>
              </summary>
              <div style={{ color: "#a8a6b0", fontSize: "13.5px", padding: "0 0 18px", lineHeight: 1.6 }}>{a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* ── §12 FINAL CTA ─────────────────────────────────────────────── */}
      <section style={{ background: "var(--ink)", padding: "48px 0" }}>
        <div className="rep-shell">
          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "24px", color: "#f2f1ed", marginBottom: "10px", letterSpacing: "-.01em" }}>
            Nobody has explained {childName} like this before.
          </h2>
          <p style={{ color: "#c9c7d1", fontSize: "15px", marginBottom: "28px" }}>
            The report was Chapter One. This is where the story keeps going.
          </p>
          <ClosingCtaButton
            sessionId={a.session_id}
            childName={childName}
            parentName={parentName}
            email={a.email ?? ""}
            phone={a.phone ?? ""}
          />
          <p style={{ fontSize: "13px", color: "#6a6874", textAlign: "center", marginTop: "20px", fontStyle: "italic" }}>
            Whatever you decide — you already understand {childName} a little better than you did when you started.
          </p>
        </div>
      </section>

      {/* Honest-path block — gated */}
      {process.env.HONEST_PATH_DISPLAY_ENABLED === "true" && (
        <section style={{ background: "var(--ink)", padding: "0 0 32px" }}>
          <div className="rep-shell">
            <div style={{ padding: "16px 20px", borderRadius: "10px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", fontSize: "13.5px", color: "rgba(246,244,236,.55)", lineHeight: 1.6 }}>
              A quick promise: if anything here warranted a professional&rsquo;s eyes, we&rsquo;d say so plainly. — Nothing did.
            </div>
          </div>
        </section>
      )}

      {/* ── §13 STICKY MOBILE CTA ─────────────────────────────────────── */}
      <StickyCta
        sessionId={a.session_id}
        childName={childName}
        parentName={parentName}
        email={a.email ?? ""}
        phone={a.phone ?? ""}
      />
    </main>
  );
}
