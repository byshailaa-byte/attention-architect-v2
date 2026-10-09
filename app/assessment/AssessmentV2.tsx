"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GATEWAY_QUESTIONS, Question } from "@/lib/engine/questions";
import { type GatewayAnswers } from "@/lib/engine/router";
import { buildOrderedSequenceV3, FIXED_PREFIX, PART_LABELS, PART2_OPENER } from "@/lib/engine/order-v3";
import { g1Stem, g2Stem } from "@/content/assessment/worry-stems";
import { captureUtmOnce, getStoredUtm } from "@/lib/utm";
import { getFlowSid } from "@/lib/flow/session";
import { isValidIndianMobile, contactReady } from "@/lib/flow/validate";
import { displayChildName, fillTokens, CHILD_NAME_FALLBACK_MID, type Gender } from "@/lib/report/pronouns";
import { HALFWAY_FIRST_READ, HALFWAY_FIRST_READ_FALLBACK, fillHalfwayLine } from "@/content/assessment/halfway-first-read";
import { FLOW, HEAD, BODY, Wordmark, BackLink, Screen, QuestionProgress, minsLeft } from "@/app/components/FlowShell";
import { makeFiller } from "@/lib/report-v2/cards-copy";
import { bareArchetype, WHY_BOXES } from "@/lib/report-v2/v3-copy";
import ThankYouV2 from "./ThankYouV2";
import SiteFooter from "@/app/components/SiteFooter";
import { track, identifyPixel } from "@/lib/analytics/track";

// C3 preview: how the worry reads in the "WHAT WE FOUND" headline, per canonical worry key.
const PREVIEW_WORRY_PHRASE: Record<string, string> = {
  homework: "homework fights", reminders: "reminders", screens: "screen fights",
  giveup: "giving up", confidence: "“I can’t” moments", finish: "half-done work", other: "this",
};

