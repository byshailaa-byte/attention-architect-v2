"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteFooter from "@/app/components/SiteFooter";

const BG = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";

const VALID_AGE_BANDS = ["8-9", "10-11", "12-14"];

const GENDER_CHIPS = [
  { label: "Boy",               value: "boy" },
  { label: "Girl",              value: "girl" },
  { label: "Non-binary",        value: "non-binary" },
  { label: "Prefer not to say", value: "prefer-not-to-say" },
] as const;

function PreAssessmentForm() {
  const router = useRouter();
  const params = useSearchParams();
  const ageParam      = params.get("age") ?? "";
  const concernsParam = params.get("concerns") ?? "";
  const followupParam = params.get("followup") ?? "";
  const variantParam  = params.get("variant") ?? "";

  const gatePass = VALID_AGE_BANDS.includes(ageParam) && concernsParam.split(",").filter(Boolean).length > 0;

  const [childName, setChildName] = useState("");
  const [childGender, setChildGender] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!gatePass) {
      router.replace("/");
      return;
    }
    inputRef.current?.focus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!gatePass) return null;

  const trimmed = childName.trim();

  function handleBegin() {
    const p = new URLSearchParams();
    p.set("name", trimmed); // empty string is valid — assessment skips meta phase on any name param
    if (ageParam) p.set("age", ageParam);
    if (concernsParam) p.set("concerns", concernsParam);
    if (followupParam) p.set("followup", followupParam);
    if (childGender) p.set("gender", childGender);
    if (variantParam) p.set("variant", variantParam);
    router.push(`/assessment?${p.toString()}`);
  }

  return (
    <div className="funnel-screen">
      <div className="funnel-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-horizontal-icon-wordmark.png" alt="Attention Architect" style={{ height: 28, width: "auto", marginBottom: 20 }} />

        <div style={{ fontSize: "11px", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-dim)", fontWeight: 700, marginBottom: "16px" }}>
          Before You Start
        </div>

        <label style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)", display: "block", marginBottom: "10px" }}>
          What&rsquo;s your child&rsquo;s first name?{" "}
          <span style={{ fontWeight: 400, color: "var(--ink-dim)" }}>(optional)</span>
        </label>
        <input
          ref={inputRef}
          type="text"
          placeholder="e.g. Arjun"
          value={childName}
          onChange={(e) => setChildName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleBegin(); }}
          style={{
            width: "100%",
            padding: "16px 18px",
            fontSize: "16px",
            border: "2px solid var(--marker)",
            borderRadius: "12px",
            fontFamily: "inherit",
            marginBottom: "24px",
            background: "var(--paper)",
            color: "var(--ink)",
            outline: "none",
          }}
        />

        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)", marginBottom: "9px" }}>
            {trimmed ? `${trimmed}'s` : "Your child's"} gender{" "}
            <span style={{ fontWeight: 400, color: "var(--ink-dim)" }}>(optional)</span>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {GENDER_CHIPS.map((chip) => {
              const sel = childGender === chip.value;
              return (
                <button
                  key={chip.value}
                  className={`chip-btn${sel ? " sel" : ""}`}
                  style={{ fontSize: "13px", padding: "9px 14px" }}
                  onClick={() => setChildGender(sel ? null : chip.value)}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        <h1 style={{ fontFamily: BG, fontWeight: 800, fontSize: "25px", lineHeight: 1.3, color: "var(--ink)", marginBottom: "20px" }}>
          Answer honestly.<br />That&rsquo;s the only rule.
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
          {[
            "This adapts as you go — some answers lead to more questions, some don't. That's by design.",
            `Answer for how ${trimmed || "your child"} actually is right now — not how you wish they were.`,
            "No pass, no fail. Every honest answer makes the result more accurate.",
          ].map((rule, i) => (
            <div key={i} style={{ display: "flex", gap: "12px", fontSize: "14.5px", color: "var(--ink-dim)", lineHeight: 1.5 }}>
              <span style={{ color: "var(--calm-text)", flexShrink: 0, fontWeight: 700 }}>→</span>
              {rule}
            </div>
          ))}
        </div>

        <div style={{ background: "var(--calm-tint)", borderRadius: "12px", padding: "18px 20px", fontSize: "13.5px", color: "var(--calm-text)", lineHeight: 1.6, marginBottom: "24px" }}>
          <strong>You&rsquo;ll get three things at the end:</strong>{" "}
          {trimmed ? `${trimmed}'s` : "your child's"} Attention Type, your own Instinct Pattern
          — and how the two actually interact.
        </div>

        <button
          className="cta-btn"
          onClick={handleBegin}
          style={{
            background: "var(--marker)",
            color: "var(--marker-ink)",
            cursor: "pointer",
          }}
        >
          Begin →
        </button>
      </div>
    </div>
  );
}

export default function PreAssessmentPage() {
  return (
    <>
      <Suspense>
        <PreAssessmentForm />
      </Suspense>
      <SiteFooter />
    </>
  );
}
