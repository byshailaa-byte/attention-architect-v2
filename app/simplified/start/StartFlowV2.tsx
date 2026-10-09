"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { captureUtmOnce, getStoredUtm } from "@/lib/utm";
import { getFlowSid } from "@/lib/flow/session";
import { isValidIndianMobile, childStepReady } from "@/lib/flow/validate";
import { displayChildName } from "@/lib/report/pronouns";
import ReportFooterLinks from "@/app/components/ReportFooterLinks";
import {
  FLOW, HEAD, BODY, Wordmark, SegmentBar, BackLink, Screen, IconChip, FLOW_TOTAL_MIN,
  AGE_BANDS, AGE_LABELS, WORRIES_BY_AGE, FREQUENCY_OPTIONS, worryByKey, type AgeBandV2,
} from "@/app/components/FlowShell";
import { track } from "@/lib/analytics/track";

const OOB_COPY: Record<"younger" | "older", { heading: string; body: string }> = {
  younger: {
    heading: "The assessment is built for children between 8 and 14.",
    body: "We’re building a version for younger children. In the meantime, get the free Attention Handbook — the same principles explained clearly, with six things you can try tonight.",
  },
  older: {
    heading: "The assessment is built for children between 8 and 14.",
    body: "The same six attention skills apply at this age — the Handbook names them clearly and gives you things you can try this week.",
  },
};

// C2 order: 1 age · 2 worry (+ optional "how often?") · 3 child · 4 intro.
type Step = 1 | 2 | 3 | 4;

