"use client";

const NAVY   = "#14284D";
const AMBER  = "#F5A623";
const TEAL   = "#22A38A";
const INK    = "#1A1A1A";
const DIM    = "#6B6B6B";
const LINE   = "#E2DFDA";
const BG     = "#FAFAF7";
const WARM   = "#FFF8E6";
const GREEN  = "#16795C";
const BF     = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";

type Props = {
  childName:    string;
  ageBand:      "8-9" | "10-11" | "12-14";
  archetypeName:string;
  patternName:  string;
  evidenceItems:string[];
  sceneClosing: string;
  anecdote:     string;
  pullquote:    string;
  strength:     string;
  shadow:       string;
  analysis0:    string;
  analysis1:    string;
  mechanism:    string;
  disarm:       string;
  fitReveal:    string;
  futureScene:  string;
  breakIdx:     number;
  breakName:    string;
  sessionId:    string;
};

const SKILL_LABELS = [
  "STARTING",
  "HOLDING ON",
  "STAYING WITH IT",
  "RECOVERING",
  "CARRYING IT OVER",
  "RUNNING IT THEMSELVES",
] as const;

const SKILL_NAMES = [
  "Starting",
  "Holding on",
  "Staying with it",
  "Recovering",
  "Carrying it over",
  "Running it themselves",
];

const CSS = `
  .pv-skill-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .pv-pill-row   { display: flex; flex-direction: column; gap: 8px; }
  @media (max-width: 520px) {
    .pv-skill-grid { grid-template-columns: repeat(2, 1fr); }
  }
`;

function Wrap({ children, narrow }: { children: React.ReactNode; narrow?: boolean }) {
  return (
    <div style={{ maxWidth: narrow ? 728 : 960, margin: "0 auto", padding: "0 24px" }}>
      {children}
    </div>
  );
}

function Block({ children }: { children: React.ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {children}
    </section>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      margin: 0, fontFamily: BF, fontWeight: 800,
      fontSize: "clamp(22px,3vw,28px)", lineHeight: 1.2,
      letterSpacing: "-0.02em", color: NAVY,
    }}>{children}</h2>
  );
}

function P({ children, dim }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <p style={{
      margin: 0,
      font: "500 15px/1.65 var(--font-sans, system-ui)",
      color: dim ? DIM : INK,
    }}>{children}</p>
  );
}

