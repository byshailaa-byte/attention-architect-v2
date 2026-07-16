"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SkipAhead({ week }: { week: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function skip(targetDay: number) {
    setLoading(true);
    try {
      await fetch("/api/lms/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week, targetDay }),
      });
      router.push(`/lms/week/${week}/day/${targetDay}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <div className="text-center mt-2">
        <button
          onClick={() => setOpen(true)}
          className="text-sm underline"
          style={{ color: "var(--ink-dim)" }}
        >
          Behind a few days? Skip ahead →
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-5 mt-2"
      style={{ background: "var(--card)", border: "1.5px solid var(--line)" }}
    >
      <p className="text-sm font-medium mb-3" style={{ color: "var(--ink)" }}>
        Mark previous days complete and jump to:
      </p>
      <div className="flex gap-2 flex-wrap">
        {[2, 3, 4, 5].map((day) => (
          <button
            key={day}
            disabled={loading}
            onClick={() => skip(day)}
            className="rounded-lg px-3 py-2 text-sm font-semibold"
            style={{ background: "var(--ink)", color: "#fff", opacity: loading ? 0.5 : 1 }}
          >
            Day {day}
          </button>
        ))}
      </div>
      <p className="text-xs mt-3" style={{ color: "var(--ink-dim)" }}>
        Previous days will be marked done with no reflection recorded. Next card&apos;s
        opening will use the &ldquo;mixed&rdquo; framing.
      </p>
    </div>
  );
}
