"use client";

import { useState } from "react";

export const NAVY = "#14284D";
export const GOLD = "#F5A623";
export const TEAL = "#22A38A";
export const BG_F = `"Bricolage Grotesque", "Bricolage Grotesque Condensed", sans-serif`;

export function normalizePhone(raw: string): string {
  let s = raw.replace(/[\s\-.()+]/g, "");
  if (s.startsWith("91") && s.length === 12) s = s.slice(2);
  return s;
}

export function isValidPhone(raw: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizePhone(raw));
}

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function formatPhone(digits: string): string {
  if (digits.length === 10) return digits.slice(0, 5) + " " + digits.slice(5);
  return digits;
}

export default function ThankYouScreen({
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
  phone: string; // normalized 10-digit
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
      const upRes = await fetch("/api/report/update-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, phone: normalized }),
      });
      if (!upRes.ok) throw new Error("Could not update number");

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
          <div style={{ fontSize: "11px", letterSpacing: ".14em", textTransform: "uppercase", color: TEAL, fontWeight: 700, marginBottom: 16 }}>
            Report on the way
          </div>

          <h1 style={{ fontFamily: BG_F, fontWeight: 800, fontSize: "clamp(20px,4vw,26px)", color: NAVY, lineHeight: 1.25, margin: "0 0 14px" }}>
            Thank you — we&rsquo;re building {childName}&rsquo;s report now.
          </h1>

          <p style={{ fontSize: "15px", color: "#5B5648", lineHeight: 1.65, margin: "0 0 24px" }}>
            It takes about two minutes. We&rsquo;ll send it straight to your WhatsApp when it&rsquo;s ready.
          </p>

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

          <div style={{ borderTop: "1px solid #E8E4D8", margin: "20px 0" }} />

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
