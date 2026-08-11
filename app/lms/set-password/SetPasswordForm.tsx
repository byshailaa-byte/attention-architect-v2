"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Props = { sessionId: string; email: string | null };

export default function SetPasswordForm({ sessionId, email }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;
  const ready = password.length >= 8 && password === confirm && !!sessionId;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, password }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if ((data as { alreadyExists?: boolean }).alreadyExists) {
          router.push("/lms/login");
          return;
        }
        setError((data as { error?: string }).error ?? "Something went wrong. Try again.");
        return;
      }
      router.push("/lms");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--paper)" }}
    >
      <div className="w-full max-w-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-icon-wordmark.png" alt="Attention Architect" style={{ height: 44, width: "auto", marginBottom: 16 }} />
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: "var(--ink)" }}
        >
          Set your password
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--ink-dim)" }}>
          {email
            ? <>Your account: <strong style={{ color: "var(--ink)" }}>{email}</strong></>
            : "Create a password to access your program."}
        </p>

        <form onSubmit={submit} noValidate>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--ink)" }}
          >
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onInput={(e) => setPassword((e.currentTarget as HTMLInputElement).value)}
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
            Confirm password
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onInput={(e) => setConfirm((e.currentTarget as HTMLInputElement).value)}
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
            {loading ? "Setting up…" : "Set password and open program →"}
          </button>
        </form>

        <p className="text-sm mt-6 text-center" style={{ color: "var(--ink-dim)" }}>
          Already have an account?{" "}
          <Link href="/lms/login" style={{ color: "var(--calm-text)" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
