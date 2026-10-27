"use client";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "../crm-theme";
import { BUCKET_LABEL, type Bucket, type ParentRow, type PanelCall, type PanelReport, type PanelAnswers } from "@/lib/admin/parents/types";

// Pill colour per bucket, reusing the theme tokens.
const PILL: Record<Bucket, { bg: string; fg: string }> = {
  all: { bg: T.greyBg, fg: T.greyText },
  new: { bg: T.readBg, fg: T.readText },
  no_pickup: { bg: T.greyBg, fg: T.greyText },
  callback: { bg: T.warmBg, fg: T.warmText },
  interested: { bg: T.successBg, fg: T.successText },
  trial_offered: { bg: T.warmBg, fg: T.warmText },
  trial_in_progress: { bg: T.warmBg, fg: T.warmText },
  purchased: { bg: T.successBg, fg: T.successText },
  other_course: { bg: T.greyBg, fg: T.greyText },
  not_interested: { bg: T.dangerBg, fg: T.dangerText },
  no_phone: { bg: T.greyBg, fg: T.greyText },
};

// Tabs we show (hide buckets with zero rows except All/New to keep the bar tidy).
const PRIMARY: Bucket[] = ["all", "new", "no_pickup", "callback", "interested", "trial_offered", "trial_in_progress", "purchased", "other_course", "not_interested", "no_phone"];

const GRID = "1.15fr 2.2fr 1fr 0.95fr 150px";

function WaGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.5 14.2c-.2.6-1.2 1.2-1.7 1.2-.4 0-1 .1-3.3-.9-2.8-1.2-4.5-4-4.6-4.2-.1-.2-1.1-1.4-1.1-2.7 0-1.3.7-1.9.9-2.2.2-.2.5-.3.6-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .6l-.4.6c-.2.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.2.1.4 0 .6-.1l.8-.9c.2-.3.4-.2.7-.1l1.8.9c.3.1.5.2.5.4.1.2.1.9-.1 1.5Z"/></svg>
  );
}

