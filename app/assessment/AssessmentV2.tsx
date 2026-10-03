"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GATEWAY_QUESTIONS, Question } from "@/lib/engine/questions";
import { buildQuestionSequence, GatewayAnswers } from "@/lib/engine/router";
import { captureUtmOnce, getStoredUtm } from "@/lib/utm";
import { getFlowSid } from "@/lib/flow/session";
import { isValidEmail, detailsReady } from "@/lib/flow/validate";
import { displayChildName, CHILD_NAME_FALLBACK_MID, type Gender } from "@/lib/report/pronouns";
import { HALFWAY_FIRST_READ, HALFWAY_FIRST_READ_FALLBACK, fillHalfwayLine } from "@/content/assessment/halfway-first-read";
import FlowShell from "@/app/components/FlowShell";

const BG   = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";
const NAVY  = "#14284D";
const GOLD  = "#F5A623";

function fireEvent(eventType: string, sessionId: string, metadata?: Record<string, unknown>) {
  fetch("/api/funnel/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_type: eventType, session_id: sessionId, metadata: metadata ?? {} }),
  }).catch(() => {});
}
function fireGtag(event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") window.gtag("event", event, params ?? {});
}
function fireFbq(type: "track" | "trackCustom", event: string, params?: Record<string, unknown>, eventId?: string) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    if (eventId) window.fbq(type, event, params ?? {}, { eventID: eventId });
    else window.fbq(type, event, params ?? {});
  }
}
type Phase = "questions" | "halfway" | "details";

