"use client";

// Goal picker — un-numbered interactive band, rendered between Future Story and
// Roadmap in NarrativeReportView. Server passes the initial goal state; this
// component owns selection, free text, and the POST to /api/report/goal.
//
// Gate 3: the flagged response from the route contains only the fixed
// SAFEGUARDING_RESPONSE — this component never receives (and so can never reveal)
// which words triggered it.

import { useState } from "react";
import { fillLmsContent } from "@/lib/lms/render";
import { skillForArchetype, weekForSkill, WEEK_TITLES } from "@/lib/report/skills";
import {
  goalsBySkill,
  bridgeConcernFor,
  GOAL_FRAMING_LINE,
  GOAL_FRAMING_LINE_STARTING,
} from "@/content/goals";
import type { Gender } from "@/lib/report/pronouns";

const PUBLIC_SANS = "'Public Sans', system-ui, sans-serif";
const FRAUNCES = "'Fraunces', Georgia, serif";
const T = {
  paper: "#FBF9F3",
  paperDeep: "#EDE8DC",
  ink: "#26241F",
  inkSoft: "#4A463E",
  inkFaint: "#8A8474",
  accent: "#34503F",
  gold: "#B8860B",
  line: "#E2DCCF",
};

type ChosenGoal = { key: string | null; text: string; source: string };

