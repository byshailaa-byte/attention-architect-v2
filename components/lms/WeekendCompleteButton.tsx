"use client";

import { useState } from "react";

export default function WeekendCompleteButton({
  week,
  alreadyComplete,
}: {
  week: number;
  alreadyComplete: boolean;
}) {
  const [done, setDone] = useState(alreadyComplete);
  const [loading, setLoading] = useState(false);

  async function markComplete() {
    setLoading(true);
    try {
      await fetch("/api/lms/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week, day: 0 }), // day 0 = weekend review
      });
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div
        className="rounded-xl p-5 text-center"
        style={{ background: "var(--card)", border: "1.5px solid var(--line)" }}
      >
        <p className="font-semibold mb-1" style={{ color: "var(--ink)" }}>
          Week {week} complete.
        </p>
        <p className="text-sm" style={{ color: "var(--ink-dim)" }}>
          Week 2 will be available soon.
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={markComplete}
      disabled={loading}
      className="w-full rounded-lg px-4 py-3 text-base font-semibold transition-opacity"
      style={{
        background: "var(--ink)",
        color: "#fff",
        opacity: loading ? 0.5 : 1,
        cursor: loading ? "not-allowed" : "pointer",
      }}
    >
      {loading ? "Saving…" : "Mark Week 1 complete →"}
    </button>
  );
}
