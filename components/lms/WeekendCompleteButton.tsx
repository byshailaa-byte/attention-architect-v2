"use client";

import { useState } from "react";
import { useReadOnly, READ_ONLY_TOOLTIP } from "@/components/lms/ReadOnlyContext";
import { track } from "@/lib/analytics/track";

export default function WeekendCompleteButton({
  week,
  alreadyComplete,
  nextWeek,
  nextWeekUnlocked,
  nextWeekUnlockHours,
  onCompleted,
}: {
  week: number;
  alreadyComplete: boolean;
  nextWeek: number | null;
  nextWeekUnlocked: boolean;
  nextWeekUnlockHours: number;
  onCompleted?: () => void;
}) {
  const readOnly = useReadOnly();
  const [done, setDone] = useState(alreadyComplete);
  const [loading, setLoading] = useState(false);

  async function markComplete() {
    if (readOnly) return;
    setLoading(true);
    try {
      await fetch("/api/lms/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week, day: 0 }),
      });
      track("lms_day_complete", { week, day: 0 }, null, { db: false });
      setDone(true);
      onCompleted?.();
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    if (!nextWeek) {
      return (
        <div
          className="rounded-xl p-5 text-center"
          style={{ background: "var(--card)", border: "1.5px solid var(--line)" }}
        >
          <p className="font-semibold mb-1" style={{ color: "var(--ink)" }}>
            Week {week} complete.
          </p>
          <p className="text-sm" style={{ color: "var(--ink-dim)" }}>
            You&rsquo;ve finished the programme. Well done.
          </p>
        </div>
      );
    }

    if (nextWeekUnlocked) {
      return (
        <div
          className="rounded-xl p-5 text-center"
          style={{ background: "var(--card)", border: "1.5px solid var(--line)" }}
        >
          <p className="font-semibold mb-2" style={{ color: "var(--ink)" }}>
            Week {week} complete.
          </p>
          <a
            href="/lms"
            className="inline-block rounded-lg px-5 py-2 text-sm font-semibold"
            style={{ background: "var(--ink)", color: "#fff", textDecoration: "none" }}
          >
            Start Week {nextWeek} →
          </a>
        </div>
      );
    }

    const hoursText =
      nextWeekUnlockHours <= 1
        ? "less than an hour"
        : `about ${nextWeekUnlockHours} hour${nextWeekUnlockHours === 1 ? "" : "s"}`;

    return (
      <div
        className="rounded-xl p-5 text-center"
        style={{ background: "var(--card)", border: "1.5px solid var(--line)" }}
      >
        <p className="font-semibold mb-1" style={{ color: "var(--ink)" }}>
          Week {week} complete.
        </p>
        <p className="text-sm" style={{ color: "var(--ink-dim)" }}>
          Week {nextWeek} opens in {hoursText} — check back soon.
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={markComplete}
      disabled={loading || readOnly}
      title={readOnly ? READ_ONLY_TOOLTIP : undefined}
      className="w-full rounded-lg px-4 py-3 text-base font-semibold transition-opacity"
      style={{
        background: "var(--ink)",
        color: "#fff",
        opacity: readOnly ? 0.5 : loading ? 0.5 : 1,
        cursor: readOnly || loading ? "not-allowed" : "pointer",
      }}
    >
      {loading ? "Saving…" : `Mark Week ${week} complete →`}
    </button>
  );
}
