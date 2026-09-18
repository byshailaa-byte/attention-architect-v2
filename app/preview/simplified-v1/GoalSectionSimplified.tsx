"use client";

// Goal picker (v2) for the simplified-v1 funnel — redesigned to goal-picker-v2.html.
// Same API contract, safeguarding flow, and Gate 3 as before. The framing line is
// gone from the picker (it now lives only on the roadmap header); the bridge is
// shortened and restructured; the chosen state is a "locked-in" panel + a
// what-happens-now teaser with a CTA into the roadmap.
//
// Gate 3: the flagged response from the route contains only the fixed
// SAFEGUARDING_RESPONSE — this component never receives (and so can never reveal)
// which words triggered it.

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { fillLmsContent } from "@/lib/lms/render";
import { skillForArchetype, weekForSkill } from "@/lib/report/skills";
import { goalsBySkill, bridgeConcernFor } from "@/content/goals";
import { CHILD_NAME_FALLBACK } from "@/lib/report/pronouns";
import type { Gender } from "@/lib/report/pronouns";

// ── palette (goal-picker-v2.html) ──────────────────────────────────────────────
const NAVY = "#14284D";
const NAVY2 = "#1E3A66";
const GOLD = "#F5A623";
const GOLD_LT = "#FBCB4A";
const GOLD_TINT = "#FDF1DC";
const TEAL_700 = "#137A66";
const CREAM = "#FDF9F1";
const LINE = "#E8E4DC";
const DIM = "#5A6472";
const DIM2 = "#8D93A1";
const KICK = "#A3781E";
const BF = "var(--font-bricolage),'Bricolage Grotesque',sans-serif";
const IS = "'Instrument Sans',system-ui,sans-serif";

// Fixed reasoning shown under the recommended option (mockup .why).
const REC_REASON = "This is the skill the assessment found is missing.";
// Qualifier under the free-text option (mockup .q).
const FREE_TEXT_Q = "In your words — one line is enough";
// Chosen-state method paragraph (mockup). "before it's hers" retokenised to a
// gender-safe possessive ("before it becomes {poss} own") since this renders for
// boys/girls/non-binary.
const METHOD_P =
  "Week one you don't change anything — you count what's happening now. By week six you count the same thing again. Everything between is one change a week, and each change is yours first, before it becomes {{child_pronoun_poss}} own.";

type ChosenGoal = { key: string | null; text: string; source: string };

