"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function fireGtag(event: string, params?: Record<string, string | number>) {
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

const BG    = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";
const NAVY  = "#14284D";
const GOLD  = "#F5A623";
const GOLDB = "#FBCB4A";
const TEAL  = "#22A38A";

const CONCERN_CARDS = [
  { key: "homework",   emoji: "📖", label: "Homework" },
  { key: "reminders",  emoji: "🎯", label: "Focus" },
  { key: "screens",    emoji: "📱", label: "Screens" },
  { key: "confidence", emoji: "👤", label: "Confidence" },
  { key: "giveup",     emoji: "🌱", label: "Giving up" },
  { key: "finish",     emoji: "📝", label: "Finishing" },
];

const OOB_COPY: Record<"younger" | "older", { heading: string; body: string }> = {
  younger: {
    heading: "The assessment is built for children between 8 and 14.",
    body: "We're building a version for younger children. In the meantime, get the free Attention Handbook — the same principles explained clearly, with six things you can try tonight.",
  },
  older: {
    heading: "The assessment is built for children between 8 and 14.",
    body: "The same six attention skills apply at this age — the Handbook names them clearly and gives you things you can try this week.",
  },
};

const FOLLOW_UP: Record<string, { question: string; options: { label: string; echo: string }[] }> = {
  homework:   {
    question: "When homework time starts, what usually happens first?",
    options: [
      { label: "They delay starting as long as possible",        echo: "They delay starting as long as possible" },
      { label: "They start, but stop again within minutes",       echo: "They start, then stop within minutes" },
      { label: "They get upset before really trying",            echo: "They get upset before really trying" },
      { label: "They rush through it just to be done",           echo: "They rush through it just to be done" },
      { label: "It depends on the subject",                      echo: "It depends on the subject" },
    ],
  },
  reminders:  {
    question: "When you remind your child to focus, what usually happens next?",
    options: [
      { label: "They focus briefly, then drift away again",      echo: "They focus briefly, then drift" },
      { label: "They say 'Okay' but don't really start",         echo: "They say Okay but don't start" },
      { label: "They get irritated or argue",                    echo: "They get irritated or argue" },
      { label: "They try but can't stay with it",                echo: "They genuinely try but can't stay" },
      { label: "It depends on the day",                          echo: "It depends on the day" },
    ],
  },
  screens:    {
    question: "When it's time to put the screen down, what usually happens?",
    options: [
      { label: "A small negotiation turns into a bigger one",    echo: "A small negotiation turns into a bigger one" },
      { label: "They get irritable or upset",                    echo: "They get irritable or upset" },
      { label: "'Just five more minutes' keeps happening",       echo: "Just five more minutes — keeps happening" },
      { label: "They put it down but can't settle into anything",echo: "They put it down but can't settle" },
      { label: "It depends on what they were doing",            echo: "It depends on what they were doing" },
    ],
  },
  confidence: {
    question: "When something feels hard for them, what do you usually see first?",
    options: [
      { label: "They say 'I can't' before really trying",        echo: "They say I can't before trying" },
      { label: "They get frustrated and give up quickly",        echo: "They get frustrated and give up quickly" },
      { label: "They ask you to do it for them",                 echo: "They ask you to do it for them" },
      { label: "They avoid starting at all",                     echo: "They avoid starting at all" },
      { label: "It depends on the day",                          echo: "It depends on the day" },
    ],
  },
  giveup:     {
    question: "When they hit something difficult, how long before they stop trying?",
    options: [
      { label: "Almost immediately",               echo: "Almost immediately" },
      { label: "After one real attempt",           echo: "After one real attempt" },
      { label: "Only after getting visibly upset", echo: "Only after getting visibly upset" },
      { label: "It varies a lot",                  echo: "It varies a lot" },
    ],
  },
  finish:     {
    question: "When they move on to something new mid-task, what happens to the first thing?",
    options: [
      { label: "It just sits there, forgotten",                    echo: "It just sits there, forgotten" },
      { label: "They say they'll come back — and don't",           echo: "They say they'll come back — they don't" },
      { label: "You have to remind them to finish it",             echo: "You have to remind them to finish" },
      { label: "Sometimes they do circle back on their own",       echo: "Sometimes they circle back" },
    ],
  },
};

type Stage = "start" | "followup";

