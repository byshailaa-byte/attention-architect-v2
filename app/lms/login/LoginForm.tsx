"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Props = { redirectTo: string };

export default function LoginForm({ redirectTo }: Props) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Login failed. Try again.");
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const ready = email.includes("@") && password.length >= 8;

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
          className="text-2xl font-bold mb-8"
          style={{ color: "var(--ink)" }}
        >
          Sign in to your program
        </h1>

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
            onInput={(e) => setEmail((e.currentTarget as HTMLInputElement).value)}
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
            placeholder="Your password"
            className="w-full rounded-lg px-4 py-3 text-base mb-2"
            style={{
              border: "1.5px solid var(--line)",
              background: "var(--card)",
              color: "var(--ink)",
              outline: "none",
            }}
            autoComplete="current-password"
          />

          <div className="flex justify-end mb-4">
            <Link
              href="/lms/forgot-password"
              className="text-sm"
              style={{ color: "var(--calm-text)" }}
            >
              Forgot password?
            </Link>
          </div>

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
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
