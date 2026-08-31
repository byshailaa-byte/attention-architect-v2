"use client";

import { useState } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

const NAVY = "#14284D";
const GOLD = "#F5A623";
const TEAL = "#22A38A";
const BG_F = `"Bricolage Grotesque", "Bricolage Grotesque Condensed", sans-serif`;

function normalizePhone(raw: string): string {
  let s = raw.replace(/[\s\-.()+]/g, "");
  if (s.startsWith("91") && s.length === 12) s = s.slice(2);
  return s;
}

function isValidPhone(raw: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizePhone(raw));
}

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function formatPhone(digits: string): string {
  if (digits.length === 10) return digits.slice(0, 5) + " " + digits.slice(5);
  return digits;
}

// ── Thank-you screen ──────────────────────────────────────────────────────────

function ThankYouScreen({
  sessionId,
  childName,
  parentName,
  email,
  phone,
}: {
  sessionId: string;
  childName: string;
  parentName: string;
  email: string;
  phone: string;  // normalized 10-digit
}) {
  const [correcting, setCorrecting]     = useState(false);
  const [newPhone, setNewPhone]         = useState("");
  const [phoneError, setPhoneError]     = useState<string | null>(null);
  const [updating, setUpdating]         = useState(false);
  const [displayPhone, setDisplayPhone] = useState(phone);
  const [resendDone, setResendDone]     = useState(false);
  const [updateError, setUpdateError]   = useState<string | null>(null);

  async function handlePhoneUpdate(e: React.FormEvent) {
    e.preventDefault();
    setPhoneError(null);
    if (!isValidPhone(newPhone)) {
      setPhoneError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    const normalized = normalizePhone(newPhone);
    setUpdating(true);
    setUpdateError(null);
    try {
      // Step 1: update phone + reset WA send state
      const upRes = await fetch("/api/report/update-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, phone: normalized }),
      });
      if (!upRes.ok) throw new Error("Could not update number");

      // Step 2: re-trigger claim so the in-process retry or after() fires for the new number
      await fetch("/api/report/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, parentName, email, phone: normalized, variant: "simplified" }),
      });

      setDisplayPhone(normalized);
      setCorrecting(false);
      setNewPhone("");
      setResendDone(true);
    } catch {
      setUpdateError("Something went wrong — please try again.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#FBF9F3",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 20px",
    }}>
      <div style={{ maxWidth: 440, width: "100%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-horizontal-icon-wordmark.png" alt="Attention Architect" style={{ height: 26, width: "auto", marginBottom: 32 }} />

        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: "36px 28px",
          border: "1px solid #E8E4D8",
          boxShadow: "0 2px 12px rgba(20,40,77,0.06)",
        }}>
          {/* Heading */}
          <div style={{ fontSize: "11px", letterSpacing: ".14em", textTransform: "uppercase", color: TEAL, fontWeight: 700, marginBottom: 16 }}>
            Report on the way
          </div>

          <h1 style={{ fontFamily: BG_F, fontWeight: 800, fontSize: "clamp(20px,4vw,26px)", color: NAVY, lineHeight: 1.25, margin: "0 0 14px" }}>
            Thank you — we&rsquo;re building {childName}&rsquo;s report now.
          </h1>

          <p style={{ fontSize: "15px", color: "#5B5648", lineHeight: 1.65, margin: "0 0 24px" }}>
            It takes about two minutes. We&rsquo;ll send it straight to your WhatsApp when it&rsquo;s ready.
          </p>

          {/* WhatsApp number display */}
          <div style={{
            background: "#F4F8F4",
            border: "1.5px solid #BDE0C7",
            borderRadius: 10,
            padding: "14px 18px",
            marginBottom: 8,
          }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#3A7A50", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".08em" }}>
              Sending to WhatsApp
            </div>
            <div style={{ fontFamily: BG_F, fontWeight: 700, fontSize: "18px", color: NAVY, letterSpacing: ".04em" }}>
              +91 {formatPhone(displayPhone)}
            </div>
          </div>

          {/* Correction / resend confirmation */}
          {resendDone && !correcting && (
            <p style={{ fontSize: "12px", color: TEAL, marginBottom: 16, fontWeight: 600 }}>
              Updated — resending to +91 {formatPhone(displayPhone)}.
            </p>
          )}

          {!correcting && !resendDone && (
            <button
              onClick={() => { setCorrecting(true); setResendDone(false); }}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                fontSize: "12px",
                color: "#8B8570",
                cursor: "pointer",
                textDecoration: "underline",
                marginBottom: 24,
                display: "block",
              }}
            >
              Not your number?
            </button>
          )}

          {correcting && (
            <form onSubmit={handlePhoneUpdate} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: NAVY, marginBottom: 8 }}>
                Enter the correct number
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="tel"
                  placeholder="98765 43210"
                  value={newPhone}
                  onChange={(e) => { setNewPhone(e.target.value); setPhoneError(null); }}
                  autoFocus
                  style={{
                    flex: 1,
                    padding: "11px 14px",
                    fontSize: "14px",
                    border: `1.5px solid ${phoneError ? "#D94F3D" : GOLD}`,
                    borderRadius: 8,
                    fontFamily: "inherit",
                    background: "#FBF9F3",
                    color: NAVY,
                    outline: "none",
                  }}
                />
                <button
                  type="submit"
                  disabled={updating || !newPhone.trim()}
                  style={{
                    padding: "11px 16px",
                    background: newPhone.trim() ? NAVY : "#D4D0C4",
                    color: newPhone.trim() ? "#fff" : "#8B8570",
                    fontFamily: BG_F,
                    fontWeight: 700,
                    fontSize: 13,
                    border: "none",
                    borderRadius: 8,
                    cursor: newPhone.trim() && !updating ? "pointer" : "not-allowed",
                    whiteSpace: "nowrap",
                  }}
                >
                  {updating ? "Updating…" : "Update →"}
                </button>
              </div>
              {phoneError && (
                <div style={{ fontSize: 12, color: "#D94F3D", marginTop: 5 }}>{phoneError}</div>
              )}
              {updateError && (
                <div style={{ fontSize: 12, color: "#D94F3D", marginTop: 5 }}>{updateError}</div>
              )}
              <button
                type="button"
                onClick={() => { setCorrecting(false); setNewPhone(""); setPhoneError(null); }}
                style={{ background: "none", border: "none", padding: 0, fontSize: "12px", color: "#8B8570", cursor: "pointer", textDecoration: "underline", marginTop: 8, display: "block" }}
              >
                Cancel
              </button>
            </form>
          )}

          {/* Divider */}
          <div style={{ borderTop: "1px solid #E8E4D8", margin: "20px 0" }} />

          {/* Resources CTA */}
          <p style={{ fontSize: "14px", color: "#5B5648", lineHeight: 1.6, margin: "0 0 16px" }}>
            While you wait — here&rsquo;s what this has looked like in other houses.
          </p>

          <a
            href="/simplified/resources"
            style={{
              display: "block",
              width: "100%",
              padding: "14px 20px",
              background: NAVY,
              color: "#fff",
              fontFamily: BG_F,
              fontWeight: 800,
              fontSize: 14,
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              textAlign: "center",
              textDecoration: "none",
              boxSizing: "border-box",
            }}
          >
            See what other families found →
          </a>

          <p style={{ fontSize: "12px", color: "#8B8570", textAlign: "center", marginTop: 14, lineHeight: 1.5 }}>
            You don&rsquo;t need to stay on this page — we&rsquo;ll WhatsApp you when the report is ready.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Gate form ─────────────────────────────────────────────────────────────────

