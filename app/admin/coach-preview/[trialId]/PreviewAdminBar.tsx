"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Admin control bar that sits ABOVE the real Coach UI in a sandbox preview. Day switcher (simulated
// clock), reset, regenerate-with-new-focus, flag (per-reply, inside the chat), and Approve & offer.
// Everything here is admin-only and operates on a preview (is_preview) trial.
const NAVY = "#1E3A5F", GOLD = "#E8A33D", LINE = "#E7E0D2", INK = "#2E3A4B", DIM = "#5B6577";

type ApproveResult = { ok: true; trialLink: string; waMessage: string } | { ok: false; error: string };

export function PreviewAdminBar(props: {
  trialId: string; day: number; tod: "morning" | "evening"; focusConcern: string | null;
}) {
  const { trialId, day, tod, focusConcern } = props;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [approve, setApprove] = useState<ApproveResult | null>(null);
  const [copied, setCopied] = useState(false);

  const go = (d: number, t: "morning" | "evening" = tod) => router.push(`/admin/coach-preview/${trialId}?day=${d}&tod=${t}`);

  async function post(path: string, body: Record<string, unknown>) {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return res;
  }

  async function onReset() {
    if (busy) return; setBusy(true);
    try { await post("/api/admin/coach-preview/reset", { trialId }); go(0); router.refresh(); }
    finally { setBusy(false); }
  }
  async function onRegenerate() {
    if (busy) return;
    const next = window.prompt("Regenerate with a new focus concern (≤200 chars). Blank to clear:", focusConcern ?? "");
    if (next === null) return;
    setBusy(true);
    try { await post("/api/admin/coach-preview/reset", { trialId, focusConcern: next }); go(0); router.refresh(); }
    finally { setBusy(false); }
  }
  async function onApprove() {
    if (busy) return;
    if (!window.confirm("Approve & offer: grant the REAL 4-day trial to this parent with this focus? This sends nothing — you'll copy a WhatsApp message to send by hand.")) return;
    setBusy(true);
    try {
      const res = await post("/api/admin/coach-preview/approve", { trialId });
      const data = (await res.json().catch(() => ({ ok: false, error: "failed" }))) as ApproveResult;
      setApprove(res.ok ? data : { ok: false, error: (data as { error?: string }).error ?? "failed" });
    } finally { setBusy(false); }
  }
  async function copyMsg(msg: string) {
    try { await navigator.clipboard.writeText(msg); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
    catch { window.prompt("Copy the message:", msg); }
  }

  const dayBtn = (d: number): React.CSSProperties => ({
    minWidth: 40, padding: "6px 10px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
    border: `1px solid ${d === day ? NAVY : LINE}`, background: d === day ? NAVY : "#fff", color: d === day ? "#fff" : INK,
  });
  const todBtn = (t: "morning" | "evening"): React.CSSProperties => ({
    padding: "6px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
    border: `1px solid ${t === tod ? GOLD : LINE}`, background: t === tod ? "#FFF8EC" : "#fff", color: INK,
  });
  const action: React.CSSProperties = { padding: "7px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: busy ? "default" : "pointer", border: `1px solid ${LINE}`, background: "#fff", color: NAVY, opacity: busy ? 0.6 : 1 };

  return (
    <div style={{ background: "#FBF6EE", borderBottom: `1px solid ${LINE}`, padding: "10px 14px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", color: GOLD, textTransform: "uppercase" }}>Preview · sandbox</span>
        <span style={{ fontSize: 12, color: DIM }}>Day:</span>
        <button onClick={() => go(0)} style={dayBtn(0)}>0</button>
        {[1, 2, 3, 4].map((d) => <button key={d} onClick={() => go(d)} style={dayBtn(d)}>{d}</button>)}
        <button onClick={() => go(5)} style={{ ...dayBtn(5), minWidth: "auto", padding: "6px 10px" }}>Results</button>
        <span style={{ width: 1, height: 20, background: LINE, margin: "0 2px" }} />
        <button onClick={() => go(day, "morning")} style={todBtn("morning")}>Morning</button>
        <button onClick={() => go(day, "evening")} style={todBtn("evening")}>Evening</button>
        <span style={{ flex: 1 }} />
        <button onClick={onReset} disabled={busy} style={action}>Reset preview</button>
        <button onClick={onRegenerate} disabled={busy} style={action}>Regenerate focus</button>
        <button onClick={onApprove} disabled={busy} style={{ ...action, background: NAVY, color: "#fff", border: "none" }}>Approve &amp; offer</button>
      </div>
      {focusConcern && (
        <div style={{ fontSize: 12, color: DIM, marginTop: 6 }}>
          Focus: <span style={{ color: INK, fontWeight: 600 }}>{focusConcern}</span>
        </div>
      )}
      <div style={{ fontSize: 11.5, color: DIM, marginTop: 4 }}>
        Simulated: Day {day === 0 ? "0 (onboarding)" : day} · {tod}. Note: the Coach is reactive — there is no separate evening check-in; evening shows the same day&rsquo;s step.
      </div>

      {approve && approve.ok && (
        <div style={{ marginTop: 10, background: "#fff", border: `1px solid ${LINE}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: NAVY, marginBottom: 6 }}>✓ Real trial granted — copy &amp; send on WhatsApp (nothing was sent automatically):</div>
          <textarea readOnly value={approve.waMessage} rows={4}
            style={{ width: "100%", boxSizing: "border-box", fontSize: 13, padding: 10, borderRadius: 8, border: `1px solid ${LINE}`, color: INK, fontFamily: "system-ui" }} />
          <button onClick={() => copyMsg(approve.waMessage)} style={{ ...action, marginTop: 8, background: GOLD, color: "#1a1a1a", border: "none" }}>
            {copied ? "Copied ✓" : "Copy message"}
          </button>
        </div>
      )}
      {approve && !approve.ok && (
        <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: "#8C3F22" }}>
          Couldn&rsquo;t approve: {approve.error === "already_trialed" ? "this parent already has a real trial." : approve.error === "no_report" ? "report not ready." : approve.error === "already_paid" ? "already paid." : approve.error}
        </div>
      )}
    </div>
  );
}
