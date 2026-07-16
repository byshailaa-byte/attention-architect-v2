"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session") ?? "";

  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--paper)" }}
    >
      <div
        className="max-w-md w-full text-center px-6 py-10 rounded-xl"
        style={{ background: "#fff", border: "1px solid #e0ddd1" }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "#eaf5ea" }}
        >
          <span style={{ fontSize: 22 }}>✓</span>
        </div>
        <h1
          className="text-xl font-bold mb-2"
          style={{ color: "var(--ink)" }}
        >
          Payment confirmed
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--ink-dim)" }}>
          We&rsquo;ll send a link to your email once your program access is set
          up. It usually takes less than a minute.
        </p>

        {sessionId && (
          <Link
            href={`/report/${sessionId}`}
            className="inline-block px-6 py-3 rounded-lg font-semibold text-sm"
            style={{
              background: "var(--marker)",
              color: "var(--marker-text)",
              textDecoration: "none",
            }}
          >
            ← Back to your report
          </Link>
        )}
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
