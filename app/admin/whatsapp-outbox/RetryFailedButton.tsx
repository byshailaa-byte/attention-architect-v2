"use client";
import { useState } from "react";

// "Retry failed" — requeues failed rows (fresh 24h window), then the drain/cron sends them.
export function RetryFailedButton({ failed }: { failed: number }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function retry() {
    if (busy || failed === 0) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/admin/whatsapp/retry-failed", { method: "POST" });
      const d = await r.json();
      setMsg(r.ok ? `Requeued ${d.requeued ?? 0}. Queued now: ${d.queued ?? "?"}.` : (d.error ?? "failed"));
    } catch { setMsg("request failed"); }
    finally { setBusy(false); }
  }
  return (
    <span style={{ marginLeft: 12 }}>
      <button onClick={retry} disabled={busy || failed === 0}
        style={{ padding: "10px 18px", borderRadius: 8, fontSize: 14, fontWeight: 700, border: "1px solid #C2543B",
          background: failed > 0 ? "#fff" : "#f3efe6", color: failed > 0 ? "#C2543B" : "#c9c4b4", cursor: failed > 0 && !busy ? "pointer" : "not-allowed" }}>
        {busy ? "Requeuing…" : "Retry failed"}
      </button>
      {msg && <span style={{ marginLeft: 10, fontSize: 13.5, color: "#14284D" }}>{msg}</span>}
    </span>
  );
}