export function ParentsView({ rows, counts, commit }: { rows: ParentRow[]; counts: Record<Bucket, number>; commit: string }) {
  const [bucket, setBucket] = useState<Bucket>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<ParentRow | null>(null);
  const router = useRouter();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (bucket !== "all" && r.bucket !== bucket) return false;
      if (!needle) return true;
      return (
        r.parentName.toLowerCase().includes(needle) ||
        r.children.some((c) => c.childName.toLowerCase().includes(needle) || c.worry.toLowerCase().includes(needle))
      );
    });
    // Sort for the calling workflow: on follow-up buckets, soonest/overdue due first; everywhere else
    // (incl. "New" and "All") newest assessment first, so the most recent parents get called first.
    const FOLLOWUP_BUCKETS = new Set<Bucket>(["callback", "interested", "no_pickup"]);
    return list.sort((a, b) => {
      if (FOLLOWUP_BUCKETS.has(bucket)) {
        const am = a.followUpMs ?? Infinity, bm = b.followUpMs ?? Infinity;
        if (am !== bm) return am - bm;
      }
      return b.leadAtMs - a.leadAtMs;
    });
  }, [rows, bucket, q]);

  const dueCount = rows.filter((r) => r.followUpOverdue).length;
  const summary = `${counts.all} parents · ${counts.new} new${dueCount ? ` · ${dueCount} to call back today` : ""}`;

  const Pill = ({ b, label }: { b: Bucket; label: string }) => {
    const c = PILL[b];
    return <span style={{ background: c.bg, color: c.fg, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>;
  };

  return (
    <main style={{ padding: "22px 26px 40px", color: T.text, fontFamily: T.FONT_BODY }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.12em", color: T.label, textTransform: "uppercase" }}>PARENTS</div>
      <h1 style={{ fontFamily: T.FONT_HEAD, fontSize: 30, fontWeight: 600, margin: "4px 0 2px" }}>Every parent, one place</h1>
      <div style={{ color: T.text2, fontSize: 13.5, marginBottom: 14 }}>{summary}</div>

      {/* Bucket tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {PRIMARY.filter((b) => b === "all" || b === "new" || counts[b] > 0).map((b) => {
          const active = b === bucket;
          return (
            <button key={b} onClick={() => setBucket(b)} style={{
              border: `1px solid ${active ? T.navy : T.inputBorder}`, background: active ? T.navy : T.card,
              color: active ? "#fff" : T.textRow, borderRadius: 999, padding: "6px 13px", fontSize: 13,
              fontWeight: active ? 600 : 500, cursor: "pointer", fontFamily: T.FONT_BODY,
            }}>
              {BUCKET_LABEL[b]} <span style={{ opacity: 0.7, fontWeight: 600 }}>{counts[b]}</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <input
        value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search parent or child name…"
        style={{ width: 320, maxWidth: "100%", padding: "8px 12px", borderRadius: 9, border: `1px solid ${T.inputBorder}`, background: T.card, fontSize: 13.5, color: T.text, marginBottom: 14, fontFamily: T.FONT_BODY }}
      />

      {/* Desktop table */}
      <div className="aa-parents-desktop">
        <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 12, padding: "0 14px 8px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: T.muted, textTransform: "uppercase" }}>
          <div>Parent</div><div>Children</div><div>Status</div><div>Follow-up</div><div style={{ textAlign: "right" }}>Reach out</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((r) => (
            <div key={r.key} data-parent-row data-child-count={r.children.length} onClick={() => setSelected(r)} style={{ display: "grid", gridTemplateColumns: GRID, gap: 12, alignItems: "center", background: selected?.key === r.key ? T.sel : T.card, border: `1px solid ${selected?.key === r.key ? T.amber : T.cardBorder}`, borderRadius: 12, padding: "12px 14px", cursor: "pointer" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: T.text, fontSize: 14.5, display: "flex", alignItems: "center", gap: 6 }}>
                  {r.parentName}
                  {r.coachFlag && <span title="Coach flagged a call" style={{ background: T.warmBg, color: T.warmText, borderRadius: 999, padding: "1px 7px", fontSize: 10.5, fontWeight: 700 }}>📞 Coach</span>}
                </div>
                <div style={{ color: T.muted, fontSize: 12.5, marginTop: 2 }}>{r.phoneMasked ?? "no phone on file"}</div>
                <div style={{ color: T.muted, fontSize: 11.5, marginTop: 1 }}>Lead {r.leadAt}{r.tries ? ` · ${r.tries} ${r.tries === 1 ? "try" : "tries"}` : ""}</div>
              </div>
              <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {r.children.map((c) => (
                  <div key={c.assessmentId} style={{ lineHeight: 1.35 }}>
                    <div style={{ fontSize: 13.5, color: T.textRow }}>
                      <span style={{ fontWeight: 600 }}>{c.childName}</span>
                      <span style={{ color: T.muted }}> · {c.ageBand}{c.worry ? ` · ${c.worry}` : ""}</span>
                    </div>
                    <div style={{ fontSize: 12, color: T.text2 }}>{c.journey}</div>
                  </div>
                ))}
              </div>
              <div><Pill b={r.bucket} label={r.statusLabel} /></div>
              <div style={{ fontSize: 13, color: r.followUpOverdue ? T.warmText : T.text2, fontWeight: r.followUpOverdue ? 600 : 400 }}>
                {r.followUpAt ?? "—"}
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
                {r.telHref ? (
                  <a href={r.telHref} style={{ background: T.navy, color: "#fff", borderRadius: 8, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, textDecoration: "none" }}>Call</a>
                ) : (
                  <span style={{ background: T.greyBg, color: T.greyText, borderRadius: 8, padding: "7px 12px", fontSize: 12.5, fontWeight: 600 }}>No phone</span>
                )}
                {r.waHref && (
                  <a href={r.waHref} target="_blank" rel="noreferrer" aria-label="WhatsApp" style={{ background: T.wa, color: T.waText, borderRadius: 8, padding: "7px 10px", display: "inline-flex", alignItems: "center", textDecoration: "none" }}><WaGlyph /></a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="aa-parents-mobile" style={{ display: "none", flexDirection: "column", gap: 10 }}>
        {filtered.map((r) => (
          <div key={r.key} onClick={() => setSelected(r)} style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: "13px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
                  {r.parentName}
                  {r.coachFlag && <span style={{ background: T.warmBg, color: T.warmText, borderRadius: 999, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>📞</span>}
                </div>
                <div style={{ color: T.muted, fontSize: 12.5, marginTop: 2 }}>{r.phoneMasked ?? "no phone on file"}</div>
              </div>
              <Pill b={r.bucket} label={r.statusLabel} />
            </div>
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              {r.children.map((c) => (
                <div key={c.assessmentId} style={{ lineHeight: 1.35 }}>
                  <div style={{ fontSize: 13.5, color: T.textRow }}><span style={{ fontWeight: 600 }}>{c.childName}</span><span style={{ color: T.muted }}> · {c.ageBand}{c.worry ? ` · ${c.worry}` : ""}</span></div>
                  <div style={{ fontSize: 12, color: T.text2 }}>{c.journey}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
              {r.telHref ? <a href={r.telHref} style={{ flex: 1, textAlign: "center", background: T.navy, color: "#fff", borderRadius: 8, padding: "9px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Call</a> : <span style={{ flex: 1, textAlign: "center", background: T.greyBg, color: T.greyText, borderRadius: 8, padding: "9px", fontSize: 13, fontWeight: 600 }}>No phone</span>}
              {r.waHref && <a href={r.waHref} target="_blank" rel="noreferrer" style={{ background: T.wa, color: T.waText, borderRadius: 8, padding: "9px 14px", display: "inline-flex", alignItems: "center", textDecoration: "none" }}><WaGlyph /></a>}
            </div>
            {r.followUpAt && <div style={{ fontSize: 12, color: r.followUpOverdue ? T.warmText : T.text2, marginTop: 8, fontWeight: r.followUpOverdue ? 600 : 400 }}>Follow-up: {r.followUpAt}</div>}
          </div>
        ))}
      </div>

      {filtered.length === 0 && <div style={{ color: T.muted, fontSize: 13.5, padding: "20px 14px" }}>No parents in this bucket.</div>}

      <p style={{ color: T.muted, fontSize: 12, marginTop: 24 }}>Source: live · {commit} · phone shown masked; full number only in the Call/WhatsApp link</p>

      {selected && (
        <ParentPanel
          key={selected.key}
          row={selected}
          position={(() => { const i = filtered.findIndex((r) => r.key === selected.key); return { n: i + 1, total: filtered.length }; })()}
          onClose={() => setSelected(null)}
          onSavedNext={() => {
            const i = filtered.findIndex((r) => r.key === selected.key);
            const next = i >= 0 ? filtered[i + 1] : undefined;
            setSelected(next ?? null);
            router.refresh(); // re-pull server data so buckets/counts reflect the logged call
          }}
        />
      )}

      <style>{`
        @media (max-width: 767px) {
          .aa-parents-desktop { display: none !important; }
          .aa-parents-mobile { display: flex !important; }
        }
      `}</style>
    </main>
  );
}

// ── Side panel (matches docs/mockups/admin/1-Parents-calling-desk.png) ──────────────────────────────
// The 8 one-tap outcomes, in mockup order. Each maps to a call_log outcome and moves the parent to its
// bucket on save. "danger"/"purple" tint the text when unselected (per the mockup).
const OUTCOMES: { v: string; label: string; tone?: "danger" | "purple"; caret?: boolean }[] = [
  { v: "no_answer", label: "Did not pick up", tone: "danger" },
  { v: "callback", label: "Callback" },
  { v: "interested", label: "Interested" },
  { v: "not_interested", label: "Not interested" },
  { v: "trial_offered", label: "Trial offered" },
  { v: "trial_in_progress", label: "Trial in progress" },
  { v: "purchased", label: "Purchased" },
  { v: "other_course", label: "Other course", tone: "purple", caret: true },
];
const NEEDS_FOLLOWUP = new Set(["interested", "callback"]);
const OUTCOME_LABEL: Record<string, string> = {
  no_answer: "Did not pick up", busy: "Did not pick up", callback: "Callback", interested: "Interested",
  not_interested: "Not interested", do_not_call: "Not interested", trial_offered: "Trial offered",
  trial_in_progress: "Trial in progress", purchased: "Purchased", other_course: "Other course", wrong_number: "Wrong number",
};
const OUTCOME_BUCKET_C: Record<string, Bucket> = {
  no_answer: "no_pickup", busy: "no_pickup", callback: "callback", interested: "interested",
  not_interested: "not_interested", do_not_call: "not_interested", trial_offered: "trial_offered",
  trial_in_progress: "trial_in_progress", purchased: "purchased", other_course: "other_course", wrong_number: "no_phone",
};

function ParentPanel({ row, position, onClose, onSavedNext }: { row: ParentRow; position: { n: number; total: number }; onClose: () => void; onSavedNext: () => void }) {
  const [detail, setDetail] = useState<{ calls: PanelCall[]; reports: Record<string, PanelReport>; answers: PanelAnswers } | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [tab, setTab] = useState<"call" | "timeline" | "answers">("call");
  const [target, setTarget] = useState(row.children[0]?.assessmentId ?? "");
  const [outcome, setOutcome] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [followDate, setFollowDate] = useState("");
  const [followTime, setFollowTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const ids = row.children.map((c) => c.assessmentId).join(",");
    const sids = row.children.map((c) => c.sessionId).join(",");
    fetch(`/api/admin/parents/detail?ids=${encodeURIComponent(ids)}&sids=${encodeURIComponent(sids)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (live) setDetail(d); })
      .catch(() => { if (live) setLoadErr(true); });
    return () => { live = false; };
  }, [row]);

  const head = row.children[0];
  const targetChild = row.children.find((c) => c.assessmentId === target) ?? head;
  const childNames = row.children.map((c) => c.childName).join(" + ");

  const submit = async () => {
    if (!outcome) { setSaveMsg("Pick an outcome first."); return; }
    if (NEEDS_FOLLOWUP.has(outcome) && !followDate) { setSaveMsg("Pick a follow-up date for this outcome."); return; }
    setSaving(true); setSaveMsg(null);
    const followUpAt = followDate ? new Date(`${followDate}T${followTime || "10:00"}`).toISOString() : undefined;
    try {
      const res = await fetch("/api/admin/parents/call", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ assessmentId: target, outcome, note: note || undefined, nextSteps: nextSteps || undefined, followUpAt }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.ok) { onSavedNext(); }
      else {
        setSaveMsg(j.reason === "followup_required" ? "Pick a follow-up date for this outcome."
          : j.reason === "not_enabled" ? "Call logging isn’t enabled on this environment."
          : j.error || "Couldn’t log the call.");
        setSaving(false);
      }
    } catch { setSaveMsg("Network error — try again."); setSaving(false); }
  };

  const fmt = (s: string) => new Date(s).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const dur = (sec: number | null) => (sec == null ? "" : sec < 60 ? `${sec}s` : `${Math.round(sec / 60)} min`);
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: T.muted, textTransform: "uppercase", display: "block", marginBottom: 4 };
  const inputCss: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.inputBorder}`, background: "#fff", fontSize: 13.5, color: T.text, fontFamily: T.FONT_BODY };

  const OutcomePill = ({ o }: { o: string }) => {
    const c = PILL[OUTCOME_BUCKET_C[o] ?? "all"];
    return <span style={{ background: c.bg, color: c.fg, borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{OUTCOME_LABEL[o] ?? o}</span>;
  };

  const TabBtn = ({ id, children }: { id: "call" | "timeline" | "answers"; children: React.ReactNode }) => (
    <button onClick={() => setTab(id)} style={{ border: "none", background: "none", padding: "6px 2px", marginRight: 14, fontSize: 13, fontWeight: tab === id ? 700 : 500, color: tab === id ? T.navy : T.text2, borderBottom: tab === id ? `2px solid ${T.navy}` : "2px solid transparent", cursor: "pointer", fontFamily: T.FONT_BODY }}>{children}</button>
  );

  const callCount = detail?.calls.length ?? 0;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,25,35,0.28)", zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div data-parent-panel onClick={(e) => e.stopPropagation()} style={{ width: 460, maxWidth: "100%", height: "100%", overflowY: "auto", background: T.page, borderLeft: `1px solid ${T.cardBorder}`, boxShadow: "-8px 0 24px rgba(0,0,0,0.12)", padding: "18px 22px 48px" }}>
        {/* Header: parent · parent of child, age band ; archetype · worry · assessed */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div>
            <div style={{ fontFamily: T.FONT_HEAD, fontSize: 22, fontWeight: 600, lineHeight: 1.2 }}>{row.parentName} <span style={{ fontFamily: T.FONT_BODY, fontSize: 13, fontWeight: 400, color: T.text2 }}>· parent of {childNames}{head ? `, ${head.ageBand}` : ""}</span></div>
            {head && (head.archetype || head.worry) && (
              <div style={{ color: T.muted, fontSize: 12.5, marginTop: 3 }}>
                {[head.archetype, head.worry ? `worry: ${head.worry}` : "", head.assessedAt ? `assessed ${fmt(head.assessedAt)}` : ""].filter(Boolean).join(" · ")}
              </div>
            )}
            <div style={{ color: T.muted, fontSize: 11.5, marginTop: 2 }}>Parent {position.n} of {position.total} in this tab</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", fontSize: 22, color: T.muted, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* Action row */}
        <div style={{ display: "flex", gap: 8, margin: "12px 0 10px", flexWrap: "wrap" }}>
          {row.telHref ? <a href={row.telHref} style={{ background: T.navy, color: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Call {row.phoneMasked}</a>
            : <span style={{ background: T.greyBg, color: T.greyText, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600 }}>No phone on file</span>}
          {row.waHref && <a href={row.waHref} target="_blank" rel="noreferrer" style={{ background: T.wa, color: T.waText, borderRadius: 8, padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, textDecoration: "none" }}><WaGlyph /> WhatsApp</a>}
          <span title="Coming soon" style={{ background: T.greyBg, color: T.muted, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "not-allowed", display: "inline-flex", alignItems: "center", gap: 6 }}>Follow-up script <span style={{ fontSize: 10.5, fontWeight: 700, background: "#E6DECF", color: T.label, borderRadius: 999, padding: "0 6px" }}>coming soon</span></span>
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: `1px solid ${T.divider}`, marginBottom: 8, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
          <TabBtn id="call">Call &amp; notes</TabBtn>
          <TabBtn id="timeline">Timeline</TabBtn>
          <TabBtn id="answers">Answers</TabBtn>
          <a href={`/report/${targetChild?.sessionId}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 500, color: T.navy, textDecoration: "none", marginRight: 14 }}>Report ↗</a>
          <a href={`/simplified/roadmap?session=${targetChild?.sessionId}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 500, color: T.navy, textDecoration: "none" }}>Roadmap ↗</a>
        </div>
        <div style={{ fontSize: 11.5, color: T.muted, background: T.chipFill, borderRadius: 8, padding: "6px 10px", marginBottom: 14 }}>Admin view: opening these never adds events to {row.parentName}’s timeline.</div>

        {/* Child selector (multi-child) */}
        {row.children.length > 1 && (
          <div style={{ marginBottom: 12 }}>
            <label style={label}>Which child</label>
            <select value={target} onChange={(e) => setTarget(e.target.value)} style={inputCss}>
              {row.children.map((c) => <option key={c.assessmentId} value={c.assessmentId}>{c.childName} · {c.ageBand}</option>)}
            </select>
          </div>
        )}

        {tab === "call" && (
          <>
            <div style={{ ...label, marginBottom: 8 }}>Call {callCount + 1} · outcome → moves to bucket</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
              {OUTCOMES.map((o) => {
                const sel = outcome === o.v;
                const tint = o.tone === "danger" ? T.dangerText : o.tone === "purple" ? "#7A4FB0" : T.textRow;
                return (
                  <button key={o.v} onClick={() => setOutcome(o.v)} style={{
                    border: `1px solid ${sel ? T.navy : T.inputBorder}`, background: sel ? T.navy : T.card,
                    color: sel ? "#fff" : tint, borderRadius: 9, padding: "7px 12px", fontSize: 12.5, fontWeight: 600,
                    cursor: "pointer", fontFamily: T.FONT_BODY,
                  }}>{sel ? "✓ " : ""}{o.label}{o.caret ? " ▾" : ""}</button>
                );
              })}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>What happened on this call</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} style={{ ...inputCss, resize: "vertical" }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={label}>Next steps</label>
              <input value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} style={inputCss} />
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 14, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 120px" }}>
                <label style={label}>Follow-up{outcome && NEEDS_FOLLOWUP.has(outcome) ? " (required)" : ""}</label>
                <input type="date" value={followDate} onChange={(e) => setFollowDate(e.target.value)} style={inputCss} />
              </div>
              <div style={{ flex: "1 1 100px" }}>
                <label style={label}>&nbsp;</label>
                <input type="time" value={followTime} onChange={(e) => setFollowTime(e.target.value)} style={inputCss} />
              </div>
              <button onClick={submit} disabled={saving} style={{ background: T.navy, color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13.5, fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1, whiteSpace: "nowrap" }}>
                {saving ? "Saving…" : "Save & next →"}
              </button>
            </div>
            {saveMsg && <div style={{ fontSize: 12.5, color: T.dangerText, marginBottom: 12 }}>{saveMsg}</div>}

            {/* Call log */}
            <div style={{ ...label, marginBottom: 8 }}>Call log · newest first</div>
            {loadErr && <div style={{ color: T.dangerText, fontSize: 12.5 }}>Couldn’t load call history.</div>}
            {!loadErr && !detail && <div style={{ color: T.muted, fontSize: 12.5 }}>Loading…</div>}
            {detail && detail.calls.length === 0 && <div style={{ color: T.muted, fontSize: 12.5 }}>No calls logged yet.</div>}
            {detail?.calls.map((cl, i) => (
              <div key={cl.id} style={{ borderLeft: `3px solid ${T.amber}`, paddingLeft: 11, marginBottom: 11 }}>
                <div style={{ fontSize: 13, color: T.textRow, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600 }}>Call {callCount - i}</span>
                  <span style={{ color: T.muted, fontSize: 12 }}>· {fmt(cl.created_at)}{dur(cl.duration_sec) ? ` · ${dur(cl.duration_sec)}` : ""}</span>
                  <OutcomePill o={cl.outcome} />
                </div>
                {cl.notes && <div style={{ fontSize: 12.5, color: T.text2, marginTop: 2 }}><span style={{ color: T.muted }}>Note: </span>{cl.notes}</div>}
                {cl.next_steps && <div style={{ fontSize: 12.5, color: T.text2, marginTop: 2 }}><span style={{ color: T.muted }}>Next: </span>{cl.next_steps}</div>}
                {cl.follow_up_at && <div style={{ fontSize: 12, color: T.warmText, marginTop: 2 }}>Follow-up: {fmt(cl.follow_up_at)}</div>}
              </div>
            ))}
          </>
        )}

        {tab === "timeline" && (
          <div>
            {(() => {
              const events: { t: string; text: string; sub?: string }[] = [];
              for (const c of row.children) {
                events.push({ t: c.assessedAt, text: `Assessed · ${c.childName}${c.archetype ? ` · ${c.archetype}` : ""}`, sub: c.journey });
              }
              for (const cl of detail?.calls ?? []) {
                events.push({ t: cl.created_at, text: OUTCOME_LABEL[cl.outcome] ?? cl.outcome, sub: cl.notes ?? undefined });
              }
              events.sort((a, b) => +new Date(b.t) - +new Date(a.t));
              return events.length ? events.map((e, i) => (
                <div key={i} style={{ borderLeft: `3px solid ${T.cardBorder}`, paddingLeft: 11, marginBottom: 11 }}>
                  <div style={{ fontSize: 13, color: T.textRow }}><span style={{ fontWeight: 600 }}>{e.text}</span> <span style={{ color: T.muted, fontSize: 12 }}>· {fmt(e.t)}</span></div>
                  {e.sub && <div style={{ fontSize: 12.5, color: T.text2, marginTop: 2 }}>{e.sub}</div>}
                </div>
              )) : <div style={{ color: T.muted, fontSize: 12.5 }}>No timeline yet.</div>;
            })()}
          </div>
        )}

        {tab === "answers" && (
          <div>
            {!detail && <div style={{ color: T.muted, fontSize: 12.5 }}>Loading…</div>}
            {detail && (detail.answers[target]?.length ? (
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontSize: 12.5 }}>
                {detail.answers[target].map((a, i) => (
                  <Fragment key={i}>
                    <div style={{ color: T.muted, fontWeight: 600 }}>{a.label}</div>
                    <div style={{ color: T.textRow }}>{a.value}</div>
                  </Fragment>
                ))}
              </div>
            ) : <div style={{ color: T.muted, fontSize: 12.5 }}>No stored answers for this child.</div>)}
          </div>
        )}
      </div>
    </div>
  );
}
