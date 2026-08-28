"use client";

const NAVY   = "#14284D";
const GOLD   = "#F5A623";
const TEAL   = "#22A38A";
const INK    = "#1A1A1A";
const DIM    = "#555";
const LINE   = "#E2DFDA";
const BG     = "#FAFAF7";
const CARD   = "#FFFFFF";
const BF     = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";

export type WeekPreview = {
  weekTitle: string;
  bullets: [string, string, string];
};

export type WeekContent = {
  weekTitle: string;
  day2Title: string;   // WHAT YOU DO — primary action
  day4Title: string;   // WHAT YOU DO — secondary action
  whatToSay: string;   // PDF shared script (verbatim)
};

type Props = {
  childName:    string;
  archetype:    string;
  weekContents: WeekContent[];
  sessionId:    string | null;
};

const MOBILE_CSS = `
  details summary::-webkit-details-marker { display: none; }
  details summary::marker { display: none; }
  .rm-acc-icon::after { content: "+"; font-weight: 400; }
  details[open] .rm-acc-icon::after { content: "−"; }
  details summary { border-radius: 14px; }
  details[open] summary { border-radius: 14px 14px 0 0; }
  @media (max-width: 520px) {
    .rm-locked-grid { grid-template-columns: 1fr !important; }
    .rm-nav-label { display: none !important; }
    .rm-pricing { padding: 24px 18px !important; }
  }
`;

const COMPONENT_LABELS = [
  "STARTING",
  "HOLDING ON",
  "STAYING WITH IT",
  "RECOVERING",
  "CARRYING IT OVER",
  "RUNNING IT THEMSELVES",
] as const;

const ARCHETYPE_SIGNALS: Partial<Record<string, readonly [string, string, string, string, string, string]>> = {
  "The Storm": [
    "They pick one and get going, instead of arguing about which.",
    "They turn it off at the limit they chose, without the negotiation.",
    "They see a whole task through without checking in at every step.",
    "They stop looking at you first to check whether a decision is allowed.",
    "They start factoring their sibling in before it becomes a fight.",
    "They decide something before you've thought to offer the choice.",
  ],
  "The All-In Kid": [
    "They get into something without needing a run-up.",
    "They come out of a screen stretch the way they'd come out of a book.",
    "They keep going on a day that would normally derail it.",
    "A session that goes nowhere doesn't wreck the rest of the day.",
    "They handle a sibling interrupting without it becoming a scene.",
    "They ask for the quiet themselves, before you've offered it.",
  ],
  "The Inventor": [
    "They start their own way instead of waiting to be told how.",
    "They set up a screen task deliberately, not just by default.",
    "They stick with an approach across days, adjusting as they go.",
    "A method failing doesn't make them abandon the whole project.",
    "They take on someone else's idea without it feeling like losing.",
    "They explain why they did it that way, without being asked.",
  ],
  "The Explorer": [
    "An idea gets written down instead of chased mid-homework.",
    "They come back to what they were doing after a screen break.",
    "Reaching for the notepad stops needing a reminder.",
    "An idea going nowhere doesn't stop them having the next one.",
    "They notice they've interrupted someone, without being told.",
    "You find the system being used somewhere you never set it up.",
  ],
  "The Magnet": [
    "They settle into something with you nearby but not involved.",
    "They don't need you watching to stay with a screen task.",
    "They stay with something longer without checking you're still there.",
    "They work through a hard moment while you're in the room, not for you.",
    "They hold their own in a group, not just one-to-one.",
    "They tell you when they want you around — and when they don't.",
  ],
  "The Glue": [
    "Homework starts without the friction it used to start with.",
    "Screen conversations stop beginning as an argument.",
    "A bad day stops taking the whole evening with it.",
    "Something unresolved doesn't mean the night is ruined.",
    "They stop carrying the whole weight of a sibling fight.",
    "They tell you how they're doing before you've asked.",
  ],
  "The Captain": [
    "They run something without checking each step with you.",
    "They keep a rule they set themselves.",
    "Something ongoing keeps running without your reminders.",
    "It going wrong doesn't stop them wanting to run the next thing.",
    "They lead something a sibling has to go along with, and it holds.",
    "They step in and take charge before anyone hands it to them.",
  ],
  "The Live Wire": [
    "Something matters enough to start without a push.",
    "A screen limit holds because they set the stakes on it.",
    "The energy lasts past the exciting first stretch.",
    "Not getting the thing doesn't stop them setting the next stake.",
    "They handle a shared outcome, including someone else losing too.",
    "They set their own stakes without being prompted.",
  ],
};

