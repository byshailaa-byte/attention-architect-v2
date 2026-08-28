"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteNav, SiteFooterFull, Eyebrow, Wrap, CloseBand, headingStyle } from "../_shared";

type Archetype = {
  id: string;
  n: string;
  name: string;
  gloss: string;
  home: string;
  strength: string;
  breaks: string;
  lever?: string;
};

const ARCHETYPES: Archetype[] = [
  {
    id: "storm", n: "01", name: "The Storm",
    gloss: "Full force when it is hers — gone the moment it is handed to her",
    home: "Works hard on something they chose. The same task, assigned, gets nothing.",
    strength: "Real drive, entirely her own. Nobody has to manufacture it.",
    lever: "Ownership",
    breaks: "Starting",
  },
  {
    id: "all-in-kid", n: "02", name: "The All-In Kid",
    gloss: "Goes very deep, and pays an unusually high price for being interrupted",
    home: "Can sit with one thing for two straight hours without looking up. Switching or stopping is the hard part.",
    strength: "Goes deeper than almost anyone when left alone with something.",
    breaks: "Carrying it over",
  },
  {
    id: "inventor", n: "03", name: "The Inventor",
    gloss: "Will do it — but his own way",
    home: "Rebuilds something four different wrong ways before it's finally right, and never looks bored doing it.",
    strength: "Builds real, durable understanding by getting it wrong their own way first.",
    breaks: "Starting",
  },
  {
    id: "explorer", n: "04", name: "The Explorer",
    gloss: "Ideas arrive mid-task and have to be chased",
    home: "Ten good minutes, then a question about something unrelated. Twenty minutes later they can tell you three new facts and none were on the worksheet.",
    strength: "Curiosity that goes further and connects more than a fixed lesson plan ever could.",
    breaks: "Holding on",
  },
  {
    id: "magnet", n: "05", name: "The Magnet",
    gloss: "Attention holds while someone is nearby — company, not supervision",
    home: "Forty minutes of focused work at the kitchen table. Can't manage ten alone in their room on the same task.",
    strength: "Genuinely does better work, more consistently, in the presence of someone else.",
    breaks: "Running it themselves",
  },
  {
    id: "glue", n: "06", name: "The Glue",
    gloss: "Cannot concentrate across an unresolved gap with you",
    home: "Staring at homework, pencil not moving. Solve the tension in one sentence and they finish the page in ten minutes.",
    strength: "Deeply attuned to the emotional temperature of a room — often the first to notice when something's actually wrong.",
    breaks: "Holding on",
  },
  {
    id: "captain", n: "07", name: "The Captain",
    gloss: "Rises to genuine ownership, deflates under supervised participation",
    home: "Tell them how to do it and they slow-walk every step. Say 'your call' and the same task is done in half the time.",
    strength: "Takes real ownership and drives hard the moment something is genuinely theirs to run.",
    breaks: "Running it themselves",
  },
  {
    id: "live-wire", n: "08", name: "The Live Wire",
    gloss: "Effort tracks stakes, not importance",
    home: "A timed challenge gets full, locked-in effort. The identical untimed version gets ninety seconds.",
    strength: "Brings real, sustained intensity to anything that offers genuine stakes or challenge.",
    breaks: "Staying with it",
  },
];

