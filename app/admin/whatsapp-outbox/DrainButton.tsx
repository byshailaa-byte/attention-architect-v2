"use client";
import { useState } from "react";

// "Send queued" — disabled until the provider is cloud (so nothing sends while we're on none).
export function DrainButton({ enabled }: { enabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function drain() {
    if (!enabled || busy) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/admin/whatsapp/drain", { method: "POST" });
      const d = await r.json();
      setMsg(r.ok ? `Sent ${d.sent ?? 0} of ${d.attempted ?? 0}. Queued now: ${d.queued ?? "?"}.` : (d.error ?? "failed"));
    } catch { setMsg("request failed"); }
    finally { setBusy(false); }
  }
  return (
    <div style={{ marginTop: 16 }}>
      <button onClick={drain} disabled={!enabled || busy}
        style={{ padding: "10px 18px", borderRadius: 8, fontSize: 14, fontWeight: 700, border: "none",
          background: enabled ? "#14284D" : "#c9c4b4", color: "#fff", cursor: enabled && !busy ? "pointer" : "not-allowed" }}>
        {busy ? "Sending…" : "Send queued"}
      </button>
      {!enabled && <span style={{ marginLeft: 12, fontSize: 13, color: "#9a927c" }}>Disabled until WHATSAPP_PROVIDER=cloud.</span>}
      {msg && <div style={{ marginTop: 10, fontSize: 13.5, color: "#14284D" }}>{msg}</div>}
    </div>
  );
}
