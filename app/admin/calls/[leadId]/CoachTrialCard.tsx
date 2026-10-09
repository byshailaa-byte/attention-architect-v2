"use client";
import { useCallback, useEffect, useState } from "react";
import { T } from "../../crm-theme";

// Admin view of a live/ended trial — mirrors the API's TrialAdminView shape.
type TrialAdminView = {
  day: number;
  locked: boolean;
  status: string;
  endsAt: string;
  extendedDays: number;
  parentMessages: number;
  costInr: number;
  lastActiveAt: string | null;
  stepsEngaged: number;
  flagged: boolean;
};

type StatusResponse = {
  enabled: boolean;
  paid: boolean;
  alreadyTrialed: boolean;
  trialId: string | null;
  view: TrialAdminView | null;
};

// "Mon 13 Oct" — compact, IST-leaning readable date.
function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
  const mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
  return `${wd} ${d.getDate()} ${mo}`;
}

// "3h ago" / "2d ago" / a date for anything older — used for last-active.
function fmtRelative(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(iso);
}

export function CoachTrialCard({ sessionId, paid }: { sessionId: string; paid: boolean }) {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/coach-trial/status?sessionId=${encodeURIComponent(sessionId)}`);
      const data = (await res.json().catch(() => null)) as StatusResponse | null;
      if (data) setStatus(data);
    } catch {
      // Leave status as-is; the card stays quiet rather than flashing an error on a transient read.
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { void load(); }, [load]);

  const errorLabel = (code: string | undefined): string => {
    if (code === "already_paid") return "Already paid — no trial needed.";
    if (code === "already_trialed") return "This parent already had a trial.";
    if (code === "no_contact") return "No contact on file for this parent.";
    return "Something went wrong — try again.";
  };

  const grant = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/admin/coach-trial/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) await load();
      else setError(errorLabel(data.error));
    } catch {
      setError("Couldn’t grant the trial (network) — try again.");
    }
    setBusy(false);
  };

  const extend = async (trialId: string) => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/admin/coach-trial/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trialId }),
      });
      if (res.ok) await load();
      else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(errorLabel(data.error));
      }
    } catch {
      setError("Couldn’t extend the trial (network) — try again.");
    }
    setBusy(false);
  };

  const end = async (trialId: string) => {
    if (busy) return;
    if (!window.confirm("End this trial now?")) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/admin/coach-trial/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trialId }),
      });
      if (res.ok) await load();
      else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(errorLabel(data.error));
      }
    } catch {
      setError("Couldn’t end the trial (network) — try again.");
    }
    setBusy(false);
  };

  // Styles mirrored from CallScreen's local panel/sectionLabel/chip conventions.
  const panel: React.CSSProperties = { background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 12 };
  const sectionLabel: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, letterSpacing: "0.12em", color: T.label };
  const rowLabel: React.CSSProperties = { color: T.text2 };
  const errBox: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: T.dangerText, background: T.dangerBg, borderRadius: 10, padding: "9px 12px" };

  // Feature flag off → render nothing. Also render nothing until we know.
  if (loading || !status) return null;
  if (!status.enabled) return null;

  const view = status.view;

  // ── No trial yet: offer to grant one. ─────────────────────────────────────
  if (!view) {
    const blocked = paid || status.paid || status.alreadyTrialed;
    const reason = (paid || status.paid) ? "Already paid" : status.alreadyTrialed ? "Already had a trial" : null;
    return (
      <section style={panel}>
        <div style={sectionLabel}>FREE 4-DAY QUICK START</div>
        <button
          onClick={grant}
          disabled={blocked || busy}
          style={{
            background: T.navy, color: "#fff", border: "none", borderRadius: 12, padding: 12,
            fontWeight: 700, textAlign: "center", fontSize: 14,
            cursor: blocked || busy ? "default" : "pointer", opacity: blocked || busy ? 0.55 : 1,
          }}
        >
          {busy ? "Granting…" : "Grant 4-day trial"}
        </button>
        {reason && <div style={{ fontSize: 13, color: T.muted }}>{reason}</div>}
        {error && <div style={errBox}>{error}</div>}
      </section>
    );
  }

  // ── Trial exists: show its state. ─────────────────────────────────────────
  const ended = view.status !== "active" || view.locked;
  const headline = view.locked
    ? "Converted"
    : view.status !== "active"
      ? "Trial ended"
      : `Trial · Day ${view.day} of 4`;

  const btn = (kind: "extend" | "end"): React.CSSProperties => ({
    flex: 1, borderRadius: 10, padding: "9px 12px", fontWeight: 700, fontSize: 13.5,
    cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1,
    border: kind === "extend" ? `1px solid ${T.inputBorder}` : "none",
    background: kind === "extend" ? T.card : T.dangerBg,
    color: kind === "extend" ? T.navy : T.dangerText,
  });

  return (
    <section style={panel}>
      <div style={sectionLabel}>FREE 4-DAY QUICK START</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: T.navy }}>{headline}</div>
      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "7px 14px", fontSize: 13.5, lineHeight: 1.4 }}>
        <span style={rowLabel}>Ends</span>
        <span>{fmtDate(view.endsAt)}{view.extendedDays > 0 ? ` · +${view.extendedDays}d` : ""}</span>
        <span style={rowLabel}>Steps engaged</span>
        <span>{view.stepsEngaged} steps engaged</span>
        <span style={rowLabel}>Coach</span>
        <span>{view.parentMessages} Coach messages · ₹{view.costInr}</span>
        <span style={rowLabel}>Last active</span>
        <span>{fmtRelative(view.lastActiveAt)}</span>
      </div>
      {view.flagged && (
        <div style={{ fontSize: 13, fontWeight: 700, color: T.dangerText }}>⚑ Flagged — review</div>
      )}
      {!ended && (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => extend(status.trialId ?? "")} disabled={busy} style={btn("extend")}>Extend 2 days</button>
          <button onClick={() => end(status.trialId ?? "")} disabled={busy} style={btn("end")}>End trial</button>
        </div>
      )}
      {error && <div style={errBox}>{error}</div>}
    </section>
  );
}
