"use client";

import { useState, useEffect, useRef } from "react";
import { PlanPricing } from "./PlanInteractive";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

type Screen = "phone" | "teaser" | "paywall";

type Props = {
  sessionId: string;
  hasPhone: boolean;
  initialPhone: string;
  teaserText: string | null;
  childName: string;
};

function fireEvent(eventType: string, sessionId: string, metadata?: Record<string, unknown>) {
  fetch("/api/funnel/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_type: eventType, session_id: sessionId, metadata: metadata ?? {} }),
  }).catch(() => {});
}

function fireGtag(event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", event, params ?? {});
  }
}

function fireFbq(
  type: "track" | "trackCustom",
  event: string,
  params?: Record<string, unknown>,
  eventId?: string,
) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    if (eventId) {
      window.fbq(type, event, params ?? {}, { eventID: eventId });
    } else {
      window.fbq(type, event, params ?? {});
    }
  }
}

function normalizePhone(raw: string): string {
  let s = raw.replace(/[\s\-.()+]/g, "");
  if (s.startsWith("91") && s.length === 12) s = s.slice(2);
  return s;
}

function isValidPhone(raw: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizePhone(raw));
}

// ── Screen 1: Phone capture ───────────────────────────────────────────────────

function PhoneScreen({
  sessionId,
  teaserText,
  onSuccess,
}: {
  sessionId: string;
  teaserText: string | null;
  onSuccess: (phone: string) => void;
}) {
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    fireEvent("phone_capture_shown", sessionId);
  }, [sessionId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPhoneError(null);
    if (!isValidPhone(phone)) {
      setPhoneError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/report/claim-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, phone: normalizePhone(phone) }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? "Something went wrong");
      }
      fireGtag("generate_lead");
      fireFbq("track", "Lead", {}, `lead:${sessionId}`);
      onSuccess(normalizePhone(phone));
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  const ready = phone.trim().length > 0;

  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--paper)" }}>
      <div
        className="max-w-md w-full"
        style={{ background: "#fff", borderRadius: 12, padding: 32, border: "1px solid #e0ddd1" }}
      >
        <p
          className="text-xs font-semibold tracking-widest uppercase mb-3"
          style={{ color: "var(--calm-text)" }}
        >
          Your report is ready
        </p>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--ink)" }}>
          Where should we send it?
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--ink-dim)" }}>
          Just your number — we&rsquo;ll use it to send the report and, if you go ahead, your weekly roadmap.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--ink-dim)" }}>
              WhatsApp number
            </label>
            <input
              type="tel"
              className="w-full border rounded px-3 py-2 text-sm"
              style={{
                borderColor: phoneError ? "var(--redpen)" : "#d4d0c4",
                color: "var(--ink)",
                outline: "none",
              }}
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setPhoneError(null); }}
              placeholder="98765 43210"
              autoFocus
              required
            />
            {phoneError ? (
              <p style={{ color: "var(--redpen)", fontSize: 12, marginTop: 4 }}>{phoneError}</p>
            ) : (
              <p style={{ color: "var(--ink-dim)", fontSize: 12, marginTop: 4 }}>
                We&rsquo;ll message you on WhatsApp with your report and follow-up ideas for your child&rsquo;s attention. Reply STOP any time.
              </p>
            )}
          </div>

          {error && <p style={{ color: "var(--redpen)", fontSize: 13 }}>{error}</p>}

          <button
            type="submit"
            disabled={!ready || submitting}
            className="py-3 rounded font-semibold text-sm mt-1"
            style={{
              background: ready ? "var(--marker)" : "#e8e5d8",
              color: ready ? "var(--marker-text)" : "var(--ink-dim)",
              cursor: ready && !submitting ? "pointer" : "not-allowed",
              transition: "background 0.15s",
            }}
          >
            {submitting
              ? "Sending…"
              : teaserText
              ? "See a preview →"
              : "Open my report →"}
          </button>
        </form>
      </div>
    </main>
  );
}

