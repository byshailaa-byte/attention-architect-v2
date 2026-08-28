// NarrativeReportView — renders a generated narrative report from stored AttentionMoments.
// TestimonialsCarousel is a "use client" component imported here (server components can import client components).
//
// Design tokens frozen per §12 of the Report Engine Architecture:
//   Paper:       #EDE6D6  Paper-deep: #E3D9C3  Surface: #FBF9F3
//   Ink:         #201E19  Ink-soft:   #5B5648  Ink-faint: #8B8570
//   Accent:      #34503F  Gold:       #A9772A  Uncertainty: #5C7285
//   Display:     Fraunces (loaded inline via Google Fonts preconnect)
//   Body/UI:     Public Sans (loaded inline)
//
// confidence_vector is NEVER received or rendered here — this component sees
// only parent-facing content (moments, archetype, parent_instinct).
// honest_flag and honest_trigger are NEVER passed or rendered — Gate 3.

import fs from "fs";
import path from "path";
import type { AttentionMoment } from "@/lib/narrative/types";
import type { FamilyAttentionLoop } from "@/lib/graph/loop";
import { TestimonialsCarousel } from "./TestimonialsCarousel";
import PriceCards from "./PriceCards";
import StickyCta from "./StickyCta";

// ── Frozen tokens ─────────────────────────────────────────────────────────────
const T = {
  paper:       "#EDE6D6",
  paperDeep:   "#E3D9C3",
  surface:     "#FBF9F3",
  ink:         "#201E19",
  inkSoft:     "#5B5648",
  inkFaint:    "#8B8570",
  accent:      "#34503F",
  gold:        "#A9772A",
  uncertainty: "#5C7285",
} as const;

const FRAUNCES = "'Fraunces', Georgia, serif";
const PUBLIC_SANS = "'Public Sans', system-ui, sans-serif";

// ── Font loading ──────────────────────────────────────────────────────────────
function FontLoader() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Public+Sans:ital,wght@0,300..900;1,300..900&display=swap"
        rel="stylesheet"
      />
    </>
  );
}

// ── Inline-embed founder photos as base64 ─────────────────────────────────────
const founderB64 = (() => {
  try {
    return fs
      .readFileSync(path.join(process.cwd(), "public/founder.jpg"))
      .toString("base64");
  } catch {
    return "";
  }
})();

const shailyB64 = (() => {
  try {
    return fs
      .readFileSync(path.join(process.cwd(), "public/shaily-headshot-square.png"))
      .toString("base64");
  } catch {
    return "";
  }
})();

// ── Per-archetype static signal-row cards ─────────────────────────────────────
// key receives the child's first name so possessives work correctly.
// value is either a static string or a function of pronouns (for gender-sensitive phrasing).
type SignalValue = string | ((p: { subj: string; poss: string; obj: string }) => string);
const ARCHETYPE_SIGNALS: Record<string, Array<{ key: (name: string) => string; value: SignalValue }>> = {
  "The Explorer": [
    { key: (n) => `What lights ${n} up`,       value: "Figuring out something really hard" },
    { key: (n) => `What ends ${n}'s interest`, value: "The moment it stops being challenging" },
    { key: (n) => `What ${n} wants right after`, value: "Moving on to the next interesting thing" },
  ],
  "The Storm": [
    { key: (n) => `What lights ${n} up`,   value: "Full control over what and how" },
    { key: (n) => `What matters to ${n}`,  value: (p) => `That ${p.subj} did it ${p.poss} own way` },
    { key: (n) => `What restores ${n}`,    value: (p) => `Time and choices, entirely ${p.poss} own` },
  ],
  "The Live Wire": [
    { key: (n) => `What lights ${n} up`,            value: "Being noticed, included, or appreciated" },
    { key: (n) => `What ends ${n}'s interest`,      value: "When the social part disappears" },
    { key: (n) => `What brings ${n} back fastest`,  value: "Connection with people" },
  ],
  "The All-In Kid": [
    { key: (n) => `What lights ${n} up`,    value: "Going deep on something that genuinely matters" },
    { key: (n) => `What pulls ${n} away`,   value: "Being asked to spread attention elsewhere" },
    { key: (n) => `What ${n} needs after`,  value: "Uninterrupted time to process alone" },
  ],
  "The Inventor": [
    { key: (n) => `What lights ${n} up`,       value: (p) => `Building something entirely on ${p.poss} own terms` },
    { key: (n) => `What ends ${n}'s interest`, value: "When it becomes someone else's idea" },
    { key: (n) => `What restores ${n}`,        value: (p) => `Complete control over ${p.poss} time and choices` },
  ],
  "The Magnet": [
    { key: (n) => `What lights ${n} up`,   value: "Being at the centre of something shared" },
    { key: (n) => `What pulls ${n} away`,  value: (p) => `When the group moves on without ${p.obj}` },
    { key: (n) => `What brings ${n} back`, value: (p) => `Being with people who get ${p.obj}` },
  ],
  "The Glue": [
    { key: (n) => `What lights ${n} up`,   value: "Making sure everyone's okay" },
    { key: (n) => `What ${n} finds hard`,  value: "When the group is fractured or tense" },
    { key: (n) => `What restores ${n}`,    value: "Time with people who know them well" },
  ],
  "The Captain": [
    { key: (n) => `What lights ${n} up`,        value: "Figuring out something really hard" },
    { key: (n) => `What ${n} cares most about`, value: "Knowing they got better at something" },
    { key: (n) => `What restores ${n}`,         value: "Quiet time after getting something done" },
  ],
  "The Steady Hand": [
    { key: (n) => `What lights ${n} up`,  value: "Making steady progress on something they know" },
    { key: (n) => `What disrupts ${n}`,   value: "Sudden changes or unclear expectations" },
    { key: (n) => `What restores ${n}`,   value: "Reliable routines and predictable outcomes" },
  ],
};

const ARCHETYPE_DESCRIPTORS: Record<string, string> = {
  "The Explorer":     "a mind built around difficulty renewing itself",
  "The Storm":        "needing it to be their choice, specifically",
  "The Live Wire":    "attention that runs on connection, not on tasks",
  "The All-In Kid":   "attention that goes narrow and deep, not wide",
  "The Inventor":     "ownership over process, not just outcome",
  "The Magnet":       "connection is the fuel, not the reward",
  "The Glue":         "holding the group together is its own reward",
  "The Captain":      "leading is how they feel most themselves",
  "The Steady Hand":  "consistency and predictability over novelty",
};

