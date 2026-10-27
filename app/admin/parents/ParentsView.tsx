"use client";
import { useEffect, useMemo, useState } from "react";
import { T } from "../crm-theme";
import { BUCKET_LABEL, type Bucket, type ParentRow, type PanelCall, type PanelReport } from "@/lib/admin/parents/types";

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
  const [refreshKey, setRefreshKey] = useState(0);

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
          key={`${selected.key}:${refreshKey}`}
          row={selected}
          onClose={() => setSelected(null)}
          onLogged={() => setRefreshKey((k) => k + 1)}
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

// ── Side panel ────────────────────────────────────────────────────────────────────────────────────
const OUTCOME_OPTIONS: { v: string; label: string }[] = [
  { v: "interested", label: "Interested (needs follow-up)" },
  { v: "callback", label: "Call back later (needs follow-up)" },
  { v: "trial_offered", label: "Trial offered" },
  { v: "not_interested", label: "Not interested" },
  { v: "do_not_call", label: "Do not call" },
  { v: "no_answer", label: "No answer" },
  { v: "busy", label: "Busy" },
  { v: "wrong_number", label: "Wrong number" },
  { v: "other_course", label: "Doing another course" },
  { v: "purchased", label: "Purchased" },
];
const OBJECTIONS = [
  { v: "", label: "—" }, { v: "price", label: "Price" }, { v: "time", label: "No time" },
  { v: "ask_spouse", label: "Ask spouse" }, { v: "will_it_work", label: "Will it work?" },
  { v: "later", label: "Maybe later" }, { v: "other", label: "Other" },
];
const NEEDS_FOLLOWUP = new Set(["interested", "callback"]);