export default function SimplifiedStart() {
  const router = useRouter();
  const [stage, setStage]         = useState<Stage>("start");
  const [childName, setChildName] = useState("");
  const [gender, setGender]       = useState<string | null>(null);
  const [age, setAge]             = useState<string | null>(null);
  const [concern, setConcern]     = useState<string | null>(null);

  const [oobPopup, setOobPopup]           = useState<"younger" | "older" | null>(null);
  const [oobName, setOobName]             = useState("");
  const [oobPhone, setOobPhone]           = useState("");
  const [oobSubmitting, setOobSubmitting] = useState(false);
  const [oobResult, setOobResult]         = useState<{ wa_sent: boolean } | null>(null);

  // Landing session UUID — used for landing_step_* DB events.
  // Separate from the assessment session_id created when assessment starts.
  const landSidRef = useRef<string | null>(null);
  function getLandSid(): string {
    if (!landSidRef.current) landSidRef.current = crypto.randomUUID();
    return landSidRef.current;
  }

  function selectAge(val: string) {
    setAge(val);
    fireGtag("age_selected", { age_band: val });
    fireEvent("landing_step_age", getLandSid(), { age_band: val });
  }

  function selectConcern(key: string) {
    setConcern(key);
    fireGtag("concern_selected", { concern: key });
    fireEvent("landing_step_concern", getLandSid(), { concern: key });
  }

  function openOobPopup(band: "younger" | "older") {
    setOobPopup(band);
    setOobName("");
    setOobPhone("");
    setOobSubmitting(false);
    setOobResult(null);
    fireGtag("age_out_of_band", { age_band: band });
  }

  async function submitOobPopup() {
    if (!oobName.trim() || !oobPhone.trim() || !oobPopup) return;
    setOobSubmitting(true);
    try {
      const res = await fetch("/api/handbook-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: oobName.trim(), phone: oobPhone.trim(), ageBand: oobPopup, variant: "simplified" }),
      });
      const data = await res.json().catch(() => ({})) as { wa_sent?: boolean };
      setOobResult({ wa_sent: data.wa_sent ?? false });
    } catch {
      setOobResult({ wa_sent: false });
    } finally {
      setOobSubmitting(false);
    }
  }

  function goToAssessment(followup: string) {
    fireGtag("follow_up_selected", { concern: concern ?? "", answer: followup });
    fireEvent("landing_step_followup", getLandSid(), { concern: concern ?? "", answer: followup });
    const p = new URLSearchParams();
    p.set("name", childName.trim());
    if (gender) p.set("gender", gender);
    if (age) p.set("age", age);
    if (concern) p.set("concerns", concern);
    p.set("followup", followup);
    p.set("variant", "simplified");
    router.push(`/assessment?${p.toString()}`);
  }

  // ── OOB modal ────────────────────────────────────────────────────────────────
  const oobModal = oobPopup ? (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
      onClick={(e) => { if (e.target === e.currentTarget && !oobSubmitting) setOobPopup(null); }}
    >
      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "18px", padding: "32px 28px", maxWidth: "400px", width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,.22)", position: "relative" }}>
        <button
          onClick={() => setOobPopup(null)}
          style={{ position: "absolute", top: "16px", right: "18px", background: "none", border: "none", fontSize: "20px", color: "var(--ink-dim)", cursor: "pointer", lineHeight: 1, padding: "4px" }}
          aria-label="Close"
        >×</button>

        {!oobResult ? (
          <>
            <div style={{ fontFamily: BG, fontWeight: 800, fontSize: "18px", color: "var(--ink)", lineHeight: 1.3, marginBottom: "12px" }}>
              {OOB_COPY[oobPopup].heading}
            </div>
            <p style={{ fontSize: "14px", color: "var(--ink-dim)", lineHeight: 1.6, marginBottom: "16px" }}>
              {OOB_COPY[oobPopup].body}
            </p>
            <p style={{ fontSize: "13.5px", color: "var(--ink-dim)", lineHeight: 1.6, marginBottom: "16px" }}>
              Where should we send it? Enter your WhatsApp number and we&apos;ll send the Attention Handbook within a few minutes.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "14px" }}>
              <input
                type="text"
                placeholder="Your name"
                value={oobName}
                onChange={(e) => setOobName(e.target.value)}
                style={{ border: "1.5px solid var(--line)", borderRadius: "10px", padding: "12px 14px", fontSize: "14.5px", fontFamily: "inherit", color: "var(--ink)", background: "var(--paper)", outline: "none", width: "100%", boxSizing: "border-box" }}
              />
              <input
                type="tel"
                placeholder="WhatsApp number"
                value={oobPhone}
                onChange={(e) => setOobPhone(e.target.value)}
                style={{ border: "1.5px solid var(--line)", borderRadius: "10px", padding: "12px 14px", fontSize: "14.5px", fontFamily: "inherit", color: "var(--ink)", background: "var(--paper)", outline: "none", width: "100%", boxSizing: "border-box" }}
              />
            </div>
            <button
              onClick={submitOobPopup}
              disabled={!oobName.trim() || !oobPhone.trim() || oobSubmitting}
              style={{
                width: "100%", background: NAVY, color: "#fff", border: "none", borderRadius: "10px",
                padding: "14px 20px", fontWeight: 700, fontSize: "15px", cursor: oobName.trim() && oobPhone.trim() && !oobSubmitting ? "pointer" : "not-allowed",
                opacity: oobName.trim() && oobPhone.trim() && !oobSubmitting ? 1 : 0.55, fontFamily: "inherit", marginBottom: "10px",
              }}
            >
              {oobSubmitting ? "Sending…" : "Send me the Handbook →"}
            </button>
            <p style={{ fontSize: "11.5px", color: "var(--ink-dim)", textAlign: "center", lineHeight: 1.5, margin: 0 }}>
              By continuing, you agree to receive the Handbook and occasional related messages from Attention Architect on WhatsApp. Reply STOP any time to opt out.
            </p>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: "32px", marginBottom: "16px" }}>✓</div>
            <div style={{ fontFamily: BG, fontWeight: 800, fontSize: "18px", color: "var(--ink)", marginBottom: "10px" }}>
              {oobResult.wa_sent ? "Handbook sent to your WhatsApp." : "You're on the list."}
            </div>
            <p style={{ fontSize: "14px", color: "var(--ink-dim)", lineHeight: 1.6 }}>
              {oobResult.wa_sent
                ? "Check your WhatsApp — the link is on its way."
                : "We'll send you the Attention Handbook on WhatsApp in 1–2 days, once our messaging setup is live."}
            </p>
            <button
              onClick={() => setOobPopup(null)}
              style={{ marginTop: "20px", background: "none", border: "1.5px solid var(--line)", borderRadius: "10px", padding: "10px 22px", fontSize: "13.5px", fontWeight: 600, color: "var(--ink-dim)", cursor: "pointer", fontFamily: "inherit" }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  ) : null;

  // ── Stage: start (combined) ───────────────────────────────────────────────────
  if (stage === "start") {
    const canContinue = !!age && !!concern && age !== "younger" && age !== "older";
    return (
      <>
      <div className="funnel-screen">
        <div className="funnel-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-horizontal-icon-wordmark.png" alt="Attention Architect" style={{ height: 28, width: "auto", marginBottom: 20 }} />

          <div style={{ fontSize: "11px", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-dim)", fontWeight: 700, marginBottom: "18px" }}>
            Before You Start
          </div>

          {/* Name */}
          <label style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)", display: "block", marginBottom: "10px" }}>
            What&rsquo;s your child&rsquo;s first name?{" "}
            <span style={{ fontWeight: 400, color: "var(--ink-dim)" }}>(optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Arjun"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            style={{
              width: "100%", padding: "14px 16px", fontSize: "16px",
              border: "2px solid var(--marker)", borderRadius: "12px",
              fontFamily: "inherit", marginBottom: "20px",
              background: "var(--paper)", color: "var(--ink)", outline: "none", boxSizing: "border-box",
            }}
          />

          {/* Gender */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink-dim)", marginBottom: "9px" }}>
              Pronouns <span style={{ fontWeight: 400 }}>(optional)</span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {([["he", "He/him"], ["she", "She/her"], ["they", "They/them"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  className={`chip-btn${gender === val ? " sel" : ""}`}
                  style={{
                    flex: 1, minHeight: "44px", padding: "10px 0",
                    ...(gender === val ? { background: GOLDB, color: NAVY, borderColor: GOLD } : {}),
                  }}
                  onClick={() => setGender(gender === val ? null : val)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Age */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink-dim)", marginBottom: "9px" }}>
              How old is {childName.trim() ? childName.trim() : "your child"}?
            </div>
            {/* In-range chips */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              {(["8–9", "10–11", "12–14"] as const).map((label) => {
                const val = label.replace("–", "-");
                const sel = age === val;
                return (
                  <button
                    key={val}
                    className={`chip-btn${sel ? " sel" : ""}`}
                    style={{
                      flex: 1, minHeight: "48px", padding: "11px 0",
                      ...(sel ? { background: GOLDB, color: NAVY, borderColor: GOLD } : {}),
                    }}
                    onClick={() => selectAge(val)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {/* OOB chips */}
            <div style={{ display: "flex", gap: "8px" }}>
              {([["younger", "Younger than 8"], ["older", "Older than 14"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  className="chip-btn"
                  style={{ flex: 1, minHeight: "40px", padding: "9px 0", fontSize: "12px", color: "var(--ink-dim)" }}
                  onClick={() => openOobPopup(val)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Concern */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink-dim)", marginBottom: "9px" }}>
              What&rsquo;s worrying you the most right now?
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {CONCERN_CARDS.map(({ key, emoji, label }) => (
                <button
                  key={key}
                  onClick={() => selectConcern(key)}
                  style={{
                    background: concern === key ? "#FFF8E6" : "var(--paper)",
                    border: concern === key ? `2px solid ${GOLD}` : "2px solid transparent",
                    outline: "none", borderRadius: "12px", padding: "14px 10px",
                    textAlign: "center", cursor: "pointer", fontFamily: "inherit",
                    transition: "all .12s", display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 0,
                  }}
                >
                  <span style={{ fontSize: "22px", marginBottom: "6px", display: "block", lineHeight: 1 }}>{emoji}</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)", lineHeight: 1.3 }}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            className="cta-btn"
            disabled={!canContinue}
            onClick={() => { if (canContinue) setStage("followup"); }}
            style={{
              background: canContinue ? NAVY : "var(--line)",
              color: canContinue ? "#fff" : "var(--ink-dim)",
              cursor: canContinue ? "pointer" : "not-allowed",
            }}
          >
            {!age
              ? "Select your child's age to continue"
              : !concern
                ? "Select what's worrying you most"
                : "Continue →"}
          </button>

          <div style={{ display: "flex", gap: "16px", marginTop: "14px", fontSize: "12px", color: "var(--ink-dim)" }}>
            <span>Free</span><span>·</span><span>Under 5 minutes</span><span>·</span><span>No sign-up needed</span>
          </div>
        </div>
      </div>
      {oobModal}
      </>
    );
  }

  // ── Stage: followup ───────────────────────────────────────────────────────────
  const fuConfig = concern ? FOLLOW_UP[concern] : null;
  return (
    <div className="funnel-screen">
      <div className="funnel-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-horizontal-icon-wordmark.png" alt="Attention Architect" style={{ height: 28, width: "auto", marginBottom: 20 }} />

        <button
          onClick={() => setStage("start")}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--calm-text)", fontWeight: 600, marginBottom: "18px", padding: 0, display: "flex", alignItems: "center", gap: "6px" }}
        >
          ← Back
        </button>

        <div style={{ fontSize: "11px", letterSpacing: ".13em", textTransform: "uppercase", fontWeight: 700, color: TEAL, marginBottom: "10px" }}>
          One more question
        </div>

        <h2 style={{ fontFamily: BG, fontWeight: 800, fontSize: "clamp(18px,3vw,24px)", lineHeight: 1.3, color: "var(--ink)", marginBottom: "22px" }}>
          {fuConfig?.question}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {fuConfig?.options.map((opt) => (
            <button
              key={opt.echo}
              onClick={() => {
                goToAssessment(opt.echo);
              }}
              style={{
                background: "var(--paper)", border: "1.5px solid var(--line)",
                borderRadius: "12px", padding: "14px 16px", fontSize: "14px",
                fontWeight: 500, color: "var(--ink)", cursor: "pointer",
                textAlign: "left", fontFamily: "inherit", transition: "border-color .1s, background .1s",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
