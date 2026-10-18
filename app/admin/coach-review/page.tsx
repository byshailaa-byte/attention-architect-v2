// Weekly Coach review — 15 minutes a week: who needs a call, which replies were flagged or
// thumbs-downed, and pending gold examples to approve. Admin-authed upstream (/admin/* Basic Auth).
import { openCallRequests, flaggedReplies, pendingGold } from "@/lib/admin/coach-review";
import { CallActions, GoldActions, BetterReply } from "./ReviewActions";

export const dynamic = "force-dynamic";

const card = { background: "#fff", border: "1px solid #E7E0D2", borderRadius: 12, padding: "14px 16px", marginBottom: 12 } as const;
const h2 = { fontSize: 16, fontWeight: 700, margin: "22px 0 10px", color: "#1E3A5F" } as const;
const when = (s: string | null) => (s ? new Date(s).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "");

export default async function CoachReviewPage() {
  const [calls, flagged, gold] = await Promise.all([openCallRequests(), flaggedReplies(), pendingGold()]);

  return (
    <div style={{ padding: "22px 26px", maxWidth: 860, fontFamily: "var(--font-figtree), system-ui, sans-serif", color: "#2E3A4B" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1E3A5F", fontFamily: "var(--font-newsreader), Georgia, serif" }}>Coach — weekly review</h1>
      <p style={{ fontSize: 13.5, color: "#5B6577" }}>Needs-a-call queue, flagged / low-rated replies, and pending gold examples to approve.</p>

      <h2 style={h2}>Needs a call ({calls.length})</h2>
      {calls.length === 0 && <p style={{ color: "#5B6577", fontSize: 14 }}>Nothing open. 🎉</p>}
      {calls.map((c) => (
        <div key={c.id} style={{ ...card, borderLeft: `4px solid ${c.urgency === "urgent" ? "#A23A2E" : "#E8A33D"}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
            <strong>{c.urgency === "urgent" ? "🔴 URGENT" : "Normal"} · {c.child || `${c.kind} ${c.subjectId.slice(0, 8)}`}</strong>
            <span style={{ fontSize: 12, color: "#5B6577" }}>{c.source} · {when(c.createdAt)}</span>
          </div>
          <p style={{ margin: "6px 0 10px", fontSize: 14 }}>{c.reason || "(no reason)"}</p>
          <CallActions id={c.id} />
        </div>
      ))}

      <h2 style={h2}>Flagged &amp; low-rated replies ({flagged.length})</h2>
      {flagged.length === 0 && <p style={{ color: "#5B6577", fontSize: 14 }}>None.</p>}
      {flagged.map((f) => (
        <div key={f.id} style={card}>
          <div style={{ fontSize: 12, color: "#5B6577", marginBottom: 6 }}>
            {f.kind} · day {f.day ?? "?"} · {f.flaggedAt ? `flagged ${when(f.flaggedAt)}` : ""} {f.feedback && f.feedback < 0 ? "· 👎 parent" : ""}
          </div>
          {f.note && <div style={{ fontSize: 13, color: "#8C3F22", marginBottom: 6 }}>Note: {f.note}</div>}
          <div style={{ fontSize: 14, whiteSpace: "pre-wrap", background: "#FBF6EE", borderRadius: 8, padding: "8px 10px" }}>{f.content}</div>
          <div style={{ marginTop: 8 }}><BetterReply messageId={f.id} /></div>
        </div>
      ))}

      <h2 style={h2}>Pending gold examples ({gold.length})</h2>
      {gold.length === 0 && <p style={{ color: "#5B6577", fontSize: 14 }}>None waiting.</p>}
      {gold.map((g) => (
        <div key={g.id} style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
            <strong>{g.title}</strong>
            <span style={{ fontSize: 12, color: "#5B6577" }}>{g.createdBy} · {when(g.createdAt)}</span>
          </div>
          <div style={{ fontSize: 12.5, color: "#5B6577", margin: "4px 0 8px" }}>{g.situation} {g.tags?.length ? `· ${g.tags.join(", ")}` : ""}</div>
          <div style={{ background: "#FBF6EE", borderRadius: 8, padding: "8px 10px", fontSize: 13.5 }}>
            {g.conversation.map((t, i) => (
              <div key={i} style={{ marginBottom: 4 }}><strong>{t.role === "coach" ? "Coach" : "Parent"}:</strong> {t.text}</div>
            ))}
          </div>
          <div style={{ marginTop: 8 }}><GoldActions id={g.id} /></div>
        </div>
      ))}
    </div>
  );
}