export default function RoadmapView({ childName: c, archetype, weekContents, sessionId }: Props) {
  void sessionId; // reserved for payment wiring

  const WEEK_COLORS = [TEAL, GOLD, NAVY] as const;

  return (
    <div style={{ background: BG, minHeight: "100dvh", fontFamily: "'Inter', system-ui, sans-serif", color: INK }}>
      <style dangerouslySetInnerHTML={{ __html: MOBILE_CSS }} />

      {/* Nav */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${LINE}`, display: "flex", alignItems: "center", gap: "12px", background: CARD, position: "sticky", top: 0, zIndex: 10 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-horizontal-icon-wordmark.png" alt="Attention Architect" style={{ height: 24, width: "auto", flexShrink: 0 }} />
        <span className="rm-nav-label" style={{ fontSize: "12px", color: DIM, marginLeft: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {c}&rsquo;s Attention Health Roadmap
        </span>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 18px 80px" }}>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div style={{
          font: "700 11px/1.4 var(--font-sans, system-ui)",
          letterSpacing: "0.12em", textTransform: "uppercase",
          color: TEAL, marginBottom: "12px",
        }}>
          THE ROADMAP
        </div>
        <h1 style={{
          fontFamily: BF, fontWeight: 800,
          fontSize: "clamp(24px,5vw,38px)", lineHeight: 1.15,
          color: NAVY, marginBottom: "16px",
        }}>
          It is not your child who moves first. It is you.
        </h1>
        {/* NOTE: spec says three-sentence body from THE_PLAN.pdf — third sentence not located;
            using two authored sentences. Replace with PDF verbatim when available. */}
        <p style={{ fontSize: "16px", color: DIM, lineHeight: 1.7, marginBottom: "44px", maxWidth: "54ch" }}>
          Every plan you have tried asked your child to change. This one changes your role — one step at a time — until managing their attention is no longer your job.
        </p>

        {/* ── Parent Ladder ────────────────────────────────────────────────── */}
        <div style={{ marginBottom: "44px" }}>
          <h2 style={{ fontFamily: BF, fontWeight: 700, fontSize: "20px", color: NAVY, marginBottom: "18px" }}>
            From managing attention to architecting it
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {([
              { color: "#E85D5D", name: "The Reminder Parent",    quote: "Focus. Finish your homework. Put the phone away.",                                    desc: "You manage attention from the outside." },
              { color: "#F5A623", name: "The Observant Parent",   quote: "What keeps pulling their attention away?",                                             desc: "You begin noticing the patterns instead of reacting to every distraction." },
              { color: "#3B82F6", name: "The Guiding Parent",     quote: "What would make this easier to start?",                                                desc: "You stop giving constant instructions and start changing the conditions around attention." },
              { color: "#7C3AED", name: "The Coaching Parent",    quote: "What do you notice about your own attention?",                                          desc: "Your child begins recognising distraction, difficulty, fatigue and what helps them return." },
              { color: TEAL,      name: "The Attention Architect", quote: "I don't have to manage their attention. They are learning to manage it themselves.",  desc: "You design the environment, teach the skills, and gradually hand ownership back to your child." },
            ] as { color: string; name: string; quote: string; desc: string }[]).map((rung, i, arr) => (
              <div key={rung.name} style={{
                display: "flex", gap: 16, alignItems: "flex-start",
                padding: "16px 0",
                borderBottom: i < arr.length - 1 ? `1px solid ${LINE}` : "none",
              }}>
                <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: rung.color, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    font: "700 13px/1 var(--font-sans, system-ui)",
                  }}>{i + 1}</div>
                  {i < arr.length - 1 && <div style={{ width: 2, height: 18, background: LINE, marginTop: 4 }} />}
                </div>
                <div style={{ paddingTop: 4, flex: 1 }}>
                  <div style={{ font: "700 13px/1.3 var(--font-sans, system-ui)", color: rung.color, marginBottom: 3 }}>{rung.name}</div>
                  <div style={{ font: "600 12px/1.45 var(--font-sans, system-ui)", color: INK, fontStyle: "italic", marginBottom: 4 }}>
                    &ldquo;{rung.quote}&rdquo;
                  </div>
                  <p style={{ margin: 0, fontSize: "12.5px", color: DIM, lineHeight: 1.6 }}>{rung.desc}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Footer rail */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginTop: 18,
            font: "500 11.5px/1.4 var(--font-sans, system-ui)", color: DIM,
          }}>
            <span style={{ color: "#E85D5D", fontWeight: 700 }}>More control from you</span>
            <div style={{ flex: 1, height: 2, background: `linear-gradient(to right, #E85D5D, ${TEAL})`, borderRadius: 2 }} />
            <span style={{ color: TEAL, fontWeight: 700 }}>More ownership by your child</span>
          </div>
        </div>

        {/* ── Goal Card ────────────────────────────────────────────────────── */}
        <div style={{
          background: NAVY, borderRadius: 16, padding: "24px", marginBottom: "44px",
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          <div style={{
            font: "700 11px/1.4 var(--font-sans, system-ui)",
            letterSpacing: "0.1em", textTransform: "uppercase", color: GOLD,
          }}>The four moves you&rsquo;ll build</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {([
              ["NOTICE",  "See what&rsquo;s happening before you respond."],
              ["DIRECT",  "Redirect one move — the smallest shift."],
              ["PROTECT", "Build conditions that work with the pattern."],
              ["RECOVER", "Get back to the move after a hard day."],
            ] as [string, string][]).map(([goal, desc]) => (
              <div key={goal} style={{
                background: "rgba(255,255,255,.06)", borderRadius: 10,
                padding: "14px 14px 12px",
                display: "flex", flexDirection: "column", gap: 4,
              }}>
                <div style={{
                  font: "700 11px/1.4 var(--font-sans, system-ui)",
                  letterSpacing: "0.1em", textTransform: "uppercase", color: GOLD,
                }}>{goal}</div>
                <p style={{ margin: 0, fontSize: "12.5px", color: "rgba(255,255,255,.75)", lineHeight: 1.5 }}
                  dangerouslySetInnerHTML={{ __html: desc }} />
              </div>
            ))}
          </div>
          {/* "And for you?" panel */}
          <div style={{
            background: "rgba(255,255,255,.06)", borderRadius: 10,
            padding: "14px 14px 12px",
            borderTop: "1px solid rgba(255,255,255,.1)",
          }}>
            <div style={{
              font: "700 11px/1.4 var(--font-sans, system-ui)",
              letterSpacing: "0.1em", textTransform: "uppercase", color: GOLD, marginBottom: 6,
            }}>And for you?</div>
            <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,.85)", lineHeight: 1.55 }}>
              That&rsquo;s the Attention Architect.
            </p>
          </div>
        </div>

        {/* ── Six weeks ────────────────────────────────────────────────────── */}
        <h2 style={{ fontFamily: BF, fontWeight: 700, fontSize: "20px", color: NAVY, marginBottom: "8px" }}>
          Six weeks that build on each other — not six separate lessons
        </h2>
        <p style={{ fontSize: "14px", color: DIM, lineHeight: 1.65, marginBottom: "10px", maxWidth: "52ch" }}>
          Each week doesn&rsquo;t replace the one before it. It adds to it. By week six, the goal isn&rsquo;t a new habit you&rsquo;re managing for {c} — it&rsquo;s one {c} already has.
        </p>
        <p style={{ fontSize: "11.5px", color: DIM, marginBottom: "20px", letterSpacing: ".01em" }}>
          Small → tested → routine → resilient → shared → automatic.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "44px" }}>
          {weekContents.map(({ weekTitle, day2Title, day4Title, whatToSay }, i) => {
            const tagColor = WEEK_COLORS[i % WEEK_COLORS.length];
            const componentLabel = COMPONENT_LABELS[i] ?? "";
            const archSignals = ARCHETYPE_SIGNALS[archetype] ?? ARCHETYPE_SIGNALS["The All-In Kid"];
            const signal = archSignals?.[i] ?? "";
            return (
              <details key={i} open={i === 0} style={{ background: CARD, border: `1.5px solid ${tagColor}44`, borderRadius: "14px" }}>
                <summary style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "16px 18px", cursor: "pointer", userSelect: "none" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: tagColor, marginBottom: "4px" }}>
                      WEEK {i + 1} · {componentLabel}
                    </div>
                    <div style={{ fontFamily: BF, fontWeight: 800, fontSize: "15px", color: NAVY, lineHeight: 1.3 }}>{weekTitle}</div>
                  </div>
                  <span className="rm-acc-icon" style={{ color: tagColor, fontSize: "20px", flexShrink: 0, marginTop: "2px" }} />
                </summary>
                <div style={{ padding: "0 18px 18px", borderTop: `1px solid ${LINE}` }}>
                  {/* WHAT YOU DO */}
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: "9.5px", fontWeight: 700, color: tagColor, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 }}>
                      What you do
                    </div>
                    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                      {[day2Title, day4Title].filter(Boolean).map((title, bi) => (
                        <li key={bi} style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: "12.5px", color: DIM, lineHeight: 1.45 }}>
                          <span style={{ color: tagColor, fontWeight: 700, flexShrink: 0, fontSize: 11, marginTop: 2 }}>→</span>
                          <span>{title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* WHAT TO WATCH FOR */}
                  {signal && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: "9.5px", fontWeight: 700, color: tagColor, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 5 }}>
                        What to watch for
                      </div>
                      <p style={{ margin: 0, fontSize: "12.5px", color: DIM, lineHeight: 1.55, fontStyle: "italic" }}>{signal}</p>
                    </div>
                  )}
                  {/* WHAT TO SAY */}
                  {whatToSay && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: "9.5px", fontWeight: 700, color: tagColor, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 5 }}>
                        What to say
                      </div>
                      <p style={{ margin: 0, fontSize: "13px", color: NAVY, lineHeight: 1.55, fontWeight: 600 }}>
                        &ldquo;{whatToSay}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>

        {/* ── Pricing ──────────────────────────────────────────────────────── */}
        <div className="rm-pricing" style={{
          background: NAVY, borderRadius: 16, padding: "32px 28px",
          marginBottom: "44px", textAlign: "center",
        }}>
          <p style={{
            margin: "0 0 22px", fontFamily: BF, fontWeight: 700,
            fontSize: "clamp(15px,2.5vw,18px)", lineHeight: 1.4, color: "#fff",
          }}>
            The plan is the same six weeks. What goes underneath is {c}&rsquo;s.
          </p>
          <div style={{
            fontFamily: BF, fontSize: "44px", fontWeight: 800,
            background: `linear-gradient(135deg, ${GOLD}, #FBCB4A)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text", marginBottom: "12px",
          }}>
            ₹2,999
          </div>
          <div style={{
            display: "flex", justifyContent: "center", gap: "10px",
            fontSize: "12px", color: "rgba(255,255,255,.6)",
            marginBottom: "24px", flexWrap: "wrap", alignItems: "center",
          }}>
            <span>One-time</span><span>·</span><span>7-day guarantee</span><span>·</span><span>You keep your report either way</span>
          </div>
          <button style={{
            background: GOLD, color: NAVY,
            fontFamily: BF, fontWeight: 800, fontSize: "16px",
            padding: "16px 32px", borderRadius: "12px",
            border: "none", cursor: "pointer",
            width: "100%", maxWidth: "360px",
          }}>
            Start {c}&rsquo;s roadmap →
          </button>
        </div>

        {/* ── Founders ─────────────────────────────────────────────────────── */}
        <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: "20px", padding: "32px", marginBottom: "32px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: TEAL, marginBottom: "12px" }}>The founders</div>

          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "20px" }}>
            {/* Shashank */}
            <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", flex: "1 1 180px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/founder.jpg" alt="Shashank Agrawal"
                style={{ width: "56px", height: "56px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `2px solid ${GOLD}` }} />
              <div>
                <div style={{ fontFamily: BF, fontWeight: 800, fontSize: "15px", color: NAVY, lineHeight: 1.3, marginBottom: "3px" }}>Shashank Agrawal</div>
                <div style={{ fontSize: "12px", color: DIM, marginBottom: "8px" }}>Founder, Attention Architect</div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(240,197,80,.18)", border: "1px solid rgba(240,197,80,.4)", borderRadius: "999px", padding: "3px 10px", fontSize: "11px", fontWeight: 600, color: "#9a7c10" }}>
                  🎓 IIM Rohtak Alumnus
                </span>
              </div>
            </div>
            {/* Shaily */}
            <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", flex: "1 1 180px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/shaily-headshot-square.png" alt="Shaily Badonia"
                style={{ width: "56px", height: "56px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `2px solid ${TEAL}` }} />
              <div>
                <div style={{ fontFamily: BF, fontWeight: 800, fontSize: "15px", color: NAVY, lineHeight: 1.3, marginBottom: "3px" }}>Shaily Badonia</div>
                <div style={{ fontSize: "12px", color: DIM, marginBottom: "8px" }}>Chief Attention Architect</div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: `${TEAL}18`, border: `1px solid ${TEAL}44`, borderRadius: "999px", padding: "3px 10px", fontSize: "11px", fontWeight: 600, color: TEAL }}>
                  10+ years of experience
                </span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: "14px", color: DIM, lineHeight: 1.7 }}>
            <p style={{ margin: "0 0 14px" }}>
              Attention Architect didn&rsquo;t start as a business plan. It started as years spent trying to understand why the same advice worked for one child and did nothing for another — and slowly realising the missing piece usually wasn&rsquo;t more effort from the parent. It was a clearer map.
            </p>
            <div style={{ borderLeft: `3px solid ${GOLD}`, paddingLeft: "16px", fontStyle: "italic", color: DIM, lineHeight: 1.65 }}>
              &ldquo;We built this because we realised parents are often trying harder when what they actually need is a better map.&rdquo;
            </div>
          </div>
        </div>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <h2 style={{ fontFamily: BF, fontWeight: 700, fontSize: "20px", color: NAVY, marginBottom: "16px" }}>
          Frequently asked questions
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "48px" }}>
          {[
            ["Is this a medical or clinical test?", "No. Attention Architect is a parent-education and self-discovery tool, not a diagnostic service."],
            ["Who is this for?", "Parents of children aged 8–14."],
            ["Does this diagnose ADHD or any condition?", "No — and it's not designed to. If something here concerns you clinically, that's worth a conversation with a pediatrician or child psychologist."],
            ["Is this the same as the report I already got?", `No. The report helped you understand ${c}'s pattern. The roadmap is what helps you act on it, one week at a time.`],
          ].map(([q, a]) => (
            <details key={q} style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: "12px", padding: "16px 20px" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "14.5px", color: INK, listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                {q}
                <span style={{ color: NAVY, fontSize: "18px", flexShrink: 0 }}>+</span>
              </summary>
              <div style={{ marginTop: "12px", fontSize: "14px", color: DIM, lineHeight: 1.65 }}>{a}</div>
            </details>
          ))}
        </div>

        <div style={{ fontSize: "12px", color: DIM, textAlign: "center" }}>
          Attention Architect is a parent-education and guidance platform, not a diagnostic service.
        </div>

      </div>
    </div>
  );
}
