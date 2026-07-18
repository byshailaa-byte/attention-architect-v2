import {
  archetypeContent,
  patternContent,
  getFitContent,
  objectivePhrases,
  triedPhrases,
  betterPhrases,
} from "@/content";
import { Prose, inlineNodes } from "@/lib/report/prose";
import { fillTokens } from "@/lib/report/tokens";
import { buildPronounTokens, type Gender } from "@/lib/report/pronouns";
import { TODO } from "@/lib/content/todo";
import type { AxisResult } from "@/lib/engine/scorer";
import PriceCards from "./PriceCards";

const BG = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";

type AssessmentRow = {
  session_id: string;
  child_name: string;
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
  concerns: string[];
  tried: string[] | null;
  better: string[] | null;
};

// ── Inline helpers ──────────────────────────────────────────────────────────

function Kicker({ text, light = false }: { text: string; light?: boolean }) {
  return (
    <div style={{ fontSize: "11.5px", letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 700, marginBottom: "22px", color: light ? "var(--calm-text)" : "var(--marker)" }}>
      {text}
    </div>
  );
}

function CardLabel({ text }: { text: string }) {
  return (
    <div style={{ fontSize: "11px", color: "#D8D6E0", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: "10px", fontWeight: 600 }}>
      {text}
    </div>
  );
}

function AxisBar({ label, axis, description }: { label: string; axis: AxisResult; description: string }) {
  const pct = axis.eligible ? Math.round(axis.norm * 100) : 0;
  const band = axis.eligible ? axis.band : "Ineligible";
  const bandBg = band === "Strong" ? "#d4eed4" : band === "Low" ? "#fdd" : "#f0eee8";
  const bandColor = band === "Strong" ? "#2a6a2a" : band === "Low" ? "var(--redpen)" : "var(--ink-dim)";

  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--ink)" }}>{label}</span>
        <span style={{ background: bandBg, color: bandColor, fontSize: "12px", fontWeight: 500, padding: "2px 10px", borderRadius: "999px" }}>{band}</span>
      </div>
      <div style={{ height: "8px", borderRadius: "4px", background: "#e8e5d8", marginBottom: "6px" }}>
        {axis.eligible && (
          <div style={{ height: "100%", borderRadius: "4px", background: "var(--calm)", width: `${pct}%` }} />
        )}
      </div>
      <p style={{ fontSize: "14px", color: "var(--ink-dim)", lineHeight: 1.55 }}>{description}</p>
    </div>
  );
}

// ── Report component ────────────────────────────────────────────────────────