export default function StartFlowV2() {
  const router = useRouter();
  const params = useSearchParams();
  // Returning from the assessment (Back on Q1) lands on the intro (step 4) with the choices restored.
  const restored = !!(params.get("name") && params.get("age") && params.get("concerns"));
  const [step, setStep]           = useState<Step>(restored ? 4 : 1);
  const [age, setAge]             = useState<string | null>(params.get("age") || null);
  const [worry, setWorry]         = useState<string | null>(params.get("concerns") || null);
  const [frequency, setFrequency] = useState<string | null>(params.get("freq") || null);
  const [childName, setChildName] = useState(params.get("name") || "");
  const [gender, setGender]       = useState<string | null>(params.get("gender") || null);
  const nameRef = useRef<HTMLInputElement>(null);

  // OOB handbook popup — backend (handbook-lead / handbook_send) UNCHANGED. Flow stops here.
  const [oobPopup, setOobPopup]           = useState<"younger" | "older" | null>(null);
  const [oobName, setOobName]             = useState("");
  const [oobPhone, setOobPhone]           = useState("");
  const [oobSubmitting, setOobSubmitting] = useState(false);
  const [oobResult, setOobResult]         = useState<{ wa_sent: boolean } | null>(null);
  const [oobError, setOobError]           = useState<string | null>(null);

  const sidRef = useRef<string>("");
  useEffect(() => {
    captureUtmOnce();
    const sid = getFlowSid();
    sidRef.current = sid;
    if (restored) return; // restored to the intro from the assessment — skip re-create/re-fire of landing
    fetch("/api/flow/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sid, flow: "v2", utm: getStoredUtm() }),
    }).catch(() => {});
    track("landing_view", { flow: "v2" }, sid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Age is now the FIRST screen — fire start_age_view once it's shown (to measure drop at the age step).
  useEffect(() => {
    if (step === 1 && sidRef.current) track("start_age_view", {}, sidRef.current);
  }, [step]);

  // Intro screen impression (C5) — fire once each time the intro (step 4) is shown.
  useEffect(() => {
    if (step === 4 && sidRef.current) track("assessment_intro_view", { flow: "v2" }, sidRef.current);
  }, [step]);

  const ageBand: AgeBandV2 = (AGE_BANDS as readonly string[]).includes(age ?? "") ? (age as AgeBandV2) : "10-11";
  const worryList = WORRIES_BY_AGE[ageBand];
  const worryObj  = worry ? worryByKey(worry) : null;
  const kidName    = childName.trim() ? displayChildName(childName) : "your child";
  const kidNameCap = childName.trim() ? displayChildName(childName) : "Your child";

  function pickAge(val: string) {
    setAge(val);
    track("start_age", { age_band: val }, sidRef.current);
    setStep(2);
  }
  function pickWorry(key: string) {
    setWorry(key);
    // Picking a new worry clears a stale frequency only when the worry actually changes.
    if (key !== worry) setFrequency(null);
  }
  function continueFromWorry() {
    if (!worry) return;
    // start_worry carries BOTH the worry and the (optional) frequency — C5.
    track("start_worry", { worry, frequency: frequency ?? null }, sidRef.current);
    setStep(3);
  }
  function openOob(band: "younger" | "older") {
    track("start_oob", { choice: band }, sidRef.current);
    setOobPopup(band); setOobName(""); setOobPhone(""); setOobSubmitting(false); setOobResult(null); setOobError(null);
  }
  async function submitOobPopup() {
    if (!oobName.trim() || !oobPhone.trim() || !oobPopup || oobSubmitting) return;
    if (!isValidIndianMobile(oobPhone)) { setOobError("Please enter a valid 10-digit mobile number"); return; }
    setOobError(null); setOobSubmitting(true);
    try {
      const res = await fetch("/api/handbook-lead", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: oobName.trim(), phone: oobPhone.trim(), ageBand: oobPopup, variant: "simplified" }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})) as { error?: string }; setOobError(d.error || "Please enter a valid 10-digit mobile number"); return; }
      const d = await res.json().catch(() => ({})) as { wa_sent?: boolean };
      track("start_oob_submit", { choice: oobPopup }, sidRef.current);
      // Handbook (out-of-range) lead — DB + GA4 + Meta CUSTOM only. NEVER generate_lead / Meta Lead
      // / OpenAI lead_created, so handbook sign-ups don't train the ad platforms as paid-funnel leads.
      track("handbook_lead", { age_band: oobPopup }, sidRef.current);
      setOobResult({ wa_sent: d.wa_sent ?? false });
    } catch { setOobError("Something went wrong, please try again."); }
    finally { setOobSubmitting(false); }
  }
  function continueFromChild() {
    if (!childStepReady(childName, gender)) return;
    track("start_child", { gender }, sidRef.current);
    setStep(4);
  }
  function startAssessment() {
    const p = new URLSearchParams();
    p.set("flow", "v2");
    p.set("name", childName.trim());
    if (gender) p.set("gender", gender);
    if (age) p.set("age", age);
    if (worry) p.set("concerns", worry);
    if (frequency) p.set("freq", frequency);
    p.set("variant", "simplified");
    router.push(`/assessment?${p.toString()}`);
  }

  // ── OOB modal (handbook) ───────────────────────────────────────────────────
  const oobModal = oobPopup ? (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: BODY }}
      onClick={(e) => { if (e.target === e.currentTarget && !oobSubmitting) setOobPopup(null); }}>
      <div style={{ background: "#fff", border: `1px solid ${FLOW.line}`, borderRadius: 18, padding: "32px 28px", maxWidth: 400, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,.22)", position: "relative" }}>
        <button onClick={() => setOobPopup(null)} style={{ position: "absolute", top: 16, right: 18, background: "none", border: "none", fontSize: 20, color: FLOW.dim, cursor: "pointer", lineHeight: 1, padding: 4 }} aria-label="Close">×</button>
        {!oobResult ? (
          <>
            <div style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 20, color: FLOW.ink, lineHeight: 1.3, marginBottom: 12 }}>{OOB_COPY[oobPopup].heading}</div>
            <p style={{ fontSize: 14, color: FLOW.dim, lineHeight: 1.6, marginBottom: 16 }}>{OOB_COPY[oobPopup].body}</p>
            <p style={{ fontSize: 13.5, color: FLOW.dim, lineHeight: 1.6, marginBottom: 16 }}>Where should we send it? Enter your WhatsApp number and we&rsquo;ll send the Attention Handbook within a few minutes.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
              <input type="text" placeholder="Your name" value={oobName} onChange={(e) => setOobName(e.target.value)} style={{ border: `1.5px solid ${FLOW.line}`, borderRadius: 10, padding: "12px 14px", fontSize: 15, fontFamily: "inherit", color: FLOW.ink, background: "#fff", outline: "none", width: "100%", boxSizing: "border-box" }} />
              <input type="tel" inputMode="numeric" placeholder="WhatsApp number" value={oobPhone} onChange={(e) => { setOobPhone(e.target.value); if (oobError) setOobError(null); }} aria-invalid={oobError ? true : undefined} style={{ border: `1.5px solid ${oobError ? "#c0392b" : FLOW.line}`, borderRadius: 10, padding: "12px 14px", fontSize: 15, fontFamily: "inherit", color: FLOW.ink, background: "#fff", outline: "none", width: "100%", boxSizing: "border-box" }} />
              {oobError && <p role="alert" style={{ margin: "-2px 2px 0", fontSize: 13, color: "#c0392b", lineHeight: 1.5 }}>{oobError}</p>}
            </div>
            <button onClick={submitOobPopup} disabled={!oobName.trim() || !oobPhone.trim() || oobSubmitting} style={{ width: "100%", background: FLOW.navy, color: "#fff", border: "none", borderRadius: 12, padding: "15px 20px", fontWeight: 700, fontSize: 15, cursor: oobName.trim() && oobPhone.trim() && !oobSubmitting ? "pointer" : "not-allowed", opacity: oobName.trim() && oobPhone.trim() && !oobSubmitting ? 1 : 0.55, fontFamily: "inherit", marginBottom: 10 }}>{oobSubmitting ? "Sending…" : "Send me the Handbook →"}</button>
            <p style={{ fontSize: 11.5, color: FLOW.dim, textAlign: "center", lineHeight: 1.5, margin: 0 }}>By continuing, you agree to receive the Handbook and occasional related messages from Attention Architect on WhatsApp. Reply STOP any time to opt out.</p>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ width: 48, height: 48, margin: "0 auto 16px", borderRadius: "50%", background: FLOW.sel, display: "grid", placeItems: "center" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" stroke={FLOW.gold} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 20, color: FLOW.ink, marginBottom: 10 }}>{oobResult.wa_sent ? "Handbook sent to your WhatsApp." : "You’re on the list."}</div>
            <p style={{ fontSize: 14, color: FLOW.dim, lineHeight: 1.6 }}>{oobResult.wa_sent ? "Check your WhatsApp — the link is on its way." : "Check WhatsApp — your Attention Handbook is on its way. It usually arrives within a minute."}</p>
            <button onClick={() => setOobPopup(null)} style={{ marginTop: 20, background: "none", border: `1.5px solid ${FLOW.line}`, borderRadius: 10, padding: "10px 22px", fontSize: 13.5, fontWeight: 600, color: FLOW.dim, cursor: "pointer", fontFamily: "inherit" }}>Close</button>
          </div>
        )}
      </div>
    </div>
  ) : null;

  // ── STEP 1 — AGE (navy hero + bands below) ────────────────────────────────────
  if (step === 1) {
    return (
      <>
        <div style={{ minHeight: "100dvh", background: FLOW.cream, fontFamily: BODY, color: FLOW.ink }}>
          <div style={{ background: FLOW.navy, borderRadius: "0 0 28px 28px", padding: "16px 22px 40px" }}>
            <div style={{ maxWidth: 440, margin: "0 auto" }}>
              <div style={{ marginBottom: 12 }}><SegmentBar step={1} onNavy /></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <Wordmark onNavy />
                <span style={{ background: "rgba(232,163,61,.18)", color: FLOW.goldSoft, border: "1px solid rgba(232,163,61,.4)", borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 700 }}>Free · {FLOW_TOTAL_MIN} min</span>
              </div>
              <h1 style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 32, lineHeight: 1.2, color: "#fff", margin: 0 }}>
                How old is your <span style={{ fontStyle: "italic", color: FLOW.goldSoft }}>child</span>?
              </h1>
              <p style={{ fontSize: 14, color: "#C9D6E6", lineHeight: 1.45, margin: "10px 0 0" }}>What works at 9 backfires at 13, so we start here.</p>
            </div>
          </div>

          <div style={{ maxWidth: 440, margin: "0 auto", padding: "0 20px 16px", marginTop: -24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {AGE_BANDS.map((band) => (
                <button key={band} onClick={() => pickAge(band)}
                  style={{ background: "#fff", border: age === band ? `2px solid ${FLOW.gold}` : `1px solid rgba(0,0,0,.04)`, borderRadius: 16, padding: "16px 4px", minHeight: 104, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, boxShadow: "0 6px 18px rgba(30,58,95,.07)" }}>
                  <span style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 27, color: FLOW.navy, lineHeight: 1 }}>{band.replace("-", "–")}</span>
                  <span style={{ fontSize: 11, color: FLOW.dim }}>years</span>
                  <span style={{ fontSize: 11.5, color: FLOW.dim, lineHeight: 1.25, marginTop: 2, padding: "0 2px" }}>{AGE_LABELS[band]}</span>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              {([["younger", "Younger than 8"], ["older", "15 or older"]] as const).map(([val, label]) => (
                <button key={val} onClick={() => openOob(val)} style={{ flex: 1, minHeight: 44, background: "none", border: `1px solid ${FLOW.line}`, borderRadius: 12, padding: "10px 8px", fontSize: 12.5, color: FLOW.dim, cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
              ))}
            </div>
            <p style={{ textAlign: "center", marginTop: 14, fontSize: 12.5, color: FLOW.dim }}>No sign-up · Private · For ages 8–14</p>
          </div>
        </div>
        {oobModal}
        <ReportFooterLinks />
      </>
    );
  }

  // ── STEP 2 — WORRY (age-specific list) + optional "How often?" ────────────────
  if (step === 2) {
    return (
      <>
        <Screen>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
            <Wordmark /><BackLink onClick={() => setStep(1)} />
          </div>
          <div style={{ marginBottom: 22 }}><SegmentBar step={2} /></div>

          <h1 style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 32, lineHeight: 1.2, color: FLOW.ink, margin: "0 0 6px" }}>
            What&rsquo;s hardest with your child <span style={{ fontStyle: "italic", color: FLOW.gold }}>right now</span>?
          </h1>
          <p style={{ fontSize: 14, color: FLOW.dim, lineHeight: 1.4, margin: "0 0 18px" }}>Tap one. The questions after this are shaped by it.</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {worryList.map((w) => {
              const sel = worry === w.key;
              const reg = worryByKey(w.key);
              return (
                <button key={w.key} onClick={() => pickWorry(w.key)}
                  style={{ position: "relative", background: sel ? FLOW.sel : "#fff", border: sel ? `2px solid ${FLOW.gold}` : "1px solid rgba(0,0,0,.04)", borderRadius: 18, padding: "12px 13px", minHeight: 92, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 9, textAlign: "left", boxShadow: "0 6px 18px rgba(30,58,95,.07)" }}>
                  <IconChip worry={reg} />
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: FLOW.ink, lineHeight: 1.25 }}>{w.label}</span>
                  {sel && (
                    <span aria-hidden="true" style={{ position: "absolute", top: 10, right: 10, width: 22, height: 22, borderRadius: "50%", background: FLOW.gold, display: "grid", placeItems: "center" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Optional "How often?" — appears once a worry is picked; Next works with or without it. */}
          {worry && (
            <div style={{ marginTop: 20 }}>
              {worryObj && (
                <div style={{ background: FLOW.navy, borderRadius: 14, padding: "14px 16px", marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <IconChip worry={worryObj} size={36} />
                  <p style={{ margin: 0, fontSize: 13.5, color: "#EAF1F8", lineHeight: 1.5 }}>{worryObj.echo}</p>
                </div>
              )}
              <div style={{ fontSize: 13.5, fontWeight: 600, color: FLOW.ink, marginBottom: 9 }}>How often does this happen? <span style={{ fontWeight: 500, color: FLOW.dim }}>(optional)</span></div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {FREQUENCY_OPTIONS.map((opt) => {
                  const sel = frequency === opt.key;
                  return (
                    <button key={opt.key} onClick={() => setFrequency(sel ? null : opt.key)}
                      style={{ minHeight: 42, padding: "9px 14px", fontSize: 13.5, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", borderRadius: 999, border: sel ? `2px solid ${FLOW.gold}` : `1px solid ${FLOW.line}`, background: sel ? FLOW.sel : "#fff", color: FLOW.ink }}>{opt.label}</button>
                  );
                })}
              </div>
            </div>
          )}

          <button onClick={continueFromWorry} disabled={!worry}
            style={{ width: "100%", height: 54, marginTop: 22, background: worry ? FLOW.navy : FLOW.line, color: worry ? "#fff" : FLOW.dim, border: "none", borderRadius: 16, fontFamily: HEAD, fontWeight: 600, fontSize: 17, cursor: worry ? "pointer" : "not-allowed" }}>
            {worry ? "Continue →" : "Pick what’s hardest to continue"}
          </button>
        </Screen>
        {oobModal}
        <ReportFooterLinks />
      </>
    );
  }

  // ── STEP 3 — CHILD (name + gender) ────────────────────────────────────────────
  if (step === 3) {
    const canContinue = childStepReady(childName, gender);
    return (
      <>
        <Screen>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
            <Wordmark /><BackLink onClick={() => setStep(2)} />
          </div>
          <div style={{ marginBottom: 22 }}><SegmentBar step={3} /></div>

          <h1 style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 32, lineHeight: 1.2, color: FLOW.ink, margin: "0 0 8px" }}>Who are we thinking about?</h1>
          <p style={{ fontSize: 14, color: FLOW.dim, lineHeight: 1.5, margin: "0 0 20px" }}>We&rsquo;ll use their name in the questions, so they feel like they&rsquo;re about your child — not a generic kid.</p>

          <div style={{ background: "#fff", border: `1px solid ${FLOW.line}`, borderRadius: 20, padding: "22px 20px", boxShadow: "0 8px 22px rgba(30,58,95,.06)" }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: FLOW.ink, display: "block", marginBottom: 8 }}>Your child&rsquo;s first name</label>
            <input ref={nameRef} type="text" autoComplete="off" placeholder="e.g. Arjun" value={childName}
              onChange={(e) => setChildName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && canContinue) continueFromChild(); }}
              style={{ width: "100%", height: 54, padding: "0 16px", fontSize: 18, border: `2px solid ${FLOW.line}`, borderRadius: 14, fontFamily: "inherit", marginBottom: 20, background: FLOW.cream, color: FLOW.ink, outline: "none", boxSizing: "border-box" }} />

            <div style={{ fontSize: 13, fontWeight: 600, color: FLOW.ink, marginBottom: 9 }}>{kidNameCap} is a</div>
            <div style={{ display: "flex", gap: 8 }}>
              {([["boy", "Boy"], ["girl", "Girl"], ["prefer-not-to-say", "Prefer not to say"]] as const).map(([val, label]) => {
                const sel = gender === val;
                return (
                  <button key={val} onClick={() => setGender(sel ? null : val)}
                    style={{ flex: 1, minHeight: 50, padding: "10px 4px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", borderRadius: 12, border: sel ? `2px solid ${FLOW.gold}` : `1px solid ${FLOW.line}`, background: sel ? FLOW.sel : "#fff", color: FLOW.ink }}>{label}</button>
                );
              })}
            </div>
          </div>

          <button onClick={continueFromChild} disabled={!canContinue}
            style={{ width: "100%", height: 56, marginTop: 22, background: canContinue ? FLOW.navy : FLOW.line, color: canContinue ? "#fff" : FLOW.dim, border: "none", borderRadius: 16, fontFamily: HEAD, fontWeight: 600, fontSize: 17, cursor: canContinue ? "pointer" : "not-allowed" }}>
            {canContinue ? "Continue →" : "Add a name and pick one to continue"}
          </button>
        </Screen>
        <ReportFooterLinks />
      </>
    );
  }

  // ── STEP 4 — INTRO (what to expect, then start) ───────────────────────────────
  const TILES: { big: string; small: string }[] = [
    { big: "15", small: "quick questions" },
    { big: `${FLOW_TOTAL_MIN} min`, small: "about" },
    { big: "Free", small: "report on WhatsApp" },
  ];
  return (
    <>
      <Screen>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <Wordmark /><BackLink onClick={() => setStep(3)} />
        </div>

        <h1 style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 32, lineHeight: 1.2, color: FLOW.ink, margin: "0 0 8px" }}>
          {kidNameCap}&rsquo;s questions are ready.
        </h1>
        <p style={{ fontSize: 14.5, color: FLOW.dim, lineHeight: 1.55, margin: "0 0 22px" }}>
          There are no right answers — pick what happens most days. {kidNameCap}&rsquo;s name is in the questions so they feel like yours.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
          {TILES.map((t, i) => (
            <div key={i} style={{ background: "#fff", border: `1px solid ${FLOW.line}`, borderRadius: 16, padding: "16px 8px", minHeight: 92, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, boxShadow: "0 4px 14px rgba(30,58,95,.05)", textAlign: "center" }}>
              {t.small === "about" && <span style={{ fontSize: 11, color: FLOW.dim }}>{t.small}</span>}
              <span style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 22, color: FLOW.navy, lineHeight: 1.05 }}>{t.big}</span>
              {t.small !== "about" && <span style={{ fontSize: 11.5, color: FLOW.dim, lineHeight: 1.25 }}>{t.small}</span>}
            </div>
          ))}
        </div>

        <button onClick={startAssessment}
          style={{ width: "100%", height: 56, background: FLOW.navy, color: "#fff", border: "none", borderRadius: 16, fontFamily: HEAD, fontWeight: 600, fontSize: 17, cursor: "pointer" }}>
          Start {kidName}&rsquo;s questions →
        </button>
        <p style={{ textAlign: "center", marginTop: 14, fontSize: 12.5, color: FLOW.dim }}>Private · No sign-up to start</p>
      </Screen>
      <ReportFooterLinks />
    </>
  );
}
