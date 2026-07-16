"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteFooter from "@/app/components/SiteFooter";

const BG = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";

function PreAssessmentForm() {
  const router = useRouter();
  const params = useSearchParams();
  const ageParam  = params.get("age") ?? "";
  const concernsParam = params.get("concerns") ?? "";

  const [childName, setChildName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trimmed = childName.trim();
  const canBegin = trimmed.length > 0;

  function handleBegin() {
    if (!canBegin) return;
    const p = new URLSearchParams();
    p.set("name", trimmed);
    if (ageParam) p.set("age", ageParam);
    if (concernsParam) p.set("concerns", concernsParam);
    router.push(`/assessment?${p.toString()}`);
  }

  return (
    <div className="funnel-screen">
      <div className="funnel-card">
        <div style={{ fontSize: "11px", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-dim)", fontWeight: 700, marginBottom: "16px" }}>
          Before You Start
        </div>

        <label style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)", display: "block", marginBottom: "10px" }}>
          What&rsquo;s your child&rsquo;s first name?
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
          disabled={!canBegin}
          onClick={handleBegin}
          style={{
            background: canBegin ? "var(--marker)" : "var(--line)",
            color: canBegin ? "var(--marker-ink)" : "var(--ink-dim)",
            cursor: canBegin ? "pointer" : "not-allowed",
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
