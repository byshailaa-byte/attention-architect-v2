"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GATEWAY_QUESTIONS, Question } from "@/lib/engine/questions";
import { buildQuestionSequence, GatewayAnswers } from "@/lib/engine/router";
import { captureUtmOnce, getStoredUtm } from "@/lib/utm";
import { getFlowSid } from "@/lib/flow/session";
import { isValidIndianMobile, contactReady } from "@/lib/flow/validate";
import { displayChildName, CHILD_NAME_FALLBACK_MID, type Gender } from "@/lib/report/pronouns";
import { HALFWAY_FIRST_READ, HALFWAY_FIRST_READ_FALLBACK, fillHalfwayLine } from "@/content/assessment/halfway-first-read";
import { FLOW, HEAD, BODY, Wordmark, BackLink, Screen, QuestionProgress, minsLeft } from "@/app/components/FlowShell";
import ThankYouV2 from "./ThankYouV2";
import SiteFooter from "@/app/components/SiteFooter";

const LETTERS = "ABCDEF";

function fireEvent(eventType: string, sessionId: string, metadata?: Record<string, unknown>) {
  fetch("/api/funnel/event", {
    method: "POST", headers: { "Content-Type": "application/json" },
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

type Phase = "questions" | "halfway" | "contact" | "thankyou";

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
  const [picked, setPicked]         = useState<string | null>(null);
  const [childName] = useState(nameParam);
  const ageBand: "8-9" | "10-11" | "12-14" = ageParam && VALID_AGE_BANDS.includes(ageParam) ? ageParam : "10-11";

  const [sessionId] = useState(() => getFlowSid());
  const [halfwayLine, setHalfwayLine] = useState<string>("");
  const [archetype, setArchetype]     = useState<string>("");
  const [totalDone, setTotalDone]     = useState(0);
  const pendingIdxRef = useRef<number | null>(null);
  const halfwayShown = useRef(false);

  const [phone, setPhone]           = useState("");
  const [parentName, setParentName] = useState("");
  const [email, setEmail]           = useState("");
  const [phoneErr, setPhoneErr]     = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const kidName     = childName.trim() ? displayChildName(childName) : CHILD_NAME_FALLBACK_MID;
  const kidNameDisp = childName.trim() ? displayChildName(childName) : "your child";

  const totalMax = useMemo(() => {
    const [g1, g2, g3] = GATEWAY_QUESTIONS;
    let max = GATEWAY_QUESTIONS.length;
    for (const a of g1.options) for (const b of g2.options) for (const c of g3.options) {
      const len = buildQuestionSequence({ G1: a.value, G2: b.value, G3: c.value } as GatewayAnswers).length;
      if (len > max) max = len;
    }
    return max;
  }, []);
  const total = questions.length > 3 ? questions.length : totalMax;

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
    setTotalDone(fullSeq.length);
    try {
      const res = await fetch("/api/assessment/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId, childName, ageBand, gender: genderParam,
          answers: finalAnswers,
          questionSequence: fullSeq.map((q) => ({ id: q.id, dimension: q.dimension })),
          concerns: concernsParam.split(",").filter(Boolean),
          variant: variantParam, utm: getStoredUtm(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      setArchetype(data.archetype ?? "");
      fireGtag("assessment_complete", { archetype: data.archetype });
      fireFbq("trackCustom", "AssessmentComplete", { archetype: data.archetype });
      setSubmitting(false);
      fireEvent("details_view", sessionId, { flow: "v2" });
      setPhase("contact");
    } catch (e) { setSubmitting(false); setError((e as Error).message); }
  }

  async function showHalfway(partialAnswers: Record<string, string>, seq: Question[], nextIdx: number) {
    halfwayShown.current = true;
    pendingIdxRef.current = nextIdx;
    setHalfwayLine(fillHalfwayLine(HALFWAY_FIRST_READ_FALLBACK, genderParam, kidName));
    setPhase("halfway");
    fireEvent("halfway_view", sessionId, { flow: "v2" });
    try {
      const res = await fetch("/api/flow/partial-archetype", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: partialAnswers, questionSequence: seq.map((q) => ({ id: q.id, dimension: q.dimension })) }),
      });
      const data = await res.json().catch(() => ({})) as { archetype?: string | null };
      const line = (data.archetype && HALFWAY_FIRST_READ[data.archetype]) || HALFWAY_FIRST_READ_FALLBACK;
      setHalfwayLine(fillHalfwayLine(line, genderParam, kidName));
    } catch { /* keep the fallback */ }
  }

  function handleAnswer(questionId: string, value: string) {
    const nextAnswers = { ...answers, [questionId]: value };
    setAnswers(nextAnswers);
    fireEvent("q_answered", sessionId, { question_id: questionId, index: currentIdx });

    let seq = questions;
    if (currentIdx === 2) {
      const g: GatewayAnswers = { G1: nextAnswers["G1"], G2: nextAnswers["G2"], G3: nextAnswers["G3"] };
      seq = buildQuestionSequence(g);
      setQuestions(seq);
    }
    const next = currentIdx + 1;
    if (next >= seq.length && currentIdx >= 2) { submitAssessment(nextAnswers, seq); return; }
    if (seq.length > 3) {
      const halfwayAt = Math.ceil(seq.length / 2);
      if (!halfwayShown.current && next === halfwayAt) { showHalfway(nextAnswers, seq, next); return; }
    }
    setCurrentIdx(next);
  }

  function pick(qid: string, val: string) {
    if (picked) return;
    setPicked(val);
    setTimeout(() => { setPicked(null); handleAnswer(qid, val); }, 150);
  }

  async function submitContact() {
    if (submitting) return;
    if (!isValidIndianMobile(phone)) { setPhoneErr("Enter a valid 10-digit mobile number"); return; }
    if (!contactReady(phone, parentName, email)) return;
    setPhoneErr(null); setError(null); setSubmitting(true);
    fireEvent("details_submitted", sessionId, { flow: "v2" });
    try {
      // Save phone on the session + wa_contacts(first_source='assessment') + phone_captured.
      const pr = await fetch("/api/flow/phone", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, phone }),
      });
      if (!pr.ok) { const d = await pr.json().catch(() => ({})); throw new Error((d as { error?: string }).error ?? "Could not save your number."); }
      // Save details to the assessment + send the WhatsApp report (send_assessment_new,
      // deduped by whatsapp_report_sent_at). v2 never navigates to /report.
      const cr = await fetch("/api/report/claim", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, parentName: parentName.trim(), email: email.trim(), phone, variant: variantParam }),
      });
      if (!cr.ok) { const d = await cr.json().catch(() => ({})); throw new Error((d as { error?: string }).error ?? "Something went wrong"); }
      fireGtag("generate_lead");
      // Set external_id (raw session id) as pixel advanced matching so the browser Lead carries
      // the same external_id the CAPI Lead sends (both hash to SHA-256 of the session id). The
      // shared eventID below dedups browser + server into one Lead.
      const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
      if (pixelId && typeof window !== "undefined" && typeof window.fbq === "function") {
        window.fbq("init", pixelId, { external_id: sessionId });
      }
      fireFbq("track", "Lead", {}, `lead:${sessionId}`);
      setSubmitting(false);
      setPhase("thankyou");
    } catch (e) { setError((e as Error).message); setSubmitting(false); }
  }

  if (submitting && phase !== "contact") {
    return <Screen><p style={{ color: FLOW.dim, fontSize: 16 }}>Building {kidNameDisp}&rsquo;s report…</p></Screen>;
  }
  if (error && phase !== "contact") {
    return <Screen><div style={{ color: "#c0392b", fontSize: 15 }}>Error: {error}</div></Screen>;
  }
  if (!gatePass) return null;

  // ── THANK-YOU ────────────────────────────────────────────────────────────────
  if (phase === "thankyou") {
    return (
      <>
        <ThankYouV2 childName={childName} parentName={parentName} phone={phone} archetype={archetype} ageBand={ageBand} gender={genderParam ?? ""} />
        <SiteFooter />
      </>
    );
  }

  // ── HALFWAY (navy, dot grid) ─────────────────────────────────────────────────
  if (phase === "halfway") {
    const goldDot = 4; // index of the one gold dot in the 8-dot grid
    const hwIdx = pendingIdxRef.current ?? Math.ceil(total / 2);
    const hwPct = 10 + Math.round((hwIdx / Math.max(1, total)) * 78);
    return (
      <div style={{ minHeight: "100dvh", background: FLOW.navy, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 22px", fontFamily: BODY }}>
        <div style={{ maxWidth: 440, width: "100%" }}>
          <div style={{ marginBottom: 24 }}><QuestionProgress pct={hwPct} minutesLeft={minsLeft(hwPct)} onNavy /></div>
          <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: "repeat(4, 10px)", gap: 10, marginBottom: 20 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: i === goldDot ? FLOW.gold : "rgba(255,255,255,.18)", boxShadow: i === goldDot ? `0 0 0 6px rgba(232,163,61,.22)` : "none" }} />
            ))}
          </div>
          <div style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#E8A33D", fontWeight: 700, marginBottom: 10 }}>Halfway</div>
          <h1 style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 27, lineHeight: 1.25, color: "#fff", margin: "0 0 20px" }}>
            A pattern is already showing in <span style={{ fontStyle: "italic", color: FLOW.goldSoft }}>{kidNameDisp}</span>&rsquo;s answers.
          </h1>
          <div style={{ background: FLOW.cream, borderRadius: 16, padding: "22px 20px" }}>
            <div style={{ fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase", color: FLOW.dim, fontWeight: 700, marginBottom: 10 }}>First read</div>
            <p style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 19, lineHeight: 1.4, color: FLOW.ink, margin: 0 }}>{halfwayLine}</p>
          </div>
          <p style={{ fontSize: 14.5, color: "#D6E0EC", lineHeight: 1.6, margin: "20px 2px 24px" }}>The next questions confirm it, and your report shows what to do about it.</p>
          <button onClick={() => { const n = pendingIdxRef.current; setPhase("questions"); if (n != null) setCurrentIdx(n); }}
            style={{ width: "100%", height: 56, background: FLOW.gold, color: "#3A2A08", border: "none", borderRadius: 16, fontFamily: HEAD, fontWeight: 600, fontSize: 17, cursor: "pointer" }}>Keep going →</button>
        </div>
      </div>
    );
  }

  // ── CONTACT (step 6) ─────────────────────────────────────────────────────────
  if (phase === "contact") {
    const ready = contactReady(phone, parentName, email) && !submitting;
    const emailTouched = email.length > 0;
    return (
      <Screen>
        <div style={{ marginBottom: 20 }}><Wordmark /></div>
        <div style={{ background: "#fff", border: `1px solid ${FLOW.line}`, borderRadius: 20, padding: "24px 20px", boxShadow: "0 8px 22px rgba(30,58,95,.06)" }}>
          <span style={{ display: "inline-block", background: "#EAF0EA", color: "#2F5D3A", borderRadius: 999, padding: "5px 12px", fontSize: 11.5, fontWeight: 700, letterSpacing: ".04em", marginBottom: 14 }}>ALL {total} QUESTIONS DONE</span>
          <h1 style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 27, lineHeight: 1.2, color: FLOW.ink, margin: "0 0 6px" }}>{kidName}&rsquo;s report is being written.</h1>
          <p style={{ fontSize: 15, color: FLOW.dim, lineHeight: 1.5, margin: "0 0 22px" }}>Where should we send it?</p>

          {/* WhatsApp */}
          <label style={{ fontSize: 13, fontWeight: 600, color: FLOW.ink, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.5 11.5a7.5 7.5 0 0 1-10.9 6.7L4 20l1.3-4.4A7.5 7.5 0 1 1 20.5 11.5z" stroke={FLOW.navy} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            WhatsApp number
          </label>
          <div style={{ display: "flex", gap: 8, marginBottom: phoneErr ? 6 : 6 }}>
            <span style={{ display: "inline-flex", alignItems: "center", padding: "0 14px", fontSize: 17, fontWeight: 700, color: FLOW.ink, background: FLOW.cream, border: `2px solid ${FLOW.line}`, borderRadius: 14 }}>+91</span>
            <input type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" value={phone}
              onChange={(e) => { setPhone(e.target.value); if (phoneErr) setPhoneErr(null); }}
              style={{ flex: 1, height: 54, padding: "0 16px", fontSize: 18, border: `2px solid ${phoneErr ? "#c0392b" : FLOW.line}`, borderRadius: 14, fontFamily: "inherit", background: FLOW.cream, color: FLOW.ink, outline: "none", boxSizing: "border-box", minWidth: 0 }} />
          </div>
          {phoneErr ? <div role="alert" style={{ fontSize: 12.5, color: "#c0392b", marginBottom: 14 }}>{phoneErr}</div>
            : <div style={{ fontSize: 12.5, color: FLOW.dim, marginBottom: 14 }}>The report arrives here, usually within a minute.</div>}

          {/* Name */}
          <label style={{ fontSize: 13, fontWeight: 600, color: FLOW.ink, display: "block", marginBottom: 8 }}>Your name</label>
          <input type="text" placeholder="e.g. Priya" value={parentName} onChange={(e) => setParentName(e.target.value)}
            style={{ width: "100%", height: 54, padding: "0 16px", fontSize: 18, border: `2px solid ${FLOW.line}`, borderRadius: 14, fontFamily: "inherit", background: FLOW.cream, color: FLOW.ink, outline: "none", boxSizing: "border-box", marginBottom: 14 }} />

          {/* Email */}
          <label style={{ fontSize: 13, fontWeight: 600, color: FLOW.ink, display: "block", marginBottom: 8 }}>Email</label>
          <input type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", height: 54, padding: "0 16px", fontSize: 18, border: `2px solid ${emailTouched && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? "#c0392b" : FLOW.line}`, borderRadius: 14, fontFamily: "inherit", background: FLOW.cream, color: FLOW.ink, outline: "none", boxSizing: "border-box" }} />
          {emailTouched && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && <div style={{ fontSize: 12, color: "#c0392b", marginTop: 6 }}>Enter a valid email address.</div>}

          <p style={{ fontSize: 12, color: FLOW.dim, lineHeight: 1.55, margin: "16px 0 0" }}>
            Only the report and a few follow-ups about it. Reply STOP any time.{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: FLOW.navy, fontWeight: 600 }}>Privacy</a>
          </p>

          {error && <div style={{ background: "#fdf0ee", color: "#c0392b", border: "1px solid #e8c4be", borderRadius: 8, padding: "12px 16px", fontSize: 13, marginTop: 14 }}>{error}</div>}

          <button onClick={submitContact} disabled={!ready}
            style={{ width: "100%", height: 56, marginTop: 18, background: ready ? FLOW.navy : FLOW.line, color: ready ? "#fff" : FLOW.dim, border: "none", borderRadius: 16, fontFamily: HEAD, fontWeight: 600, fontSize: 17, cursor: ready ? "pointer" : "not-allowed" }}>
            {submitting ? "Sending…" : `Send me ${kidName}’s report →`}
          </button>
        </div>
      </Screen>
    );
  }

  // ── QUESTIONS (step 4/5) ──────────────────────────────────────────────────────
  const q = questions[currentIdx];
  if (!q) return null;
  const pct = 10 + Math.round((currentIdx / Math.max(1, total)) * 78);
  return (
    <Screen>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <Wordmark />
        <BackLink onClick={() => {
          if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
          else router.push(`/simplified/start?${params.toString()}`); // back from Q1 → step 3, choices restored
        }} />
      </div>
      <div style={{ marginBottom: 20 }}><QuestionProgress pct={pct} minutesLeft={minsLeft(pct)} /></div>

      <span style={{ display: "inline-block", background: "rgba(232,163,61,.14)", color: "#8A6322", border: "1px solid rgba(232,163,61,.4)", borderRadius: 999, padding: "5px 12px", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", marginBottom: 16 }}>
        QUESTION {currentIdx + 1} OF {total}
      </span>
      <h2 style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 27, lineHeight: 1.3, marginBottom: 24, color: FLOW.ink }}>
        {q.text.replace(/\{name\}/g, kidName)}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {q.options.map((opt, i) => {
          // After Back, the previously chosen answer stays selected (from the final answers map).
          const sel = picked ? picked === opt.value : answers[q.id] === opt.value;
          return (
            <button key={opt.value} onClick={() => pick(q.id, opt.value)}
              style={{ display: "flex", alignItems: "center", gap: 14, background: sel ? FLOW.sel : "#fff", border: sel ? `2px solid ${FLOW.gold}` : `1px solid ${FLOW.line}`, borderRadius: 14, padding: "16px 16px", minHeight: 56, fontSize: 15.5, fontWeight: 500, color: FLOW.ink, cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }}>
              <span aria-hidden="true" style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13, background: sel ? FLOW.gold : FLOW.cream, color: sel ? "#fff" : FLOW.dim, border: sel ? "none" : `1px solid ${FLOW.line}` }}>{LETTERS[i]}</span>
              {opt.label}
            </button>
          );
        })}
      </div>
      <p style={{ textAlign: "center", marginTop: 20, fontSize: 12.5, color: FLOW.dim }}>No right answers. Pick what happens most days.</p>
    </Screen>
  );
}
