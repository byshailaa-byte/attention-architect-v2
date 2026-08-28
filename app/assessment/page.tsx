"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GATEWAY_QUESTIONS, Question } from "@/lib/engine/questions";
import { buildQuestionSequence, progressMilestone, GatewayAnswers } from "@/lib/engine/router";
import SiteFooter from "@/app/components/SiteFooter";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

function fireGtag(event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", event, params ?? {});
  }
}

function fireFbq(type: "track" | "trackCustom", event: string, params?: Record<string, unknown>, eventId?: string) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    if (eventId) {
      window.fbq(type, event, params ?? {}, { eventID: eventId });
    } else {
      window.fbq(type, event, params ?? {});
    }
  }
}

function fireEvent(eventType: string, sessionId: string, metadata?: Record<string, unknown>) {
  fetch("/api/funnel/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_type: eventType, session_id: sessionId, metadata: metadata ?? {} }),
  }).catch(() => {});
}

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function normalizePhone(raw: string): string {
  let s = raw.replace(/[\s\-.()+]/g, "");
  if (s.startsWith("91") && s.length === 12) s = s.slice(2);
  return s;
}

function isValidPhone(raw: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizePhone(raw));
}

type Phase = "meta" | "questions" | "simplified-gate" | "post-assessment";
type ScoringResult = { archetype: string; parent_pattern: string };

const BG = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";

// ── Engagement screen icon SVGs ──────────────────────────────────────────────
const BrainIcon = (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path d="M12 6C9.8 6 8 7.8 8 10c0 .7.2 1.4.5 2C6.6 12.5 5 14.1 5 16c0 1.5.8 2.9 2 3.7C7 20.1 7 20.6 7 21c0 2.2 1.8 4 4 4h10c2.2 0 4-1.8 4-4 0-.4 0-.9-.1-1.3 1.2-.8 2-2.2 2-3.7 0-1.9-1.6-3.5-3.5-4 .3-.6.5-1.3.5-2 0-2.2-1.8-4-4-4-1 0-1.9.4-2.6 1-.6-.6-1.5-1-2.3-1z" stroke="#F6C63D" strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M16 6v19M11 12h10M11 20h10" stroke="#F6C63D" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const HeartIcon = (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path d="M16 27S5 20 5 12a6 6 0 0112 0 6 6 0 0112 0c0 8-11 15-11 15z" stroke="#F6C63D" strokeWidth="1.8" strokeLinejoin="round"/>
  </svg>
);

const ENGAGEMENT_SCREENS = [
  {
    icon: BrainIcon,
    headline: () => "Most parents think this is about discipline.",
    body: "Your answers suggest something more interesting.",
    cta: "Continue →",
  },
  {
    icon: HeartIcon,
    headline: () => "One final section.",
    body: "How children recover from effort often explains more than how they begin.",
    cta: "Finish →",
  },
] as const;

const GENDER_CHIPS = [
  { label: "Boy",               value: "boy" },
  { label: "Girl",              value: "girl" },
  { label: "Non-binary",        value: "non-binary" },
  { label: "Prefer not to say", value: "prefer-not-to-say" },
] as const;

