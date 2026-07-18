"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GATEWAY_QUESTIONS, Question } from "@/lib/engine/questions";
import { buildQuestionSequence, progressMilestone, GatewayAnswers } from "@/lib/engine/router";
import SiteFooter from "@/app/components/SiteFooter";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function fireGtag(event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", event, params ?? {});
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

type Phase = "meta" | "questions" | "post-assessment";
type ScoringResult = { archetype: string; parent_pattern: string };

const BG = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";

const GENDER_CHIPS = [
  { label: "Boy",               value: "boy" },
  { label: "Girl",              value: "girl" },
  { label: "Non-binary",        value: "non-binary" },
  { label: "Prefer not to say", value: "prefer-not-to-say" },
] as const;

function AssessmentForm() {
  const params    = useSearchParams();
  const nameParam = params.get("name") ?? "";
  const ageParam  = params.get("age") as "8-9" | "10-11" | "12-14" | null;

  const [phase, setPhase]       = useState<Phase>("meta");
  const [childName, setChildName] = useState(nameParam);
  const [ageBand, setAgeBand]   = useState<"8-9" | "10-11" | "12-14">(
    ageParam && ["8-9", "10-11", "12-14"].includes(ageParam) ? ageParam : "10-11"
  );

  useEffect(() => {
    if (nameParam.trim()) {
      setQuestions(GATEWAY_QUESTIONS);
      setCurrentIdx(0);
      setAnswers({});
      setPhase("questions");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [questions, setQuestions]   = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers]       = useState<Record<string, string>>({});
  const [sessionId] = useState(() => crypto.randomUUID());

  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);

  // Post-assessment fields
  const [postGender, setPostGender] = useState<string | null>(null);
  const [parentName, setParentName] = useState("");
  const [email, setEmail]           = useState("");

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
    }
  }, [phase, sessionId]);

  function startAssessment() {
    if (!childName.trim()) return;
    setQuestions(GATEWAY_QUESTIONS);
    setCurrentIdx(0);
    setAnswers({});
    setPhase("questions");
  }

  function fireDimensionComplete(dimension: string) {
    if (firedDimensions.current.has(dimension)) return;
    firedDimensions.current.add(dimension);
    fireEvent("assessment_dimension_complete", sessionId, { dimension });
    fireGtag("dimension_complete", { dimension });
  }

  function handleAnswer(questionId: string, value: string) {
    const nextAnswers = { ...answers, [questionId]: value };
    setAnswers(nextAnswers);
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
          gender: null,
          answers: finalAnswers,
          questionSequence: fullSeq.map((q) => ({ id: q.id, dimension: q.dimension })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      setScoringResult({ archetype: data.archetype, parent_pattern: data.parent_pattern });
      fireGtag("assessment_complete", { archetype: data.archetype });
      setSubmitting(false);
      setPhase("post-assessment");
    } catch (e) {
      setSubmitting(false);
      setError((e as Error).message);
    }
  }

  async function submitPostAssessment() {
    if (!parentName.trim() || !email.trim()) return;
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
          gender: postGender,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? "Something went wrong");
      }
      fireGtag("generate_lead");
      router.push(`/report/${sessionId}`);
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

  /* ── META PHASE ─────────────────────────────────────────────── */
  if (phase === "meta") {
    const metaReady = childName.trim().length > 0;
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
            <div style={{ height: "100%", width: `${pct}%`, background: "var(--marker)", transition: "width .3s ease" }} />
          </div>
          <div className="q-wrap">
            <div style={{ fontSize: "13px", color: "var(--calm-text)", fontWeight: 600, marginBottom: "8px" }}>
              {milestone}
            </div>
            <div style={{ fontSize: "12.5px", color: "var(--ink-dim)", marginBottom: "20px" }}>
              {currentIdx + 1} of {questions.length}
            </div>
            <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "26px", lineHeight: 1.3, marginBottom: "32px", color: "var(--ink)" }}>
              {q.text.replace(/\{name\}/g, childName)}
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
                  onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--marker)"; }}
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

  /* ── POST-ASSESSMENT PHASE ──────────────────────────────────── */
  const emailTouched = email.length > 0;
  const emailValid   = isValidEmail(email);
  const postReady    = parentName.trim().length > 0 && emailValid;

  return (
    <div className="funnel-screen">
      <div className="post-grid">

        {/* Left: dark teaser */}
        <div className="teaser-col">
          <div style={{ fontSize: "11px", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--marker)", fontWeight: 700, marginBottom: "20px" }}>
            Your Results Are Ready
          </div>

          {/* Revealed: archetype */}
          <div style={{ background: "var(--marker-tint)", border: "1.5px solid var(--marker)", borderRadius: "12px", padding: "18px 20px", marginBottom: "14px" }}>
            <div style={{ fontSize: "11px", color: "var(--ink-dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: "6px" }}>
              {childName || "Your child"}&rsquo;s Type
            </div>
            <div style={{ fontFamily: BG, fontWeight: 800, fontSize: "20px", color: "var(--ink)" }}>
              {scoringResult?.archetype ?? "—"}
            </div>
          </div>

          {/* Locked: parent pattern */}
          <div style={{ background: "rgba(246,244,236,.06)", border: "1.5px dashed rgba(246,244,236,.25)", borderRadius: "12px", padding: "18px 20px", marginBottom: "0" }}>
            <div style={{ fontSize: "11px", color: "rgba(246,244,236,.5)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: "6px" }}>
              Your Pattern
            </div>
            <div style={{ fontFamily: BG, fontWeight: 800, fontSize: "20px", color: "rgba(246,244,236,.35)" }}>
              ? · One of 4
            </div>
          </div>

          <p style={{ fontSize: "13px", color: "rgba(246,244,236,.7)", lineHeight: 1.6, marginTop: "20px" }}>
            One of 8 attention types, confirmed. There&rsquo;s also a pattern in your own answers — and a specific way the two connect that most parents don&rsquo;t see coming.
          </p>
        </div>

        {/* Right: form */}
        <div className="form-col">
          <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "20px", color: "var(--ink)", marginBottom: "8px" }}>
            Almost there.
          </h2>
          <p style={{ fontSize: "13.5px", color: "var(--ink-dim)", lineHeight: 1.6, marginBottom: "24px" }}>
            A couple of optional questions sharpen the report. Only your name and email are needed to see it.
          </p>

          {/* Gender — optional */}
          <div style={{ marginBottom: "22px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>
              {childName || "Your child"}&rsquo;s gender{" "}
              <span style={{ fontWeight: 400, color: "var(--ink-dim)" }}>(optional)</span>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {GENDER_CHIPS.map((chip) => {
                const sel = postGender === chip.value;
                return (
                  <button
                    key={chip.value}
                    className={`chip-btn${sel ? " sel" : ""}`}
                    style={{ fontSize: "13px", padding: "9px 14px" }}
                    onClick={() => setPostGender(sel ? null : chip.value)}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

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