const LETTERS = "ABCDEF";

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
  const freqParam     = params.get("freq") || null; // optional "how often?" key (d1_2/d3_4/most/daily)

  const VALID_AGE_BANDS = ["8-9", "10-11", "12-14"];
  const gatePass = hasNameParam && VALID_AGE_BANDS.includes(ageParam ?? "") && concernsParam.split(",").filter(Boolean).length > 0;

  const [phase, setPhase]       = useState<Phase>("questions");
  // v3: the first 8 questions (Part 1 + Part 2) are fixed for everyone; Part 3 is appended once
  // G1 is answered (Q3). Part 3 is G3-independent (parent_instinct moved to Part 2), so it can be
  // built from G1/G2 — see lib/engine/order-v3.ts.
  const [questions, setQuestions]   = useState<Question[]>(FIXED_PREFIX);
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
    let max = FIXED_PREFIX.length;
    for (const a of g1.options) for (const b of g2.options) for (const c of g3.options) {
      const len = buildOrderedSequenceV3({ G1: a.value, G2: b.value, G3: c.value } as GatewayAnswers).length;
      if (len > max) max = len;
    }
    return max;
  }, []);
  // Exact path length once Part 3 is built (after Q3); an estimate for the first 3 questions.
  const total = questions.length > FIXED_PREFIX.length ? questions.length : totalMax;

  const firedStart = useRef(false);
  useEffect(() => {
    if (!gatePass) { router.replace("/simplified/start?flow=v2"); return; }
    captureUtmOnce();
    if (!firedStart.current) {
      firedStart.current = true;
      // DB + GA4 + Pixel(custom) under one name. (Retired the Pixel-only "AssessmentStarted".)
      track("assessment_started", { flow: "v2" }, sessionId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Per-question impression (for the next drop-off analysis). Fire once per (index, question).
  const lastViewRef = useRef<string>("");
  useEffect(() => {
    if (phase !== "questions") return;
    const q = questions[currentIdx];
    if (!q) return;
    const key = `${currentIdx}:${q.id}`;
    if (lastViewRef.current === key) return;
    lastViewRef.current = key;
    track("question_view", { question_id: q.id, index: currentIdx }, sessionId);
  }, [currentIdx, phase, questions, sessionId]);

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
          worryFrequency: freqParam,
          variant: variantParam, utm: getStoredUtm(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      setArchetype(data.archetype ?? "");
      // GA4 + Pixel(custom) only (DB row is written server-side in /api/assessment/submit).
      // archetype is NOT passed to ad platforms — the allow-list would strip it anyway.
      track("assessment_complete", {}, sessionId, { db: false });
      setSubmitting(false);
      track("details_view", { flow: "v2" }, sessionId);
      setPhase("contact");
    } catch (e) { setSubmitting(false); setError((e as Error).message); }
  }

  async function showHalfway(partialAnswers: Record<string, string>, seq: Question[], nextIdx: number) {
    halfwayShown.current = true;
    pendingIdxRef.current = nextIdx;
    setHalfwayLine(fillHalfwayLine(HALFWAY_FIRST_READ_FALLBACK, genderParam, kidName));
    setPhase("halfway");
    track("halfway_view", { flow: "v2" }, sessionId);
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
    const changed = answers[questionId] !== undefined && answers[questionId] !== value;
    const nextAnswers = { ...answers, [questionId]: value };
    setAnswers(nextAnswers);
    track("q_answered", { question_id: questionId, index: currentIdx }, sessionId);
    if (changed) track("answer_changed", { question_id: questionId }, sessionId);

    let seq = questions;
    // After G1 (Q3) we know G1 + G2 → build Part 3 (G3-independent) and the full ordered sequence.
    if (currentIdx === 2) {
      const g: GatewayAnswers = { G1: nextAnswers["G1"], G2: nextAnswers["G2"], G3: nextAnswers["G3"] ?? "negotiator" };
      seq = buildOrderedSequenceV3(g);
      setQuestions(seq);
    }
    const next = currentIdx + 1;
    if (next >= seq.length && currentIdx >= 2) { submitAssessment(nextAnswers, seq); return; }
    if (seq.length > FIXED_PREFIX.length) {
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
    track("details_submitted", { flow: "v2" }, sessionId);
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
      // Set HASHED external_id (SHA-256 of the session id) for Pixel advanced matching, matching
      // how CAPI hashes it server-side — then fire the lead. GA4 generate_lead + Pixel custom
      // generate_lead + Pixel standard Lead (eventID lead:${sessionId}, shared with CAPI). The DB
      // generate_lead row is written server-side in /api/report/claim, so db:false here.
      await identifyPixel(sessionId);
      track("generate_lead", {}, sessionId, { db: false });
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
    // ── C3 preview (no LLM): archetype comes from the scorer via /api/assessment/submit. ──
    const previewFill = makeFiller(childName, genderParam);
    const worryKey = concernsParam.split(",").filter(Boolean)[0] ?? "other";
    const worryPhrase = PREVIEW_WORRY_PHRASE[worryKey] ?? PREVIEW_WORRY_PHRASE.other;
    // "There's a clear reason for the <phrase>." reads naturally for the 6 concrete worries; "other"
    // (phrase = "this") would give "for the this", so it drops the article.
    const previewHeadline = worryKey === "other"
      ? `${kidName} can focus. There’s a clear reason for it.`
      : `${kidName} can focus. There’s a clear reason for the ${worryPhrase}.`;
    const why = archetype ? WHY_BOXES[bareArchetype(archetype)] : undefined;
    const greenLine = why ? previewFill(why.greenLine) : null;
    const greenLabel = why ? previewFill(why.greenLabel) : null;
    const lockedItems = [
      "The 3 answers that show it",
      `One sentence to try with ${kidName} tonight`,
      "What changes in 6 weeks",
    ];
    return (
      <Screen>
        <div style={{ marginBottom: 18 }}><Wordmark /></div>

        {/* Preview header */}
        <h1 style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 27, lineHeight: 1.2, color: FLOW.ink, margin: "0 0 16px" }}>
          Done. Here&rsquo;s a first look at {kidName}&rsquo;s report.
        </h1>

        {/* WHAT WE FOUND — dark card */}
        <div style={{ background: FLOW.navy, borderRadius: 18, padding: "20px 20px", marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: FLOW.goldSoft, marginBottom: 10 }}>What we found</div>
          <p style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 21, lineHeight: 1.3, color: "#fff", margin: 0 }}>
            {previewHeadline}
          </p>
          {greenLine && (
            <div style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.16)", borderRadius: 12, padding: "12px 14px", marginTop: 14 }}>
              {greenLabel && <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", color: "#8FD3B0", textTransform: "uppercase", marginBottom: 6 }}>{greenLabel}</div>}
              <p style={{ fontSize: 14.5, lineHeight: 1.5, color: "#EAF1F8", margin: 0 }}>{greenLine}</p>
            </div>
          )}
        </div>

        {/* IN THE FULL REPORT — 3 locked rows */}
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: FLOW.dim, marginBottom: 10 }}>In the full report</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
          {lockedItems.map((it, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: `1px solid ${FLOW.line}`, borderRadius: 12, padding: "13px 14px" }}>
              <span aria-hidden="true" style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, background: FLOW.cream, display: "grid", placeItems: "center" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke={FLOW.dim} strokeWidth="1.8" /><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke={FLOW.dim} strokeWidth="1.8" strokeLinecap="round" /></svg>
              </span>
              <span style={{ fontSize: 14.5, color: FLOW.ink, fontWeight: 500 }}>{it}</span>
            </div>
          ))}
        </div>

        {/* Name + WhatsApp form */}
        <div style={{ background: "#fff", border: `1px solid ${FLOW.line}`, borderRadius: 20, padding: "24px 20px", boxShadow: "0 8px 22px rgba(30,58,95,.06)" }}>
          <h2 style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 23, lineHeight: 1.2, color: FLOW.ink, margin: "0 0 6px" }}>Where should we send {kidName}&rsquo;s full report?</h2>
          <p style={{ fontSize: 15, color: FLOW.dim, lineHeight: 1.5, margin: "0 0 22px" }}>It comes on WhatsApp in about a minute. Free.</p>

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
  const worry = concernsParam.split(",").filter(Boolean)[0] ?? "other";
  const fillQ = fillTokens(childName, genderParam);
  // Part 1 = first 5 (G2,D2.1,G1,D2.2,D2.3); Part 2 = next 3 (G3,P1,P2); Part 3 = the rest.
  const partNo: 1 | 2 | 3 = currentIdx < 5 ? 1 : currentIdx < 8 ? 2 : 3;
  // Only G1 and G2 get a worry-specific stem; all other questions keep their original text.
  const qText = q.id === "G1" ? fillQ(g1Stem(worry))
    : q.id === "G2" ? fillQ(g2Stem(worry))
    : q.text.replace(/\{name\}/g, kidName);
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

      <div style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: FLOW.dim, fontWeight: 700, marginBottom: 6 }}>
        Part {partNo} of 3 · {fillQ(PART_LABELS[partNo])}
      </div>
      <span style={{ display: "inline-block", background: "rgba(232,163,61,.14)", color: "#8A6322", border: "1px solid rgba(232,163,61,.4)", borderRadius: 999, padding: "5px 12px", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", marginBottom: 16 }}>
        QUESTION {currentIdx + 1}
      </span>
      {/* Part 2 opens with one reassuring line. */}
      {currentIdx === 5 && (
        <p style={{ fontSize: 14, color: FLOW.dim, lineHeight: 1.55, margin: "0 0 16px" }}>{fillQ(PART2_OPENER)}</p>
      )}
      <h2 style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 27, lineHeight: 1.3, marginBottom: 24, color: FLOW.ink }}>
        {qText}
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
