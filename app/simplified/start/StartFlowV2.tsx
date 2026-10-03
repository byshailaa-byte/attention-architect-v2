"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { captureUtmOnce, getStoredUtm } from "@/lib/utm";
import { getFlowSid } from "@/lib/flow/session";
import { displayChildName } from "@/lib/report/pronouns";
import ReportFooterLinks from "@/app/components/ReportFooterLinks";
import FlowShell from "@/app/components/FlowShell";

const BG   = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";
const NAVY  = "#14284D";
const GOLD  = "#F5A623";
const GOLDB = "#FBCB4A";

function fireEvent(eventType: string, sessionId: string, metadata?: Record<string, unknown>) {
  fetch("/api/funnel/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_type: eventType, session_id: sessionId, metadata: metadata ?? {} }),
  }).catch(() => {});
}

// ── Inline stroke icons for the worry tiles (never emoji) ─────────────────────
const stroke = { stroke: NAVY, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
const BookIcon = (<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2 2 0 016 4h5v15H6a2 2 0 00-2 1.5z" {...stroke} /><path d="M20 5.5A2 2 0 0018 4h-5v15h5a2 2 0 012 1.5z" {...stroke} /></svg>);
const TargetIcon = (<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" {...stroke} /><circle cx="12" cy="12" r="4" {...stroke} /><circle cx="12" cy="12" r="0.6" {...stroke} stroke={NAVY} fill={NAVY} /></svg>);
const ScreenIcon = (<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="2.5" {...stroke} /><path d="M11 18h2" {...stroke} /></svg>);
const PersonIcon = (<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" {...stroke} /><path d="M5.5 20a6.5 6.5 0 0113 0" {...stroke} /></svg>);
const SproutIcon = (<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20v-7" {...stroke} /><path d="M12 13C12 9 9 7 5 7c0 4 3 6 7 6z" {...stroke} /><path d="M12 11c0-3 2.5-4.5 6-4.5 0 3-2.5 4.5-6 4.5z" {...stroke} /></svg>);
const ChecklistIcon = (<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h10M9 12h10M9 18h10" {...stroke} /><path d="M4 5.5l1.2 1.2L7 4.5" {...stroke} /><path d="M4.5 12h.01M4.5 18h.01" {...stroke} /></svg>);

const WORRIES = [
  { key: "homework",   label: "Homework fights",  icon: BookIcon,      echo: "Homework fights. You’re in the right place. The fight is usually not about the homework, and the next questions find what it’s really about." },
  { key: "reminders",  label: "Can’t focus", icon: TargetIcon,    echo: "Can’t focus. You’re in the right place. “Won’t” and “can’t” look identical from the outside, and the next questions tell them apart." },
  { key: "screens",    label: "Screens",          icon: ScreenIcon,    echo: "Screens. You’re in the right place. Screen battles usually sit on top of something else, and the next questions find what." },
  { key: "confidence", label: "Low confidence",   icon: PersonIcon,    echo: "Low confidence. You’re in the right place. “I can’t” is often a decision made before trying, and the next questions show where it starts." },
  { key: "giveup",     label: "Gives up quickly", icon: SproutIcon,    echo: "Gives up quickly. You’re in the right place. Quitting fast is usually protecting something, and the next questions find what." },
  { key: "finish",     label: "Never finishes",   icon: ChecklistIcon, echo: "Never finishes. You’re in the right place. Starting and finishing use different wiring, and the next questions show which one slips." },
];

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

type Step = 1 | 2 | 3 | 4;

// pct of the whole 7-step flow at the START of each step (steps 5–7 live in /assessment).
const STEP_PCT: Record<Step, number> = { 1: 6, 2: 16, 3: 26, 4: 34 };
function minsLeft(pct: number) { return Math.max(1, Math.round((100 - pct) / 20)); }

export default function StartFlowV2() {
  const router = useRouter();
  const [step, setStep]         = useState<Step>(1);
  const [worry, setWorry]       = useState<string | null>(null);
  const [age, setAge]           = useState<string | null>(null);
  const [childName, setChildName] = useState("");
  const [gender, setGender]     = useState<string | null>(null);
  const [phone, setPhone]       = useState("");
  const [phoneErr, setPhoneErr] = useState<string | null>(null);
  const [savingPhone, setSavingPhone] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // OOB handbook popup — backend (handbook-lead / handbook_send) UNCHANGED.
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
    // First touch: create the flow_sessions row (flow=v2, device, UTM, is_internal) + landing_view.
    fetch("/api/flow/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sid, flow: "v2", utm: getStoredUtm() }),
    }).catch(() => {});
    fireEvent("landing_view", sid, { flow: "v2" });
  }, []);

  const worryObj = worry ? WORRIES.find((w) => w.key === worry) ?? null : null;
  const kidName  = childName.trim() ? displayChildName(childName) : "your child";
  const kidNameCap = childName.trim() ? displayChildName(childName) : "Your child";

  function isValidMobile(raw: string): boolean {
    let d = raw.replace(/\D/g, "");
    if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
    return /^[6-9]\d{9}$/.test(d);
  }

  function pickWorry(key: string) {
    setWorry(key);
    fireEvent("start_worry", sidRef.current, { worry: key });
    setStep(2);
  }

  function pickAge(val: string) {
    setAge(val);
    fireEvent("start_age", sidRef.current, { age_band: val });
    setStep(3);
  }

  function openOob(band: "younger" | "older") {
    setOobPopup(band); setOobName(""); setOobPhone(""); setOobSubmitting(false); setOobResult(null); setOobError(null);
  }

  async function submitOobPopup() {
    if (!oobName.trim() || !oobPhone.trim() || !oobPopup || oobSubmitting) return;
    if (!isValidMobile(oobPhone)) { setOobError("Please enter a valid 10-digit mobile number"); return; }
    setOobError(null); setOobSubmitting(true);
    try {
      const res = await fetch("/api/handbook-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: oobName.trim(), phone: oobPhone.trim(), ageBand: oobPopup, variant: "simplified" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setOobError(data.error || "Please enter a valid 10-digit mobile number");
        return;
      }
      const data = await res.json().catch(() => ({})) as { wa_sent?: boolean };
      setOobResult({ wa_sent: data.wa_sent ?? false });
    } catch {
      setOobError("Something went wrong, please try again.");
    } finally {
      setOobSubmitting(false);
    }
  }

  function submitChild() {
    if (!childName.trim() || !gender) return;
    fireEvent("start_child", sidRef.current, { gender });
    setStep(4);
  }

  async function submitPhone() {
    if (savingPhone) return;
    if (!isValidMobile(phone)) { setPhoneErr("Enter a valid 10-digit mobile number"); return; }
    setPhoneErr(null);
    setSavingPhone(true);
    fireEvent("start_phone", sidRef.current);
    try {
      const res = await fetch("/api/flow/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sidRef.current, phone }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setPhoneErr(d.error || "Could not save your number, please try again.");
        setSavingPhone(false);
        return;
      }
    } catch {
      setPhoneErr("Could not save your number, please try again.");
      setSavingPhone(false);
      return;
    }
    // phone_captured is recorded server-side. Carry the selections into the assessment;
    // the unified session id travels in sessionStorage, so it's NOT in the URL.
    const p = new URLSearchParams();
    p.set("flow", "v2");
    p.set("name", childName.trim());
    if (gender) p.set("gender", gender);
    if (age) p.set("age", age);
    if (worry) p.set("concerns", worry);
    p.set("variant", "simplified");
    router.push(`/assessment?${p.toString()}`);
  }

  // ── OOB modal (handbook) ───────────────────────────────────────────────────
  const oobModal = oobPopup ? (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget && !oobSubmitting) setOobPopup(null); }}
    >
      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "32px 28px", maxWidth: 400, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,.22)", position: "relative" }}>
        <button onClick={() => setOobPopup(null)} style={{ position: "absolute", top: 16, right: 18, background: "none", border: "none", fontSize: 20, color: "var(--ink-dim)", cursor: "pointer", lineHeight: 1, padding: 4 }} aria-label="Close">×</button>
        {!oobResult ? (
          <>
            <div style={{ fontFamily: BG, fontWeight: 800, fontSize: 18, color: "var(--ink)", lineHeight: 1.3, marginBottom: 12 }}>{OOB_COPY[oobPopup].heading}</div>
            <p style={{ fontSize: 14, color: "var(--ink-dim)", lineHeight: 1.6, marginBottom: 16 }}>{OOB_COPY[oobPopup].body}</p>
            <p style={{ fontSize: 13.5, color: "var(--ink-dim)", lineHeight: 1.6, marginBottom: 16 }}>Where should we send it? Enter your WhatsApp number and we&apos;ll send the Attention Handbook within a few minutes.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
              <input type="text" placeholder="Your name" value={oobName} onChange={(e) => setOobName(e.target.value)} style={{ border: "1.5px solid var(--line)", borderRadius: 10, padding: "12px 14px", fontSize: 14.5, fontFamily: "inherit", color: "var(--ink)", background: "var(--paper)", outline: "none", width: "100%", boxSizing: "border-box" }} />
              <input type="tel" placeholder="WhatsApp number" value={oobPhone} onChange={(e) => { setOobPhone(e.target.value); if (oobError) setOobError(null); }} aria-invalid={oobError ? true : undefined} style={{ border: `1.5px solid ${oobError ? "#c0392b" : "var(--line)"}`, borderRadius: 10, padding: "12px 14px", fontSize: 14.5, fontFamily: "inherit", color: "var(--ink)", background: "var(--paper)", outline: "none", width: "100%", boxSizing: "border-box" }} />
              {oobError && <p role="alert" style={{ margin: "-2px 2px 0", fontSize: 13, color: "#c0392b", lineHeight: 1.5 }}>{oobError}</p>}
            </div>
            <button onClick={submitOobPopup} disabled={!oobName.trim() || !oobPhone.trim() || oobSubmitting} style={{ width: "100%", background: NAVY, color: "#fff", border: "none", borderRadius: 10, padding: "14px 20px", fontWeight: 700, fontSize: 15, cursor: oobName.trim() && oobPhone.trim() && !oobSubmitting ? "pointer" : "not-allowed", opacity: oobName.trim() && oobPhone.trim() && !oobSubmitting ? 1 : 0.55, fontFamily: "inherit", marginBottom: 10 }}>{oobSubmitting ? "Sending…" : "Send me the Handbook →"}</button>
            <p style={{ fontSize: 11.5, color: "var(--ink-dim)", textAlign: "center", lineHeight: 1.5, margin: 0 }}>By continuing, you agree to receive the Handbook and occasional related messages from Attention Architect on WhatsApp. Reply STOP any time to opt out.</p>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>✓</div>
            <div style={{ fontFamily: BG, fontWeight: 800, fontSize: 18, color: "var(--ink)", marginBottom: 10 }}>{oobResult.wa_sent ? "Handbook sent to your WhatsApp." : "You're on the list."}</div>
            <p style={{ fontSize: 14, color: "var(--ink-dim)", lineHeight: 1.6 }}>{oobResult.wa_sent ? "Check your WhatsApp — the link is on its way." : "Check WhatsApp — your Attention Handbook is on its way. It usually arrives within a minute."}</p>
            <button onClick={() => setOobPopup(null)} style={{ marginTop: 20, background: "none", border: "1.5px solid var(--line)", borderRadius: 10, padding: "10px 22px", fontSize: 13.5, fontWeight: 600, color: "var(--ink-dim)", cursor: "pointer", fontFamily: "inherit" }}>Close</button>
          </div>
        )}
      </div>
    </div>
  ) : null;

  const pct = STEP_PCT[step];
  const shellProps = { pct, minutesLeft: minsLeft(pct), label: `Step ${step} of 7` };

  // ── STEP 1 — WORRY ──────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <>
        <FlowShell {...shellProps} footer={<>Free · No sign-up · Private</>}>
          <h1 style={{ fontFamily: BG, fontWeight: 800, fontSize: 25, lineHeight: 1.25, color: "var(--ink)", margin: "0 0 8px" }}>What&rsquo;s hardest with your child right now?</h1>
          <p style={{ fontSize: 14, color: "var(--ink-dim)", lineHeight: 1.55, margin: "0 0 22px" }}>Tap one. The questions after this are shaped by it.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {WORRIES.map((w) => (
              <button
                key={w.key}
                onClick={() => pickWorry(w.key)}
                style={{ background: "var(--paper)", border: "1.5px solid var(--line)", borderRadius: 14, padding: "18px 12px", minHeight: 96, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, textAlign: "center", transition: "border-color .1s, background .1s" }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.background = "#FFF8E6"; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.background = "var(--paper)"; }}
              >
                {w.icon}
                <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", lineHeight: 1.25 }}>{w.label}</span>
              </button>
            ))}
          </div>
        </FlowShell>
        {oobModal}
        <ReportFooterLinks />
      </>
    );
  }

  // ── STEP 2 — AGE ──────────────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <>
        <FlowShell {...shellProps} onBack={() => setStep(1)}>
          {worryObj && (
            <div style={{ background: "var(--calm-tint)", border: "1px solid var(--calm)", borderRadius: 12, padding: "14px 16px", marginBottom: 22, fontSize: 13.5, color: "var(--calm-text)", lineHeight: 1.55 }}>
              {worryObj.echo}
            </div>
          )}
          <h1 style={{ fontFamily: BG, fontWeight: 800, fontSize: 25, lineHeight: 1.25, color: "var(--ink)", margin: "0 0 8px" }}>How old is your child?</h1>
          <p style={{ fontSize: 14, color: "var(--ink-dim)", lineHeight: 1.55, margin: "0 0 22px" }}>What works at 9 backfires at 13, so this matters.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(["8-9", "10-11", "12-14"] as const).map((band) => (
              <button
                key={band}
                onClick={() => pickAge(band)}
                style={{ background: "var(--paper)", border: "1.5px solid var(--line)", borderRadius: 12, padding: "16px 18px", minHeight: 56, fontSize: 16, fontWeight: 700, color: "var(--ink)", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "border-color .1s, background .1s" }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.background = "#FFF8E6"; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.background = "var(--paper)"; }}
              >
                {band.replace("-", "–")}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            {([["younger", "Younger than 8"], ["older", "Older than 14"]] as const).map(([val, label]) => (
              <button key={val} onClick={() => openOob(val)} style={{ flex: 1, minHeight: 44, background: "none", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 8px", fontSize: 12.5, color: "var(--ink-dim)", cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
            ))}
          </div>
        </FlowShell>
        {oobModal}
        <ReportFooterLinks />
      </>
    );
  }

  // ── STEP 3 — CHILD ────────────────────────────────────────────────────────────
  if (step === 3) {
    const canContinue = !!childName.trim() && !!gender;
    return (
      <>
        <FlowShell {...shellProps} onBack={() => setStep(2)}>
          <h1 style={{ fontFamily: BG, fontWeight: 800, fontSize: 25, lineHeight: 1.25, color: "var(--ink)", margin: "0 0 8px" }}>Who are we thinking about?</h1>
          <p style={{ fontSize: 14, color: "var(--ink-dim)", lineHeight: 1.55, margin: "0 0 22px" }}>We&rsquo;ll use their name in the questions, so they feel like they&rsquo;re about your child — not a generic kid.</p>

          <label style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", display: "block", marginBottom: 8 }}>Your child&rsquo;s first name</label>
          <input
            ref={nameRef}
            type="text"
            autoComplete="off"
            placeholder="e.g. Arjun"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && canContinue) submitChild(); }}
            style={{ width: "100%", padding: "14px 16px", fontSize: 16, border: "2px solid var(--marker)", borderRadius: 12, fontFamily: "inherit", marginBottom: 20, background: "var(--paper)", color: "var(--ink)", outline: "none", boxSizing: "border-box" }}
          />

          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 9 }}>{kidNameCap} is a</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {([["boy", "Boy"], ["girl", "Girl"], ["prefer-not-to-say", "Prefer not to say"]] as const).map(([val, label]) => {
              const sel = gender === val;
              return (
                <button key={val} className={`chip-btn${sel ? " sel" : ""}`} style={{ flex: 1, minHeight: 48, padding: "10px 4px", fontSize: 13, ...(sel ? { background: GOLDB, color: NAVY, borderColor: GOLD } : {}) }} onClick={() => setGender(sel ? null : val)}>{label}</button>
              );
            })}
          </div>

          <button
            className="cta-btn"
            disabled={!canContinue}
            onClick={submitChild}
            style={{ background: canContinue ? NAVY : "var(--line)", color: canContinue ? "#fff" : "var(--ink-dim)", cursor: canContinue ? "pointer" : "not-allowed" }}
          >
            {canContinue ? `Start ${kidName}'s questions →` : "Add a name and pick one to continue"}
          </button>
        </FlowShell>
        <ReportFooterLinks />
      </>
    );
  }

  // ── STEP 4 — WHATSAPP ─────────────────────────────────────────────────────────
  const phoneReady = phone.trim().length > 0 && !savingPhone;
  return (
    <>
      <FlowShell {...shellProps} onBack={() => setStep(3)}>
        <h1 style={{ fontFamily: BG, fontWeight: 800, fontSize: 25, lineHeight: 1.25, color: "var(--ink)", margin: "0 0 8px" }}>Where should we send {kidName}&rsquo;s report?</h1>
        <p style={{ fontSize: 14, color: "var(--ink-dim)", lineHeight: 1.55, margin: "0 0 22px" }}>We&rsquo;ll message it to your WhatsApp the moment it&rsquo;s ready. Free — no payment needed.</p>

        <label style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", display: "block", marginBottom: 8 }}>WhatsApp number</label>
        <div style={{ display: "flex", alignItems: "stretch", gap: 8, marginBottom: phoneErr ? 6 : 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", padding: "0 14px", fontSize: 16, fontWeight: 700, color: "var(--ink)", background: "var(--card)", border: "2px solid var(--marker)", borderRadius: 12 }}>+91</span>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            placeholder="98765 43210"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); if (phoneErr) setPhoneErr(null); }}
            onKeyDown={(e) => { if (e.key === "Enter" && phoneReady) submitPhone(); }}
            style={{ flex: 1, padding: "14px 16px", fontSize: 16, border: `2px solid ${phoneErr ? "var(--redpen)" : "var(--marker)"}`, borderRadius: 12, fontFamily: "inherit", background: "var(--paper)", color: "var(--ink)", outline: "none", boxSizing: "border-box", minWidth: 0 }}
          />
        </div>
        {phoneErr && <div role="alert" style={{ fontSize: 12.5, color: "var(--redpen)", marginBottom: 12 }}>{phoneErr}</div>}

        <p style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.6, marginBottom: 22 }}>
          Only your report and a few follow-ups about it. Reply STOP any time.{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: NAVY, fontWeight: 600, textDecoration: "underline" }}>Privacy</a>
        </p>

        <button
          className="cta-btn"
          disabled={!phoneReady}
          onClick={submitPhone}
          style={{ background: phoneReady ? NAVY : "var(--line)", color: phoneReady ? "#fff" : "var(--ink-dim)", cursor: phoneReady ? "pointer" : "not-allowed" }}
        >
          {savingPhone ? "Saving…" : "Continue →"}
        </button>
      </FlowShell>
      <ReportFooterLinks />
    </>
  );
}
