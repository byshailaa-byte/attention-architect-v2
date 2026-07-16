"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") ?? "/lms";

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendOtp() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setError(data.error ?? "Couldn't send code. Try again.");
        return;
      }
      setStep("otp");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      if (!r.ok) {
        setError("Incorrect or expired code.");
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const phoneDigits = phone.replace(/\D/g, "");

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--paper)" }}
    >
      <div className="w-full max-w-sm">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--ink-dim)" }}>
          The Attention System
        </p>
        <h1 className="text-2xl font-bold mb-8" style={{ color: "var(--ink)" }}>
          Sign in to your program
        </h1>

        {step === "phone" ? (
          <>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--ink)" }}>
              Your phone number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile number"
              className="w-full rounded-lg px-4 py-3 text-base mb-4"
              style={{
                border: "1.5px solid var(--line)",
                background: "var(--card)",
                color: "var(--ink)",
                outline: "none",
              }}
              onKeyDown={(e) => e.key === "Enter" && phoneDigits.length >= 10 && sendOtp()}
              autoFocus
            />
            {error && (
              <p className="text-sm mb-4" style={{ color: "var(--redpen)" }}>
                {error}
              </p>
            )}
            <button
              onClick={sendOtp}
              disabled={loading || phoneDigits.length < 10}
              className="w-full rounded-lg px-4 py-3 text-base font-semibold transition-opacity"
              style={{
                background: "var(--ink)",
                color: "#fff",
                opacity: loading || phoneDigits.length < 10 ? 0.5 : 1,
                cursor: loading || phoneDigits.length < 10 ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Sending…" : "Send code"}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm mb-6" style={{ color: "var(--ink-dim)" }}>
              Code sent to {phone}.{" "}
              <button
                className="underline"
                style={{ color: "var(--calm)" }}
                onClick={() => { setStep("phone"); setCode(""); setError(""); }}
              >
                Change
              </button>
            </p>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--ink)" }}>
              6-digit code
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full rounded-lg px-4 py-3 text-xl text-center tracking-widest mb-4"
              style={{
                border: "1.5px solid var(--line)",
                background: "var(--card)",
                color: "var(--ink)",
                outline: "none",
                letterSpacing: "0.3em",
              }}
              onKeyDown={(e) => e.key === "Enter" && code.length === 6 && verifyOtp()}
              autoFocus
            />
            {error && (
              <p className="text-sm mb-4" style={{ color: "var(--redpen)" }}>
                {error}
              </p>
            )}
            <button
              onClick={verifyOtp}
              disabled={loading || code.length < 6}
              className="w-full rounded-lg px-4 py-3 text-base font-semibold transition-opacity"
              style={{
                background: "var(--ink)",
                color: "#fff",
                opacity: loading || code.length < 6 ? 0.5 : 1,
                cursor: loading || code.length < 6 ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Verifying…" : "Continue"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
