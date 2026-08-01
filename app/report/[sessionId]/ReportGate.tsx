"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

function normalizePhone(raw: string): string {
  // Strip +91 / 91 prefix, spaces, dashes, dots
  let s = raw.replace(/[\s\-.()+]/g, "");
  if (s.startsWith("91") && s.length === 12) s = s.slice(2);
  return s;
}

function isValidPhone(raw: string): boolean {
  const digits = normalizePhone(raw);
  return /^[6-9]\d{9}$/.test(digits);
}

export default function ReportGate({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", "report_gate_view");
    }
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      window.fbq("trackCustom", "ReportGateView");
    }
  }, []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const res = await fetch("/api/report/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          parentName: name.trim(),
          email: email.trim(),
          phone: normalizePhone(phone),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Something went wrong");
      }
      if (typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag("event", "generate_lead");
      }
      // event_id matches server-side CAPI Lead call in /api/report/claim
      if (typeof window !== "undefined" && typeof window.fbq === "function") {
        window.fbq("track", "Lead", {}, { eventID: `lead:${sessionId}` });
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  const ready = name.trim().length > 0 && email.trim().length > 0 && phone.trim().length > 0;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div
        className="max-w-md md:max-w-lg w-full"
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 32,
          border: "1px solid #e0ddd1",
        }}
      >
        <p
          className="text-xs font-semibold tracking-widest uppercase mb-3"
          style={{ color: "var(--calm-text)" }}
        >
          Your report is ready
        </p>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--ink)" }}>
          Who should we address it to?
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--ink-dim)" }}>
          Enter your name and email to open your child&rsquo;s full attention report.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--ink-dim)" }}
            >
              Your first name
            </label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              style={{ borderColor: "#d4d0c4", color: "var(--ink)", outline: "none" }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First name"
              required
              autoFocus
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--ink-dim)" }}
            >
              Email address
            </label>
            <input
              type="email"
              className="w-full border rounded px-3 py-2 text-sm"
              style={{ borderColor: "#d4d0c4", color: "var(--ink)", outline: "none" }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--ink-dim)" }}
            >
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
              required
            />
            {phoneError ? (
              <p style={{ color: "var(--redpen)", fontSize: 12, marginTop: 4 }}>{phoneError}</p>
            ) : (
              <p style={{ color: "var(--ink-dim)", fontSize: 12, marginTop: 4 }}>
                We&rsquo;ll send your report to this number on WhatsApp — we won&rsquo;t share it elsewhere.
              </p>
            )}
          </div>

          {error && (
            <p style={{ color: "var(--redpen)", fontSize: 13 }}>{error}</p>
          )}

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
            {submitting ? "Opening report…" : "See your report →"}
          </button>
        </form>
      </div>
    </main>
  );
}