// ── Screen 2: Teaser ──────────────────────────────────────────────────────────

function TeaserScreen({
  sessionId,
  teaserText,
  childName,
  onContinue,
}: {
  sessionId: string;
  teaserText: string;
  childName: string;
  onContinue: () => void;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    fireEvent("teaser_shown", sessionId);
  }, [sessionId]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--paper)" }}>
      <div className="max-w-md w-full">
        <p
          className="text-xs font-semibold tracking-widest uppercase mb-4"
          style={{ color: "var(--calm-text)" }}
        >
          From {childName}&rsquo;s report
        </p>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e0ddd1",
            borderRadius: 12,
            padding: "28px 24px",
            marginBottom: 24,
          }}
        >
          {teaserText.split("\n\n").map((para, i) => (
            <p
              key={i}
              className="text-base leading-relaxed"
              style={{
                color: "var(--ink)",
                margin: i > 0 ? "16px 0 0" : 0,
                fontStyle: i === teaserText.split("\n\n").length - 1 ? "italic" : "normal",
              }}
            >
              {para}
            </p>
          ))}
        </div>

        <p className="text-sm mb-5" style={{ color: "var(--ink-dim)", textAlign: "center" }}>
          The full report explains what&rsquo;s actually happening and what tends to help.
        </p>

        <button
          onClick={onContinue}
          className="w-full py-3 rounded font-semibold text-sm"
          style={{
            background: "var(--marker)",
            color: "var(--marker-text)",
            border: "none",
            cursor: "pointer",
          }}
        >
          Continue →
        </button>
      </div>
    </main>
  );
}

// ── Screen 3: Paywall ─────────────────────────────────────────────────────────

function PaywallScreen({
  sessionId,
  childName,
  phone,
}: {
  sessionId: string;
  childName: string;
  phone: string;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    fireEvent("paywall_shown", sessionId, { variant: "gated" });
  }, [sessionId]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--paper)" }}>
      <div style={{ maxWidth: 480, width: "100%" }}>
        <p
          className="text-xs font-semibold tracking-widest uppercase mb-4"
          style={{ color: "var(--calm-text)", textAlign: "center" }}
        >
          Unlock {childName}&rsquo;s report
        </p>

        <PlanPricing sessionId={sessionId} calendlyUrl="" childName={childName} phone={phone} />

        {/* Trust row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#8B8570" }}>🔒 Secured by Razorpay</span>
          {["UPI", "Cards", "Netbanking"].map((m) => (
            <span
              key={m}
              style={{
                background: "rgba(32,30,25,0.05)",
                border: "1px solid rgba(32,30,25,0.12)",
                borderRadius: 6,
                fontSize: 11,
                color: "#5B5648",
                padding: "2px 8px",
              }}
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GatedReportFlow({ sessionId, hasPhone, initialPhone, teaserText, childName }: Props) {
  const initialScreen: Screen = !hasPhone
    ? "phone"
    : teaserText
    ? "teaser"
    : "paywall";

  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [capturedPhone, setCapturedPhone] = useState<string>(initialPhone);

  function advanceFromPhone() {
    setScreen(teaserText ? "teaser" : "paywall");
  }

  if (screen === "phone") {
    return (
      <PhoneScreen
        sessionId={sessionId}
        teaserText={teaserText}
        onSuccess={(phone: string) => {
          setCapturedPhone(phone);
          advanceFromPhone();
        }}
      />
    );
  }

  if (screen === "teaser" && teaserText) {
    return (
      <TeaserScreen
        sessionId={sessionId}
        teaserText={teaserText}
        childName={childName}
        onContinue={() => setScreen("paywall")}
      />
    );
  }

  return (
    <PaywallScreen
      sessionId={sessionId}
      childName={childName}
      phone={capturedPhone}
    />
  );
}
