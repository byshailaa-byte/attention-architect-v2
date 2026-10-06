"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReflectionOutcome } from "@/content/types";
import { V2, BODY, OUTCOMES, OUTCOME_LABEL } from "@/app/lms-v2/v2ui";
import { useReadOnly, READ_ONLY_TOOLTIP } from "@/components/lms/ReadOnlyContext";

export default function V2DayActions({
  week,
  day,
  reflectionPrompt,
  alreadyComplete,
  existingReflection,
  nextHref,
  nextLabel,
}: {
  week: number;
  day: number;
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

  async function done() {
    if (readOnly) return;
    if (busy) return;
    if (needsReflection && !selected) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/lms/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week, day }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error || `HTTP ${r.status}`);
      }
      if (needsReflection && selected) {
        await fetch("/api/lms/reflect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ week, day, outcome: selected, note: note || null }),
        });
      }
      router.push(nextHref);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  // ── Completed state (E4): saved record + "Done ✓" + "Next" — never an unlock line.
  if (alreadyComplete) {
    return (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: V2.tintGreen, border: `1px solid rgba(47,93,58,0.3)`, borderRadius: 14, padding: "14px 18px" }}>
          <span style={{ fontSize: 18, color: V2.green, fontWeight: 800 }}>✓</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: V2.greenInk }}>
            Done{existingReflection ? ` · you recorded "${OUTCOME_LABEL[existingReflection]}"` : ""}
          </span>
        </div>
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

      {error && <p style={{ margin: 0, fontSize: 13, color: "#C0392B" }}>{error}</p>}

      <button type="button" onClick={done} disabled={busy || !ready || readOnly} title={readOnly ? READ_ONLY_TOOLTIP : undefined}
        style={{ minHeight: 52, borderRadius: 12, border: 0, background: V2.navy, color: V2.white, font: "inherit", fontFamily: BODY, fontSize: 16, fontWeight: 600, cursor: readOnly ? "not-allowed" : busy || !ready ? "default" : "pointer", opacity: readOnly ? 0.5 : busy || !ready ? 0.55 : 1 }}>
        {busy ? "Saving…" : "Done for today"}
      </button>
    </>
  );
}
