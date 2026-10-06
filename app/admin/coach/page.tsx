import { getCoachStats, getCoachThreads, getCoachThreadDetail, type CoachFilter } from "@/lib/admin/coach";
import { T } from "../crm-theme";
import { CoachAside, MarkReviewedButton } from "./CoachClient";

export const dynamic = "force-dynamic";

const FILTERS: { k: CoachFilter; label: string }[] = [
  { k: "needs_look", label: "Needs a look" }, { k: "all", label: "All" }, { k: "safety", label: "Safety" }, { k: "thumbsdown", label: "👎" },
];
const words = (s: string) => (s || "").trim().split(/\s+/).filter(Boolean).length;
const istTime = (d: Date) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).format(d).toLowerCase();
const rel = (d: Date) => {
  const h = (Date.now() - d.getTime()) / 3600_000;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`;
  if (h < 24) return `${Math.round(h)}h`;
  if (h < 48) return "Yesterday";
  return `${Math.round(h / 24)}d`;
};
const planLabel = (tier: string | null) => (tier === "tier2" ? "₹4,999 plan" : tier === "tier1" ? "₹2,999 plan" : "legacy plan");

export default async function AdminCoachPage({ searchParams }: { searchParams: Promise<{ u?: string; filter?: string }> }) {
  const sp = await searchParams;
  const filter = (["needs_look", "all", "safety", "thumbsdown"].includes(sp.filter ?? "") ? sp.filter : "needs_look") as CoachFilter;
  const [stats, threads] = await Promise.all([getCoachStats(), getCoachThreads(filter)]);
  const selectedId = sp.u || threads[0]?.userId || null;
  const detail = selectedId ? await getCoachThreadDetail(selectedId) : null;

  const tile = (value: string, label: string, color?: string) => (
    <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "12px 14px" }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: color ?? T.text }}>{value}</div>
      <div style={{ fontSize: 12.5, color: T.text2 }}>{label}</div>
    </div>
  );

  return (
    <main style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 14, minWidth: 0, color: T.text, height: "100vh", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <h1 style={{ margin: 0, fontFamily: T.FONT_HEAD, fontSize: 28, fontWeight: 600 }}>Coach chats</h1>
        <span style={{ fontSize: 13, color: T.text2 }}>Last 7 days</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12 }}>
        {tile(`${stats.paidUsed} / ${stats.totalPaid}`, "Paid parents who used it")}
        {tile(String(stats.parentMessages), "Parent messages")}
        {tile(stats.helpfulPct == null ? "—" : `${stats.helpfulPct}%`, `Helpful (${stats.thumbsUp} 👍 · ${stats.thumbsDown} 👎)`, T.successText)}
        {tile(String(stats.safetyFlags), "Safety flags", T.dangerText)}
        {tile(`₹${stats.costRupees}`, "AI cost")}
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "320px minmax(0, 1fr) 280px", gap: 14, minHeight: 0 }}>
        {/* list */}
        <section style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: 12, display: "flex", gap: 6, flexWrap: "wrap", fontSize: 12.5, fontWeight: 600, borderBottom: `1px solid ${T.divider}` }}>
            {FILTERS.map((f) => {
              const active = f.k === filter;
              return <a key={f.k} href={`/admin/coach?filter=${f.k}`} style={{ textDecoration: "none", borderRadius: 999, padding: "5px 10px", background: active ? T.navy : undefined, color: active ? "#fff" : T.navy, border: active ? "none" : `1px solid ${T.inputBorder}` }}>{f.label}{f.k === "needs_look" && threads.length ? ` ${threads.filter((t) => t.needsLook).length}` : ""}</a>;
            })}
          </div>
          <div style={{ overflowY: "auto" }}>
            {threads.length === 0 && <div style={{ padding: 16, color: T.text2, fontSize: 14 }}>No chats in this view.</div>}
            {threads.map((r) => {
              const sel = r.userId === selectedId;
              const bg = r.kind === "safety" ? T.dangerBg : r.kind === "down" ? T.readBg : sel ? T.sel : undefined;
              const bar = r.kind === "safety" ? T.dangerText : r.kind === "down" ? T.amber : undefined;
              const tag = r.kind === "safety" ? { t: `Safety · ${rel(r.lastAt)}`, c: T.dangerText } : r.kind === "down" ? { t: `👎 · ${rel(r.lastAt)}`, c: T.label } : { t: rel(r.lastAt), c: T.text2 };
              return (
                <a key={r.userId} href={`/admin/coach?filter=${filter}&u=${r.userId}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 3, background: bg, borderLeft: bar ? `3px solid ${bar}` : "3px solid transparent", borderBottom: `1px solid ${T.divider}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                      <b>{r.parent} · {r.child}</b>
                      <span style={{ fontSize: 12, color: tag.c, fontWeight: 700 }}>{tag.t}</span>
                    </div>
                    <div style={{ fontSize: 13, color: T.textRow, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.line}</div>
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        {/* thread */}
        <section style={{ background: T.thread, border: `1px solid ${T.cardBorder}`, borderRadius: 14, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          {!detail ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.text2 }}>Select a chat</div>
          ) : (
            <>
              <div style={{ background: T.card, padding: "12px 16px", borderBottom: `1px solid ${T.cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{detail.parent} · {detail.child}</div>
                  <div style={{ fontSize: 12.5, color: T.text2 }}>{(detail.archetype || "").replace(/^The /, "")} · {detail.ageBand} · Week {detail.week ?? "?"} Day {detail.day ?? "?"} · {planLabel(detail.tier)}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <a href={`/admin/lms-user/${detail.userId}/view/coach`} style={{ border: `1px solid ${T.inputBorder}`, background: T.card, borderRadius: 10, padding: "8px 12px", fontWeight: 600, fontSize: 13, textDecoration: "none", color: T.text }}>View their LMS</a>
                  <MarkReviewedButton userId={detail.userId} />
                </div>
              </div>
              <div style={{ flex: 1, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 9, fontSize: 13.5, lineHeight: 1.45, overflowY: "auto" }}>
                {detail.messages.map((m) => {
                  if (m.role === "parent") {
                    return (
                      <div key={m.id} style={{ alignSelf: "flex-end", maxWidth: "72%", background: T.navy, color: "#fff", borderRadius: "12px 12px 3px 12px", padding: "8px 11px" }}>
                        <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                        <div style={{ fontSize: 11, color: "#C9D6E6", textAlign: "right", marginTop: 3 }}>{istTime(m.createdAt)}{m.source && m.source !== "coach" ? ` · from ${m.source.replace(/_/g, " ")}` : ""}</div>
                      </div>
                    );
                  }
                  const safety = m.role === "safety";
                  return (
                    <div key={m.id} style={{ alignSelf: "flex-start", maxWidth: "72%", background: safety ? T.dangerBg : "#fff", color: safety ? T.dangerText : T.text, borderRadius: "12px 12px 12px 3px", padding: "8px 11px" }}>
                      <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                      <div style={{ fontSize: 11, color: T.text2, marginTop: 3 }}>
                        {istTime(m.createdAt)}
                        {!safety && ` · ${words(m.content)} words`}
                        {!safety && m.costPaise != null && ` · ₹${(m.costPaise / 100).toFixed(2)}`}
                        {m.feedback === 1 && <span style={{ color: T.successText, fontWeight: 700 }}> · 👍</span>}
                        {m.feedback === -1 && <span style={{ color: T.dangerText, fontWeight: 700 }}> · 👎{m.feedbackReason ? ` "${m.feedbackReason}"` : ""}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* aside */}
        {detail ? (
          <CoachAside userId={detail.userId} facts={detail.facts} note={detail.note}
            usage={{ usedToday: detail.usedToday, totalParent: detail.totalParent, daysDone: detail.daysDone, lastActive: detail.lastActive ? istTime(detail.lastActive) : null }} />
        ) : <div />}
      </div>
    </main>
  );
}
