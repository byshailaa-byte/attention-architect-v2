"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReflectionOutcome } from "@/content/types";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

type Props = {
  week: number;
  day: number;
  reflectionPrompt: string | null;
  alreadyComplete: boolean;
  existingReflection: ReflectionOutcome | null;
  nextHref: string;
};

const OUTCOMES: { value: ReflectionOutcome; label: string; emoji: string }[] = [
  { value: "worked", label: "Worked", emoji: "✓" },
  { value: "mixed", label: "Mixed", emoji: "~" },
  { value: "didnt_land", label: "Didn't land", emoji: "✗" },
];

export default function DayCardActions({
  week,
  day,
  reflectionPrompt,
  alreadyComplete,
  existingReflection,
  nextHref,
}: Props) {
  const router = useRouter();

  type Step = "idle" | "completing" | "reflecting" | "submitting" | "done";
  const initialStep: Step =
    alreadyComplete && existingReflection ? "done" :
    alreadyComplete && reflectionPrompt ? "reflecting" :
    alreadyComplete ? "done" :
    "idle";

  const [step, setStep] = useState<Step>(initialStep);
  const [selected, setSelected] = useState<ReflectionOutcome | null>(existingReflection);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

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
        setError(data.error ?? "Something went wrong.");
        setStep("idle");
        return;
      }
      if (typeof window.gtag === "function") {
        window.gtag("event", "lms_day_complete", { week, day });
      }
      if (typeof window.fbq === "function") {
        window.fbq("trackCustom", "LmsDayComplete", { week, day });
      }
      if (reflectionPrompt) {
        setStep("reflecting");
      } else {
        setStep("done");
      }
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
    return (
      <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--line)" }}>
        {existingReflection || selected ? (
          <p className="text-sm mb-4" style={{ color: "var(--ink-dim)" }}>
            Marked: <span style={{ color: "var(--ink)", fontWeight: 600 }}>
              {OUTCOMES.find((o) => o.value === (selected ?? existingReflection))?.label}
            </span>
          </p>
        ) : null}
        <a
          href={nextHref}
          className="block w-full text-center rounded-lg px-4 py-3 text-base font-semibold"
          style={{ background: "var(--ink)", color: "#fff" }}
        >
          {nextHref.includes("weekend") ? "Go to weekend review →" : "Next day →"}
        </a>
      </div>
    );
  }

  if (step === "reflecting" || step === "submitting") {
    return (
      <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--line)" }}>
        <p className="font-semibold mb-4" style={{ color: "var(--ink)" }}>
          {reflectionPrompt}
        </p>
        <div className="flex gap-3 mb-5">
          {OUTCOMES.map(({ value, label, emoji }) => (
            <button
              key={value}
              disabled={step === "submitting"}
              onClick={() => submitReflection(value)}
              className="flex-1 rounded-lg px-3 py-3 text-sm font-semibold text-center transition-all"
              style={{
                background: selected === value ? "var(--ink)" : "var(--card)",
                color: selected === value ? "#fff" : "var(--ink)",
                border: "1.5px solid var(--line)",
                opacity: step === "submitting" ? 0.6 : 1,
              }}
            >
              <div className="text-lg mb-1">{emoji}</div>
              {label}
            </button>
          ))}
        </div>
        <label className="block text-sm mb-2" style={{ color: "var(--ink-dim)" }}>
          Note to yourself (optional — shown back to you at the weekend review)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What did you notice?"
          rows={3}
          className="w-full rounded-lg px-3 py-2 text-sm resize-none"
          style={{
            border: "1.5px solid var(--line)",
            background: "var(--card)",
            color: "var(--ink)",
            outline: "none",
          }}
        />
        <p className="text-xs mt-2" style={{ color: "var(--ink-dim)" }}>
          Tap a button above to save your reflection and continue.
        </p>
      </div>
    );
  }

  // idle / completing
  return (
    <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--line)" }}>
      {error && (
        <p className="text-sm mb-3" style={{ color: "var(--redpen)" }}>
          {error}
        </p>
      )}
      <button
        onClick={markComplete}
        disabled={step === "completing"}
        className="w-full rounded-lg px-4 py-3 text-base font-semibold transition-opacity"
        style={{
          background: "var(--ink)",
          color: "#fff",
          opacity: step === "completing" ? 0.5 : 1,
          cursor: step === "completing" ? "not-allowed" : "pointer",
        }}
      >
        {step === "completing" ? "Saving…" : "Done for today"}
      </button>
    </div>
  );
}