// Six-skills stage meter
function StageMeter({ breakIdx }: { breakIdx: number }) {
  return (
    <div className="pv-skill-grid">
      {SKILL_LABELS.map((label, i) => {
        const isBreak  = i === breakIdx;
        const isStrong = i < breakIdx;

        const bg      = isBreak ? NAVY : isStrong ? "#E8F5F1" : "#F6F5F2";
        const border  = isBreak ? NAVY : isStrong ? GREEN      : LINE;
        const color   = isBreak ? "#fff" : isStrong ? GREEN     : DIM;
        const numBg   = isBreak ? AMBER : isStrong ? GREEN      : LINE;
        const numFg   = isBreak ? NAVY  : isStrong ? "#fff"     : DIM;

        return (
          <div key={label} style={{
            background: bg, border: `2px solid ${border}`,
            borderRadius: 12, padding: "12px 10px",
            display: "flex", flexDirection: "column", gap: 6,
            position: "relative",
          }}>
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 22, height: 22, borderRadius: "50%",
              background: numBg, color: numFg,
              font: "700 11px/1 var(--font-sans, system-ui)",
              flexShrink: 0,
            }}>{i + 1}</div>
            <div style={{
              font: `700 11px/1.3 var(--font-sans, system-ui)`,
              letterSpacing: "0.05em", color,
            }}>{label}</div>
            {isBreak && (
              <div style={{
                font: "600 10px/1.2 var(--font-sans, system-ui)",
                color: AMBER, letterSpacing: "0.04em",
              }}>STARTS HERE</div>
            )}
            {isStrong && (
              <div style={{
                font: "600 10px/1.2 var(--font-sans, system-ui)",
                color: GREEN, letterSpacing: "0.04em",
              }}>STRONG</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Intro/theme text for WindowNote per age band
const WINDOW_NOTES: Record<string, string> = {
  "8-9":   "Between eight and eleven, attention habits are still forming rather than defended. This is when the programme works fastest — there's no story yet about who your child is with focus.",
  "10-11": "Between eight and eleven, attention habits are still forming rather than defended. This is the window before a narrative about 'I just can't focus' gets set. Once it does, the same six weeks take longer.",
  "12-14": "At twelve and thirteen, the six weeks take the same shape — but there's sometimes a layer of 'this is just who I am' to move through first. The earlier habits are more defended; the programme accounts for that.",
};

export default function ProfileView({
  childName, ageBand, archetypeName, patternName,
  evidenceItems, sceneClosing,
  anecdote, pullquote, strength, shadow,
  analysis0, analysis1, mechanism,
  disarm, fitReveal, futureScene,
  breakIdx, breakName, sessionId,
}: Props) {
  const roadmapUrl = `/simplified/roadmap?session=${sessionId}`;

  return (
    <div style={{ background: BG, minHeight: "100vh" }}>
      <style>{CSS}</style>

      {/* Minimal top bar */}
      <header style={{
        background: NAVY, padding: "12px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-horizontal-icon-wordmark.png" alt="Attention Architect"
          style={{ height: 28, width: "auto", filter: "brightness(10)", opacity: 0.9 }} />
        <a href={roadmapUrl} style={{
          background: AMBER, color: NAVY,
          font: "700 13px/1.3 var(--font-sans, system-ui)",
          padding: "8px 16px", borderRadius: 8,
          textDecoration: "none", whiteSpace: "nowrap",
        }}>Get the Roadmap →</a>
      </header>

      <div style={{ maxWidth: 728, margin: "0 auto", padding: "40px 24px 0", display: "flex", flexDirection: "column", gap: 48 }}>

        {/* ── Section 1: Header ─────────────────────────────────────────────── */}
        <Block>
          <div style={{
            font: "600 12px/1.4 var(--font-sans, system-ui)",
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: TEAL,
          }}>
            {childName}&rsquo;s Attention Report · Ages {ageBand}
          </div>
          <h1 style={{
            margin: 0, fontFamily: BF, lineHeight: 1.2,
            fontSize: "clamp(28px,5vw,40px)",
            letterSpacing: "-0.03em",
            display: "flex", flexDirection: "column", gap: 4,
          }}>
            <span style={{ fontWeight: 800, color: NAVY }}>&ldquo;{childName} doesn&rsquo;t focus.&rdquo;</span>
            <span style={{ fontWeight: 400, color: DIM }}>That isn&rsquo;t what&rsquo;s happening.</span>
          </h1>
          <P>You told us about quite a few small things. Put together, they describe something much more specific than &ldquo;doesn&rsquo;t focus&rdquo; — and much easier to work with.</P>
        </Block>

        {/* ── Section 2: Scene Card + Evidence ─────────────────────────────── */}
        <Block>
          {/* SceneCard */}
          <div style={{
            background: NAVY, borderRadius: 16,
            padding: "24px 24px 20px",
            display: "flex", flexDirection: "column", gap: 16,
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            }}>
              <div style={{
                font: "700 11px/1.4 var(--font-sans, system-ui)",
                letterSpacing: "0.1em", textTransform: "uppercase",
                color: "rgba(255,255,255,.55)",
              }}>The moment that repeats</div>
              <div style={{
                font: "600 13px/1 var(--font-sans, system-ui)",
                color: AMBER, flexShrink: 0,
              }}>6:40 pm</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                "Homework's out. The first ten minutes are genuinely good — you can see them thinking.",
                "Then something arrives. A question about something else. A thread worth pulling.",
                "Twenty minutes on, the page hasn't moved. You've asked three times. Nobody's enjoying this.",
                "So you suggest a different way to do it — and for a moment, that works.",
              ].map((line, i) => (
                <div key={i} style={{
                  display: "flex", gap: 10, alignItems: "flex-start",
                }}>
                  <div style={{
                    flexShrink: 0, marginTop: 2,
                    width: 6, height: 6, borderRadius: "50%",
                    background: "rgba(255,255,255,.35)",
                  }} />
                  <p style={{
                    margin: 0, font: "400 14px/1.6 var(--font-sans, system-ui)",
                    color: "rgba(255,255,255,.8)",
                  }}>{line}</p>
                </div>
              ))}
            </div>
            <p style={{
              margin: 0, font: "500 14px/1.6 var(--font-sans, system-ui)",
              fontStyle: "italic", color: "#fff",
              borderTop: "1px solid rgba(255,255,255,.15)",
              paddingTop: 16,
            }}>{sceneClosing}</p>
          </div>

          {/* EvidenceStamp */}
          <div style={{
            background: WARM, border: `1px solid ${AMBER}`,
            borderRadius: 10, padding: "12px 16px",
            display: "flex", flexDirection: "column", gap: 4,
          }}>
            <div style={{
              font: "700 10px/1.4 var(--font-sans, system-ui)",
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: DIM,
            }}>Built from your answers</div>
            <div style={{ font: "500 13px/1.5 var(--font-sans, system-ui)", color: INK }}>
              {evidenceItems.join(" · ")}
            </div>
          </div>
        </Block>

        {/* ── Section 3: Mechanism ─────────────────────────────────────────── */}
        <Block>
          <H2>Here&rsquo;s the mechanism</H2>
          <P>{analysis0}</P>
          <P>{analysis1}</P>
          {/* QuoteRule */}
          <blockquote style={{
            margin: 0, borderLeft: `4px solid ${AMBER}`,
            paddingLeft: 20,
            font: "600 16px/1.55 var(--font-sans, system-ui)",
            color: NAVY,
          }}>{pullquote}</blockquote>
          {/* Composed mechanism sentence */}
          <div style={{
            background: "#fff", border: `1px solid ${LINE}`,
            borderRadius: 10, padding: "14px 18px",
          }}>
            <P>{mechanism}</P>
          </div>
        </Block>

        {/* ── Section 4: This pattern has a name ───────────────────────────── */}
        <Block>
          {/* NamedBand */}
          <div style={{
            background: NAVY, color: "#fff",
            borderRadius: 12, padding: "16px 20px",
            display: "flex", flexDirection: "column", gap: 4,
          }}>
            <div style={{
              font: "700 10px/1.4 var(--font-sans, system-ui)",
              letterSpacing: "0.12em", textTransform: "uppercase",
              color: AMBER,
            }}>This pattern has a name</div>
            <div style={{
              fontFamily: BF, fontWeight: 800,
              fontSize: "clamp(20px,3vw,26px)", lineHeight: 1.2,
            }}>{archetypeName}</div>
          </div>
          <P>{anecdote}</P>
          {/* Strength / Shadow */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{
              background: "#E8F5F1", border: `1px solid ${GREEN}`,
              borderRadius: 10, padding: "12px 16px",
              display: "flex", gap: 10, alignItems: "flex-start",
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>✓</span>
              <div>
                <div style={{ font: "700 11px/1.4 var(--font-sans, system-ui)", letterSpacing: "0.08em", textTransform: "uppercase", color: GREEN, marginBottom: 2 }}>Strength</div>
                <P>{strength}</P>
              </div>
            </div>
            <div style={{
              background: "#FFF5F5", border: "1px solid #F8C4C4",
              borderRadius: 10, padding: "12px 16px",
              display: "flex", gap: 10, alignItems: "flex-start",
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>↔</span>
              <div>
                <div style={{ font: "700 11px/1.4 var(--font-sans, system-ui)", letterSpacing: "0.08em", textTransform: "uppercase", color: "#C05050", marginBottom: 2 }}>The other side</div>
                <P>{shadow}</P>
              </div>
            </div>
          </div>
        </Block>

        {/* ── Section 5: Parent half ────────────────────────────────────────── */}
        <Block>
          <H2>And your half of it</H2>
          <P>{disarm}</P>
          {fitReveal && (
            <div style={{
              background: "#fff", border: `2px solid ${NAVY}`,
              borderRadius: 12, padding: "18px 20px",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <div style={{
                font: "700 10px/1.4 var(--font-sans, system-ui)",
                letterSpacing: "0.1em", textTransform: "uppercase",
                color: NAVY,
              }}>You are not the problem here</div>
              <P>{fitReveal}</P>
            </div>
          )}
        </Block>

        {/* ── Section 6: Six skills ─────────────────────────────────────────── */}
        <Block>
          <H2>Where {childName} is on the six</H2>
          <P>This is the typical shape for children with {childName}&rsquo;s pattern.</P>
          <StageMeter breakIdx={breakIdx} />
          <P>Children with this pattern usually hold the early skills without much trouble. The first real friction tends to arrive at <strong style={{ color: NAVY }}>{breakName}</strong> — which is where the programme opens, rather than spending two weeks on what {childName} most likely already has.</P>
        </Block>

        {/* ── Section 7: What changes ───────────────────────────────────────── */}
        <Block>
          <H2>What this looks like in six weeks</H2>
          <div style={{
            background: "#fff", border: `1px solid ${LINE}`,
            borderRadius: 12, padding: "20px",
            borderLeft: `4px solid ${TEAL}`,
          }}>
            <div style={{
              font: "700 11px/1.4 var(--font-sans, system-ui)",
              letterSpacing: "0.08em", textTransform: "uppercase",
              color: TEAL, marginBottom: 10,
            }}>Six weeks from now</div>
            <P>{futureScene}</P>
          </div>
        </Block>

        {/* ── Section 8: Window note ────────────────────────────────────────── */}
        <div style={{
          background: NAVY, color: "#fff",
          borderRadius: 16, padding: "24px 24px 22px",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              background: AMBER, color: NAVY,
              font: "700 11px/1 var(--font-sans, system-ui)",
              letterSpacing: "0.06em", textTransform: "uppercase",
              padding: "4px 10px", borderRadius: 6, flexShrink: 0,
            }}>Ages {ageBand}</div>
            <div style={{ font: "700 15px/1.3 var(--font-sans, system-ui)", color: "#fff" }}>
              Why now genuinely matters
            </div>
          </div>
          <p style={{ margin: 0, font: "400 14px/1.65 var(--font-sans, system-ui)", color: "rgba(255,255,255,.8)" }}>
            {WINDOW_NOTES[ageBand]}
          </p>
        </div>

        {/* ── Section 9: Handoff ────────────────────────────────────────────── */}
        <Block>
          {/* YOU NOW KNOW panel */}
          <div style={{
            display: "grid", gap: 12,
            gridTemplateColumns: "1fr 1fr",
          }}>
            <div style={{
              background: "#fff", border: `1px solid ${LINE}`,
              borderRadius: 12, padding: "16px",
            }}>
              <div style={{ font: "700 10px/1.4 var(--font-sans, system-ui)", letterSpacing: "0.1em", textTransform: "uppercase", color: DIM, marginBottom: 6 }}>You now know</div>
              <p style={{ margin: 0, font: "500 13px/1.55 var(--font-sans, system-ui)", color: INK }}>
                <strong>WHY</strong> it happens — and what&rsquo;s actually holding it in place.
              </p>
            </div>
            <div style={{
              background: NAVY, borderRadius: 12, padding: "16px",
            }}>
              <div style={{ font: "700 10px/1.4 var(--font-sans, system-ui)", letterSpacing: "0.1em", textTransform: "uppercase", color: AMBER, marginBottom: 6 }}>Next question</div>
              <p style={{ margin: 0, font: "500 13px/1.55 var(--font-sans, system-ui)", color: "#fff" }}>
                What do you <strong>change</strong> on Monday?
              </p>
            </div>
          </div>

          {/* Navy handoff panel */}
          <div style={{
            background: "#EFF3FA", borderRadius: 12, padding: "20px",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            <div style={{ font: "700 13px/1.4 var(--font-sans, system-ui)", color: NAVY }}>
              That&rsquo;s what the Roadmap is for
            </div>
            <P>Six weeks, one change each, in the order {childName}&rsquo;s pattern requires — with the exact words to use.</P>
            <div className="pv-pill-row">
              {[
                ["🎯", `Built from ${childName}’s own answers`],
                ["🗓️", "One change a week, never a system to run"],
                ["🌱", `Starts at “${breakName}”, not at week one of six`],
              ].map(([emoji, text]) => (
                <div key={text} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  font: "500 13px/1.4 var(--font-sans, system-ui)", color: NAVY,
                }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{emoji}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </Block>

        {/* ── Section 10: Pricing ───────────────────────────────────────────── */}
        <div style={{
          background: "#fff", border: `2px solid ${LINE}`,
          borderRadius: 16, padding: "32px 28px",
          display: "flex", flexDirection: "column", gap: 14, alignItems: "center",
          textAlign: "center",
        }}>
          <h2 style={{
            margin: 0, fontFamily: BF, fontWeight: 800,
            fontSize: "clamp(20px,3vw,24px)", lineHeight: 1.2, color: NAVY,
          }}>Unlock all six weeks for {childName}</h2>
          <P dim>Sequenced from this report. Nothing to adapt, nothing generic.</P>
          <div style={{
            font: "800 40px/1 var(--font-sans, system-ui)",
            color: NAVY, letterSpacing: "-0.02em",
          }}>₹2,999</div>
          <a href={roadmapUrl} style={{
            display: "block", width: "100%", maxWidth: 360,
            background: AMBER, color: NAVY,
            font: "700 16px/1.3 var(--font-sans, system-ui)",
            padding: "16px 28px", borderRadius: 10,
            textDecoration: "none", textAlign: "center",
          }}>See {childName}&rsquo;s Roadmap →</a>
          <p style={{ margin: 0, font: "400 12px/1.4 var(--font-sans, system-ui)", color: DIM }}>
            7-day guarantee · You keep this report either way
          </p>
        </div>

        {/* ── Disclaimer ────────────────────────────────────────────────────── */}
        <p style={{
          margin: "0 0 44px",
          font: "400 12px/1.55 var(--font-sans, system-ui)",
          color: DIM, textAlign: "center",
        }}>
          This report is for your understanding and guidance only. It is not a diagnostic tool.
          Nothing here names, rules out, or tests for any condition.
        </p>

      </div>
    </div>
  );
}