export default function AssessmentV2() {
  const router = useRouter();
  const params = useSearchParams();
  const nameParam     = params.get("name") ?? "";
  const hasNameParam  = params.has("name");
  const ageParam      = params.get("age") as "8-9" | "10-11" | "12-14" | null;
  const concernsParam = params.get("concerns") ?? "";
  const genderParam   = (params.get("gender") ?? null) as Gender;
  const variantParam  = params.get("variant") ?? "simplified";

  const VALID_AGE_BANDS = ["8-9", "10-11", "12-14"];
  const gatePass = hasNameParam && VALID_AGE_BANDS.includes(ageParam ?? "") && concernsParam.split(",").filter(Boolean).length > 0;

  const [phase, setPhase]       = useState<Phase>("questions");
  const [questions, setQuestions]   = useState<Question[]>(GATEWAY_QUESTIONS);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers]       = useState<Record<string, string>>({});
  const [childName] = useState(nameParam);
  const ageBand: "8-9" | "10-11" | "12-14" = ageParam && VALID_AGE_BANDS.includes(ageParam) ? ageParam : "10-11";

  const [sessionId] = useState(() => getFlowSid());
  const [halfwayLine, setHalfwayLine] = useState<string>("");
  const pendingIdxRef = useRef<number | null>(null);
  const halfwayShown = useRef(false);

  const [parentName, setParentName] = useState("");
  const [email, setEmail]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const kidName     = childName.trim() ? displayChildName(childName) : CHILD_NAME_FALLBACK_MID;
  const kidNameDisp = childName.trim() ? displayChildName(childName) : "your child";

  // Max possible question count across all gateway combinations (the sequence is adaptive).
  const totalMax = useMemo(() => {
    const [g1, g2, g3] = GATEWAY_QUESTIONS;
    let max = GATEWAY_QUESTIONS.length;
    for (const a of g1.options) for (const b of g2.options) for (const c of g3.options) {
      const len = buildQuestionSequence({ G1: a.value, G2: b.value, G3: c.value } as GatewayAnswers).length;
      if (len > max) max = len;
    }
    return max;
  }, []);

  const firedStart = useRef(false);
  useEffect(() => {
    if (!gatePass) { router.replace("/simplified/start?flow=v2"); return; }
    captureUtmOnce();
    if (!firedStart.current) {
      firedStart.current = true;
      fireEvent("assessment_started", sessionId, { flow: "v2" });
      fireGtag("assessment_started", { session_id: sessionId });
      fireFbq("trackCustom", "AssessmentStarted");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          variant: variantParam,
          utm: getStoredUtm(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      fireGtag("assessment_complete", { archetype: data.archetype });
      fireFbq("trackCustom", "AssessmentComplete", { archetype: data.archetype });
      setSubmitting(false);
      fireEvent("details_view", sessionId, { flow: "v2" });
      setPhase("details");
    } catch (e) {
      setSubmitting(false);
      setError((e as Error).message);
    }
  }

  async function showHalfway(partialAnswers: Record<string, string>, seq: Question[], nextIdx: number) {
    halfwayShown.current = true;
    pendingIdxRef.current = nextIdx;
    setHalfwayLine(fillHalfwayLine(HALFWAY_FIRST_READ_FALLBACK, genderParam, kidName));
    setPhase("halfway");
    fireEvent("halfway_view", sessionId, { flow: "v2" });
    try {
      const res = await fetch("/api/flow/partial-archetype", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: partialAnswers, questionSequence: seq.map((q) => ({ id: q.id, dimension: q.dimension })) }),
      });
      const data = await res.json().catch(() => ({})) as { archetype?: string | null };
      const line = (data.archetype && HALFWAY_FIRST_READ[data.archetype]) || HALFWAY_FIRST_READ_FALLBACK;
      setHalfwayLine(fillHalfwayLine(line, genderParam, kidName));
    } catch { /* keep the fallback line already set */ }
  }

  function handleAnswer(questionId: string, value: string) {
    const nextAnswers = { ...answers, [questionId]: value };
    setAnswers(nextAnswers);
    fireEvent("q_answered", sessionId, { question_id: questionId, index: currentIdx });

    let seq = questions;
    // After the 3 gateway questions, build the full adaptive sequence.
    if (currentIdx === 2) {
      const g: GatewayAnswers = { G1: nextAnswers["G1"], G2: nextAnswers["G2"], G3: nextAnswers["G3"] };
      seq = buildQuestionSequence(g);
      setQuestions(seq);
    }

    const next = currentIdx + 1;

    if (next >= seq.length && currentIdx >= 2) {
      submitAssessment(nextAnswers, seq);
      return;
    }

    // Halfway interstitial after answering ceil(total/2) questions (once the full
    // sequence is known, i.e. post-gateway). Uses the parent's actual sequence length.
    if (seq.length > 3) {
      const halfwayAt = Math.ceil(seq.length / 2);
      if (!halfwayShown.current && next === halfwayAt) {
        showHalfway(nextAnswers, seq, next);
        return;
      }
    }
    setCurrentIdx(next);
  }

  if (submitting) {
    return (
      <div className="funnel-screen">
        <p style={{ color: "var(--ink-dim)", fontSize: 16 }}>Building {kidNameDisp}&rsquo;s report…</p>
      </div>
    );
  }
  if (error) {
    return <div className="funnel-screen"><div style={{ color: "var(--redpen)", fontSize: 15 }}>Error: {error}</div></div>;
  }
  if (!gatePass) return null;

  // ── STEP 6 — HALFWAY interstitial (full-screen navy) ──────────────────────────
  if (phase === "halfway") {
    return (
      <div style={{ minHeight: "100dvh", background: NAVY, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 22px" }}>
        <div style={{ maxWidth: 440, width: "100%" }}>
          <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: GOLD, fontWeight: 800, marginBottom: 14 }}>
            Halfway · A pattern is already showing in {kidNameDisp}&rsquo;s answers.
          </div>
          <div style={{ background: "#fff", borderRadius: 16, padding: "26px 24px", boxShadow: "0 20px 50px rgba(0,0,0,.3)" }}>
            <div style={{ fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink-dim)", fontWeight: 800, marginBottom: 12 }}>First read</div>
            <p style={{ fontFamily: BG, fontWeight: 700, fontSize: 20, lineHeight: 1.4, color: "var(--ink)", margin: 0 }}>{halfwayLine}</p>
          </div>
          <p style={{ fontSize: 14.5, color: "rgba(255,255,255,.82)", lineHeight: 1.6, margin: "22px 2px 24px" }}>
            The next questions confirm it, and your report shows what to do about it.
          </p>
          <button
            onClick={() => { const n = pendingIdxRef.current; setPhase("questions"); if (n != null) setCurrentIdx(n); }}
            style={{ width: "100%", background: GOLD, color: NAVY, border: "none", borderRadius: 12, padding: "16px 20px", fontFamily: BG, fontWeight: 800, fontSize: 16, cursor: "pointer" }}
          >
            Keep going →
          </button>
        </div>
      </div>
    );
  }

  // ── STEP 7 — DETAILS ──────────────────────────────────────────────────────────
  if (phase === "details") {
    const emailTouched = email.length > 0;
    const emailValid   = isValidEmail(email);
    const ready        = detailsReady(parentName, email);
    async function submitDetails() {
      if (!ready || submitting) return;
      setSubmitting(true); setError(null);
      fireEvent("details_submitted", sessionId, { flow: "v2" });
      try {
        const res = await fetch("/api/report/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, parentName: parentName.trim(), email: email.trim(), variant: variantParam }),
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as { error?: string }).error ?? "Something went wrong"); }
        fireGtag("generate_lead");
        fireFbq("track", "Lead", {}, `lead:${sessionId}`);
        router.push(`/report/${sessionId}`);
      } catch (e) {
        setError((e as Error).message);
        setSubmitting(false);
      }
    }
    return (
      <FlowShell pct={92} minutesLeft={1} label="Last step">
        <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#22A38A", fontWeight: 800, marginBottom: 12 }}>
          All questions done · {kidName}&rsquo;s report is ready.
        </div>
        <h1 style={{ fontFamily: BG, fontWeight: 800, fontSize: 24, lineHeight: 1.25, color: "var(--ink)", margin: "0 0 8px" }}>Tell us who you are, and we&rsquo;ll open it.</h1>
        <p style={{ fontSize: 14, color: "var(--ink-dim)", lineHeight: 1.55, margin: "0 0 22px" }}>We send a copy to your email too, so you always have it.</p>

        <label style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", display: "block", marginBottom: 8 }}>Your name <span style={{ color: "var(--redpen)", fontWeight: 600, fontSize: 11 }}>Required</span></label>
        <input type="text" placeholder="e.g. Priya" value={parentName} onChange={(e) => setParentName(e.target.value)}
          style={{ width: "100%", padding: "14px 16px", fontSize: 15, border: "2px solid var(--marker)", borderRadius: 12, fontFamily: "inherit", background: "var(--paper)", color: "var(--ink)", outline: "none", boxSizing: "border-box", marginBottom: 16 }} />

        <label style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", display: "block", marginBottom: 8 }}>Email <span style={{ color: "var(--redpen)", fontWeight: 600, fontSize: 11 }}>Required</span></label>
        <input type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: "14px 16px", fontSize: 15, border: `2px solid ${emailTouched && !emailValid ? "var(--redpen)" : "var(--marker)"}`, borderRadius: 12, fontFamily: "inherit", background: "var(--paper)", color: "var(--ink)", outline: "none", boxSizing: "border-box" }} />
        {emailTouched && !emailValid && <div style={{ fontSize: 12, color: "var(--redpen)", marginTop: 6 }}>Enter a valid email address (e.g. you@gmail.com)</div>}

        {error && <div style={{ background: "#fdf0ee", color: "var(--redpen)", border: "1px solid #e8c4be", borderRadius: 8, padding: "12px 16px", fontSize: 13, marginTop: 14 }}>{error}</div>}

        <button className="cta-btn" disabled={!ready || submitting} onClick={submitDetails}
          style={{ marginTop: 20, background: ready ? NAVY : "var(--line)", color: ready ? "#fff" : "var(--ink-dim)", cursor: ready && !submitting ? "pointer" : "not-allowed" }}>
          {submitting ? "Opening…" : `Show ${kidName}'s report →`}
        </button>
      </FlowShell>
    );
  }

  // ── STEP 5 — QUESTIONS ──────────────────────────────────────────────────────
  const q = questions[currentIdx];
  if (!q) return null;
  const pct = 34 + Math.round(((currentIdx) / Math.max(1, totalMax)) * 52);
  return (
    <FlowShell
      pct={pct}
      minutesLeft={Math.max(1, Math.round((100 - pct) / 20))}
      label={`Question ${currentIdx + 1} of up to ${totalMax}`}
      onBack={currentIdx > 0 ? () => setCurrentIdx(currentIdx - 1) : undefined}
      footer={<>No right answers. Pick what happens most days.</>}
    >
      <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: 24, lineHeight: 1.3, marginBottom: 28, color: "var(--ink)" }}>
        {q.text.replace(/\{name\}/g, kidName)}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {q.options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleAnswer(q.id, opt.value)}
            style={{ background: "var(--card)", border: "1.5px solid var(--line)", borderRadius: 12, padding: "18px 20px", fontSize: 15.5, fontWeight: 500, color: "var(--ink)", cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "border-color .1s", minHeight: 44 }}
            onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = NAVY; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--line)"; }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </FlowShell>
  );
}
