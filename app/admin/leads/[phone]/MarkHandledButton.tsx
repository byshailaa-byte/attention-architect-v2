"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { C, MONO } from "../ui";

export default function MarkHandledButton({ phone }: { phone: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handle() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/leads/handled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handle}
        disabled={busy}
        style={{
          font: "inherit", fontSize: 13, fontWeight: 700, cursor: busy ? "default" : "pointer",
          minHeight: 40, padding: "0 16px", borderRadius: 8, border: "none",
          background: C.yellow, color: "#000", opacity: busy ? 0.6 : 1, width: "100%",
        }}
      >
        {busy ? "Marking…" : "Mark handled"}
      </button>
      {err && <div style={{ fontFamily: MONO, fontSize: 11, color: C.red, marginTop: 6 }}>{err}</div>}
    </div>
  );
}