export default function ReportView({ assessment: a }: { assessment: AssessmentRow }) {
  const arch    = archetypeContent[a.archetype];
  const pattern = patternContent[a.parent_pattern];
  const fit     = getFitContent(a.archetype, a.parent_pattern);

  const childName  = a.child_name;
  const parentName = a.parent_name;

  const objectiveKey    = a.concerns?.[0] ?? "";
  const hasObjective    = objectiveKey !== "";
  const objectivePhrase = hasObjective
    ? (objectivePhrases[objectiveKey]?.display ?? TODO(`objective/${objectiveKey}`))
    : null;

  const triedKeys: string[]  = a.tried ?? [];
  const hasTried             = triedKeys.length > 0;
  const triedDisplay         = hasTried
    ? triedKeys.map((k) => triedPhrases[k]?.display ?? TODO(`tried/${k}`)).join(", ")
    : null;

  const betterKeys: string[] = a.better ?? [];
  const hasBetter            = betterKeys.length > 0;
  const betterDisplay        = hasBetter
    ? betterKeys.map((k) => betterPhrases[k]?.display ?? TODO(`better/${k}`)).join(", ")
    : null;

  const tokens: Record<string, string> = {
    child_name: childName,
    name: parentName,
    ...buildPronounTokens(a.child_gender as Gender),
    ...(objectivePhrase ? { objective: objectivePhrase } : {}),
    ...(triedDisplay ? { tried: triedDisplay } : {}),
    ...(betterDisplay ? { better: betterDisplay } : {}),
  };

  function fill(text: string): string {
    return fillTokens(text, tokens);
  }

  const reframeFragment   = arch?.s4ReframeClose ?? TODO("archetypes/s4ReframeClose");
  const mechanismTemplate = pattern?.s4MechanismTemplate ?? TODO("patterns/s4MechanismTemplate");
  const mechanismSentence = fill(mechanismTemplate.replace(/\{\{child_reframe_close\}\}/g, reframeFragment));
  const reframeCloseFull  = `The problem isn't that ${childName} can't focus. ${mechanismSentence}`;

  return (
    <main style={{ background: "var(--ink)", color: "var(--paper)", fontFamily: "var(--font-instrument), 'Instrument Sans', sans-serif" }}>

      {/* ── S1: DARK HERO ───────────────────────────────────────────────── */}
      <section className="rep-dark">
        <div className="rep-shell">
          <Kicker text="Blueprint · 1 of 8" />
          <h1 style={{ fontFamily: BG, fontWeight: 800, fontSize: "44px", lineHeight: 1.15, color: "var(--paper)", marginBottom: "24px", letterSpacing: "-.01em" }}>
            What we found{" "}
            <span style={{ color: "var(--marker)" }}>surprised us.</span>
          </h1>

          {hasObjective ? (
            <div style={{ fontSize: "19px", color: "var(--paper)", marginBottom: "28px", fontWeight: 600, lineHeight: 1.4 }}>
              {parentName}, you told us <strong style={{ color: "var(--marker)" }}>{objectivePhrase}</strong> was the thing bothering you most. For{" "}
              <strong style={{ color: "var(--marker)" }}>{childName}</strong>, that&rsquo;s rarely the real story — it&rsquo;s usually about{" "}
              {inlineNodes(fill(arch?.s1FlavorPhrase ?? TODO("archetypes/s1FlavorPhrase")))}.
            </div>
          ) : (
            <div style={{ fontSize: "19px", color: "var(--paper)", marginBottom: "28px", fontWeight: 600, lineHeight: 1.4 }}>
              {parentName}, what shapes <strong style={{ color: "var(--marker)" }}>{childName}</strong>&rsquo;s attention is{" "}
              {inlineNodes(fill(arch?.s1FlavorPhrase ?? TODO("archetypes/s1FlavorPhrase")))}.
            </div>
          )}

          <p style={{ fontSize: "17px", lineHeight: 1.7, color: "rgba(246,244,236,.7)", maxWidth: "640px", marginBottom: "36px" }}>
            You&rsquo;ve already seen it:{" "}
            {inlineNodes(fill(arch?.s1EvidenceObservation ?? TODO("archetypes/s1EvidenceObservation")))}.{" "}
            That&rsquo;s not a focus problem. It&rsquo;s the opposite of one.
          </p>

          <div className="combo-row-rep">
            <div style={{ background: "rgba(246,244,236,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: "14px", padding: "24px" }}>
              <CardLabel text={`${childName}'s Attention Type`} />
              <div style={{ fontFamily: BG, fontWeight: 800, fontSize: "22px", color: "var(--marker)" }}>
                {a.archetype}
              </div>
            </div>
            <div style={{ background: "rgba(246,244,236,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: "14px", padding: "24px" }}>
              <CardLabel text="Your Parent Pattern" />
              <div style={{ fontFamily: BG, fontWeight: 800, fontSize: "22px", color: "var(--marker)" }}>
                {a.parent_pattern}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── S2–7: LIGHT READ CARDS IN DARK WRAPPER ──────────────────────── */}
      <div className="rep-read-wrap">

        {/* S2: The Pattern */}
        <div className="rep-read-card">
          <Kicker text="The Pattern · 2 of 8" light />
          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "34px", lineHeight: 1.2, color: "var(--ink)", marginBottom: "22px", letterSpacing: "-.01em" }}>
            How {childName} learned to pay attention
          </h2>
          <Prose
            text={fill(arch?.s2Anecdote ?? TODO("archetypes/s2Anecdote"))}
            style={{ fontSize: "17.5px", lineHeight: 1.72, color: "#5C5950", marginBottom: "16px" }}
          />

          <blockquote style={{ margin: "24px 0", padding: "18px 22px", background: "var(--marker)", borderRadius: "10px", fontSize: "16.5px", lineHeight: 1.55, fontStyle: "italic", color: "var(--marker-ink)" }}>
            {fill(arch?.s2Pullquote ?? TODO("archetypes/s2Pullquote"))}
          </blockquote>

          <div style={{ display: "flex", gap: "16px", marginTop: "24px" }}>
            <div style={{ flex: 1, background: "var(--paper)", borderRadius: "10px", padding: "16px 20px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#2a6a2a", marginBottom: "10px" }}>The strength</div>
              <p style={{ fontSize: "14.5px", color: "var(--ink)", lineHeight: 1.6 }}>
                When it&rsquo;s on,{" "}
                {inlineNodes(fill(arch?.s2Strength ?? TODO("archetypes/s2Strength")))}
              </p>
            </div>
            <div style={{ flex: 1, background: "var(--paper)", borderRadius: "10px", padding: "16px 20px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#8b3020", marginBottom: "10px" }}>The shadow</div>
              <p style={{ fontSize: "14.5px", color: "var(--ink)", lineHeight: 1.6 }}>
                But{" "}
                {inlineNodes(fill(arch?.s2Shadow ?? TODO("archetypes/s2Shadow")))}
              </p>
            </div>
          </div>

          {/* Parent worries + self doubts from current S3 — preserved here */}
          <div style={{ marginTop: "36px", borderTop: "1px solid rgba(35,36,44,.1)", paddingTop: "28px" }}>
            <p style={{ fontSize: "14px", color: "var(--ink-dim)", marginBottom: "20px", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--ink)" }}>{parentName}</strong>, here&rsquo;s what we heard in parents like you:
            </p>
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-dim)", marginBottom: "12px" }}>
                About {childName}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {(arch?.s3ParentWorries ?? [TODO("archetypes/s3ParentWorries[0]"), TODO("archetypes/s3ParentWorries[1]")]).map(
                  (worry: string, i: number) => (
                    <div key={i} style={{ background: "var(--paper)", border: "1px solid rgba(35,36,44,.1)", borderRadius: "10px", padding: "12px 16px", fontSize: "14px", color: "var(--ink)", lineHeight: 1.6, fontStyle: "italic" }}>
                      &ldquo;{fill(worry)}&rdquo;
                    </div>
                  )
                )}
              </div>
            </div>
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-dim)", marginBottom: "12px" }}>
                About yourself
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {(pattern?.s3SelfDoubts ?? [TODO("patterns/s3SelfDoubts[0]"), TODO("patterns/s3SelfDoubts[1]")]).map(
                  (doubt: string, i: number) => (
                    <div key={i} style={{ background: "var(--paper)", border: "1px solid rgba(35,36,44,.1)", borderRadius: "10px", padding: "12px 16px", fontSize: "14px", color: "var(--ink)", lineHeight: 1.6, fontStyle: "italic" }}>
                      &ldquo;{fill(doubt)}&rdquo;
                    </div>
                  )
                )}
              </div>
            </div>
            <Prose
              text={fill(pattern?.s3Disarm ?? TODO("patterns/s3Disarm"))}
              style={{ fontSize: "15px", color: "var(--ink)", lineHeight: 1.7 }}
            />
          </div>
        </div>

        {/* S3: The Fit — dark gradient reveal */}
        <div className="rep-fit">
          <Kicker text="The Fit · 3 of 8" />
          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "30px", lineHeight: 1.2, color: "var(--paper)", marginBottom: "20px", letterSpacing: "-.01em", position: "relative" }}>
            Where you two meet
          </h2>
          <Prose
            text={fill(fit?.fitReveal ?? TODO("fits/fitReveal"))}
            style={{ fontSize: "17px", lineHeight: 1.75, color: "rgba(246,244,236,.75)", maxWidth: "680px", position: "relative" }}
          />
        </div>

        {/* S4: The Real Problem */}
        <div className="rep-read-card">
          <Kicker text="The Real Problem · 4 of 8" light />
          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "34px", lineHeight: 1.2, color: "var(--ink)", marginBottom: "22px", letterSpacing: "-.01em" }}>
            You may be solving the wrong problem
          </h2>

          {hasTried && (
            <p style={{ fontSize: "16px", color: "var(--ink)", lineHeight: 1.7, marginBottom: "18px" }}>
              You&rsquo;ve already tried <strong>{triedDisplay}</strong>. That&rsquo;s a reasonable thing to try — it just doesn&rsquo;t touch the real driver:{" "}
              <em>{inlineNodes(fill(arch?.s1FlavorPhrase ?? TODO("archetypes/s1FlavorPhrase")))}</em>.
            </p>
          )}

          <p style={{ fontSize: "17.5px", lineHeight: 1.7, color: "#5C5950", marginBottom: "20px" }}>
            Attention doesn&rsquo;t grow from pressure. It grows when something feels truly {tokens.child_pronoun_poss}.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
            {(arch?.s4Analysis ?? [TODO("archetypes/s4Analysis[0]"), TODO("archetypes/s4Analysis[1]")]).map(
              (bullet: string, i: number) => (
                <div key={i} style={{ background: "var(--paper)", borderRadius: "10px", padding: "16px 20px", fontSize: "14.5px", color: "#5C5950", lineHeight: 1.6, display: "flex", gap: "12px" }}>
                  <strong style={{ color: "var(--ink)", flexShrink: 0 }}>—</strong>
                  <span>{inlineNodes(fill(bullet))}</span>
                </div>
              )
            )}
          </div>

          <Prose
            text={reframeCloseFull}
            style={{ fontSize: "16px", color: "var(--ink)", lineHeight: 1.7, marginBottom: "24px" }}
          />

          <div style={{ background: "var(--calm-tint)", borderRadius: "14px", padding: "26px 28px", marginBottom: "24px" }}>
            <p style={{ color: "var(--calm-text)", fontSize: "14.5px", lineHeight: 1.65, marginBottom: "12px" }}>
              <strong>Why this matters more than it used to:</strong>{" "}
              the world {childName} is growing up into asks something different of attention than it used to. Information used to be the hard part to find. Now it&rsquo;s the easiest thing in the world — the hard part is deciding what deserves attention at all.
            </p>
            <p style={{ color: "var(--calm-text)", fontSize: "14.5px", lineHeight: 1.65, marginBottom: 0 }}>
              That&rsquo;s not really a knowledge problem anymore. As AI takes over more of the easy thinking, what&rsquo;s left — staying with something long enough for it to matter — is what actually separates kids who thrive from kids who don&rsquo;t. That&rsquo;s not a fixed trait. It&rsquo;s a skill.
            </p>
          </div>

          <div style={{ background: "var(--marker)", borderRadius: "10px", padding: "16px 20px", textAlign: "center" }}>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--marker-ink)" }}>
              The six-week program builds on exactly this. Keep reading.
            </p>
          </div>
        </div>

        {/* S5: Attention Ecosystem */}
        <div className="rep-read-card">
          <Kicker text="The Ecosystem · 5 of 8" light />
          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "34px", lineHeight: 1.2, color: "var(--ink)", marginBottom: "8px", letterSpacing: "-.01em" }}>
            What&rsquo;s actually competing for {tokens.child_pronoun_poss} attention
          </h2>
          <p style={{ fontSize: "14px", color: "var(--ink-dim)", marginBottom: "28px" }}>Not a score. A map.</p>

          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--ink)" }}>Direction</span>
              <span style={{ background: "#f0edf8", color: "var(--calm-text)", fontSize: "12px", fontWeight: 600, padding: "2px 10px", borderRadius: "999px" }}>
                {a.archetype}
              </span>
            </div>
            <p style={{ fontSize: "14px", color: "var(--ink-dim)", lineHeight: 1.55 }}>
              The core attention type. Everything else radiates from here.
            </p>
          </div>

          <AxisBar
            label="Stability"
            axis={a.axes.stability}
            description={fill(arch?.s5AxisDescriptions?.stability ?? TODO("archetypes/s5AxisDescriptions.stability"))}
          />
          <AxisBar
            label="Resistance"
            axis={a.axes.resistance}
            description={fill(arch?.s5AxisDescriptions?.resistance ?? TODO("archetypes/s5AxisDescriptions.resistance"))}
          />
          {a.axes.recovery.eligible ? (
            <AxisBar
              label="Recovery"
              axis={a.axes.recovery}
              description={fill(arch?.s5AxisDescriptions?.recovery ?? TODO("archetypes/s5AxisDescriptions.recovery"))}
            />
          ) : (
            <div style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--ink)" }}>Recovery</span>
                <span style={{ background: "#f0eee8", color: "var(--ink-dim)", fontSize: "12px", fontWeight: 500, padding: "2px 10px", borderRadius: "999px" }}>Ineligible</span>
              </div>
              <p style={{ fontSize: "14px", color: "var(--ink-dim)", lineHeight: 1.55 }}>
                Not enough data to score this axis reliably.
              </p>
            </div>
          )}

          <div style={{ background: "var(--paper)", border: "1px solid rgba(35,36,44,.1)", borderRadius: "10px", padding: "16px 20px", marginTop: "8px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-dim)", marginBottom: "8px" }}>
              Where the program focuses
            </div>
            <div style={{ fontFamily: BG, fontWeight: 700, fontSize: "16px", color: "var(--calm-text)" }}>
              {(a.weakest_two ?? []).join(" + ")}
            </div>
          </div>
        </div>

        {/* S6: A Different Saturday */}
        <div className="rep-read-card">
          <Kicker text="A Different Saturday · 6 of 8" light />
          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "34px", lineHeight: 1.2, color: "var(--ink)", marginBottom: "22px", letterSpacing: "-.01em" }}>
            What it looks like when it clicks
          </h2>

          {hasBetter && (
            <p style={{ fontSize: "16px", color: "var(--ink)", lineHeight: 1.7, marginBottom: "18px" }}>
              You told us <strong>{betterDisplay}</strong> is what you&rsquo;re hoping for. Here&rsquo;s what that could look like for {childName} specifically:
            </p>
          )}

          <Prose
            text={fill(arch?.s6FutureScene ?? TODO("archetypes/s6FutureScene"))}
            style={{ fontSize: "17.5px", lineHeight: 1.72, color: "#5C5950", marginBottom: "16px" }}
          />

          <p style={{ fontSize: "14.5px", color: "var(--ink-dim)", fontStyle: "italic", margin: "20px 0" }}>
            Not a promise. A possibility.
          </p>

          <Prose
            text={fill(pattern?.s6FutureVision ?? TODO("patterns/s6FutureVision"))}
            style={{ fontSize: "16px", color: "var(--ink)", lineHeight: 1.7 }}
          />
        </div>

        {/* S7: One Year From Now — last card, stakes grid */}
        <div className="rep-read-card last-card">
          <Kicker text="One Year From Now · 7 of 8" light />
          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "34px", lineHeight: 1.2, color: "var(--ink)", marginBottom: "22px", letterSpacing: "-.01em" }}>
            A fork in the road
          </h2>

          <div className="stakes-row" style={{ marginTop: "8px" }}>
            <div style={{ background: "rgba(221,75,55,.08)", border: "1px solid rgba(221,75,55,.25)", borderRadius: "14px", padding: "26px" }}>
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700, color: "#B83A2A", marginBottom: "12px" }}>
                If nothing changes
              </div>
              <Prose
                text={fill(`${arch?.s7StayPathBase ?? TODO("archetypes/s7StayPathBase")} ${pattern?.s7StayPathClause ?? TODO("patterns/s7StayPathClause")}`)}
                style={{ fontSize: "14.5px", color: "rgba(35,36,44,.7)", lineHeight: 1.6 }}
              />
            </div>
            <div style={{ background: "rgba(63,190,122,.08)", border: "1px solid rgba(63,190,122,.25)", borderRadius: "14px", padding: "26px" }}>
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700, color: "#1A7A4A", marginBottom: "12px" }}>
                If you decide
              </div>
              <Prose
                text={fill(`${arch?.s7ChangePathBase ?? TODO("archetypes/s7ChangePathBase")} ${pattern?.s7ChangePathClause ?? TODO("patterns/s7ChangePathClause")}`)}
                style={{ fontSize: "14.5px", color: "rgba(35,36,44,.7)", lineHeight: 1.6 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── S8: DARK PRICING MOMENT ─────────────────────────────────────── */}
      <section className="rep-price">
        <div className="rep-shell">
          <Kicker text="Your Next Move · 8 of 8" />
          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "34px", lineHeight: 1.2, color: "var(--paper)", marginBottom: "16px", letterSpacing: "-.01em" }}>
            What deserves {childName}&rsquo;s attention?
          </h2>
          <p style={{ fontSize: "16px", color: "rgba(246,244,236,.65)", maxWidth: "480px", margin: "0 auto 24px", lineHeight: 1.65 }}>
            The program works on{" "}
            <strong style={{ color: "var(--paper)" }}>{(a.weakest_two ?? []).join(" and ")}</strong>
            {" "}— the two axes where {childName} has the most room to move.
          </p>

          {/* What's included — sits above price cards per spec */}
          <div style={{ maxWidth: "640px", margin: "0 auto 32px", textAlign: "left" }}>
            <p style={{ fontFamily: BG, fontWeight: 700, fontSize: "14px", color: "var(--paper)", marginBottom: "12px" }}>
              What&rsquo;s included
            </p>
            <ul style={{ display: "flex", flexDirection: "column", gap: "8px", listStyle: "none", padding: 0 }}>
              {[
                `Personalized from ${childName}'s exact profile — not a generic plan`,
                "One practical step each week, built for real, busy homes",
                "Weekly insights as you go, so you're not guessing whether it's working",
                "Built directly on the roadmap above — nothing generic bolted on",
              ].map((item, i) => (
                <li key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "14px", color: "rgba(246,244,236,.65)", lineHeight: 1.55 }}>
                  <span style={{ color: "var(--green)", fontWeight: 700, flexShrink: 0 }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Price cards — client component (triggers Razorpay modal) */}
          <PriceCards
            sessionId={a.session_id}
            childName={childName}
            weakestFirst={(a.weakest_two ?? [])[0] ?? "Resistance"}
          />

          {/* How the 6 weeks work — directly after price cards per spec */}
          <div style={{ maxWidth: "640px", margin: "28px auto 0", background: "rgba(246,244,236,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: "14px", padding: "24px 28px", textAlign: "left" }}>
            <div style={{ fontSize: "11px", color: "var(--marker)", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700, marginBottom: "10px" }}>
              How the 6 weeks work
            </div>
            <p style={{ color: "rgba(246,244,236,.65)", fontSize: "14px", lineHeight: 1.65, margin: 0 }}>
              Week 1 starts with {(a.weakest_two ?? [])[0] ?? "Resistance"} — the fastest place to see change. Each week after builds directly on what worked (and what didn&rsquo;t) the week before, staying focused on {(a.weakest_two ?? []).join(" and ")} throughout. You&rsquo;ll always know exactly what&rsquo;s coming next, one week at a time — never a 20-item plan dropped on you all at once.
            </p>
          </div>

          <p style={{ fontSize: "13px", color: "rgba(246,244,236,.6)", marginTop: "20px" }}>
            Less than one month of tuition — for the skill every hour of tuition depends on.
          </p>

          <div style={{ maxWidth: "640px", margin: "20px auto 0", background: "rgba(63,190,122,.1)", border: "1px solid rgba(63,190,122,.25)", borderRadius: "12px", padding: "16px 20px", fontSize: "14px", color: "var(--green)", textAlign: "left" }}>
            <strong>7 days.</strong>{" "}
            <a href="mailto:support@thehumandecision.in" style={{ color: "var(--green)", textDecoration: "underline" }}>Email us</a> and we&rsquo;ll refund you in full — no forms, no questions.
          </div>

          {/* 3-card testimonial scroll — dark context */}
          <div
            style={{ display: "flex", gap: "16px", overflowX: "auto", scrollSnapType: "x mandatory", padding: "4px 4px 16px", margin: "56px -4px 0", WebkitOverflowScrolling: "touch" }}
          >
            {[
              {
                quote: "We thought our son was just being lazy or spending too much time on screens. This helped us understand what was really happening. Homework became much calmer, and so did our evenings.",
                cite: "— Manya Gangele, Parent of an 11-year-old Son · Indore",
              },
              {
                quote: "I was constantly reminding my daughter to stay on task. Small changes in how we approached things at home made a huge difference. She's much more independent now.",
                cite: "— Suchitra Mehta, Parent of an 8-year-old Daughter · Mumbai",
              },
              {
                quote: "We believed our son just needed more discipline. This completely changed our perspective. A few simple changes reduced the daily arguments, and studying no longer feels like a battle.",
                cite: "— Sandeel Shukla, Parent of a 14-year-old Son · Raipur",
              },
            ].map(({ quote, cite }) => (
              <div
                key={cite}
                style={{ background: "rgba(246,244,236,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: "14px", padding: "26px", minWidth: "280px", maxWidth: "320px", flexShrink: 0, scrollSnapAlign: "start", textAlign: "left" }}
              >
                <blockquote style={{ color: "var(--paper)", fontSize: "15px", lineHeight: 1.6, marginBottom: "14px", fontStyle: "normal" }}>
                  &ldquo;{quote}&rdquo;
                </blockquote>
                <cite style={{ fontStyle: "normal", color: "rgba(246,244,236,.55)", fontSize: "12.5px", fontWeight: 600 }}>
                  {cite}
                </cite>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", fontSize: "12px", color: "rgba(246,244,236,.4)", marginTop: "4px" }}>
            ← Scroll to see more →
          </div>

          {/* FAQ — native details/summary accordion */}
          <div style={{ maxWidth: "640px", margin: "48px auto 0", textAlign: "left" }}>
            <p style={{ fontFamily: BG, fontWeight: 700, fontSize: "14px", color: "var(--paper)", marginBottom: "12px" }}>
              Questions
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                {
                  q: "Is this a diagnosis?",
                  a: `No. Not a diagnosis, not a verdict — a map. Nothing here labels ${childName}; it shows how ${fill("{{child_pronoun_poss}}")} attention actually works and what to do about it.`,
                },
                {
                  q: `What if ${childName} doesn't cooperate?`,
                  a: `The first moves are yours to make — the environment and routine changes in Week 1 don't need ${fill("{{child_pronoun_poss}}")} buy-in to start. Participation tends to grow as the friction shrinks, not the other way around.`,
                },
                {
                  q: "How much time does this take each week?",
                  a: "One practical step, not a curriculum. Most weeks take 15–20 minutes to read and a few minutes a day to actually do.",
                },
              ].map(({ q, a }) => (
                <details
                  key={q}
                  style={{ border: "1px solid rgba(255,255,255,.1)", borderRadius: "12px", background: "rgba(255,255,255,.04)" }}
                >
                  <summary style={{ padding: "14px 16px", fontSize: "14px", fontWeight: 600, cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--paper)" }}>
                    {q}
                    <span style={{ color: "rgba(246,244,236,.4)", fontSize: "20px", fontWeight: 300, flexShrink: 0, marginLeft: "12px" }}>+</span>
                  </summary>
                  <div style={{ padding: "0 16px 14px", borderTop: "1px solid rgba(255,255,255,.08)", fontSize: "14px", color: "rgba(246,244,236,.65)", lineHeight: 1.6 }}>
                    {a}
                  </div>
                </details>
              ))}
            </div>
          </div>

          {/* Honest-path block */}
          {process.env.HONEST_PATH_DISPLAY_ENABLED === "true" && (
            <div style={{ maxWidth: "640px", margin: "32px auto 0", padding: "16px 20px", borderRadius: "10px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", fontSize: "13.5px", color: "rgba(246,244,236,.55)", lineHeight: 1.6, textAlign: "left" }}>
              A quick promise: if anything here warranted a professional&rsquo;s eyes, we&rsquo;d say so plainly. — Nothing did.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
