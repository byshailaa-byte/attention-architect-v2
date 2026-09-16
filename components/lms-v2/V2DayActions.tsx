"use client";

import { useState } from "react";
import type { ReflectionOutcome } from "@/content/types";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

const OUTCOMES: { value: ReflectionOutcome; label: string; cls: string }[] = [
  { value: "worked",     label: "✓ It worked",    cls: "sel-worked" },
  { value: "mixed",      label: "~ Mixed",         cls: "sel-mixed" },
  { value: "didnt_land", label: "✕ Didn't land",  cls: "sel-no" },
];

type Props = {
  week: number;
  day: number;
  reflectionPrompt: string | null;
  alreadyComplete: boolean;
  existingReflection: ReflectionOutcome | null;
  nextHref: string;
};

export default function V2DayActions({
  week,
  day,
  reflectionPrompt,
  alreadyComplete,
  existingReflection,
  nextHref,
}: Props) {
  type Step = "idle" | "completing" | "reflecting" | "submitting" | "done";
  const initialStep: Step =
    alreadyComplete && existingReflection ? "done" :
    alreadyComplete && reflectionPrompt   ? "reflecting" :
    alreadyComplete                        ? "done" : "idle";

  const [step, setStep]         = useState<Step>(initialStep);
  const [selected, setSelected] = useState<ReflectionOutcome | null>(existingReflection);
  const [note, setNote]         = useState("");
  const [error, setError]       = useState("");

  const BG = `var(--font-bricolage),'Bricolage Grotesque',sans-serif`;

  async function markComplete() {
    setStep("completing");
    setError("");
    try {
      const r = await fetch("/api/lms/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week, day }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Something went wrong.");
        setStep("idle");
        return;
      }
      if (typeof window.gtag === "function") {
        window.gtag("event", "lms_day_complete", { week, day });
      }
      if (typeof window.fbq === "function") {
        window.fbq("trackCustom", "LmsDayComplete", { week, day });
      }
      setStep(reflectionPrompt ? "reflecting" : "done");
    } catch {
      setError("Something went wrong. Try again.");
      setStep("idle");
    }
  }

  async function submitReflection(outcome: ReflectionOutcome) {
    setSelected(outcome);
    setStep("submitting");
    try {
      await fetch("/api/lms/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week, day, outcome, note: note || null }),
      });
      if (typeof window.gtag === "function") {
        window.gtag("event", "lms_reflection_submitted", { week, day, outcome });
      }
      if (typeof window.fbq === "function") {
        window.fbq("trackCustom", "LmsReflectionSubmitted", { week, day, outcome });
      }
      setStep("done");
    } catch {
      setStep("reflecting");
    }
  }

  if (step === "done") {
    const outcomeLabel = OUTCOMES.find(o => o.value === (selected ?? existingReflection))?.label;
    return (
      <div style={{
        marginTop:15, background:"linear-gradient(115deg,#fff,var(--v2-gold-tint))",
        border:"1px solid var(--v2-gold-line)", borderRadius:14, padding:"19px 21px",
      }}>
        {outcomeLabel && (
          <p style={{ fontSize:13, color:"var(--v2-teal-700)", fontWeight:700, marginBottom:14 }}>
            Saved. You marked this as: {outcomeLabel}
          </p>
        )}
        <a
          href={nextHref}
          style={{
            display:"block", textAlign:"center", textDecoration:"none",
            background:"var(--v2-navy)", color:"#fff",
            fontFamily:BG, fontWeight:700, fontSize:13,
            borderRadius:10, padding:"13px 20px",
          }}
        >
          {nextHref.includes("weekend") ? "Go to weekend review →" : "Next day →"}
        </a>
      </div>
    );
  }

  if (step === "reflecting" || step === "submitting") {
    return (
      <div style={{
        marginTop:15, background:"linear-gradient(115deg,#fff,var(--v2-gold-tint))",
        border:"1px solid var(--v2-gold-line)", borderRadius:14, padding:"19px 21px",
      }}>
        <h3 style={{ fontSize:15.5, fontFamily:BG, color:"var(--v2-navy)", marginBottom:3 }}>How did tonight go?</h3>
        <div style={{ fontSize:13 }}>One tap. This is what tomorrow&apos;s opening is built from.</div>
        <div style={{ display:"flex", gap:8, marginTop:13, flexWrap:"wrap" }}>
          {OUTCOMES.map(({ value, label, cls }) => (
            <button
              key={value}
              disabled={step === "submitting"}
              onClick={() => submitReflection(value)}
              className={selected === value ? `v2-rbtn ${cls}` : "v2-rbtn"}
              style={{ opacity: step === "submitting" ? 0.6 : 1 }}
            >
              {label}
            </button>
          ))}
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Anything you noticed? (optional)"
          style={{
            width:"100%", marginTop:11, border:"1px solid var(--v2-line)", borderRadius:10,
            padding:"10px 12px", fontSize:13, resize:"vertical", minHeight:58, outline:"none",
            fontFamily:"var(--v2-IS)",
          }}
        />
        <p style={{ fontSize:12, color:"var(--v2-dim2)", marginTop:8 }}>
          Tap a button above to save and continue.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      marginTop:15, background:"linear-gradient(115deg,#fff,var(--v2-gold-tint))",
      border:"1px solid var(--v2-gold-line)", borderRadius:14, padding:"19px 21px",
    }}>
      {error && (
        <p style={{ fontSize:13, color:"var(--v2-red)", marginBottom:12 }}>{error}</p>
      )}
      <h3 style={{ fontSize:15.5, fontFamily:BG, color:"var(--v2-navy)", marginBottom:3 }}>How did tonight go?</h3>
      <div style={{ fontSize:13, marginBottom:13 }}>{reflectionPrompt ?? "Mark when you&apos;re done for today."}</div>
      <button
        onClick={markComplete}
        disabled={step === "completing"}
        style={{
          width:"100%", borderRadius:10, padding:13,
          fontFamily:BG, fontSize:13, fontWeight:700, cursor:"pointer",
          background:"var(--v2-navy)", color:"#fff", border:"none",
          opacity: step === "completing" ? 0.5 : 1,
        }}
      >
        {step === "completing" ? "Saving…" : "Done for today"}
      </button>
    </div>
  );
}