export function GoalSectionSimplified({
  sessionId,
  archetype,
  childName,
  childGender,
  concerns,
  worryFollowup,
  initialGoal,
}: {
  sessionId: string;
  archetype: string;
  childName: string;
  childGender: Gender;
  concerns: string[];
  worryFollowup: string | null;
  initialGoal: { skill: string | null; key: string | null; text: string | null; source: string | null };
}) {
  const router = useRouter();
  const skill = skillForArchetype(archetype);
  const N = weekForSkill(skill.idx); // week the work starts (1-based)
  const content = goalsBySkill[skill.name as keyof typeof goalsBySkill];
  const fill = (s: string) => fillLmsContent(s, childName, childGender);

  // ── Bridge (see report): opener + the parent's follow-up joined with an
  // em-dash, then the fixed reframe "The assessment found what sits underneath
  // it.", then the authored finding as its own sentence. Name casing is
  // positional so the fallback never renders "Your child" mid-sentence.
  const bridge = buildBridge(content.bridges[bridgeConcernFor(concerns[0] ?? null)], worryFollowup, childName, childGender);

  // The assessment's own answer — pre-selected so a parent who agrees taps once.
  const recommendedKey = content.goals.find((g) => g.recommended)?.key ?? null;

  // ── State ──────────────────────────────────────────────────────────────────
  const [chosen, setChosen] = useState<ChosenGoal | null>(
    initialGoal.source ? { key: initialGoal.key, text: initialGoal.text ?? "", source: initialGoal.source } : null,
  );
  const [editing, setEditing] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(recommendedKey); // authored key or "__free__"
  const [freeText, setFreeText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [safeguarding, setSafeguarding] = useState<string | null>(null);

  const showPicker = !safeguarding && (chosen === null || editing);
  const canSubmit = selectedKey !== null && !(selectedKey === "__free__" && freeText.trim().length === 0);

  async function submit(source: "recommended" | "chosen" | "free_text", goalKey: string | null) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/report/goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          skill: skill.name,
          ...(source === "free_text" ? { freeText: freeText.trim() } : { goalKey }),
          source,
        }),
      });
      const data = await res.json();
      if (data.safeguarding) {
        setSafeguarding(data.safeguarding); // Gate 3: fixed copy only, no picker beneath
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Something went wrong. Please try again.");
        return;
      }
      setChosen({ key: data.goalKey ?? null, text: data.goalText ?? "", source });
      setEditing(false);
      setSelectedKey(null);
      setFreeText("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const wrap: CSSProperties = { background: CREAM, borderTop: `1px solid ${LINE}` };
  const inner: CSSProperties = { maxWidth: 480, margin: "0 auto", padding: "30px 22px 34px" };
  const kickStyle: CSSProperties = { font: `700 10.5px/1.4 ${IS}`, letterSpacing: "0.12em", textTransform: "uppercase", color: KICK };

  return (
    <section style={wrap}>
      <div style={inner}>
        {/* ── PICKER ─────────────────────────────────────────────────────────── */}
        {showPicker && (
          <>
            <div style={kickStyle}>One thing to decide</div>
            <h2 style={{ font: `800 24px/1.16 ${BF}`, color: NAVY, letterSpacing: "-0.03em", margin: "11px 0 0" }}>
              What do you want to be true in six weeks?
            </h2>
            <p style={{ font: `400 15px/1.62 ${IS}`, color: DIM, margin: "13px 0 0" }}>{bridge}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 20 }}>
              {content.goals.map((g) => {
                const on = selectedKey === g.key;
                return (
                  <button
                    key={g.key}
                    onClick={() => setSelectedKey(g.key)}
                    style={optStyle(on)}
                  >
                    {g.recommended && <span style={recBadge}>Recommended</span>}
                    <span style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
                      <span style={radio(on)}>{on && <span style={radioDot} />}</span>
                      <b style={{ font: `700 16px/1.32 ${BF}`, color: NAVY, display: "block" }}>{fill(g.text)}</b>
                    </span>
                    <span style={qStyle}>{fill(g.why)}</span>
                    {g.recommended && <span style={whyStyle}>{REC_REASON}</span>}
                  </button>
                );
              })}

              {/* Something else */}
              <button onClick={() => setSelectedKey("__free__")} style={optStyle(selectedKey === "__free__")}>
                <span style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
                  <span style={radio(selectedKey === "__free__")}>{selectedKey === "__free__" && <span style={radioDot} />}</span>
                  <b style={{ font: `700 16px/1.32 ${BF}`, color: NAVY, display: "block" }}>Something else</b>
                </span>
                <span style={qStyle}>{FREE_TEXT_Q}</span>
                {selectedKey === "__free__" && (
                  <input
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value.slice(0, 200))}
                    onClick={(e) => e.stopPropagation()}
                    maxLength={200}
                    placeholder="What would you want to be different?"
                    style={{ marginTop: 11, marginLeft: 30, width: "calc(100% - 30px)", boxSizing: "border-box", border: `1px solid ${LINE}`, borderRadius: 9, padding: "10px 12px", font: `400 14px/1.4 ${IS}`, color: NAVY, outline: "none" }}
                  />
                )}
              </button>
            </div>

            {error && <div style={{ color: "#B23A3A", font: `400 13px/1.4 ${IS}`, marginTop: 10 }}>{error}</div>}

            <button
              disabled={submitting || !canSubmit}
              onClick={() => {
                if (selectedKey === "__free__") return submit("free_text", null);
                const g = content.goals.find((x) => x.key === selectedKey);
                if (!g) return;
                submit(g.recommended ? "recommended" : "chosen", g.key);
              }}
              style={{
                display: "block", width: "100%", background: NAVY, color: "#fff", borderRadius: 12,
                padding: 15, font: `700 15.5px/1 ${BF}`, marginTop: 18, border: "none",
                cursor: submitting || !canSubmit ? "default" : "pointer",
                opacity: submitting || !canSubmit ? 0.38 : 1, textAlign: "center",
              }}
            >
              {submitting ? "Saving…" : "Set this goal →"}
            </button>
            <div style={{ font: `400 12px/1.4 ${IS}`, color: DIM2, marginTop: 11, textAlign: "center" }}>
              You can change it later. Nothing here is a score on your child.
            </div>
          </>
        )}

        {/* ── CHOSEN ─────────────────────────────────────────────────────────── */}
        {chosen && !editing && !safeguarding && (
          <>
            <div style={kickStyle}>Locked in</div>
            <h2 style={{ font: `800 20px/1.2 ${BF}`, color: NAVY, letterSpacing: "-0.03em", margin: "11px 0 0" }}>
              This is what the six weeks works toward.
            </h2>

            {/* navy locked panel */}
            <div style={{ background: `linear-gradient(135deg,${NAVY},${NAVY2})`, borderRadius: 16, padding: "24px 22px", marginTop: 14 }}>
              <div style={{ font: `700 10px/1.4 ${IS}`, letterSpacing: "0.12em", textTransform: "uppercase", color: GOLD_LT }}>Your goal</div>
              <h3 style={{ font: `700 22px/1.28 ${BF}`, color: "#fff", letterSpacing: "-0.02em", margin: "10px 0 0" }}>{chosen.text}</h3>
              <div style={{ display: "flex", gap: 18, marginTop: 16, paddingTop: 15, borderTop: "1px solid rgba(255,255,255,.17)", flexWrap: "wrap" }}>
                {([["6 weeks", "one change a week"], [`Week ${N}`, "where the work starts"], ["You first", "every week"]] as const).map(([a, b]) => (
                  <div key={a}>
                    <b style={{ display: "block", font: `700 14.5px/1.2 ${BF}`, color: GOLD_LT }}>{a}</b>
                    <span style={{ font: `400 11.5px/1.4 ${IS}`, color: "#A9B8CE" }}>{b}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setEditing(true); setSelectedKey(chosen.key ?? (chosen.source === "free_text" ? "__free__" : null)); if (chosen.source === "free_text") setFreeText(chosen.text); }}
                style={{ background: "none", border: "none", color: "#8EA0BC", font: `400 12.5px/1.4 ${IS}`, textDecoration: "underline", marginTop: 14, cursor: "pointer", padding: 0 }}
              >
                Change this
              </button>
            </div>

            {/* white teaser card */}
            <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: "19px 20px", marginTop: 13 }}>
              <div style={{ font: `700 10px/1.4 ${IS}`, letterSpacing: "0.12em", textTransform: "uppercase", color: TEAL_700 }}>What happens now</div>
              <h3 style={{ font: `700 17.5px/1.35 ${BF}`, color: NAVY, letterSpacing: "-0.02em", margin: "9px 0 0" }}>
                Six weeks are built backwards from that sentence.
              </h3>
              <p style={{ font: `400 14px/1.6 ${IS}`, color: DIM, margin: "8px 0 0" }}>{fill(METHOD_P)}</p>
              <div style={{ display: "flex", gap: 5, marginTop: 15 }}>
                {[1, 2, 3, 4, 5, 6].map((_, i) => (
                  <div key={i} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ height: 5, borderRadius: 3, background: i === skill.idx ? GOLD : "#ECE9E2" }} />
                    <small style={{ display: "block", font: `400 9.5px/1 ${IS}`, color: DIM2, marginTop: 5 }}>{i + 1}</small>
                  </div>
                ))}
              </div>
              <button
                onClick={() => router.push(`/roadmap?session=${sessionId}`)}
                style={{ display: "block", width: "100%", background: `linear-gradient(135deg,${GOLD_LT},${GOLD})`, color: NAVY, borderRadius: 12, padding: 15, font: `800 15.5px/1 ${BF}`, marginTop: 16, border: "none", cursor: "pointer", textAlign: "center", boxShadow: "0 6px 18px rgba(245,166,35,.32)" }}
              >
                See how the six weeks get you there →
              </button>
            </div>
          </>
        )}

        {/* ── SAFEGUARDING (unchanged flow — fixed copy only) ────────────────── */}
        {safeguarding && (
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: "20px 20px" }}>
            {safeguarding.split("\n\n").map((para, i) => (
              <p
                key={i}
                style={{ font: `${i === 0 ? 700 : 400} 14.5px/1.7 ${IS}`, color: i === 0 ? NAVY : DIM, margin: "0 0 12px" }}
                dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ── option card styling ────────────────────────────────────────────────────────
function optStyle(on: boolean): CSSProperties {
  return {
    position: "relative", background: on ? GOLD_TINT : "#fff",
    border: `${on ? 2 : 1.5}px solid ${on ? GOLD : LINE}`, borderRadius: 14,
    padding: "15px 16px", width: "100%", textAlign: "left", cursor: "pointer", font: IS,
  };
}
function radio(on: boolean): CSSProperties {
  return {
    width: 19, height: 19, borderRadius: "50%", border: `2px solid ${on ? GOLD : "#D6D2C8"}`,
    background: on ? GOLD : "transparent", flexShrink: 0, marginTop: 2,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
}
const radioDot: CSSProperties = { width: 7, height: 7, borderRadius: "50%", background: "#fff" };
const recBadge: CSSProperties = {
  position: "absolute", top: -8, right: 13, background: GOLD, color: NAVY,
  font: `800 9.5px/1.4 ${BF}`, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 9px", borderRadius: 5,
};
const qStyle: CSSProperties = { display: "block", font: `400 13.2px/1.5 ${IS}`, color: DIM2, marginTop: 5, paddingLeft: 30 };
const whyStyle: CSSProperties = { display: "block", font: `400 12.3px/1.5 ${IS}`, color: "#8A5F0F", marginTop: 8, paddingLeft: 30 };

// ── Bridge transform ────────────────────────────────────────────────────────────
// Every authored bridge contains "What the assessment found is …". We rebuild it as:
//   {opener}{ — followUp}. The assessment found what sits underneath it. {finding}
// stripping the "(exactly )?that:? / more specific:" lead-in so the finding stands
// as its own sentence. Name casing is positional (capital only at a sentence start),
// so the null-name fallback never appears as "Your child" mid-sentence.
function buildBridge(raw: string, followUp: string | null, childName: string, gender: Gender): string {
  const marker = "What the assessment found is ";
  const idx = raw.indexOf(marker);
  const fu = followUp?.trim().replace(/\.$/, "") || "";
  let out: string;
  if (idx === -1) {
    out = fu ? insertFollowUp(raw, fu) : raw;
  } else {
    const opener = raw.slice(0, idx).replace(/\.\s*$/, "").trim();
    let finding = raw.slice(idx + marker.length).replace(/^(?:exactly that:\s*|more specific:\s*|that\s+)/, "");
    const openerOut = opener
      ? `${opener}${fu ? ` — ${fu}` : ""}. `
      : (fu ? `${fu}. ` : "");
    out = `${openerOut}The assessment found what sits underneath it. ${finding}`;
  }
  out = placeName(out, childName);
  out = fillLmsContent(out, childName, gender);
  // Capitalise the finding sentence's first letter (the token may resolve to a pronoun).
  out = out.replace(/(underneath it\. )([a-z])/, (_m, p, c) => p + c.toUpperCase());
  return out.charAt(0).toUpperCase() + out.slice(1);
}

// Positional {{child_name}} substitution for the null-name fallback: "Your child"
// only at a sentence boundary, "your child" mid-sentence. Real names are proper
// nouns and stay as given.
function placeName(template: string, childName: string): string {
  const isFallback = childName === CHILD_NAME_FALLBACK || childName === "your child";
  if (!isFallback) return template.replace(/\{\{child_name\}\}/g, childName);
  return template.replace(/\{\{child_name\}\}/g, (_m, offset: number, full: string) => {
    const before = full.slice(0, offset).replace(/\s+$/, "");
    const atStart = before === "" || /[.!?:—]$/.test(before);
    return atStart ? "Your child" : "your child";
  });
}

// Fallback when no "What the assessment found is" marker exists — insert the
// follow-up after the first sentence with a colon connective (preserves capital).
function insertFollowUp(bridge: string, fu: string): string {
  const dot = bridge.indexOf(". ");
  if (dot === -1) return bridge;
  return `${bridge.slice(0, dot)}, and specifically: ${fu}${bridge.slice(dot)}`;
}