export function GoalSection({
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
  const skill = skillForArchetype(archetype);
  const content = goalsBySkill[skill.name as keyof typeof goalsBySkill];
  const fill = (s: string) => fillLmsContent(s, childName, childGender);

  // ── Bridge line: authored line for (skill, concern), with the parent's own
  // follow-up templated into the first sentence per the content doc's connective.
  const bridgeRaw = content.bridges[bridgeConcernFor(concerns[0] ?? null)];
  const bridge = fill(templateFollowUp(bridgeRaw, worryFollowup));

  // ── Framing line: Starting (week 1) uses the special variant; otherwise the
  // parent already has the first (idx) weeks, and the work is week (idx+1).
  const N = weekForSkill(skill.idx);
  const framingRaw =
    skill.idx === 0
      ? GOAL_FRAMING_LINE_STARTING
      : GOAL_FRAMING_LINE
          .replace(/\{\{n\}\}/g, String(skill.idx))
          .replace(/\{\{N\}\}/g, String(N))
          .replace(/\{\{week_title\}\}/g, WEEK_TITLES[N] ?? "");
  const framing = fill(framingRaw);

  // ── State ──────────────────────────────────────────────────────────────────
  const [chosen, setChosen] = useState<ChosenGoal | null>(
    initialGoal.source ? { key: initialGoal.key, text: initialGoal.text ?? "", source: initialGoal.source } : null,
  );
  const [editing, setEditing] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null); // authored key or "__free__"
  const [freeText, setFreeText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [safeguarding, setSafeguarding] = useState<string | null>(null);

  const showPicker = !safeguarding && (chosen === null || editing);

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
        // Gate 3: fixed copy only — no reason, no trigger words, no picker beneath.
        setSafeguarding(data.safeguarding);
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

  return (
    <section style={{ background: T.paper, padding: "52px 0", borderTop: `1px solid ${T.line}` }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 22px" }}>
        <div style={{ fontFamily: PUBLIC_SANS, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.gold, marginBottom: 10 }}>
          Choose the goal
        </div>

        {/* Bridge */}
        <p style={{ fontFamily: PUBLIC_SANS, fontSize: 15, lineHeight: 1.65, color: T.inkSoft, margin: "0 0 10px" }}>
          {bridge}
        </p>
        <p style={{ fontFamily: PUBLIC_SANS, fontSize: 15, lineHeight: 1.65, color: T.ink, fontWeight: 600, margin: "0 0 18px" }}>
          These four come from that.
        </p>

        {/* Framing */}
        <p style={{ fontFamily: PUBLIC_SANS, fontSize: 13.5, lineHeight: 1.6, color: T.inkFaint, margin: "0 0 24px", paddingLeft: 12, borderLeft: `2px solid ${T.paperDeep}` }}>
          {framing}
        </p>

        {/* Chosen state */}
        {chosen && !editing && !safeguarding && (
          <div style={{ background: "#fff", border: `1.5px solid ${T.accent}`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ fontFamily: PUBLIC_SANS, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.accent, marginBottom: 6 }}>
              Your goal
            </div>
            <div style={{ fontFamily: FRAUNCES, fontSize: 17, fontWeight: 600, color: T.ink, lineHeight: 1.35 }}>
              {chosen.text}
            </div>
            <button
              onClick={() => { setEditing(true); setSelectedKey(chosen.key ?? (chosen.source === "free_text" ? "__free__" : null)); if (chosen.source === "free_text") setFreeText(chosen.text); }}
              style={{ marginTop: 12, background: "none", border: "none", padding: 0, color: T.accent, fontFamily: PUBLIC_SANS, fontSize: 13.5, fontWeight: 600, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}
            >
              Change this
            </button>
          </div>
        )}

        {/* Picker */}
        {showPicker && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {content.goals.map((g) => {
              const isSel = selectedKey === g.key;
              return (
                <button
                  key={g.key}
                  onClick={() => setSelectedKey(g.key)}
                  style={{
                    textAlign: "left", background: isSel ? "#FFFDF7" : "#fff",
                    border: `1.5px solid ${isSel ? T.gold : T.line}`, borderRadius: 12,
                    padding: "14px 16px", cursor: "pointer", fontFamily: PUBLIC_SANS,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ fontFamily: FRAUNCES, fontSize: 15.5, fontWeight: 600, color: T.ink, lineHeight: 1.35 }}>
                      {fill(g.text)}
                    </div>
                    {g.recommended && (
                      <span style={{ flexShrink: 0, background: T.gold, color: "#fff", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 7px", borderRadius: 5 }}>
                        Recommended
                      </span>
                    )}
                  </div>
                  {/* Reasoning — always for the recommended one; on selection for the rest */}
                  {(g.recommended || isSel) && (
                    <div style={{ fontSize: 13, color: T.inkFaint, lineHeight: 1.5, marginTop: 6 }}>
                      {fill(g.why)}
                    </div>
                  )}
                </button>
              );
            })}

            {/* Something else */}
            <button
              onClick={() => setSelectedKey("__free__")}
              style={{
                textAlign: "left", background: selectedKey === "__free__" ? "#FFFDF7" : "#fff",
                border: `1.5px solid ${selectedKey === "__free__" ? T.gold : T.line}`, borderRadius: 12,
                padding: "14px 16px", cursor: "pointer", fontFamily: PUBLIC_SANS,
                fontSize: 15.5, fontWeight: 600, color: T.ink,
              }}
            >
              Something else
            </button>
            {selectedKey === "__free__" && (
              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value.slice(0, 200))}
                maxLength={200}
                placeholder="Describe the goal in your own words"
                rows={3}
                style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${T.line}`, borderRadius: 10, padding: "12px 14px", fontFamily: PUBLIC_SANS, fontSize: 14.5, color: T.ink, resize: "vertical" }}
              />
            )}

            {error && (
              <div style={{ color: "#B23A3A", fontSize: 13, fontFamily: PUBLIC_SANS }}>{error}</div>
            )}

            <button
              disabled={submitting || selectedKey === null || (selectedKey === "__free__" && freeText.trim().length === 0)}
              onClick={() => {
                if (selectedKey === "__free__") return submit("free_text", null);
                const g = content.goals.find((x) => x.key === selectedKey);
                if (!g) return;
                submit(g.recommended ? "recommended" : "chosen", g.key);
              }}
              style={{
                marginTop: 6, alignSelf: "flex-start", background: T.accent, color: "#fff",
                border: "none", borderRadius: 10, padding: "12px 22px", fontFamily: PUBLIC_SANS,
                fontSize: 14.5, fontWeight: 700,
                cursor: submitting || selectedKey === null ? "not-allowed" : "pointer",
                opacity: submitting || selectedKey === null || (selectedKey === "__free__" && freeText.trim().length === 0) ? 0.55 : 1,
              }}
            >
              {submitting ? "Saving…" : chosen ? "Update goal" : "Set this goal"}
            </button>
          </div>
        )}

        {/* Safeguarding — fixed copy only, no picker beneath */}
        {safeguarding && (
          <div style={{ background: "#fff", border: `1.5px solid ${T.line}`, borderRadius: 14, padding: "20px 20px" }}>
            {safeguarding.split("\n\n").map((para, i) => (
              <p
                key={i}
                style={{ fontFamily: PUBLIC_SANS, fontSize: 14.5, lineHeight: 1.7, color: i === 0 ? T.ink : T.inkSoft, fontWeight: i === 0 ? 700 : 400, margin: i === 0 ? "0 0 12px" : "0 0 12px" }}
                dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// Inserts the parent's follow-up into the bridge's first sentence, using a colon
// connective that takes a capitalised sentence naturally — the follow-up options
// are stored as full sentences (some begin with "I"), so we must NOT lowercase.
// "You came in about homework" + "I have to remind him" →
// "You came in about homework, and specifically: I have to remind him. …"
// Falls back to the raw bridge if the shape is unexpected.
function templateFollowUp(bridge: string, followUp: string | null): string {
  if (!followUp || !followUp.trim()) return bridge;
  const fu = followUp.trim().replace(/\.$/, ""); // avoid a doubled period
  const dot = bridge.indexOf(". ");
  if (dot === -1) return bridge;
  return `${bridge.slice(0, dot)}, and specifically: ${fu}${bridge.slice(dot)}`;
}
