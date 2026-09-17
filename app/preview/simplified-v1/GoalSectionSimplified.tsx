"use client";

// Goal picker for the simplified-v1 funnel — same behaviour as
// app/report/[sessionId]/GoalSection.tsx (bridge line, framing line, four
// authored goals with Recommended + reasoning, "Something else" free text,
// chosen state with a change affordance, safeguarding block), but restyled to
// simplified-v1's own system (navy/gold/teal, Bricolage + Instrument Sans, the
// 600px band layout used by §6/§7) instead of NarrativeReportView's cream/
// forest-green Fraunces system.
//
// Shared, surface-agnostic pieces are imported, not duplicated: the authored
// content (@/content/goals), the skill resolver (@/lib/report/skills), the
// LMS token fill (@/lib/lms/render), and the POST target (/api/report/goal).
// Only the presentation and the local selection state live here.
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

// simplified-v1 palette (mirrors the constants in AttentionAdvantageReport).
const NAVY = "#14284D";
const GOLD = "#F5A623";
const TEAL = "#137A66";
const CREAM = "#FDF9F1";
const AMBER_TEXT = "#B87308";
const DIM = "#5A6472";
const LINE = "#ECE7DC";
const BF = "var(--font-bricolage),'Bricolage Grotesque',sans-serif";
const IS = "'Instrument Sans',system-ui,sans-serif";

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
  const skill = skillForArchetype(archetype);
  const content = goalsBySkill[skill.name as keyof typeof goalsBySkill];
  const fill = (s: string) => fillLmsContent(s, childName, childGender);

  // Bridge line — authored line for (skill, concern), with the parent's own
  // follow-up templated into the first sentence per the content doc's connective.
  const bridgeRaw = content.bridges[bridgeConcernFor(concerns[0] ?? null)];
  const bridge = fill(templateFollowUp(bridgeRaw, worryFollowup));

  // Framing line — Starting (week 1) uses the special variant; otherwise the
  // parent already has the first (idx) weeks and the work is week (idx+1).
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
    <div style={{ background: CREAM, borderTop: `1px solid ${LINE}` }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 20px" }}>
        <div style={{ font: `700 10px/1.2 ${IS}`, letterSpacing: "0.11em", textTransform: "uppercase", color: AMBER_TEXT, marginBottom: 12 }}>
          Choose the goal
        </div>

        {/* Bridge */}
        <p style={{ font: `400 15px/1.6 ${IS}`, color: DIM, margin: "0 0 8px" }}>
          {bridge}
        </p>
        <p style={{ font: `700 16px/1.5 ${IS}`, color: NAVY, margin: "0 0 16px" }}>
          These four come from that.
        </p>

        {/* Framing */}
        <p style={{ font: `400 13.5px/1.6 ${IS}`, color: "#7D8CA3", margin: "0 0 22px", paddingLeft: 12, borderLeft: `2px solid #E8DFCB` }}>
          {framing}
        </p>

        {/* Chosen state */}
        {chosen && !editing && !safeguarding && (
          <div style={{ background: "#fff", border: `1.5px solid ${TEAL}`, borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ font: `700 10px/1.2 ${IS}`, letterSpacing: "0.09em", textTransform: "uppercase", color: TEAL, marginBottom: 6 }}>
              Your goal
            </div>
            <div style={{ font: `600 17px/1.35 ${BF}`, color: NAVY }}>
              {chosen.text}
            </div>
            <button
              onClick={() => { setEditing(true); setSelectedKey(chosen.key ?? (chosen.source === "free_text" ? "__free__" : null)); if (chosen.source === "free_text") setFreeText(chosen.text); }}
              style={{ marginTop: 12, background: "none", border: "none", padding: 0, color: TEAL, font: `700 13.5px/1.2 ${IS}`, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}
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
                    textAlign: "left", background: isSel ? "#FFFDF6" : "#fff",
                    border: `1.5px solid ${isSel ? GOLD : LINE}`, borderRadius: 12,
                    padding: "14px 16px", cursor: "pointer", font: `400 15px/1.5 ${IS}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ font: `600 15.5px/1.35 ${BF}`, color: NAVY }}>
                      {fill(g.text)}
                    </div>
                    {g.recommended && (
                      <span style={{ flexShrink: 0, background: GOLD, color: NAVY, font: `700 9.5px/1.2 ${IS}`, letterSpacing: "0.06em", textTransform: "uppercase", padding: "4px 7px", borderRadius: 5 }}>
                        Recommended
                      </span>
                    )}
                  </div>
                  {/* Reasoning — always for the recommended one; on selection for the rest */}
                  {(g.recommended || isSel) && (
                    <div style={{ font: `400 13px/1.5 ${IS}`, color: DIM, marginTop: 6 }}>
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
                textAlign: "left", background: selectedKey === "__free__" ? "#FFFDF6" : "#fff",
                border: `1.5px solid ${selectedKey === "__free__" ? GOLD : LINE}`, borderRadius: 12,
                padding: "14px 16px", cursor: "pointer", font: `600 15.5px/1.35 ${BF}`, color: NAVY,
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
                style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${LINE}`, borderRadius: 10, padding: "12px 14px", font: `400 14.5px/1.5 ${IS}`, color: NAVY, resize: "vertical" }}
              />
            )}

            {error && (
              <div style={{ color: "#B23A3A", font: `400 13px/1.4 ${IS}` }}>{error}</div>
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
                marginTop: 6, alignSelf: "flex-start", background: NAVY, color: "#fff",
                border: "none", borderRadius: 10, padding: "13px 24px", font: `700 14.5px/1.3 ${IS}`,
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
          <div style={{ background: "#fff", border: `1.5px solid ${LINE}`, borderRadius: 12, padding: "20px 20px" }}>
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
    </div>
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