// ── Loop SVG mechanism labels ─────────────────────────────────────────────────
const LOOP_LABELS: Record<string, { childBehavior: string; parentBehavior: string; topPath: string; bottomPath: string; goldText: string }> = {
  intervenes_too_early: {
    childBehavior:  "tries to work it out",
    parentBehavior: "steps in to help",
    topPath:        "at the moment of struggle",
    bottomPath:     "the attempt never gets to finish",
    goldText:       "and the coping cycle keeps resetting",
  },
  stays_too_long: {
    childBehavior:  "signals they are done",
    parentBehavior: "pushes a little further",
    topPath:        "misread as giving up",
    bottomPath:     "effort continues past the finish",
    goldText:       "and the internal signal gets buried",
  },
  misaligned_response: {
    childBehavior:  "holds it on their own terms",
    parentBehavior: "offers to work it through together",
    topPath:        "a caring and genuine instinct",
    bottomPath:     "a joint process is still something shared",
    goldText:       "and ownership stays contested",
  },
};

// ── Bold text renderer ────────────────────────────────────────────────────────
function renderWithBold(text: string): React.ReactNode[] {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} style={{ fontWeight: 600, color: T.ink }}>{part}</strong>
      : part
  );
}

// ── Shared layout primitives ──────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", padding: "0 20px" }}>
      {children}
    </div>
  );
}

