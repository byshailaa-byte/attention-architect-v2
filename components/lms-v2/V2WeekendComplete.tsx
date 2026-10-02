"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { V2, BODY } from "@/app/lms-v2/v2ui";

export default function V2WeekendComplete({
  week,
  alreadyComplete,
  nextWeek,
}: {
  week: number;
  alreadyComplete: boolean;
  nextWeek: number | null; // null when this is the final week
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = () => router.push(nextWeek ? `/lms-v2/week/${nextWeek}` : "/lms-v2");

  async function markComplete() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/lms/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week, day: 0 }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error || `HTTP ${r.status}`);
      }
      go();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const label = nextWeek ? `Go to Week ${nextWeek}` : "Back to home";
  const primary: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", minHeight: 52, borderRadius: 12, border: `1px solid ${V2.navy}`, background: V2.white, color: V2.navy, fontSize: 16, fontWeight: 600, fontFamily: BODY, cursor: "pointer", textDecoration: "none" };

  if (alreadyComplete) {
    return <button type="button" onClick={go} style={primary}>{label}</button>;
  }
  return (
    <>
      <button type="button" onClick={markComplete} disabled={busy} style={{ ...primary, opacity: busy ? 0.6 : 1 }}>
        {busy ? "Saving…" : `Mark week complete · ${label}`}
      </button>
      {error && <p style={{ margin: 0, fontSize: 13, color: "#C0392B", textAlign: "center" }}>{error}</p>}
    </>
  );
}
