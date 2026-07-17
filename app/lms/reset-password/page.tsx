"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;
  const ready = password.length >= 8 && password === confirm && !!token;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError((data as { error?: string }).error ?? "Reset failed. The link may have expired.");
        return;
      }
      router.push("/lms");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "var(--paper)" }}
      >
        <div className="w-full max-w-sm text-center">
          <p className="text-sm mb-4" style={{ color: "var(--redpen)" }}>
            Invalid reset link. Please request a new one.
          </p>
          <Link href="/lms/forgot-password" style={{ color: "var(--calm-text)", fontSize: 14 }}>
            Request a new link →
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
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: "var(--ink-dim)" }}
        >
          The Attention System
        </p>
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: "var(--ink)" }}
        >
          Set a new password
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--ink-dim)" }}>
          Choose a new password for your account.
        </p>

        <form onSubmit={submit} noValidate>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--ink)" }}
          >
            New password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full rounded-lg px-4 py-3 text-base mb-4"
            style={{
              border: "1.5px solid var(--line)",
              background: "var(--card)",
              color: "var(--ink)",
              outline: "none",
            }}
            autoFocus
            autoComplete="new-password"
          />

          <label
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--ink)" }}
          >
            Confirm new password
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Same password again"
            className="w-full rounded-lg px-4 py-3 text-base mb-4"
            style={{
              border: mismatch ? "1.5px solid var(--redpen)" : "1.5px solid var(--line)",
              background: "var(--card)",
              color: "var(--ink)",
              outline: "none",
            }}
            autoComplete="new-password"
          />

          {mismatch && (
            <p className="text-sm mb-4" style={{ color: "var(--redpen)" }}>
              Passwords don&rsquo;t match.
            </p>
          )}

          {error && (
            <p className="text-sm mb-4" style={{ color: "var(--redpen)" }}>
              {error}{" "}
              {error.includes("expired") && (
                <Link href="/lms/forgot-password" style={{ color: "var(--calm-text)" }}>
                  Request a new link.
                </Link>
              )}
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
            {loading ? "Updating…" : "Set new password →"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
