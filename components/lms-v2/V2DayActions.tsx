"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReflectionOutcome } from "@/content/types";
import { V2, BODY, OUTCOMES, OUTCOME_LABEL } from "@/app/lms-v2/v2ui";
import { useReadOnly, READ_ONLY_TOOLTIP } from "@/components/lms/ReadOnlyContext";

const OUTCOME_PREFILL: Record<string, string> = {
  worked: "It worked. ",
  sort_of: "It sort of worked. ",
  didnt_work: "It didn't work. ",
};

export default function V2DayActions({
  week,
  day,
  childName,
  reflectionPrompt,
  alreadyComplete,
  existingReflection,
  nextHref,
  nextLabel,
}: {
  week: number;
  day: number;
  childName: string;
  reflectionPrompt: string | null; // null = Day 1 (observe only)
  alreadyComplete: boolean;
  existingReflection: ReflectionOutcome | null;
  nextHref: string;
  nextLabel: string;
}) {
  const router = useRouter();
  const readOnly = useReadOnly();
  const needsReflection = reflectionPrompt !== null; // days 2–5
  const [selected, setSelected] = useState<ReflectionOutcome | null>(existingReflection);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);

  async function done() {
    if (readOnly || busy) return;
    if (needsReflection && !selected) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/lms/complete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week, day }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error || `HTTP ${r.status}`);
      }
      if (needsReflection && selected) {
        await fetch("/api/lms/reflect", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ week, day, outcome: selected, note: note || null }),
        });
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function saveOutcome(o: string) {
    if (readOnly) return;
    setOutcome(o);
    await fetch("/api/lms/day-outcome", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week, day, outcome: o }),
    }).catch(() => {});
  }

  const coachHref = (source: string, prefill: string) =>
    `/lms-v2/coach?source=${source}&prefill=${encodeURIComponent(prefill)}`;

  // Amber "Ask the Coach about tonight" card (L3), shown above the primary action.
  const CoachCard = (
    <a href={coachHref("day_card", "About tonight's step: ")} style={{ display: "flex", alignItems: "center", gap: 10, background: "#FBF4E6", border: "1px solid #F0DDB8", borderRadius: 14, padding: "12px 14px", textDecoration: "none", color: V2.navy }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: V2.gold, color: V2.navy, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>AC</div>
      <div style={{ flex: 1, fontSize: 14, lineHeight: 1.4 }}><b>Not sure how to say it to {childName}?</b><br /><span style={{ color: V2.dim }}>Ask the Coach about tonight</span></div>
      <span style={{ color: V2.darkGold, fontSize: 18 }}>›</span>
    </a>
  );

  // ── Completed state: record + after-done outcome + "Talk it through with the Coach".
  if (alreadyComplete) {
    return (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: V2.tintGreen, border: `1px solid rgba(47,93,58,0.3)`, borderRadius: 14, padding: "14px 18px" }}>
          <span style={{ fontSize: 18, color: V2.green, fontWeight: 800 }}>✓</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: V2.greenInk }}>
            Done{existingReflection ? ` · you recorded "${OUTCOME_LABEL[existingReflection]}"` : ""}
          </span>
        </div>

        <section style={{ background: V2.white, border: `1px solid ${V2.line}`, borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: V2.navy }}>Done. How did it go?</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[["worked", "It worked"], ["sort_of", "Sort of"], ["didnt_work", "Didn't work"]].map(([val, label]) => {
              const on = outcome === val;
              return (
                <button key={val} type="button" disabled={readOnly} title={readOnly ? READ_ONLY_TOOLTIP : undefined} onClick={() => saveOutcome(val)}
                  style={{ flex: 1, border: on ? `1.5px solid ${V2.navy}` : `1px solid ${V2.line2}`, background: on ? V2.navy : V2.white, color: on ? V2.white : V2.navy, borderRadius: 10, padding: 10, textAlign: "center", fontWeight: 600, fontSize: 14, cursor: readOnly ? "not-allowed" : "pointer", fontFamily: BODY }}>
                  {label}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 13.5, color: V2.ink, lineHeight: 1.45 }}>Tell the Coach what happened. It&rsquo;ll help you adjust for tomorrow.</div>
          <a href={coachHref("after_done", OUTCOME_PREFILL[outcome ?? "sort_of"])} style={{ background: V2.gold, color: V2.navy, borderRadius: 12, padding: 12, textAlign: "center", fontWeight: 700, textDecoration: "none" }}>Talk it through with the Coach</a>
        </section>

        <button type="button" onClick={() => router.push(nextHref)}
          style={{ minHeight: 52, borderRadius: 12, border: 0, background: V2.navy, color: V2.white, font: "inherit", fontFamily: BODY, fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
          {nextLabel}
        </button>
      </>
    );
  }

  const ready = !needsReflection || !!selected;

  return (
    <>
      {needsReflection && (
        <section style={{ background: V2.white, border: `1px solid ${V2.line}`, borderRadius: 18, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: V2.dim }}>RECORD · TONIGHT</div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: V2.navy }}>{reflectionPrompt}</h2>
          <div role="group" aria-label="How did it go" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {OUTCOMES.map((o) => {
              const on = selected === o.value;
              return (
                <button key={o.value} type="button" aria-pressed={on} onClick={() => setSelected(o.value)}
                  style={{ minHeight: 52, borderRadius: 12, border: `${on ? 1.5 : 1}px solid ${on ? V2.green : V2.line2}`, background: on ? V2.tintGreen : V2.white, color: on ? V2.greenInk : V2.navy, font: "inherit", fontFamily: BODY, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                  {o.label}
                </button>
              );
            })}
          </div>
          <label style={{ fontSize: 14, color: V2.dim }}>Note to yourself (optional, read back to you at the weekend)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="What did you notice?"
            style={{ font: "inherit", fontFamily: BODY, fontSize: 15, padding: 12, border: `1px solid ${V2.line2}`, borderRadius: 12, background: V2.cream, color: V2.navy, resize: "none" }} />
        </section>
      )}

      {CoachCard}

      {error && <p style={{ margin: 0, fontSize: 13, color: "#C0392B" }}>{error}</p>}

      <button type="button" onClick={done} disabled={busy || !ready || readOnly} title={readOnly ? READ_ONLY_TOOLTIP : undefined}
        style={{ minHeight: 52, borderRadius: 12, border: 0, background: V2.navy, color: V2.white, font: "inherit", fontFamily: BODY, fontSize: 16, fontWeight: 600, cursor: readOnly ? "not-allowed" : busy || !ready ? "default" : "pointer", opacity: readOnly ? 0.5 : busy || !ready ? 0.55 : 1 }}>
        {busy ? "Saving…" : "Done for today"}
      </button>
    </>
  );
}
