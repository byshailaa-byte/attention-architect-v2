"use client";
import { useState } from "react";

// Per-row actions on the "not yet sent" table. "Copy report link" copies the parent's report URL
// (report rows only). "Mark sent manually" records provider='manual' so the row is never re-sent.
export function OutboxRowActions({ id, kind, refValue }: { id: string; kind: string; refValue: string }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const copyLink = async () => {
    const link = `${window.location.origin}/report/${refValue}?report=v2`;
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { window.prompt("Copy the report link:", link); }
  };

  const markSent = async () => {
    if (busy) return;
    if (!window.confirm("Mark this as sent by hand? It won't be sent automatically later.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/whatsapp/mark-sent", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
      });
      if (res.ok) window.location.reload();
      else { setBusy(false); alert("Couldn't mark sent — try again."); }
    } catch { setBusy(false); alert("Network error — try again."); }
  };

  const btn: React.CSSProperties = { fontSize: 12, fontWeight: 700, padding: "6px 10px", borderRadius: 8, cursor: "pointer", border: "1px solid #d9d4c7", background: "#fff", color: "#14284D", marginRight: 8 };
  return (
    <span style={{ whiteSpace: "nowrap" }}>
      {kind === "report" && (
        <button onClick={copyLink} style={btn}>{copied ? "Copied ✓" : "Copy report link"}</button>
      )}
      <button onClick={markSent} disabled={busy} style={{ ...btn, background: busy ? "#eee" : "#fff" }}>{busy ? "…" : "Mark sent manually"}</button>
    </span>
  );
}