function ParentPanel({ row, onClose, onLogged }: { row: ParentRow; onClose: () => void; onLogged: () => void }) {
  const [detail, setDetail] = useState<{ calls: PanelCall[]; reports: Record<string, PanelReport> } | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [target, setTarget] = useState(row.children[0]?.assessmentId ?? "");
  const [outcome, setOutcome] = useState("interested");
  const [note, setNote] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [objection, setObjection] = useState("");
  const [followUp, setFollowUp] = useState("");
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

  const submit = async () => {
    setSaving(true); setSaveMsg(null);
    try {
      const res = await fetch("/api/admin/parents/call", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assessmentId: target, outcome,
          note: note || undefined, nextSteps: nextSteps || undefined,
          objection: objection || undefined,
          followUpAt: followUp ? new Date(followUp).toISOString() : undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.ok) {
        setSaveMsg("Call logged ✓"); setNote(""); setNextSteps(""); setObjection(""); setFollowUp("");
        onLogged();
      } else {
        const reason = j.reason === "followup_required" ? "Pick a follow-up date for this outcome."
          : j.reason === "not_enabled" ? "Call logging isn’t enabled on this environment."
          : j.error || "Couldn’t log the call.";
        setSaveMsg(reason);
      }
    } catch { setSaveMsg("Network error — try again."); }
    finally { setSaving(false); }
  };

  const fmt = (s: string) => new Date(s).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const outcomeLabel = (v: string) => OUTCOME_OPTIONS.find((o) => o.v === v)?.label.replace(/ \(needs follow-up\)/, "") ?? v;
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: T.muted, textTransform: "uppercase", display: "block", marginBottom: 4 };
  const inputCss: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.inputBorder}`, background: "#fff", fontSize: 13.5, color: T.text, fontFamily: T.FONT_BODY };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,25,35,0.28)", zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div data-parent-panel onClick={(e) => e.stopPropagation()} style={{ width: 440, maxWidth: "100%", height: "100%", overflowY: "auto", background: T.page, borderLeft: `1px solid ${T.cardBorder}`, boxShadow: "-8px 0 24px rgba(0,0,0,0.12)", padding: "18px 20px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div>
            <div style={{ fontFamily: T.FONT_HEAD, fontSize: 22, fontWeight: 600 }}>{row.parentName}</div>
            <div style={{ color: T.muted, fontSize: 12.5, marginTop: 2 }}>{row.phoneMasked ?? "no phone on file"}</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", fontSize: 22, color: T.muted, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: "flex", gap: 8, margin: "12px 0 6px" }}>
          {row.telHref ? <a href={row.telHref} style={{ background: T.navy, color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Call</a>
            : <span style={{ background: T.greyBg, color: T.greyText, borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600 }}>No phone on file</span>}
          {row.waHref && <a href={row.waHref} target="_blank" rel="noreferrer" style={{ background: T.wa, color: T.waText, borderRadius: 8, padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, textDecoration: "none" }}><WaGlyph /> WhatsApp</a>}
        </div>

        {/* Children + report talking points */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", color: T.label, textTransform: "uppercase", marginBottom: 8 }}>Children</div>
          {row.children.map((c) => {
            const rep = detail?.reports[c.sessionId];
            return (
              <div key={c.assessmentId} style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: "11px 13px", marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{c.childName} <span style={{ color: T.muted, fontWeight: 400 }}>· {c.ageBand}{c.worry ? ` · ${c.worry}` : ""}</span></div>
                <div style={{ fontSize: 12, color: T.text2, marginTop: 2 }}>{c.journey}</div>
                {rep?.worry && <div style={{ fontSize: 12.5, color: T.textRow, marginTop: 7, lineHeight: 1.4 }}><span style={{ color: T.muted }}>What they saw: </span>{rep.worry}</div>}
                {rep?.hardPart && <div style={{ fontSize: 12.5, color: T.textRow, marginTop: 4, lineHeight: 1.4 }}><span style={{ color: T.muted }}>Hard part: </span>{rep.hardPart}</div>}
                {rep?.tonightStep && <div style={{ fontSize: 12.5, color: T.textRow, marginTop: 4, lineHeight: 1.4 }}><span style={{ color: T.muted }}>Tonight: </span>{rep.tonightStep}</div>}
                <a href={`/report/${c.sessionId}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ display: "inline-block", marginTop: 8, fontSize: 12.5, color: T.navy, fontWeight: 600, textDecoration: "none" }}>Open report ↗</a>
              </div>
            );
          })}
        </div>

        {/* Call history */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", color: T.label, textTransform: "uppercase", marginBottom: 8 }}>Call history</div>
          {loadErr && <div style={{ color: T.dangerText, fontSize: 12.5 }}>Couldn’t load call history.</div>}
          {!loadErr && !detail && <div style={{ color: T.muted, fontSize: 12.5 }}>Loading…</div>}
          {detail && detail.calls.length === 0 && <div style={{ color: T.muted, fontSize: 12.5 }}>No calls logged yet.</div>}
          {detail?.calls.map((cl) => (
            <div key={cl.id} style={{ borderLeft: `3px solid ${T.amber}`, paddingLeft: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.textRow }}>{outcomeLabel(cl.outcome)} <span style={{ color: T.muted, fontWeight: 400, fontSize: 12 }}>· {fmt(cl.created_at)}{cl.called_by ? ` · ${cl.called_by}` : ""}</span></div>
              {cl.notes && <div style={{ fontSize: 12.5, color: T.text2, marginTop: 2 }}>{cl.notes}</div>}
              {cl.next_steps && <div style={{ fontSize: 12.5, color: T.text2, marginTop: 2 }}><span style={{ color: T.muted }}>Next: </span>{cl.next_steps}</div>}
              {cl.follow_up_at && <div style={{ fontSize: 12, color: T.warmText, marginTop: 2 }}>Follow-up: {fmt(cl.follow_up_at)}</div>}
            </div>
          ))}
        </div>

        {/* Log a call */}
        <div style={{ marginTop: 16, background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: "13px 14px" }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", color: T.label, textTransform: "uppercase", marginBottom: 10 }}>Log a call</div>
          {row.children.length > 1 && (
            <div style={{ marginBottom: 10 }}>
              <label style={label}>About which child</label>
              <select value={target} onChange={(e) => setTarget(e.target.value)} style={inputCss}>
                {row.children.map((c) => <option key={c.assessmentId} value={c.assessmentId}>{c.childName}</option>)}
              </select>
            </div>
          )}
          <div style={{ marginBottom: 10 }}>
            <label style={label}>Outcome</label>
            <select value={outcome} onChange={(e) => setOutcome(e.target.value)} style={inputCss}>
              {OUTCOME_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </div>
          {NEEDS_FOLLOWUP.has(outcome) && (
            <div style={{ marginBottom: 10 }}>
              <label style={label}>Follow-up (required)</label>
              <input type="datetime-local" value={followUp} onChange={(e) => setFollowUp(e.target.value)} style={inputCss} />
            </div>
          )}
          <div style={{ marginBottom: 10 }}>
            <label style={label}>Objection (optional)</label>
            <select value={objection} onChange={(e) => setObjection(e.target.value)} style={inputCss}>
              {OBJECTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={label}>Note (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} style={{ ...inputCss, resize: "vertical" }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={label}>Next steps (optional)</label>
            <input value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} style={inputCss} />
          </div>
          <button onClick={submit} disabled={saving || !target} style={{ background: T.navy, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13.5, fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "Save call"}
          </button>
          {saveMsg && <span style={{ marginLeft: 12, fontSize: 12.5, color: saveMsg.includes("✓") ? T.successText : T.dangerText }}>{saveMsg}</span>}
        </div>
      </div>
    </div>
  );
}