export default function SimplifiedGate({
  sessionId,
  childName,
}: {
  sessionId: string;
  childName: string;
}) {
  const [parentName, setParentName] = useState("");
  const [email, setEmail]           = useState("");
  const [phone, setPhone]           = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [submitted, setSubmitted]   = useState(false);
  const [submittedPhone, setSubmittedPhone] = useState("");

  const emailTouched = email.length > 0;
  const emailValid   = isValidEmail(email);
  const ready        = parentName.trim().length > 0 && emailValid && phone.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPhoneError(null);
    if (!isValidPhone(phone)) {
      setPhoneError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const normalized = normalizePhone(phone);
    try {
      const res = await fetch("/api/report/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          parentName: parentName.trim(),
          email: email.trim(),
          phone: normalized,
          variant: "simplified",
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? "Something went wrong");
      }
      if (typeof window !== "undefined") {
        if (typeof window.gtag === "function") window.gtag("event", "generate_lead");
        if (typeof window.fbq === "function")
          window.fbq("track", "Lead", {}, { eventID: `lead:${sessionId}` });
      }
      setSubmittedPhone(normalized);
      setSubmitted(true);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <ThankYouScreen
        sessionId={sessionId}
        childName={childName}
        parentName={parentName.trim()}
        email={email.trim()}
        phone={submittedPhone}
      />
    );
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#FBF9F3",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 20px",
    }}>
      <div style={{ maxWidth: 440, width: "100%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-horizontal-icon-wordmark.png" alt="Attention Architect" style={{ height: 26, width: "auto", marginBottom: 32 }} />

        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: "32px 28px",
          border: "1px solid #E8E4D8",
          boxShadow: "0 2px 12px rgba(20,40,77,0.06)",
        }}>
          <div style={{ fontSize: "11px", letterSpacing: ".14em", textTransform: "uppercase", color: TEAL, fontWeight: 700, marginBottom: 12 }}>
            {childName}&rsquo;s Report is Ready
          </div>

          <h1 style={{ fontFamily: BG_F, fontWeight: 800, fontSize: "clamp(22px,4vw,28px)", color: NAVY, lineHeight: 1.25, marginBottom: 8, margin: "0 0 8px" }}>
            Where should we send it?
          </h1>
          <p style={{ fontSize: "14px", color: "#5B5648", lineHeight: 1.6, marginBottom: 28, margin: "0 0 28px" }}>
            We&rsquo;ll send {childName}&rsquo;s report to your WhatsApp. Free — no payment needed.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: NAVY, marginBottom: 6 }}>
                Your name <span style={{ color: "#D94F3D", fontWeight: 500, fontSize: 11 }}>Required</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Priya"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  fontSize: "15px",
                  border: `2px solid ${GOLD}`,
                  borderRadius: 10,
                  fontFamily: "inherit",
                  background: "#FBF9F3",
                  color: NAVY,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: NAVY, marginBottom: 6 }}>
                Email <span style={{ color: "#D94F3D", fontWeight: 500, fontSize: 11 }}>Required</span>
              </label>
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  fontSize: "15px",
                  border: `2px solid ${emailTouched && !emailValid ? "#D94F3D" : GOLD}`,
                  borderRadius: 10,
                  fontFamily: "inherit",
                  background: "#FBF9F3",
                  color: NAVY,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {emailTouched && !emailValid && (
                <div style={{ fontSize: 12, color: "#D94F3D", marginTop: 5 }}>Enter a valid email (e.g. you@gmail.com)</div>
              )}
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: NAVY, marginBottom: 6 }}>
                WhatsApp number <span style={{ color: "#D94F3D", fontWeight: 500, fontSize: 11 }}>Required</span>
              </label>
              <input
                type="tel"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setPhoneError(null); }}
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  fontSize: "15px",
                  border: `2px solid ${phoneError ? "#D94F3D" : GOLD}`,
                  borderRadius: 10,
                  fontFamily: "inherit",
                  background: "#FBF9F3",
                  color: NAVY,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {phoneError ? (
                <div style={{ fontSize: 12, color: "#D94F3D", marginTop: 5 }}>{phoneError}</div>
              ) : (
                <div style={{ fontSize: 12, color: "#8B8570", marginTop: 5 }}>Used only to send the report — never shared.</div>
              )}
            </div>

            {error && (
              <div style={{ background: "#fdf0ee", color: "#D94F3D", border: "1px solid #e8c4be", borderRadius: 8, padding: "12px 16px", fontSize: 13 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!ready || submitting}
              style={{
                width: "100%",
                padding: "15px 20px",
                background: ready ? NAVY : "#D4D0C4",
                color: ready ? "#fff" : "#8B8570",
                fontFamily: BG_F,
                fontWeight: 800,
                fontSize: 15,
                border: "none",
                borderRadius: 10,
                cursor: ready && !submitting ? "pointer" : "not-allowed",
                transition: "background .15s",
                marginTop: 4,
              }}
            >
              {submitting ? "Sending…" : `Send ${childName}'s Report →`}
            </button>
          </form>

          <div style={{ display: "flex", gap: 16, marginTop: 18, fontSize: 12, color: "#8B8570", justifyContent: "center" }}>
            <span>Free</span><span>·</span><span>No payment needed</span><span>·</span><span>Sent to WhatsApp</span>
          </div>
        </div>
      </div>
    </div>
  );
}
