"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Request failed. Try again.");
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  const ready = email.includes("@");

  if (sent) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "var(--paper)" }}
      >
        <div className="w-full max-w-sm text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "#eaf5ea" }}
          >
            <span style={{ fontSize: 22 }}>✓</span>
          </div>
          <h1
            className="text-xl font-bold mb-3"
            style={{ color: "var(--ink)" }}
          >
            Check your email
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--ink-dim)" }}>
            If an account exists for <strong>{email}</strong>, we&rsquo;ve sent a
            password reset link. Check your inbox — it expires in 1 hour.
          </p>
          <Link
            href="/lms/login"
            className="text-sm"
            style={{ color: "var(--calm-text)" }}
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--paper)" }}
    >
      <div className="w-full max-w-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-horizontal-icon-wordmark.png" alt="Attention Architect" style={{ height: 28, width: "auto", marginBottom: 16 }} />
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: "var(--ink)" }}
        >
          Forgot your password?
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--ink-dim)" }}>
          Enter your email and we&rsquo;ll send a reset link. It expires in 1 hour.
        </p>

        <form onSubmit={submit} noValidate>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--ink)" }}
          >
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg px-4 py-3 text-base mb-4"
            style={{
              border: "1.5px solid var(--line)",
              background: "var(--card)",
              color: "var(--ink)",
              outline: "none",
            }}
            autoFocus
            autoComplete="email"
          />

          {error && (
            <p className="text-sm mb-4" style={{ color: "var(--redpen)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !ready}
            className="w-full rounded-lg px-4 py-3 text-base font-semibold transition-opacity"
            style={{
              background: "var(--ink)",
              color: "#fff",
              opacity: loading || !ready ? 0.5 : 1,
              cursor: loading || !ready ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <p className="text-sm mt-6 text-center" style={{ color: "var(--ink-dim)" }}>
          <Link href="/lms/login" style={{ color: "var(--calm-text)" }}>
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