function ArchetypeCard({ a, expanded, onToggle }: { a: Archetype; expanded: boolean; onToggle: () => void }) {
  const cardStyle: React.CSSProperties = {
    border: "1px solid var(--border-card)", borderRadius: "var(--radius-lg)",
    padding: "var(--card-pad)", background: "var(--surface-card)",
    boxShadow: "var(--shadow-card)", cursor: "pointer",
    display: "flex", flexDirection: "column", gap: 12,
    transition: "box-shadow var(--duration-base) var(--ease-standard)",
  };

  return (
    <div style={cardStyle} onClick={onToggle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ font: "var(--weight-bold) var(--text-lg)/var(--leading-snug) var(--font-sans)", color: "var(--navy-800)" }}>
          {a.name}
        </div>
        <div style={{ font: "var(--weight-bold) var(--text-sm)/1 var(--font-sans)", color: "var(--amber-500)", flexShrink: 0, marginTop: 2 }}>
          {a.n}
        </div>
      </div>
      <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-body)" }}>{a.gloss}</p>

      {expanded ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 4 }}>
          <div style={{ borderTop: "1px solid var(--border-divider)", paddingTop: 14 }}>
            <div style={{
              font: "var(--type-eyebrow)", letterSpacing: "var(--tracking-eyebrow)",
              textTransform: "uppercase", color: "var(--text-eyebrow)", marginBottom: 6,
            }}>At home it looks like</div>
            <p style={{ margin: 0, font: "var(--type-body-sm)", color: "var(--text-body)" }}>{a.home}</p>
          </div>
          <div>
            <div style={{
              font: "var(--type-eyebrow)", letterSpacing: "var(--tracking-eyebrow)",
              textTransform: "uppercase", color: "var(--teal-700)", marginBottom: 6,
            }}>The strength</div>
            <p style={{ margin: 0, font: "var(--type-body-sm)", color: "var(--text-body)" }}>{a.strength}</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {a.lever && (
              <span style={{
                padding: "4px 12px", borderRadius: "var(--radius-pill)",
                background: "var(--teal-100)", border: "1px solid var(--teal-200)",
                font: "var(--weight-medium) var(--text-sm)/1.4 var(--font-sans)", color: "var(--teal-700)",
              }}>The lever: {a.lever}</span>
            )}
            <span style={{
              padding: "4px 12px", borderRadius: "var(--radius-pill)",
              background: "var(--amber-100)", border: "1px solid var(--amber-200)",
              font: "var(--weight-medium) var(--text-sm)/1.4 var(--font-sans)", color: "var(--amber-700)",
            }}>Usually breaks at: {a.breaks}</span>
          </div>
        </div>
      ) : (
        <div style={{ font: "var(--weight-bold) var(--text-sm)/1.4 var(--font-sans)", color: "var(--teal-600)" }}>
          Read this one →
        </div>
      )}
    </div>
  );
}

export default function ChildrenPage() {
  const router = useRouter();
  const go = () => router.push("/simplified/start");
  const [expandedId, setExpandedId] = useState<string>("storm");

  const h2: React.CSSProperties = { ...headingStyle, fontSize: "var(--type-display-size)", lineHeight: 1.16 };

  return (
    <div className="aa-site">
      <SiteNav onCta={go} active="archetypes" />

      {/* Hero */}
      <div style={{ background: "var(--surface-page-warm)", borderBottom: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ padding: "var(--site-section-gap) 0", maxWidth: 720, display: "flex", flexDirection: "column", gap: 20 }}>
            <Eyebrow>Your child</Eyebrow>
            <h1 style={h2}>Eight kinds of children. One of them is yours.</h1>
            <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-body)" }}>
              No labels, no best one. Each begins with what that child is genuinely good at, then names the skill they are ready to build next. Most mothers spot their own child straight away.
            </p>
          </div>
        </Wrap>
      </div>

      {/* Cards */}
      <section style={{ padding: "var(--site-section-gap) 0", borderBottom: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div style={{ display: "grid", gridTemplateColumns: "var(--grid-2up)", gap: "var(--space-6)" }}>
              {ARCHETYPES.map((a) => (
                <ArchetypeCard
                  key={a.id}
                  a={a}
                  expanded={expandedId === a.id}
                  onToggle={() => setExpandedId(expandedId === a.id ? "" : a.id)}
                />
              ))}
            </div>

            {/* Chips */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {["Not conditions", "Not permanent", "Not a ranking"].map((label) => (
                <span key={label} style={{
                  padding: "6px 16px", borderRadius: "var(--radius-pill)",
                  border: "1px solid var(--ink-200)",
                  font: "var(--weight-medium) var(--text-sm)/1.4 var(--font-sans)", color: "var(--ink-600)",
                }}>{label}</span>
              ))}
            </div>

            <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-body)" }}>
              This is your child now, at this age. They move between these as the missing skill gets built.
            </p>
          </div>
        </Wrap>
      </section>

      <CloseBand
        title="Which of the eight is your child?"
        lead="The assessment names it from what you already notice — no test for your child to sit, nothing for them to fail."
        onCta={go}
      />
      <SiteFooterFull />
    </div>
  );
}
