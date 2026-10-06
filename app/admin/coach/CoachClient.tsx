"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { T } from "../crm-theme";

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: T.label };
const card: React.CSSProperties = { background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 8, fontSize: 13 };

export function MarkReviewedButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    await fetch("/api/admin/coach/reviewed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) }).catch(() => {});
    router.refresh();
  }
  return (
    <button onClick={go} disabled={busy} style={{ border: `1px solid ${T.inputBorder}`, background: T.card, borderRadius: 10, padding: "8px 12px", fontWeight: 600, fontSize: 13, cursor: "pointer", color: T.text }}>
      {busy ? "…" : "Mark reviewed"}
    </button>
  );
}

export function CoachAside({ userId, facts, usage, note }: {
  userId: string;
  facts: string[];
  usage: { usedToday: number; totalParent: number; daysDone: number; lastActive: string | null };
  note: string;
}) {
  const [factText, setFactText] = useState(facts.join("\n"));
  const [savedFacts, setSavedFacts] = useState(false);
  const [noteText, setNoteText] = useState(note);
  const [noteSaved, setNoteSaved] = useState(false);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function saveFacts() {
    const arr = factText.split("\n").map((s) => s.trim()).filter(Boolean);
    await fetch("/api/admin/coach/memory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, facts: arr }) }).catch(() => {});
    setSavedFacts(true); setTimeout(() => setSavedFacts(false), 1500);
  }
  function onNote(v: string) {
    setNoteText(v); setNoteSaved(false);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(async () => {
      await fetch("/api/admin/coach/note", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, note: v }) }).catch(() => {});
      setNoteSaved(true);
    }, 700);
  }

  return (
    <aside style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
      <section style={card}>
        <div style={lbl}>WHAT THE COACH REMEMBERS</div>
        <textarea value={factText} onChange={(e) => setFactText(e.target.value)} rows={6}
          style={{ border: `1px solid ${T.inputBorder}`, borderRadius: 10, padding: "8px 10px", fontSize: 13, color: T.textRow, fontFamily: "inherit", resize: "vertical", background: T.card, lineHeight: 1.5 }} placeholder="One fact per line" />
        <button onClick={saveFacts} style={{ alignSelf: "flex-start", color: T.navy, fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: 0 }}>{savedFacts ? "Saved ✓" : "Edit memory"}</button>
      </section>
      <section style={card}>
        <div style={lbl}>USAGE</div>
        <div>Today: {usage.usedToday} of 30 · Total: {usage.totalParent} messages</div>
        <div>Days done: {usage.daysDone} · Last active: {usage.lastActive ?? "—"}</div>
      </section>
      <section style={card}>
        <div style={lbl}>TEAM NOTE (PARENT CAN&rsquo;T SEE)</div>
        <textarea value={noteText} onChange={(e) => onNote(e.target.value)} rows={3}
          style={{ border: `1px solid ${T.inputBorder}`, borderRadius: 10, padding: "8px 10px", fontSize: 13, color: T.textRow, fontFamily: "inherit", resize: "vertical", background: T.card, minHeight: 48 }} placeholder="Visible only to your team" />
        <span style={{ fontSize: 11, color: T.muted }}>{noteSaved ? "Saved" : "Autosaves"}</span>
      </section>
    </aside>
  );
}