function SectionMarker({ n, label }: { n: number; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
      <span style={{ fontFamily: PUBLIC_SANS, fontSize: "11px", fontWeight: 600, color: T.inkFaint, letterSpacing: ".12em", textTransform: "uppercase" }}>
        {String(n).padStart(2, "0")}
      </span>
      <span style={{ fontFamily: PUBLIC_SANS, fontSize: "11px", fontWeight: 600, color: T.inkFaint, letterSpacing: ".12em", textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
  );
}

function Divider() {
  return <div style={{ height: "1px", background: T.paperDeep, margin: "0" }} />;
}

// ── Moment content renderer ───────────────────────────────────────────────────

function MomentContent({ content, color = T.inkSoft }: { content: string; color?: string }) {
  const paragraphs = content.split(/\n{2,}/).filter(Boolean);
  return (
    <div style={{ fontFamily: PUBLIC_SANS, fontSize: "16px", color, lineHeight: 1.75 }}>
      {paragraphs.map((p, i) => (
        <p key={i} style={{ margin: i < paragraphs.length - 1 ? "0 0 18px" : "0" }}>
          {renderWithBold(p.replace(/\n/g, " "))}
        </p>
      ))}
    </div>
  );
}

// ── Section components ────────────────────────────────────────────────────────

function CoverSection({
  childName,
  parentName,
  heroLine,
}: {
  childName: string;
  parentName: string;
  heroLine?: string;
}) {
  return (
    <section style={{ background: T.surface, padding: "60px 0 52px" }}>
      <Shell>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-horizontal-with-tagline.png" alt="Attention Architect" style={{ width: "min(500px, 100%)", height: "auto", marginBottom: "28px" }} />
        <div style={{
          fontFamily: PUBLIC_SANS,
          fontSize: "13px",
          fontWeight: 600,
          color: T.inkFaint,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          marginBottom: "26px",
        }}>
          For {parentName}
        </div>
        <h1 style={{
          fontFamily: FRAUNCES,
          fontWeight: 500,
          fontSize: "clamp(32px, 5.4vw, 52px)",
          lineHeight: 1.14,
          color: T.ink,
          margin: "0 0 22px",
          letterSpacing: "-0.01em",
        }}>
          {heroLine ?? `We think we understand what’s actually happening between you and ${childName}.`}
        </h1>
        <p style={{
          fontFamily: PUBLIC_SANS,
          fontSize: "16px",
          color: T.inkSoft,
          lineHeight: 1.7,
          margin: "0 0 44px",
          maxWidth: "46ch",
        }}>
          Not a personality quiz. Not a diagnosis. A closer look at what&rsquo;s actually happening — built entirely from what you told us, not a category we sorted {childName} into — what we call their attention health.
        </p>
        <div style={{ display: "flex", gap: "28px", flexWrap: "wrap", fontFamily: PUBLIC_SANS, fontSize: "12.5px", color: T.inkFaint }}>
          <div>
            <div style={{ fontFamily: FRAUNCES, fontSize: "17px", fontWeight: 500, color: T.ink, marginBottom: "2px" }}>
              {childName}
            </div>
            What their answers show
          </div>
          <div>
            <div style={{ fontFamily: FRAUNCES, fontSize: "17px", fontWeight: 500, color: T.ink, marginBottom: "2px" }}>
              You
            </div>
            What your instincts show, too
          </div>
        </div>
      </Shell>
    </section>
  );
}

function RecognitionSection({ moment }: { moment: AttentionMoment | undefined }) {
  if (!moment) return null;

  const paragraphs = moment.content.split(/\n{2,}/).filter(Boolean);
  const lastPara = paragraphs[paragraphs.length - 1] ?? "";
  const isAnchorLine = paragraphs.length > 1 && lastPara.length < 250;
  const bodyParas = isAnchorLine ? paragraphs.slice(0, -1) : paragraphs;

  const h2Text = moment.title ?? "What we noticed";

  return (
    <section style={{ background: T.surface, padding: "52px 0" }}>
      <Divider />
      <Shell>
        <div style={{ paddingTop: "52px" }}>
          <SectionMarker n={1} label="Recognition" />
          <h2 style={{
            fontFamily: FRAUNCES,
            fontWeight: 500,
            fontSize: "clamp(24px, 3.4vw, 32px)",
            lineHeight: 1.28,
            color: T.ink,
            margin: "0 0 24px",
            maxWidth: "22ch",
          }}>
            {h2Text}
          </h2>
          <div style={{ fontFamily: PUBLIC_SANS, fontSize: "16px", color: T.ink, lineHeight: 1.75 }}>
            {bodyParas.map((p, i) => (
              <p key={i} style={{ margin: i < bodyParas.length - 1 ? "0 0 18px" : "0" }}>
                {renderWithBold(p.replace(/\n/g, " "))}
              </p>
            ))}
          </div>
          {isAnchorLine && (
            <div style={{
              marginTop: "32px",
              padding: "16px 20px",
              background: T.surface,
              borderRadius: "10px",
              borderLeft: `3px solid ${T.gold}`,
              fontSize: "14px",
              color: T.inkSoft,
              fontFamily: PUBLIC_SANS,
              lineHeight: 1.65,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              {renderWithBold(lastPara.replace(/\n/g, " "))}
            </div>
          )}
        </div>
      </Shell>
    </section>
  );
}

function BehaviourPatternSection({
  moment,
  archetype,
  archetypeFitTier,
  childName,
  pronouns,
}: {
  moment: AttentionMoment | undefined;
  archetype: string;
  archetypeFitTier: string;
  childName: string;
  pronouns: { subj: string; poss: string; obj: string };
}) {
  if (!moment) return null;

  const h2Text = moment.title ?? "What the pattern actually is";
  const descriptor = ARCHETYPE_DESCRIPTORS[archetype] ?? "a pattern worth understanding";
  const signals = ARCHETYPE_SIGNALS[archetype] ?? [];
  const showLabelLine = archetypeFitTier !== "no_clear_fit";

  return (
    <section style={{ background: T.paper, padding: "52px 0" }}>
      <Shell>
        <SectionMarker n={2} label="Behaviour Pattern" />
        <h2 style={{
          fontFamily: FRAUNCES,
          fontWeight: 500,
          fontSize: "clamp(24px, 3.4vw, 32px)",
          lineHeight: 1.28,
          color: T.ink,
          margin: "0 0 24px",
          letterSpacing: "-0.01em",
        }}>
          {h2Text}
        </h2>
        <MomentContent content={moment.content} />
        {showLabelLine && (
          <div style={{
            fontFamily: PUBLIC_SANS,
            fontSize: "15px",
            color: T.accent,
            fontWeight: 600,
            marginTop: "20px",
            marginBottom: "0",
          }}>
            We call this pattern {archetype} — {descriptor}.
          </div>
        )}
        {signals.length > 0 && (
          <div style={{ display: "flex", gap: "12px", marginTop: "24px", flexWrap: "wrap" }}>
            {signals.map((s, i) => {
              const valStr = typeof s.value === "function" ? s.value(pronouns) : s.value;
              return (
                <div key={i} style={{
                  flex: "1 1 180px",
                  background: T.surface,
                  borderRadius: "12px",
                  padding: "18px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  border: `1px solid ${T.paperDeep}`,
                }}>
                  <div style={{
                    fontFamily: PUBLIC_SANS,
                    fontSize: "10.5px",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    color: T.inkFaint,
                    fontWeight: 600,
                    marginBottom: "8px",
                  }}>
                    {s.key(childName)}
                  </div>
                  <div style={{
                    fontFamily: PUBLIC_SANS,
                    fontSize: "14px",
                    color: T.ink,
                    fontWeight: 500,
                    lineHeight: 1.5,
                  }}>
                    {valStr}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Shell>
    </section>
  );
}

function LoopSvg({
  childName,
  parentName,
  loop,
}: {
  childName: string;
  parentName: string;
  loop: FamilyAttentionLoop;
}) {
  const tp = loop.loop_tension_point;
  if (!tp) return null;

  const labels = LOOP_LABELS[tp.mechanism] ?? LOOP_LABELS.misaligned_response;

  // Responsive font size: shrink for longer names rather than truncating silently.
  // Circle r=56; usable text width ~84px. Fraunces ≈ 8px/char at 14px.
  const nameFontSize = (name: string) =>
    name.length <= 9 ? 14 : name.length <= 12 ? 11 : 9.5;

  return (
    <svg
      viewBox="0 0 720 260"
      style={{ width: "100%", height: "auto", display: "block" }}
      role="img"
      aria-label={`Family attention loop between ${childName} and ${parentName}`}
    >
      <defs>
        <marker id="loop-arrow" markerWidth="9" markerHeight="9" refX="6" refY="4.5" orient="auto">
          <path d="M0,0 L9,4.5 L0,9 z" fill="#34503F" />
        </marker>
      </defs>
      {/* Child circle (left) */}
      <circle cx="130" cy="70" r="56" fill="#FBF9F3" stroke="#34503F" strokeWidth="1.5" />
      <text x="130" y="65" textAnchor="middle" fontFamily="Fraunces, serif" fontSize={nameFontSize(childName)} fill="#201E19" fontWeight="500">
        <title>{childName}</title>
        {childName}
      </text>
      <text x="130" y="83" textAnchor="middle" fontFamily="Public Sans, sans-serif" fontSize="10.5" fill="#5B5648">{labels.childBehavior}</text>
      {/* Parent circle (right) */}
      <circle cx="590" cy="70" r="56" fill="#FBF9F3" stroke="#34503F" strokeWidth="1.5" />
      <text x="590" y="65" textAnchor="middle" fontFamily="Fraunces, serif" fontSize={nameFontSize(parentName)} fill="#201E19" fontWeight="500">
        <title>{parentName}</title>
        {parentName}
      </text>
      <text x="590" y="83" textAnchor="middle" fontFamily="Public Sans, sans-serif" fontSize="10.5" fill="#5B5648">{labels.parentBehavior}</text>
      {/* Top path: child → parent (solid green) */}
      <path d="M186,58 C 300,8 420,8 534,58" fill="none" stroke="#34503F" strokeWidth="1.5" markerEnd="url(#loop-arrow)" />
      <text x="360" y="22" textAnchor="middle" fontFamily="Public Sans, sans-serif" fontSize="10.5" fill="#8B8570">{labels.topPath}</text>
      {/* Bottom path: parent → child (dashed blue) */}
      <path d="M534,90 C 420,152 300,152 186,92" fill="none" stroke="#5C7285" strokeWidth="1.5" strokeDasharray="2 5" markerEnd="url(#loop-arrow)" />
      <text x="360" y="182" textAnchor="middle" fontFamily="Public Sans, sans-serif" fontSize="10.5" fill="#8B8570">{labels.bottomPath}</text>
      {/* Gold tension dot + text */}
      <circle cx="360" cy="232" r="4" fill="#A9772A" />
      <text x="378" y="236" fontFamily="Public Sans, sans-serif" fontSize="10.5" fill="#A9772A" fontWeight="600">{labels.goldText.replace(/^and /i, "")}</text>
    </svg>
  );
}

function FamilyLoopSection({
  moment,
  familyLoop,
  childName,
  parentName,
}: {
  moment: AttentionMoment | undefined;
  familyLoop: FamilyAttentionLoop | null;
  childName: string;
  parentName: string;
}) {
  if (!moment) return null;

  const paragraphs = moment.content.split(/\n{2,}/).filter(Boolean);
  const lastPara = paragraphs[paragraphs.length - 1] ?? "";
  const isPullQuote = paragraphs.length > 1 && lastPara.length < 320;
  const bodyParas = isPullQuote ? paragraphs.slice(0, -1) : paragraphs;

  const showSvg = familyLoop?.detected && familyLoop.loop_tension_point !== null;
  const h2Text = moment.title ?? "The loop that keeps repeating";

  return (
    <section style={{ background: T.surface, padding: "52px 0" }}>
      <Shell>
        <SectionMarker n={3} label="Family Attention Loop" />
        <h2 style={{
          fontFamily: FRAUNCES,
          fontWeight: 500,
          fontSize: "clamp(24px, 3.4vw, 32px)",
          lineHeight: 1.28,
          color: T.ink,
          margin: "0 0 24px",
          letterSpacing: "-0.01em",
        }}>
          {h2Text}
        </h2>
        <div style={{ fontFamily: PUBLIC_SANS, fontSize: "16px", color: T.inkSoft, lineHeight: 1.75 }}>
          {bodyParas.map((p, i) => (
            <p key={i} style={{ margin: i < bodyParas.length - 1 ? "0 0 18px" : "0" }}>
              {renderWithBold(p.replace(/\n/g, " "))}
            </p>
          ))}
        </div>
        {showSvg && (
          <div style={{ marginTop: "32px" }}>
            <div style={{
              fontFamily: PUBLIC_SANS,
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: ".1em",
              color: T.gold,
              fontWeight: 700,
              textAlign: "center",
              marginBottom: "14px",
            }}>
              The Family Loop
            </div>
            <div style={{
              background: T.surface,
              borderRadius: "22px",
              padding: "42px 32px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              border: `1px solid ${T.paperDeep}`,
              margin: "8px 0 28px",
            }}>
              <LoopSvg childName={childName} parentName={parentName} loop={familyLoop!} />
            </div>
          </div>
        )}
        {isPullQuote && (
          <div style={{
            fontFamily: FRAUNCES,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: "clamp(20px, 2.8vw, 27px)",
            lineHeight: 1.44,
            color: T.ink,
            maxWidth: "38ch",
            margin: "40px auto 8px",
            textAlign: "center",
            padding: "0 10px",
          }}>
            <div style={{ width: "32px", height: "1px", background: T.gold, margin: "0 auto 18px" }} />
            {renderWithBold(lastPara.replace(/\n/g, " "))}
            <div style={{ width: "32px", height: "1px", background: T.gold, margin: "18px auto 0" }} />
          </div>
        )}
      </Shell>
    </section>
  );
}

// Parse BELIEVED/ACTUALLY structured pairs from LLM content
function parseReframes(content: string): { believed: string; actually: string }[] | null {
  const pairs: { believed: string; actually: string }[] = [];
  const lines = content.split("\n");
  let currentBelieved = "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^BELIEVED:\s*/i.test(trimmed)) {
      currentBelieved = trimmed.replace(/^BELIEVED:\s*/i, "").trim();
    } else if (/^ACTUALLY:\s*/i.test(trimmed) && currentBelieved) {
      pairs.push({ believed: currentBelieved, actually: trimmed.replace(/^ACTUALLY:\s*/i, "").trim() });
      currentBelieved = "";
    }
  }
  return pairs.length >= 2 ? pairs : null;
}

// Extract optional PARENT_LABEL line
function parseParentLabel(content: string): string | null {
  const match = content.match(/^PARENT_LABEL:\s*(.+)$/im);
  return match ? match[1].trim() : null;
}

function WhatThisExplainsSection({ moment, sectionN }: { moment: AttentionMoment | undefined; sectionN: number }) {
  if (!moment) return null;
  const h2Text = moment.title ?? "Why these moments keep happening";
  const reframes = parseReframes(moment.content);
  const parentLabel = parseParentLabel(moment.content);

  return (
    <section style={{ background: T.paper, padding: "52px 0" }}>
      <Shell>
        <SectionMarker n={sectionN} label="What This Explains" />
        <h2 style={{
          fontFamily: FRAUNCES,
          fontWeight: 500,
          fontSize: "clamp(24px, 3.4vw, 32px)",
          lineHeight: 1.28,
          color: T.ink,
          margin: "0 0 12px",
          letterSpacing: "-0.01em",
        }}>
          {h2Text}
        </h2>
        {reframes ? (
          <>
            <p style={{
              fontFamily: PUBLIC_SANS,
              fontSize: "14px",
              color: T.inkFaint,
              margin: "0 0 28px",
            }}>
              Three things you&rsquo;ve probably believed, and what the evidence says instead.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {reframes.map(({ believed, actually }, i) => (
                <div key={i} style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto 1fr",
                  gap: "16px",
                  alignItems: "start",
                  padding: "20px 0",
                  borderBottom: i < reframes.length - 1 ? `1px solid ${T.paperDeep}` : "none",
                }}>
                  <div>
                    <div style={{
                      fontFamily: PUBLIC_SANS,
                      fontSize: "10px",
                      fontWeight: 700,
                      color: T.inkFaint,
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                      marginBottom: "6px",
                    }}>
                      You&rsquo;ve probably thought
                    </div>
                    <p style={{
                      fontFamily: PUBLIC_SANS,
                      fontSize: "14px",
                      color: T.inkSoft,
                      fontStyle: "italic",
                      margin: 0,
                      lineHeight: 1.6,
                    }}>
                      {believed}
                    </p>
                  </div>
                  <div style={{
                    fontFamily: PUBLIC_SANS,
                    fontSize: "18px",
                    color: T.gold,
                    fontWeight: 300,
                    paddingTop: "22px",
                    flexShrink: 0,
                  }}>→</div>
                  <div>
                    <div style={{
                      fontFamily: PUBLIC_SANS,
                      fontSize: "10px",
                      fontWeight: 700,
                      color: T.accent,
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                      marginBottom: "6px",
                    }}>
                      What&rsquo;s more likely true
                    </div>
                    <p style={{
                      fontFamily: PUBLIC_SANS,
                      fontSize: "14px",
                      color: T.ink,
                      margin: 0,
                      lineHeight: 1.6,
                      fontWeight: 500,
                    }}>
                      {actually}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <MomentContent content={moment.content} />
        )}
        {parentLabel && (
          <div style={{
            fontFamily: PUBLIC_SANS,
            fontSize: "15px",
            color: T.accent,
            fontWeight: 600,
            marginTop: "28px",
            paddingTop: "20px",
            borderTop: `1px solid ${T.paperDeep}`,
          }}>
            {parentLabel}
          </div>
        )}
      </Shell>
    </section>
  );
}

function LessCertainSection({ moment, sectionN }: { moment: AttentionMoment | undefined; sectionN: number }) {
  if (!moment) return null;
  const h2Text = moment.title ?? "Where we are less certain";
  return (
    <section style={{ background: T.surface, padding: "52px 0" }}>
      <Shell>
        <SectionMarker n={sectionN} label="Where We Are Less Certain" />
        <div style={{
          background: `rgba(92,114,133,0.11)`,
          border: `1px solid rgba(92,114,133,0.3)`,
          borderRadius: "16px",
          padding: "32px 28px",
        }}>
          <h2 style={{
            fontFamily: FRAUNCES,
            fontWeight: 500,
            fontSize: "clamp(22px, 3vw, 28px)",
            lineHeight: 1.28,
            color: T.ink,
            margin: "0 0 16px",
          }}>
            {h2Text}
          </h2>
          <MomentContent content={moment.content} color={T.inkSoft} />
        </div>
      </Shell>
    </section>
  );
}

const HOPE_PILLARS = ["Attention is trainable", "Not stubbornness", "Not a diagnosis"];

function HopeSection({ moment, sectionN, childName }: { moment: AttentionMoment | undefined; sectionN: number; childName: string }) {
  if (!moment) return null;
  const h2Text = moment.title ?? "What becomes possible";
  return (
    <section style={{ background: T.paper, padding: "52px 0" }}>
      <Shell>
        <SectionMarker n={sectionN} label="Hope" />
        <h2 style={{
          fontFamily: FRAUNCES,
          fontWeight: 500,
          fontSize: "clamp(24px, 3.6vw, 34px)",
          lineHeight: 1.28,
          color: T.accent,
          margin: "0 0 24px",
          letterSpacing: "-0.01em",
        }}>
          {h2Text}
        </h2>
        <MomentContent content={moment.content} />
        <p style={{
          fontFamily: PUBLIC_SANS,
          fontSize: "16px",
          color: T.inkSoft,
          lineHeight: 1.7,
          margin: "20px 0 0",
        }}>
          This is what {childName}&rsquo;s attention health looks like right now — and, like any skill, it&rsquo;s trainable.
        </p>
        <div style={{ display: "flex", gap: "10px", marginTop: "28px", flexWrap: "wrap" }}>
          {HOPE_PILLARS.map((pillar) => (
            <div key={pillar} style={{
              fontFamily: PUBLIC_SANS,
              fontSize: "12px",
              fontWeight: 600,
              color: T.accent,
              background: `rgba(52,80,63,0.08)`,
              border: `1px solid rgba(52,80,63,0.2)`,
              borderRadius: "20px",
              padding: "6px 14px",
            }}>
              {pillar}
            </div>
          ))}
        </div>
      </Shell>
    </section>
  );
}

function FutureStorySection({ moment, sectionN }: { moment: AttentionMoment | undefined; sectionN: number }) {
  if (!moment) return null;
  const h2Text = moment.title ?? "A different scene, six weeks from now";

  // Separate the caveat sentence (starts with "Not guaranteed") from the scene paragraphs
  const allParas = moment.content.split(/\n{2,}/).filter(Boolean);
  const caveatIdx = allParas.findIndex(p => /^Not guaranteed/i.test(p.trim()));
  const sceneParas = caveatIdx >= 0 ? allParas.slice(0, caveatIdx) : allParas;
  const caveatText = caveatIdx >= 0 ? allParas[caveatIdx] : null;

  return (
    <section style={{ background: T.surface, padding: "52px 0" }}>
      <Shell>
        <SectionMarker n={sectionN} label="Future Story" />
        <h2 style={{
          fontFamily: FRAUNCES,
          fontWeight: 500,
          fontSize: "clamp(24px, 3.4vw, 32px)",
          lineHeight: 1.28,
          color: T.ink,
          margin: "0 0 24px",
          letterSpacing: "-0.01em",
        }}>
          {h2Text}
        </h2>
        <div style={{ fontFamily: PUBLIC_SANS, fontSize: "16px", color: T.ink, lineHeight: 1.75 }}>
          {sceneParas.map((p, i) => (
            <p key={i} style={{ margin: i < sceneParas.length - 1 ? "0 0 18px" : "0" }}>
              {renderWithBold(p.replace(/\n/g, " "))}
            </p>
          ))}
        </div>
        {caveatText && (
          <div style={{
            marginTop: "28px",
            padding: "14px 18px",
            background: T.paperDeep,
            borderRadius: "8px",
            fontFamily: PUBLIC_SANS,
            fontSize: "14px",
            color: T.inkFaint,
            fontStyle: "italic",
            lineHeight: 1.6,
          }}>
            {caveatText}
          </div>
        )}
        <p style={{
          fontFamily: PUBLIC_SANS,
          fontSize: "14px",
          color: T.inkSoft,
          fontStyle: "italic",
          marginTop: "16px",
          marginBottom: 0,
        }}>
          The obvious next question is what actually gets you there.
        </p>
      </Shell>
    </section>
  );
}

function RoadmapSection({
  roadmapMoments,
  sectionN,
  childName,
  parentName,
  familyLoop,
}: {
  roadmapMoments: AttentionMoment[];
  sectionN: number;
  childName: string;
  parentName: string;
  familyLoop: FamilyAttentionLoop | null;
}) {
  if (roadmapMoments.length === 0) return null;
  return (
    <section style={{ background: T.paper, padding: "52px 0" }}>
      <Shell>
        <SectionMarker n={sectionN} label="Roadmap" />
        <h2 style={{
          fontFamily: FRAUNCES,
          fontWeight: 600,
          fontSize: "26px",
          lineHeight: 1.25,
          color: T.ink,
          margin: "0 0 8px",
          letterSpacing: "-0.01em",
        }}>
          What changes for {childName}
        </h2>
        <p style={{
          fontFamily: PUBLIC_SANS,
          fontSize: "14px",
          color: T.inkFaint,
          margin: "0 0 36px",
        }}>
          Four things you&rsquo;ll notice, in the order they tend to arrive.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {roadmapMoments.map((m, i) => {
            const isLast = i === roadmapMoments.length - 1;
            const beatLabel = m.section.replace("Roadmap — ", "");
            return (
              <div
                key={m.moment_id}
                style={{
                  display: "flex",
                  gap: "20px",
                  paddingBottom: isLast ? "0" : "32px",
                  borderBottom: isLast ? "none" : `1px solid ${T.paperDeep}`,
                  marginBottom: isLast ? "0" : "32px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: T.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <span style={{ fontFamily: PUBLIC_SANS, fontSize: "13px", fontWeight: 700, color: "#fff" }}>
                      {i + 1}
                    </span>
                  </div>
                </div>
                <div style={{ flex: 1, paddingTop: "6px" }}>
                  <div style={{
                    fontFamily: PUBLIC_SANS,
                    fontSize: "11px",
                    fontWeight: 700,
                    color: T.gold,
                    textTransform: "uppercase",
                    letterSpacing: ".1em",
                    marginBottom: "8px",
                  }}>
                    {beatLabel}
                  </div>
                  <MomentContent content={m.content} color={T.inkSoft} />
                </div>
              </div>
            );
          })}
        </div>
        {/* Loop-callback: only shown when a loop was detected */}
        {familyLoop?.detected && familyLoop.loop_tension_point && (
          <div style={{
            marginTop: "36px",
            padding: "24px 22px",
            background: T.surface,
            borderRadius: "14px",
            border: `1px solid ${T.paperDeep}`,
            display: "flex",
            gap: "16px",
            alignItems: "flex-start",
          }}>
            <div style={{ flexShrink: 0, marginTop: "2px" }}>
              <svg viewBox="0 0 40 40" style={{ width: "36px", height: "36px" }}>
                <circle cx="10" cy="20" r="7" fill="none" stroke={T.accent} strokeWidth="1.5" />
                <circle cx="30" cy="20" r="7" fill="none" stroke={T.accent} strokeWidth="1.5" />
                <path d="M17,16 C20,10 24,10 27,16" fill="none" stroke={T.accent} strokeWidth="1.2" markerEnd="url(#ra)" />
                <path d="M23,24 C20,30 16,30 13,24" fill="none" stroke={T.uncertainty} strokeWidth="1.2" strokeDasharray="2 3" markerEnd="url(#rb)" />
                <defs>
                  <marker id="ra" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill={T.accent} /></marker>
                  <marker id="rb" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill={T.uncertainty} /></marker>
                </defs>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: PUBLIC_SANS, fontSize: "11px", fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: "6px" }}>
                The loop from earlier
              </div>
              <p style={{ fontFamily: PUBLIC_SANS, fontSize: "14px", color: T.inkSoft, margin: 0, lineHeight: 1.65 }}>
                This is the same loop — {childName} and {parentName} meeting at the moment where the pattern resets. Six weeks doesn&rsquo;t mean less connection. It means{" "}
                <strong style={{ fontWeight: 600, color: T.ink }}>
                  {(LOOP_LABELS[familyLoop.loop_tension_point.mechanism]?.goldText ?? "the cycle has room to break").replace(/^and /i, "")}
                </strong>.
              </p>
            </div>
          </div>
        )}
      </Shell>
    </section>
  );
}

function FounderSection({ sectionN }: { sectionN: number }) {
  const founderSrc = founderB64
    ? `data:image/jpeg;base64,${founderB64}`
    : "/founder.jpg";

  const shailySrc = shailyB64
    ? `data:image/png;base64,${shailyB64}`
    : "/shaily-headshot-square.png";

  return (
    <section style={{ background: T.surface, padding: "52px 0" }}>
      <Divider />
      <Shell>
        <div style={{ paddingTop: "52px" }}>
          <SectionMarker n={sectionN} label="Why This Framework" />
          <h2 style={{
            fontFamily: FRAUNCES,
            fontWeight: 500,
            fontSize: "clamp(22px, 3vw, 28px)",
            lineHeight: 1.28,
            color: T.ink,
            margin: "0 0 24px",
          }}>
            A note from the founders
          </h2>

          {/* Two-founder byline row */}
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", marginBottom: "24px" }}>
            {/* Shashank */}
            <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", flex: "1 1 200px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={founderSrc}
                alt="Shashank Agrawal"
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  flexShrink: 0,
                  border: `2px solid ${T.paperDeep}`,
                }}
              />
              <div>
                <div style={{ fontFamily: FRAUNCES, fontWeight: 700, fontSize: "15px", color: T.ink, lineHeight: 1.3 }}>
                  Shashank Agrawal
                </div>
                <div style={{ fontFamily: PUBLIC_SANS, fontSize: "12px", color: T.inkFaint, marginTop: "2px" }}>
                  Founder, Attention Architect · IIM Rohtak
                </div>
              </div>
            </div>

            {/* Shaily */}
            <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", flex: "1 1 200px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shailySrc}
                alt="Shaily Badonia"
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  flexShrink: 0,
                  border: `2px solid ${T.paperDeep}`,
                }}
              />
              <div>
                <div style={{ fontFamily: FRAUNCES, fontWeight: 700, fontSize: "15px", color: T.ink, lineHeight: 1.3 }}>
                  Shaily Badonia
                </div>
                <div style={{ fontFamily: PUBLIC_SANS, fontSize: "12px", color: T.inkFaint, marginTop: "2px" }}>
                  Chief Attention Architect · 10+ years of experience
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontFamily: PUBLIC_SANS, fontSize: "14px", color: T.inkSoft, lineHeight: 1.7 }}>
            <p style={{ margin: "0 0 14px" }}>
              Attention Architect didn&rsquo;t start as a business plan. It started as years spent trying to understand why the same advice worked for one child and did nothing for another — and slowly realising the missing piece usually wasn&rsquo;t more effort from the parent. It was a clearer map.
            </p>
            <p style={{ margin: "0 0 14px" }}>
              This framework was built in stages, together — studying how attention and habit actually form in children, identifying the signals that genuinely differ from child to child, and testing each assessment question until it isolated one real thing rather than guessing at several. Your answers are matched against that structure. Nothing here is improvised about your child specifically — the matching is, the framework underneath isn&rsquo;t.
            </p>
            <div style={{
              fontFamily: FRAUNCES,
              fontStyle: "italic",
              fontSize: "16px",
              lineHeight: 1.6,
              color: T.inkSoft,
              borderLeft: `3px solid ${T.gold}`,
              paddingLeft: "16px",
              margin: "0",
            }}>
              &ldquo;We built this because we realised parents are often trying harder when what they actually need is a better map.&rdquo;
            </div>
          </div>
        </div>
      </Shell>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section style={{ background: T.paper, padding: "52px 0" }}>
      <Divider />
      <Shell>
        <div style={{ paddingTop: "52px" }}>
          <div style={{
            fontFamily: PUBLIC_SANS,
            fontSize: "11px",
            fontWeight: 600,
            color: T.inkFaint,
            letterSpacing: ".12em",
            textTransform: "uppercase",
            marginBottom: "12px",
          }}>
            What other parents found
          </div>
          <h2 style={{
            fontFamily: FRAUNCES,
            fontWeight: 500,
            fontSize: "clamp(22px, 3vw, 28px)",
            lineHeight: 1.28,
            color: T.ink,
            margin: "0 0 24px",
            letterSpacing: "-0.01em",
          }}>
            Not different outcomes. Different clarity.
          </h2>
          {/* Client component handles auto-advance, pause-on-hover, prefers-reduced-motion */}
          <TestimonialsCarousel />
        </div>
      </Shell>
    </section>
  );
}

function FaqSection({ childName, pronouns }: { childName: string; pronouns: { poss: string } }) {
  const faqs = [
    {
      q: "How personalized is this, really?",
      a: `Every section was generated from ${childName}'s actual assessment answers — ${pronouns.poss} attention shape, motivational driver, and the specific dimension profile that emerged. It isn't reusable for another child.`,
    },
    {
      q: "Is this a diagnosis?",
      a: `No. Not a diagnosis, not a verdict — a map. Nothing here labels ${childName}; it shows how ${pronouns.poss} attention actually works and what to do about it.`,
    },
    {
      q: "How much time does this take each week?",
      a: "One practical step, not a curriculum. Most weeks take 15–20 minutes to read and a few minutes a day to actually apply.",
    },
    {
      q: "What if my child already has a diagnosis (e.g. ADHD)?",
      a: "This works alongside any existing support or diagnosis — it's a practical, at-home layer, not a substitute for professional care.",
    },
    {
      q: "Can grandparents follow this too?",
      a: "Yes — anyone involved in the child's daily routine can read and follow the weekly steps.",
    },
    {
      q: "What if we miss a week?",
      a: "No pressure — pick back up whenever you're ready. The roadmap waits for you.",
    },
  ];

  return (
    <section style={{ background: T.surface, padding: "52px 0" }}>
      <Divider />
      <Shell>
        <div style={{ paddingTop: "52px" }}>
          <div style={{
            fontFamily: PUBLIC_SANS,
            fontSize: "11px",
            fontWeight: 600,
            color: T.inkFaint,
            letterSpacing: ".12em",
            textTransform: "uppercase",
            marginBottom: "16px",
          }}>
            A Few Practical Questions
          </div>
          <h2 style={{
            fontFamily: FRAUNCES,
            fontWeight: 500,
            fontSize: "clamp(24px, 3vw, 30px)",
            lineHeight: 1.2,
            color: T.ink,
            margin: "0 0 28px",
            letterSpacing: "-0.01em",
          }}>
            Before you decide
          </h2>
          <div>
            {faqs.map(({ q, a }) => (
              <details
                key={q}
                style={{ borderBottom: `1px solid ${T.paperDeep}` }}
              >
                <summary style={{
                  listStyle: "none",
                  cursor: "pointer",
                  padding: "16px 0",
                  fontFamily: PUBLIC_SANS,
                  fontSize: "15px",
                  fontWeight: 600,
                  color: T.ink,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                }}>
                  <span>{q}</span>
                  <span style={{ fontSize: "20px", fontWeight: 300, color: T.inkFaint, flexShrink: 0 }}>+</span>
                </summary>
                <div style={{
                  fontFamily: PUBLIC_SANS,
                  fontSize: "14px",
                  color: T.inkSoft,
                  padding: "0 0 18px",
                  lineHeight: 1.7,
                }}>
                  {a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </Shell>
    </section>
  );
}

function LmsAccessCard({
  sessionId,
  childName,
  purchaseTier,
}: {
  sessionId: string;
  childName: string;
  purchaseTier: string | null;
}) {
  const isFullRoadmap = purchaseTier === "full" || purchaseTier === "topup";
  return (
    <div style={{
      background: T.surface,
      border: `1.5px solid ${T.accent}`,
      borderRadius: "12px",
      padding: "32px 28px",
    }}>
      <p style={{
        fontFamily: PUBLIC_SANS,
        fontSize: "11px",
        fontWeight: 700,
        color: T.accent,
        letterSpacing: ".12em",
        textTransform: "uppercase",
        margin: "0 0 14px",
      }}>
        Programme access · Confirmed
      </p>
      <h3 style={{
        fontFamily: FRAUNCES,
        fontWeight: 500,
        fontSize: "clamp(20px, 2.8vw, 26px)",
        color: T.ink,
        margin: "0 0 10px",
        lineHeight: 1.25,
        letterSpacing: "-0.02em",
      }}>
        {isFullRoadmap
          ? `${childName}'s full 6-week programme is ready.`
          : `Week 1 of ${childName}'s programme is ready.`}
      </h3>
      <p style={{
        fontFamily: PUBLIC_SANS,
        fontSize: "15px",
        color: T.inkSoft,
        lineHeight: 1.65,
        margin: "0 0 28px",
      }}>
        {isFullRoadmap
          ? "Set a password to open your dashboard and begin the full roadmap."
          : "Set a password to open your dashboard and begin Week 1."}
      </p>
      <a
        href={`/lms/set-password?session=${sessionId}`}
        style={{
          display: "inline-block",
          background: T.accent,
          color: "#fff",
          fontFamily: PUBLIC_SANS,
          fontWeight: 700,
          fontSize: "15px",
          padding: "14px 28px",
          borderRadius: "8px",
          textDecoration: "none",
        }}
      >
        Set up access →
      </a>
      <p style={{
        fontFamily: PUBLIC_SANS,
        fontSize: "13px",
        color: T.inkFaint,
        margin: "20px 0 0",
      }}>
        Already set a password?{" "}
        <a href="/lms/login" style={{ color: T.accent, textDecoration: "none" }}>
          Log in to your dashboard
        </a>
      </p>
    </div>
  );
}

function FinalInvitationSection({
  sessionId,
  childName,
  parentName,
  email,
  phone,
  hasPurchase,
  purchaseTier,
}: {
  sessionId: string;
  childName: string;
  parentName: string;
  email: string;
  phone: string;
  hasPurchase: boolean;
  purchaseTier: string | null;
}) {
  return (
    <section style={{ background: T.paper, padding: "64px 0" }}>
      <Divider />
      <Shell>
        <div style={{ paddingTop: "64px" }}>
          <p style={{
            fontFamily: PUBLIC_SANS,
            fontSize: "15px",
            color: T.inkSoft,
            lineHeight: 1.65,
            margin: "0 0 20px",
          }}>
            You understand what has been happening. The roadmap is built to change what happens next — six weeks, one move at a time, grounded in what&rsquo;s in this report.
          </p>
          <h2 style={{
            fontFamily: FRAUNCES,
            fontWeight: 500,
            fontSize: "clamp(26px, 3.4vw, 34px)",
            lineHeight: 1.2,
            color: T.ink,
            margin: "0 0 12px",
            letterSpacing: "-0.02em",
          }}>
            A roadmap built around how {childName}&rsquo;s attention actually works.
          </h2>
          <p style={{
            fontFamily: PUBLIC_SANS,
            fontSize: "15px",
            color: T.inkSoft,
            lineHeight: 1.65,
            margin: "0 0 32px",
            maxWidth: "44ch",
          }}>
            Not a generic plan. This one — built from {childName}&rsquo;s own answers.
          </p>

          {hasPurchase ? (
            <LmsAccessCard
              sessionId={sessionId}
              childName={childName}
              purchaseTier={purchaseTier}
            />
          ) : (
            <PriceCards
              sessionId={sessionId}
              childName={childName}
              parentName={parentName}
              email={email}
              phone={phone}
              weakestFirst=""
            />
          )}
        </div>
      </Shell>
    </section>
  );
}

function FooterSection() {
  return (
    <footer style={{ background: T.paperDeep, padding: "24px 0" }}>
      <Shell>
        <p style={{
          fontFamily: PUBLIC_SANS,
          fontSize: "12px",
          color: T.inkFaint,
          textAlign: "center",
          margin: 0,
        }}>
          Attention Architect · by The Human Decision · Made for parents who want to understand, not diagnose.
        </p>
      </Shell>
    </footer>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NarrativeReportView({
  moments,
  archetype,
  archetypeFitTier,
  parentInstinct: _parentInstinct,
  familyLoop,
  childName: childNameRaw,
  parentName,
  email,
  phone,
  concerns: _concerns,
  sessionId,
  pronouns,
  hasPurchase = false,
  purchaseTier = null,
}: {
  moments: AttentionMoment[];
  archetype: string;
  archetypeFitTier: string;
  parentInstinct: string;
  familyLoop: FamilyAttentionLoop | null;
  childName: string;
  parentName: string;
  email: string;
  phone: string;
  concerns: string[];
  sessionId: string;
  pronouns: { subj: string; obj: string; poss: string; reflexive: string };
  hasPurchase?: boolean;
  purchaseTier?: string | null;
}) {
  // childName is optional at intake — normalize to a grammatically safe fallback
  // so every sub-component gets a renderable string, not an empty interpolation
  const childName = (childNameRaw.trim() || "your child") as string;

  const bySection = new Map<string, AttentionMoment>();
  const roadmapMoments: AttentionMoment[] = [];
  for (const m of moments) {
    if (m.section.startsWith("Roadmap — ")) {
      roadmapMoments.push(m);
    } else {
      bySection.set(m.section, m);
    }
  }

  roadmapMoments.sort((a, b) => a.moment_id.localeCompare(b.moment_id));

  const hasLoop = bySection.has("Family Attention Loop");
  const loopOffset = hasLoop ? 1 : 0;

  return (
    <>
      <FontLoader />
      <main style={{
        background: T.surface,
        fontFamily: PUBLIC_SANS,
        color: T.ink,
        minHeight: "100vh",
      }}>
        {/* Cover — heroLine from generated Cover moment if present; falls back to static copy */}
        <CoverSection
          childName={childName}
          parentName={parentName}
          heroLine={bySection.get("Cover")?.content}
        />

        {/* 01 — Recognition */}
        <RecognitionSection moment={bySection.get("Recognition")} />

        {/* 02 — Behaviour Pattern */}
        <BehaviourPatternSection
          moment={bySection.get("Behaviour Pattern")}
          archetype={archetype}
          archetypeFitTier={archetypeFitTier}
          childName={childName}
          pronouns={pronouns}
        />

        {/* Sentinel: sticky CTA appears once this scrolls off the top (after Recognition + Pattern) */}
        <div id="sticky-show-sentinel" />

        {/* 03 — Family Attention Loop (conditional) */}
        {hasLoop && (
          <FamilyLoopSection
            moment={bySection.get("Family Attention Loop")}
            familyLoop={familyLoop}
            childName={childName}
            parentName={parentName}
          />
        )}

        {/* 03 or 04 — What This Explains */}
        <WhatThisExplainsSection
          moment={bySection.get("What This Explains")}
          sectionN={3 + loopOffset}
        />

        {/* 04 or 05 — Where We Are Less Certain */}
        <LessCertainSection
          moment={bySection.get("Where We Are Less Certain")}
          sectionN={4 + loopOffset}
        />

        {/* 05 or 06 — Hope */}
        <HopeSection
          moment={bySection.get("Hope")}
          sectionN={5 + loopOffset}
          childName={childName}
        />

        {/* 06 or 07 — Future Story */}
        <FutureStorySection
          moment={bySection.get("Future Story")}
          sectionN={6 + loopOffset}
        />

        {/* 07 or 08 — Roadmap */}
        <RoadmapSection
          roadmapMoments={roadmapMoments}
          sectionN={7 + loopOffset}
          childName={childName}
          parentName={parentName}
          familyLoop={familyLoop}
        />

        {/* Founder's Note (sequential: 8 or 9) */}
        <FounderSection sectionN={8 + loopOffset} />

        {/* Testimonials */}
        <TestimonialsSection />

        {/* FAQ */}
        <FaqSection childName={childName} pronouns={pronouns} />

        {/* Sentinel: sticky CTA hides once the PriceCards section enters view */}
        <div id="sticky-hide-sentinel" />

        {/* Final Invitation */}
        <FinalInvitationSection sessionId={sessionId} childName={childName} parentName={parentName} email={email} phone={phone} hasPurchase={hasPurchase} purchaseTier={purchaseTier} />

        {/* Footer */}
        <FooterSection />
      </main>
      <StickyCta sessionId={sessionId} childName={childName} parentName={parentName} email={email} phone={phone} hasPurchase={hasPurchase} />
    </>
  );
}
