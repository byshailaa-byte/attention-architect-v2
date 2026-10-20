"use client";
// Small client actions for the weekly Coach review: resolve a call, approve/reject a pending gold
// example, and "Write a better reply" on a flagged reply (→ a pending gold example).
import { useState } from "react";
import { useRouter } from "next/navigation";

async function post(body: unknown) {
  const res = await fetch("/api/admin/coach-review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.ok;
}

const btn = { padding: "5px 11px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 } as const;

export function CallActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function act(status: "done" | "dismissed") {
    setBusy(true);
    if (await post({ action: "resolve_call", id, status })) router.refresh();
    setBusy(false);
  }
  return (
    <span style={{ display: "inline-flex", gap: 6 }}>
      <button style={btn} disabled={busy} onClick={() => act("done")}>Called ✓</button>
      <button style={btn} disabled={busy} onClick={() => act("dismissed")}>Dismiss</button>
    </span>
  );
}

export function GoldActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function act(action: "approve_gold" | "reject_gold") {
    setBusy(true);
    if (await post({ action, id })) router.refresh();
    setBusy(false);
  }
  return (
    <span style={{ display: "inline-flex", gap: 6 }}>
      <button style={{ ...btn, borderColor: "#1F7A46", color: "#1F7A46" }} disabled={busy} onClick={() => act("approve_gold")}>Approve</button>
      <button style={btn} disabled={busy} onClick={() => act("reject_gold")}>Reject</button>
    </span>
  );
}

export function BetterReply({ messageId }: { messageId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [situation, setSituation] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!text.trim()) return;
    setBusy(true);
    if (await post({ action: "better_reply", sourceMessageId: messageId, betterReply: text, situation })) { setOpen(false); setText(""); setSituation(""); router.refresh(); }
    setBusy(false);
  }
  if (!open) return <button style={btn} onClick={() => setOpen(true)}>Write a better reply</button>;
  return (
    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
      <input value={situation} onChange={(e) => setSituation(e.target.value)} placeholder="situation (for matching) e.g. 'didn't work, TV on'" style={{ padding: 7, borderRadius: 8, border: "1px solid #ccc", fontSize: 13 }} />
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="The better reply…" rows={4} style={{ padding: 7, borderRadius: 8, border: "1px solid #ccc", fontSize: 13 }} />
      <span style={{ display: "inline-flex", gap: 6 }}>
        <button style={{ ...btn, borderColor: "#1F7A46", color: "#1F7A46" }} disabled={busy} onClick={submit}>Save as pending example</button>
        <button style={btn} onClick={() => setOpen(false)}>Cancel</button>
      </span>
    </div>
  );
}
