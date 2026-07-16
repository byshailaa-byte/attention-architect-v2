"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReportGate({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Something went wrong");
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  const ready = name.trim().length > 0 && email.trim().length > 0;

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