function AssessmentForm() {
  const params    = useSearchParams();
  const nameParam     = params.get("name") ?? "";
  const hasNameParam  = params.has("name"); // true even when name=""
  const ageParam      = params.get("age") as "8-9" | "10-11" | "12-14" | null;
  const concernsParam = params.get("concerns") ?? "";
  const followupParam = params.get("followup") ?? "";
  const genderParam   = params.get("gender") ?? null; // collected at pre-assessment
  const variantParam  = params.get("variant") ?? "";

  const VALID_AGE_BANDS = ["8-9", "10-11", "12-14"];
  const gatePass = hasNameParam
    && VALID_AGE_BANDS.includes(ageParam ?? "")
    && concernsParam.split(",").filter(Boolean).length > 0;

  const [phase, setPhase]       = useState<Phase>("meta");
  const [childName, setChildName] = useState(nameParam);
  const [ageBand, setAgeBand]   = useState<"8-9" | "10-11" | "12-14">(
    ageParam && VALID_AGE_BANDS.includes(ageParam) ? ageParam : "10-11"
  );

  useEffect(() => {
    if (!gatePass) {
      const p = new URLSearchParams();
      if (ageParam) p.set("age", ageParam);
      if (concernsParam) p.set("concerns", concernsParam);
      const qs = p.toString();
      router.replace(`/pre-assessment${qs ? "?" + qs : ""}`);
      return;
    }
    setQuestions(GATEWAY_QUESTIONS);
    setCurrentIdx(0);
    setAnswers({});
    setPhase("questions");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [questions, setQuestions]   = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers]       = useState<Record<string, string>>({});
  const [sessionId] = useState(() => crypto.randomUUID());

  const [engagementBanner, setEngagementBanner] = useState<{ screenIdx: number } | null>(null);
  const shownEngagements = useRef(new Set<number>());

  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);

  // Post-assessment fields
  const [postGender, setPostGender] = useState<string | null>(null);
  const [parentName, setParentName] = useState("");
  const [email, setEmail]           = useState("");
  const [phone, setPhone]           = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const router = useRouter();

  const firedStart = useRef(false);
  const firedDimensions = useRef(new Set<string>());
  useEffect(() => {
    if (phase === "questions" && !firedStart.current) {
      firedStart.current = true;
      fireEvent("assessment_started", sessionId);
      fireGtag("assessment_started", { session_id: sessionId });
      fireFbq("trackCustom", "AssessmentStarted");
    }
  }, [phase, sessionId]);

  // Auto-dismiss inline engagement banner after 4.5s
  useEffect(() => {
    if (engagementBanner === null) return;
    const t = setTimeout(() => setEngagementBanner(null), 4500);
    return () => clearTimeout(t);
  }, [engagementBanner]);

  function startAssessment() {
    setQuestions(GATEWAY_QUESTIONS);
    setCurrentIdx(0);
    setAnswers({});
    setPhase("questions");
  }

  function fireDimensionComplete(dimension: string) {
    if (firedDimensions.current.has(dimension)) return;
    firedDimensions.current.add(dimension);
    fireEvent("assessment_dimension_complete", sessionId, { dimension });
    fireGtag("assessment_dimension_complete", { dimension });
    fireFbq("trackCustom", "AssessmentDimensionComplete", { dimension });
  }

  function handleAnswer(questionId: string, value: string) {
    const nextAnswers = { ...answers, [questionId]: value };
    setAnswers(nextAnswers);
    fireEvent("assessment_question_complete", sessionId, { question_id: questionId, question_idx: currentIdx });
    const next = currentIdx + 1;

    if (currentIdx === 2) {
      const g: GatewayAnswers = { G1: nextAnswers["G1"], G2: nextAnswers["G2"], G3: nextAnswers["G3"] };
      const fullSeq = buildQuestionSequence(g);
      setQuestions(fullSeq);

      // Gateway-only dimensions: fire complete for any dimension not in post-gateway questions
      const postDims = new Set(fullSeq.slice(3).map(q => q.dimension));
      for (const gq of GATEWAY_QUESTIONS) {
        if (!postDims.has(gq.dimension)) fireDimensionComplete(gq.dimension);
      }
    }

    // Post-gateway: detect dimension transitions using full sequence (questions.length > 3 means it's loaded)
    if (questions.length > 3 && currentIdx >= 3) {
      const thisQ = questions[currentIdx];
      const nextQ = questions[next];
      if (thisQ?.dimension && (!nextQ || nextQ.dimension !== thisQ.dimension)) {
        fireDimensionComplete(thisQ.dimension);
      }
    }

    if (next >= questions.length && currentIdx >= 2) {
      const g: GatewayAnswers = { G1: nextAnswers["G1"], G2: nextAnswers["G2"], G3: nextAnswers["G3"] };
      const fullSeq = buildQuestionSequence(g);
      if (next >= fullSeq.length) {
        // Ensure last dimension fires before submit
        const lastQ = questions[currentIdx];
        if (lastQ?.dimension) fireDimensionComplete(lastQ.dimension);
        submitAssessment(nextAnswers, fullSeq);
        return;
      }
    }

    // Show inline engagement banner at ~40% and ~75% through the full sequence
    if (questions.length > 3) {
      const nextPct = (next + 1) / questions.length;
      const THRESHOLDS = [0.40, 0.75] as const;
      for (let i = 0; i < THRESHOLDS.length; i++) {
        if (nextPct >= THRESHOLDS[i] && !shownEngagements.current.has(i)) {
          shownEngagements.current.add(i);
          setEngagementBanner({ screenIdx: i });
          break;
        }
      }
    }

    if (engagementBanner !== null) setEngagementBanner(null);
    setCurrentIdx(next);
  }

  async function submitAssessment(finalAnswers: Record<string, string>, fullSeq: Question[]) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/assessment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          childName,
          ageBand,
          gender: genderParam,
          answers: finalAnswers,
          questionSequence: fullSeq.map((q) => ({ id: q.id, dimension: q.dimension })),
          concerns: concernsParam.split(",").filter(Boolean),
          worryFollowup: followupParam || null,
          variant: variantParam || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      setScoringResult({ archetype: data.archetype, parent_pattern: data.parent_pattern });
      fireGtag("assessment_complete", { archetype: data.archetype });
      fireFbq("trackCustom", "AssessmentComplete", { archetype: data.archetype });
      setSubmitting(false);
      if (variantParam === "simplified") {
        // Simplified variant: show contact gate immediately (generation already started
        // fire-and-forget in assessment/submit). Parent fills details while report generates.
        setPhase("simplified-gate");
      } else {
        setPhase("post-assessment");
      }
    } catch (e) {
      setSubmitting(false);
      setError((e as Error).message);
    }
  }

  async function submitSimplifiedGate() {
    if (!parentName.trim() || !email.trim() || !phone.trim()) return;
    setPhoneError(null);
    if (!isValidPhone(phone)) {
      setPhoneError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/report/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          parentName: parentName.trim(),
          email: email.trim(),
          phone: normalizePhone(phone),
          variant: "simplified",
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? "Something went wrong");
      }
      fireGtag("generate_lead");
      fireFbq("track", "Lead", {}, `lead:${sessionId}`);
      router.push(
        `/report/generating/${sessionId}?name=${encodeURIComponent(childName || "")}&archetype=${encodeURIComponent(scoringResult?.archetype || "")}&dest=simplified`
      );
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  async function submitPostAssessment() {
    if (!parentName.trim() || !email.trim() || !phone.trim()) return;
    setPhoneError(null);
    if (!isValidPhone(phone)) {
      setPhoneError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/report/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          parentName: parentName.trim(),
          email: email.trim(),
          phone: normalizePhone(phone),
          gender: null, // collected at pre-assessment, already stored via assessment/submit
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? "Something went wrong");
      }
      fireGtag("generate_lead");
      fireFbq("track", "Lead", {}, `lead:${sessionId}`);
      router.push(`/report/generating/${sessionId}?name=${encodeURIComponent(childName || "")}&archetype=${encodeURIComponent(scoringResult?.archetype || "")}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  if (submitting) {
    return (
      <div className="funnel-screen">
        <p style={{ color: "var(--ink-dim)", fontSize: "16px" }}>
          {phase === "questions" ? "Building your report…" : "Opening your report…"}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="funnel-screen">
        <div style={{ color: "var(--redpen)", fontSize: "15px" }}>Error: {error}</div>
      </div>
    );
  }

  if (!gatePass) return null;

  /* ── META PHASE ─────────────────────────────────────────────── */
  if (phase === "meta") {
    const metaReady = true; // name is optional — always allow proceeding
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
            type="text"
            placeholder="e.g. Arjun"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && metaReady) startAssessment(); }}
            style={{
              width: "100%",
              padding: "16px 18px",
              fontSize: "16px",
              border: "2px solid var(--marker)",
              borderRadius: "12px",
              fontFamily: "inherit",
              marginBottom: "20px",
              background: "var(--paper)",
              color: "var(--ink)",
              outline: "none",
            }}
          />
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink-dim)", marginBottom: "9px" }}>
              How old is your child?
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {(["8-9", "10-11", "12-14"] as const).map((band) => (
                <button
                  key={band}
                  className={`chip-btn${ageBand === band ? " sel" : ""}`}
                  style={{ flex: 1, padding: "11px 0" }}
                  onClick={() => setAgeBand(band)}
                >
                  {band}
                </button>
              ))}
            </div>
          </div>
          <button
            className="cta-btn"
            disabled={!metaReady}
            onClick={startAssessment}
            style={{
              background: metaReady ? "var(--marker)" : "var(--line)",
              color: metaReady ? "var(--marker-ink)" : "var(--ink-dim)",
              cursor: metaReady ? "pointer" : "not-allowed",
            }}
          >
            Begin →
          </button>
        </div>
      </div>
    );
  }

  /* ── QUESTIONS PHASE ────────────────────────────────────────── */
  if (phase === "questions") {
    const q = questions[currentIdx];
    if (!q) return null;
    const milestone = progressMilestone(currentIdx, questions.length);
    const pct = Math.round(((currentIdx + 1) / questions.length) * 100);

    return (
      <div className="funnel-screen">
        <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div className="q-progress" style={{ marginBottom: "24px" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: variantParam === "simplified" ? "#F5A623" : "var(--marker)", transition: "width .3s ease" }} />
          </div>
          <div className="q-wrap">
            {engagementBanner !== null && (
              <div style={{
                background: "var(--calm-tint)",
                border: "1px solid var(--calm)",
                borderRadius: "14px",
                padding: "16px 18px",
                marginBottom: "22px",
                fontSize: "13px",
                color: "var(--calm-text)",
                lineHeight: 1.6,
              }}>
                <strong style={{ display: "block", marginBottom: "5px" }}>
                  {ENGAGEMENT_SCREENS[engagementBanner.screenIdx].headline()}
                </strong>
                {ENGAGEMENT_SCREENS[engagementBanner.screenIdx].body}
              </div>
            )}
            <div style={{ fontSize: "13px", color: variantParam === "simplified" ? "#22A38A" : "var(--calm-text)", fontWeight: 600, marginBottom: "8px" }}>
              {milestone}
            </div>
            <div style={{ fontSize: "12.5px", color: "var(--ink-dim)", marginBottom: "20px" }}>
              {currentIdx + 1} of {questions.length}
            </div>
            <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "26px", lineHeight: 1.3, marginBottom: "32px", color: "var(--ink)" }}>
              {q.text.replace(/\{name\}/g, childName || "your child")}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {q.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleAnswer(q.id, opt.value)}
                  style={{
                    background: "var(--card)",
                    border: "1.5px solid var(--line)",
                    borderRadius: "12px",
                    padding: "20px 22px",
                    fontSize: "15.5px",
                    fontWeight: 500,
                    color: "var(--ink)",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    transition: "border-color .1s",
                  }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = variantParam === "simplified" ? "#14284D" : "var(--marker)"; }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--line)"; }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── SIMPLIFIED GATE PHASE ─────────────────────────────────── */
  if (phase === "simplified-gate") {
    const emailTouchedG = email.length > 0;
    const emailValidG   = isValidEmail(email);
    const gateReady     = parentName.trim().length > 0 && emailValidG && phone.trim().length > 0;
    const kidName       = childName || "your child";

    return (
      <div style={{ minHeight: "100dvh", background: "#FBF9F3", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
        <div style={{ maxWidth: 440, width: "100%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-horizontal-icon-wordmark.png" alt="Attention Architect" style={{ height: 26, width: "auto", marginBottom: 32 }} />
          <div style={{ background: "#fff", borderRadius: 16, padding: "32px 28px", border: "1px solid #E8E4D8", boxShadow: "0 2px 12px rgba(20,40,77,0.06)" }}>
            <div style={{ fontSize: "11px", letterSpacing: ".14em", textTransform: "uppercase", color: "#22A38A", fontWeight: 700, marginBottom: 12 }}>
              {kidName}&rsquo;s Report is Ready
            </div>
            <h1 style={{ fontFamily: BG, fontWeight: 800, fontSize: "clamp(22px,4vw,28px)", color: "#14284D", lineHeight: 1.25, margin: "0 0 8px" }}>
              Where should we send it?
            </h1>
            <p style={{ fontSize: "14px", color: "#5B5648", lineHeight: 1.6, margin: "0 0 28px" }}>
              We&rsquo;ll send {kidName}&rsquo;s report to your WhatsApp. Free — no payment needed.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#14284D", marginBottom: 6 }}>
                  Your name <span style={{ color: "#D94F3D", fontWeight: 500, fontSize: 11 }}>Required</span>
                </label>
                <input type="text" placeholder="e.g. Priya" value={parentName} onChange={(e) => setParentName(e.target.value)}
                  style={{ width: "100%", padding: "13px 16px", fontSize: "15px", border: "2px solid #F5A623", borderRadius: 10, fontFamily: "inherit", background: "#FBF9F3", color: "#14284D", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#14284D", marginBottom: 6 }}>
                  Email <span style={{ color: "#D94F3D", fontWeight: 500, fontSize: 11 }}>Required</span>
                </label>
                <input type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  style={{ width: "100%", padding: "13px 16px", fontSize: "15px", border: `2px solid ${emailTouchedG && !emailValidG ? "#D94F3D" : "#F5A623"}`, borderRadius: 10, fontFamily: "inherit", background: "#FBF9F3", color: "#14284D", outline: "none", boxSizing: "border-box" }} />
                {emailTouchedG && !emailValidG && <div style={{ fontSize: 12, color: "#D94F3D", marginTop: 5 }}>Enter a valid email (e.g. you@gmail.com)</div>}
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#14284D", marginBottom: 6 }}>
                  WhatsApp number <span style={{ color: "#D94F3D", fontWeight: 500, fontSize: 11 }}>Required</span>
                </label>
                <input type="tel" placeholder="98765 43210" value={phone} onChange={(e) => { setPhone(e.target.value); setPhoneError(null); }}
                  style={{ width: "100%", padding: "13px 16px", fontSize: "15px", border: `2px solid ${phoneError ? "#D94F3D" : "#F5A623"}`, borderRadius: 10, fontFamily: "inherit", background: "#FBF9F3", color: "#14284D", outline: "none", boxSizing: "border-box" }} />
                {phoneError ? <div style={{ fontSize: 12, color: "#D94F3D", marginTop: 5 }}>{phoneError}</div>
                  : <div style={{ fontSize: 12, color: "#8B8570", marginTop: 5 }}>Used only to send the report — never shared.</div>}
              </div>
              {error && <div style={{ background: "#fdf0ee", color: "#D94F3D", border: "1px solid #e8c4be", borderRadius: 8, padding: "12px 16px", fontSize: 13 }}>{error}</div>}
              <button
                className="sv-gate-submit"
                onClick={submitSimplifiedGate}
                disabled={!gateReady || submitting}
                style={{ width: "100%", padding: "15px 20px", background: gateReady ? "#14284D" : "#D4D0C4", color: gateReady ? "#fff" : "#8B8570", fontFamily: BG, fontWeight: 800, fontSize: 15, border: "none", borderRadius: 10, cursor: gateReady && !submitting ? "pointer" : "not-allowed", marginTop: 4 }}
              >
                {submitting ? "Opening report…" : `Open ${kidName}'s Report →`}
              </button>
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 18, fontSize: 12, color: "#8B8570", justifyContent: "center" }}>
              <span>Free</span><span>·</span><span>No payment needed</span><span>·</span><span>Sent to WhatsApp</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── POST-ASSESSMENT PHASE ──────────────────────────────────── */
  const emailTouched  = email.length > 0;
  const emailValid    = isValidEmail(email);
  const postReady     = parentName.trim().length > 0 && emailValid && phone.trim().length > 0;

  return (
    <div className="funnel-screen">
      <div className="post-grid">

        {/* Left: report preview */}
        <div className="teaser-col">
          <div style={{ fontSize: "11px", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--marker)", fontWeight: 700, marginBottom: "18px" }}>
            What&rsquo;s in your report
          </div>
          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "20px", lineHeight: 1.3, color: "var(--paper)", marginBottom: "8px" }}>
            Six sections. All built from your answers.
          </h2>
          <p style={{ fontSize: "13px", color: "rgba(246,244,236,.5)", lineHeight: 1.6, marginBottom: "24px", fontStyle: "italic" }}>
            Nothing in your report is invented. Every sentence traces back to something you told us.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {([
              ["Recognition",              "A moment you'll almost certainly recognize — described before anything gets explained."],
              ["The Pattern",              "What's actually going on underneath that moment, named plainly, with the evidence behind it."],
              ["The Loop",                 "The specific way your instinct and your child's pattern meet — shown, not implied."],
              ["What This Explains",       "A few things you've probably believed, and what your answers actually suggest instead."],
              ["Where We're Less Certain", "What we're honestly not sure about yet — stated directly, not hidden."],
              ["Hope, and the Roadmap",    "Why none of this is fixed — and what six weeks, built around your child specifically, could look like."],
            ] as [string, string][]).map(([title, desc], i) => (
              <div key={title} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--marker)", minWidth: "18px", paddingTop: "3px", flexShrink: 0 }}>{i + 1}</div>
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--paper)", marginBottom: "3px" }}>{title}</div>
                  <div style={{ fontSize: "12px", color: "rgba(246,244,236,.55)", lineHeight: 1.55 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: form */}
        <div className="form-col">
          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "20px", color: "var(--ink)", marginBottom: "8px" }}>
            One last step before we open {childName || "your child"}&rsquo;s report.
          </h2>

          {/* Parent name — required */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "13px", fontWeight: 700, display: "block", marginBottom: "8px" }}>
              Your name{" "}
              <span style={{ color: "var(--redpen)", fontWeight: 600, fontSize: "11px" }}>Required</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Priya"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 16px",
                fontSize: "15px",
                border: "2px solid var(--marker)",
                borderRadius: "12px",
                fontFamily: "inherit",
                background: "var(--paper)",
                color: "var(--ink)",
                outline: "none",
              }}
            />
          </div>

          {/* Email — required */}
          <div style={{ marginBottom: "8px" }}>
            <label style={{ fontSize: "13px", fontWeight: 700, display: "block", marginBottom: "8px" }}>
              Email{" "}
              <span style={{ color: "var(--redpen)", fontWeight: 600, fontSize: "11px" }}>Required</span>
            </label>
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 16px",
                fontSize: "15px",
                border: `2px solid ${emailTouched && !emailValid ? "var(--redpen)" : "var(--marker)"}`,
                borderRadius: "12px",
                fontFamily: "inherit",
                background: "var(--paper)",
                color: "var(--ink)",
                outline: "none",
              }}
            />
            {emailTouched && !emailValid && (
              <div style={{ fontSize: "12px", color: "var(--redpen)", marginTop: "6px" }}>
                Enter a valid email address (e.g. you@gmail.com)
              </div>
            )}
          </div>

          {/* WhatsApp number — required */}
          <div style={{ marginBottom: "8px" }}>
            <label style={{ fontSize: "13px", fontWeight: 700, display: "block", marginBottom: "8px" }}>
              WhatsApp number{" "}
              <span style={{ color: "var(--redpen)", fontWeight: 600, fontSize: "11px" }}>Required</span>
            </label>
            <input
              type="tel"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setPhoneError(null); }}
              style={{
                width: "100%",
                padding: "14px 16px",
                fontSize: "15px",
                border: `2px solid ${phoneError ? "var(--redpen)" : "var(--marker)"}`,
                borderRadius: "12px",
                fontFamily: "inherit",
                background: "var(--paper)",
                color: "var(--ink)",
                outline: "none",
              }}
            />
            {phoneError ? (
              <div style={{ fontSize: "12px", color: "var(--redpen)", marginTop: "6px" }}>{phoneError}</div>
            ) : (
              <div style={{ fontSize: "12px", color: "var(--ink-dim)", marginTop: "6px" }}>
                Used only to send your report and your six-week reminders — never sold, never spammed.
              </div>
            )}
          </div>

          {error && (
            <div style={{ background: "#fdf0ee", color: "var(--redpen)", border: "1px solid #e8c4be", borderRadius: "8px", padding: "12px 16px", fontSize: "13px", marginBottom: "8px" }}>
              {error}
            </div>
          )}

          <button
            className="cta-btn"
            disabled={!postReady}
            onClick={submitPostAssessment}
            style={{
              marginTop: "12px",
              background: postReady ? "var(--marker)" : "var(--line)",
              color: postReady ? "var(--marker-ink)" : "var(--ink-dim)",
              cursor: postReady ? "pointer" : "not-allowed",
            }}
          >
            Open My Report →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AssessmentPage() {
  return (
    <>
      <Suspense>
        <AssessmentForm />
      </Suspense>
      <SiteFooter />
    </>
  );
}
