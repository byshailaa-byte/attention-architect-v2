"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "../crm-theme";
import { BUCKET_LABEL, type Bucket, type ParentRow, type PanelCall, type PanelReport, type PanelAnswers } from "@/lib/admin/parents/types";
import type { CallScript } from "@/lib/call-script/types";
import type { TimelineResult } from "@/lib/admin/parents/timeline-types";

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

export function ParentsView({ rows, counts, commit, showInternal }: { rows: ParentRow[]; counts: Record<Bucket, number>; commit: string; showInternal: boolean }) {
  const [bucket, setBucket] = useState<Bucket>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<ParentRow | null>(null);
  const router = useRouter();

  const toggleInternal = () => router.push(showInternal ? "/admin/parents" : "/admin/parents?internal=1");

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

      {/* Search + show-internal toggle */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search parent or child name…"
          style={{ width: 320, maxWidth: "100%", padding: "8px 12px", borderRadius: 9, border: `1px solid ${T.inputBorder}`, background: T.card, fontSize: 13.5, color: T.text, fontFamily: T.FONT_BODY }}
        />
        <label style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: T.text2, cursor: "pointer", userSelect: "none" }}>
          <input type="checkbox" checked={showInternal} onChange={toggleInternal} style={{ cursor: "pointer" }} />
          Show internal (test accounts)
        </label>
      </div>

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
                  {r.isInternal && <span title="Test / internal account" style={{ background: T.greyBg, color: T.greyText, borderRadius: 999, padding: "1px 7px", fontSize: 10.5, fontWeight: 700 }}>internal</span>}
                </div>
                <div style={{ color: T.muted, fontSize: 12.5, marginTop: 2 }}>{r.phoneDisplay ? <span data-phone>{r.phoneDisplay}</span> : "no phone on file"}</div>
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
                  {r.isInternal && <span style={{ background: T.greyBg, color: T.greyText, borderRadius: 999, padding: "1px 7px", fontSize: 9.5, fontWeight: 700 }}>internal</span>}
                </div>
                <div style={{ color: T.muted, fontSize: 12.5, marginTop: 2 }}>{r.phoneDisplay ? <span data-phone>{r.phoneDisplay}</span> : "no phone on file"}</div>
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
          onListRefresh={() => router.refresh()} // re-pull server data so buckets/counts reflect the saved call
          onNext={() => {
            const i = filtered.findIndex((r) => r.key === selected.key);
            const next = i >= 0 ? filtered[i + 1] : filtered[0];
            setSelected(next ?? null);
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

export function ParentPanel({ row, position, onClose, onListRefresh, onNext }: { row: ParentRow; position: { n: number; total: number }; onClose: () => void; onListRefresh: () => void; onNext: () => void }) {
  const [detail, setDetail] = useState<{ calls: PanelCall[]; reports: Record<string, PanelReport>; answers: PanelAnswers } | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [tab, setTab] = useState<"call" | "script" | "timeline" | "answers">("call");
  const [target, setTarget] = useState(row.children[0]?.assessmentId ?? "");
  const [outcome, setOutcome] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [followDate, setFollowDate] = useState("");
  const [followTime, setFollowTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [confirmNext, setConfirmNext] = useState(false);

  useEffect(() => {
    let live = true;
    const ids = row.children.map((c) => c.assessmentId).join(",");
    const sids = row.children.map((c) => c.sessionId).join(",");
    fetch(`/api/admin/parents/detail?ids=${encodeURIComponent(ids)}&sids=${encodeURIComponent(sids)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (live) setDetail(d); })
      .catch(() => { if (live) setLoadErr(true); });
    return () => { live = false; };
  }, [row, reloadTick]);

  const head = row.children[0];
  const targetChild = row.children.find((c) => c.assessmentId === target) ?? head;
  const childNames = row.children.map((c) => c.childName).join(" + ");

  // Coach trial state for the selected child (reuses the existing trial system via its status API).
  type TrialStatus = { enabled: boolean; paid: boolean; alreadyTrialed: boolean; trialId: string | null; trialLink: string | null; previewId: string | null; previewUrl: string | null; approved: boolean; chip: string; view: { day: number; status: string; endsAt: string; locked: boolean } | null };
  const [trial, setTrial] = useState<TrialStatus | null>(null);
  const [trialBusy, setTrialBusy] = useState(false);
  const [trialMsg, setTrialMsg] = useState<string | null>(null);
  const [offer, setOffer] = useState<{ link: string; msg: string; already: boolean } | null>(null);
  const [confirmTrial, setConfirmTrial] = useState<null | "offer" | "resend">(null);
  const [copied, setCopied] = useState(false);
  // Call script
  const [sLang, setSLang] = useState<"en" | "hinglish">("en");
  const [scriptData, setScriptData] = useState<{ script: CallScript; costPaise: number; source: string; stale: boolean; callNo: number; kind: string } | null>(null);
  const [sLoading, setSLoading] = useState(false);
  const [sErr, setSErr] = useState(false);
  const [openSec, setOpenSec] = useState<Record<number, boolean>>({});

  const fetchScript = async (lang: "en" | "hinglish", regen = false) => {
    const sid = targetChild?.sessionId; if (!sid) return;
    setSLoading(true); setSErr(false);
    try {
      const res = await fetch(`/api/admin/parents/script?sessionId=${encodeURIComponent(sid)}&lang=${lang}`, regen ? { method: "POST" } : undefined);
      if (!res.ok) throw new Error("x");
      setScriptData(await res.json());
    } catch { setSErr(true); } finally { setSLoading(false); }
  };
  useEffect(() => { if (tab === "script") { setScriptData(null); fetchScript(sLang); } /* eslint-disable-next-line */ }, [tab, sLang, targetChild?.sessionId]);
  // Background-generate the default (English) script the moment the panel opens, so the Script tab is
  // instant when the caller needs it (cached per parent/caller; repeated opens don't re-spend).
  useEffect(() => {
    const sid = row.children[0]?.sessionId; if (!sid) return;
    fetch(`/api/admin/parents/script?sessionId=${encodeURIComponent(sid)}&lang=en`).catch(() => {});
  }, [row]);

  // Timeline (merged multi-source feed)
  const [tl, setTl] = useState<(TimelineResult & { ms?: number }) | null>(null);
  const [tlLoading, setTlLoading] = useState(false);
  const [tlFilter, setTlFilter] = useState<"all" | "site" | "call" | "message" | "coach">("all");
  useEffect(() => {
    if (tab !== "timeline") return;
    setTl(null); setTlLoading(true); setTlFilter("all");
    const sids = row.children.map((c) => c.sessionId).join(",");
    fetch(`/api/admin/parents/timeline?sids=${encodeURIComponent(sids)}`)
      .then((r) => (r.ok ? r.json() : null)).then((d) => setTl(d)).catch(() => {}).finally(() => setTlLoading(false));
  }, [tab, row]);

  const refetchTrial = async () => {
    const sid = targetChild?.sessionId;
    if (!sid) return;
    // Retry a few times — the status API touches the DB and can hit a transient Neon blip.
    for (let i = 0; i < 4; i++) {
      try {
        const r = await fetch(`/api/admin/coach-trial/status?sessionId=${encodeURIComponent(sid)}`);
        if (r.ok) { const d = await r.json(); setTrial(d); return; }
      } catch { /* retry */ }
      await new Promise((res) => setTimeout(res, 400 * (i + 1)));
    }
  };
  useEffect(() => { setTrial(null); refetchTrial(); /* eslint-disable-next-line */ }, [targetChild?.sessionId]);

  const previewCoach = async () => {
    setTrialMsg(null);
    try {
      const res = await fetch("/api/admin/coach-preview/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId: targetChild.sessionId }) });
      const j = await res.json().catch(() => ({}));
      if (j.previewUrl) window.open(j.previewUrl, "_blank");
      else setTrialMsg(j.error === "no_report" ? "Report not ready for a preview yet." : "Couldn’t open the preview.");
    } catch { setTrialMsg("Network error — try again."); }
  };
  const OFFER_ERR: Record<string, string> = {
    already_paid: "Already purchased.", no_report: "Report isn’t ready for a trial yet.",
    no_contact: "No phone or email on file to send the link.", disabled: "Coach trials are turned off.",
    bad_session: "Can’t identify this child’s session.",
  };
  const doOfferTrial = async () => {
    setConfirmTrial(null);
    setTrialBusy(true); setTrialMsg(null);
    try {
      const res = await fetch("/api/admin/parents/offer-trial", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId: targetChild.sessionId, assessmentId: target }) });
      const j = await res.json().catch(() => ({}));
      if (j.ok) { setOffer({ link: j.trialLink, msg: j.waMessage, already: !!j.alreadyActive }); refetchTrial(); onListRefresh(); }
      else setTrialMsg(OFFER_ERR[j.error] ?? "Couldn’t offer the trial.");
    } catch { setTrialMsg("Network error — try again."); }
    finally { setTrialBusy(false); }
  };
  const trialStateText = (): string | null => {
    if (!trial || !trial.enabled) return null;
    if (trial.paid) return "Purchased";
    if (!trial.alreadyTrialed) return trial.previewId ? "Previewed (sandbox) — not offered" : "Not offered";
    const v = trial.view;
    if (v?.status === "converted") return "Trial → purchased";
    if (v && (v.status === "ended" || v.locked)) return `Trial ended → ${trial.paid ? "purchased" : "not purchased"}`;
    if (v) return `Day ${v.day} of 4${trial.approved ? " · offered" : ""}`;
    return "Trial active";
  };

  const dirty = outcome !== null || !!note.trim() || !!nextSteps.trim() || !!followDate || !!followTime;
  const clearForm = () => { setOutcome(null); setNote(""); setNextSteps(""); setFollowDate(""); setFollowTime(""); };

  // Save the call: stays on this parent, new entry appears at the top of the call log, list refreshes.
  const save = async (): Promise<boolean> => {
    if (!outcome) { setSaveMsg("Pick an outcome first."); return false; }
    if (NEEDS_FOLLOWUP.has(outcome) && !followDate) { setSaveMsg("Pick a follow-up date for this outcome."); return false; }
    setSaving(true); setSaveMsg(null);
    const followUpAt = followDate ? new Date(`${followDate}T${followTime || "10:00"}`).toISOString() : undefined;
    try {
      const res = await fetch("/api/admin/parents/call", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ assessmentId: target, outcome, note: note || undefined, nextSteps: nextSteps || undefined, followUpAt }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.ok) {
        clearForm(); setSaveMsg("Saved ✓");
        setReloadTick((t) => t + 1); // refetch call log → new entry at top
        onListRefresh();             // refresh list counts/buckets
        setSaving(false);
        return true;
      }
      setSaveMsg(j.reason === "followup_required" ? "Pick a follow-up date for this outcome."
        : j.reason === "not_enabled" ? "Call logging isn’t enabled on this environment."
        : j.error || "Couldn’t log the call.");
      setSaving(false);
      return false;
    } catch { setSaveMsg("Network error — try again."); setSaving(false); return false; }
  };

  // Next: if the form has unsaved input, ask before leaving so a note is never lost.
  const next = () => { if (dirty) setConfirmNext(true); else onNext(); };
  const saveThenNext = async () => { const ok = await save(); if (ok) { setConfirmNext(false); onNext(); } };
  const discardThenNext = () => { setConfirmNext(false); onNext(); };

  const fmt = (s: string) => new Date(s).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const dur = (sec: number | null) => (sec == null ? "" : sec < 60 ? `${sec}s` : `${Math.round(sec / 60)} min`);
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: T.muted, textTransform: "uppercase", display: "block", marginBottom: 4 };
  const inputCss: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.inputBorder}`, background: "#fff", fontSize: 13.5, color: T.text, fontFamily: T.FONT_BODY };

  const OutcomePill = ({ o }: { o: string }) => {
    const c = PILL[OUTCOME_BUCKET_C[o] ?? "all"];
    return <span style={{ background: c.bg, color: c.fg, borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{OUTCOME_LABEL[o] ?? o}</span>;
  };

  const TabBtn = ({ id, children }: { id: "call" | "script" | "timeline" | "answers"; children: React.ReactNode }) => (
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
          {row.telHref ? <a href={row.telHref} style={{ background: T.navy, color: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Call <span data-phone>{row.phoneDisplay}</span></a>
            : <span style={{ background: T.greyBg, color: T.greyText, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600 }}>No phone on file</span>}
          {row.waHref && <a href={row.waHref} target="_blank" rel="noreferrer" style={{ background: T.wa, color: T.waText, borderRadius: 8, padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, textDecoration: "none" }}><WaGlyph /> WhatsApp</a>}
          <span title="Coming soon" style={{ background: T.greyBg, color: T.muted, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "not-allowed", display: "inline-flex", alignItems: "center", gap: 6 }}>Follow-up script <span style={{ fontSize: 10.5, fontWeight: 700, background: "#E6DECF", color: T.label, borderRadius: 999, padding: "0 6px" }}>coming soon</span></span>
          {trial?.enabled && (
            <>
              <button onClick={previewCoach} style={{ background: T.card, color: T.navy, border: `1px solid ${T.inputBorder}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.FONT_BODY }}>Preview Coach</button>
              {!trial.paid && (
                <button onClick={() => setConfirmTrial(trial.alreadyTrialed ? "resend" : "offer")} disabled={trialBusy} style={{ background: T.amber, color: T.navy, border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: trialBusy ? "default" : "pointer", opacity: trialBusy ? 0.7 : 1, fontFamily: T.FONT_BODY }}>{trialBusy ? "Offering…" : trial.alreadyTrialed ? "Re-send trial link" : "Offer trial"}</button>
              )}
            </>
          )}
        </div>

        {/* Trial state */}
        {trial?.enabled && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 12.5, color: T.text2, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, color: T.muted, letterSpacing: "0.06em", fontSize: 11, textTransform: "uppercase" }}>Coach trial</span>
            <span style={{ background: trialStateText() === "Purchased" || trialStateText()?.includes("purchased") ? T.successBg : trialStateText()?.startsWith("Day") ? T.readBg : T.greyBg, color: trialStateText() === "Purchased" || trialStateText()?.includes("purchased") ? T.successText : trialStateText()?.startsWith("Day") ? T.readText : T.greyText, borderRadius: 999, padding: "2px 10px", fontWeight: 600 }}>{trialStateText()}</span>
            {trialMsg && <span style={{ color: T.dangerText }}>{trialMsg}</span>}
          </div>
        )}

        {/* Tabs */}
        <div style={{ borderBottom: `1px solid ${T.divider}`, marginBottom: 8, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
          <TabBtn id="call">Call &amp; notes</TabBtn>
          <TabBtn id="script">Script</TabBtn>
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

            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 10, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 130px" }}>
                <label style={label}>Follow-up{outcome && NEEDS_FOLLOWUP.has(outcome) ? " (required)" : ""}</label>
                <input type="date" value={followDate} onChange={(e) => setFollowDate(e.target.value)} style={inputCss} />
              </div>
              <div style={{ flex: "1 1 110px" }}>
                <label style={label}>&nbsp;</label>
                <input type="time" value={followTime} onChange={(e) => setFollowTime(e.target.value)} style={inputCss} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
              <button onClick={save} disabled={saving} style={{ background: T.navy, color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13.5, fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button onClick={next} disabled={saving} style={{ background: T.card, color: T.navy, border: `1px solid ${T.inputBorder}`, borderRadius: 8, padding: "9px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
                Next →
              </button>
              {saveMsg && <span style={{ fontSize: 12.5, color: saveMsg.includes("✓") ? T.successText : T.dangerText }}>{saveMsg}</span>}
            </div>

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

        {tab === "script" && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12, alignItems: "center" }}>
              {(["en", "hinglish"] as const).map((l) => (
                <button key={l} onClick={() => setSLang(l)} style={{ border: `1px solid ${sLang === l ? T.navy : T.inputBorder}`, background: sLang === l ? T.navy : T.card, color: sLang === l ? "#fff" : T.textRow, borderRadius: 999, padding: "6px 14px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: T.FONT_BODY }}>{l === "en" ? "English" : "Hinglish"}</button>
              ))}
              <button onClick={() => fetchScript(sLang, true)} disabled={sLoading} style={{ marginLeft: "auto", border: `1px solid ${T.inputBorder}`, background: T.card, color: T.navy, borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: sLoading ? "default" : "pointer" }}>↻ Regenerate</button>
            </div>
            {sLoading && <div style={{ color: T.muted, fontSize: 14 }}>Writing the script…</div>}
            {sErr && !sLoading && <div style={{ color: T.dangerText, fontSize: 13.5 }}>Couldn’t load the script. Try Regenerate.</div>}
            {scriptData && !sLoading && (() => {
              const s = scriptData.script;
              return (
                <div>
                  {scriptData.stale && <div style={{ background: T.warmBg, color: T.warmText, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Updated info since this script — <button onClick={() => fetchScript(sLang, true)} style={{ background: "none", border: "none", color: T.warmText, textDecoration: "underline", cursor: "pointer", fontWeight: 700, padding: 0, fontSize: 13 }}>regenerate</button></div>}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12, fontSize: 11.5, color: T.muted }}>
                    <span style={{ fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.label }}>{s.kind === "first" ? "First call" : `Follow-up · call ${s.callNo}`}</span>
                    <span>· Built from {s.header.builtFrom.join(" · ")}</span>
                    <span style={{ marginLeft: "auto", fontWeight: 600 }}>{scriptData.source === "fallback" ? "fallback · " : ""}₹{(scriptData.costPaise / 100).toFixed(2)}/script</span>
                  </div>
                  <div style={{ background: T.navy, color: "#fff", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", opacity: 0.8, marginBottom: 5 }}>OPEN WITH</div>
                    <div style={{ fontSize: 17, lineHeight: 1.45 }}>{s.opener}</div>
                  </div>
                  {(s.leftOff || s.since) && (
                    <div style={{ background: T.sel, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: "11px 14px", marginBottom: 14, fontSize: 14, lineHeight: 1.5, color: T.textRow }}>
                      {s.leftOff && <div>{s.leftOff}</div>}
                      {s.since && <div style={{ marginTop: 4 }}>{/^since/i.test(s.since) ? s.since : `Since then: ${s.since}`}</div>}
                    </div>
                  )}
                  {s.sections.map((sec, idx) => {
                    const open = openSec[idx] !== false;
                    return (
                      <div key={idx} style={{ border: `1px solid ${T.cardBorder}`, borderRadius: 10, marginBottom: 8, background: T.card, overflow: "hidden" }}>
                        <button onClick={() => setOpenSec((p) => ({ ...p, [idx]: !open }))} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "11px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 9, fontFamily: T.FONT_BODY }}>
                          <span style={{ background: T.navy, color: "#fff", borderRadius: 999, width: 22, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{idx + 1}</span>
                          <span style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{sec.title}</span>
                          {sec.seconds ? <span style={{ color: T.muted, fontSize: 12 }}>· {sec.seconds}s</span> : null}
                          <span style={{ marginLeft: "auto", color: T.muted, fontSize: 12 }}>{open ? "▾" : "▸"}</span>
                        </button>
                        {open && (
                          <div style={{ padding: "0 14px 12px 45px" }}>
                            {sec.lines.map((ln, li) => <div key={li} style={{ fontSize: 15.5, lineHeight: 1.5, color: T.textRow, marginBottom: 5, borderLeft: `3px solid ${T.amber}`, paddingLeft: 11 }}>“{ln}”</div>)}
                            {sec.hint && <div style={{ fontSize: 12.5, color: T.muted, marginTop: 4, fontStyle: "italic" }}>{sec.hint}</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {s.objections.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", color: T.label, textTransform: "uppercase", marginBottom: 8 }}>Likely objections</div>
                      {s.objections.map((o, oi) => (
                        <div key={oi} style={{ marginBottom: 11 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{o.label}</div>
                          <div style={{ fontSize: 14.5, lineHeight: 1.5, color: T.textRow, borderLeft: `3px solid ${T.cardBorder}`, paddingLeft: 11, marginTop: 2 }}>“{o.answer}”</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {tab === "timeline" && (
          <div>
            {tlLoading && <div style={{ color: T.muted, fontSize: 13.5 }}>Loading timeline…</div>}
            {!tlLoading && !tl && <div style={{ color: T.dangerText, fontSize: 13.5 }}>Couldn’t load the timeline.</div>}
            {tl && (() => {
              const ICON: Record<string, string> = { site: "•", call: "📞", message: "💬", coach: "🧭", checkout: "🛒", report: "📄", roadmap: "🗺️", plan: "📋", assess: "✏️", done: "✓", lead: "✦", trial: "🎁", purchase: "₹" };
              const filtered = tl.events.filter((e) => tlFilter === "all" || e.source === tlFilter);
              const sumCard = (big: string, small: string) => (
                <div style={{ flex: "1 1 80px", background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: "9px 12px" }}>
                  <div style={{ fontSize: 19, fontWeight: 700, fontFamily: T.FONT_HEAD }}>{big}</div>
                  <div style={{ fontSize: 11.5, color: T.muted }}>{small}</div>
                </div>
              );
              const FILTERS: [typeof tlFilter, string, number][] = [["all", "All", tl.counts.all], ["site", "Site", tl.counts.site], ["call", "Calls", tl.counts.call], ["message", "Messages", tl.counts.message], ["coach", "Coach", tl.counts.coach]];
              return (
                <>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                    {sumCard(String(tl.summary.visits), "visits")}
                    {sumCard(`${tl.summary.reportApprox ? "~" : ""}${tl.summary.reportMinutes} min`, "on report")}
                    {sumCard(tl.summary.lastCard ? `Card ${tl.summary.lastCard}` : "—", "last card read")}
                    {sumCard(String(tl.summary.calls), "calls")}
                  </div>
                  {tl.firstCame && (
                    <div style={{ background: T.sel, border: `1px solid ${T.cardBorder}`, borderRadius: 8, padding: "8px 12px", fontSize: 12.5, color: T.textRow, marginBottom: 12 }}>
                      <b>First came from:</b> {[tl.firstCame.source, tl.firstCame.adName ? `“${tl.firstCame.adName}”` : null, tl.firstCame.device].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    {FILTERS.map(([k, label, n]) => (
                      <button key={k} onClick={() => setTlFilter(k)} style={{ border: `1px solid ${tlFilter === k ? T.navy : T.inputBorder}`, background: tlFilter === k ? T.navy : T.card, color: tlFilter === k ? "#fff" : T.textRow, borderRadius: 999, padding: "5px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: T.FONT_BODY }}>{label} {n}</button>
                    ))}
                  </div>
                  {filtered.length === 0 && <div style={{ color: T.muted, fontSize: 13 }}>No events in this filter.</div>}
                  {filtered.map((e, i) => {
                    const prev = filtered[i - 1];
                    const dayHeader = !prev || prev.dayKey !== e.dayKey;
                    const isLastOfVisit = e.visitId && !filtered.slice(i + 1).some((x) => x.visitId === e.visitId);
                    const v = e.visitId ? tl.visits[e.visitId] : undefined;
                    return (
                      <div key={e.id}>
                        {dayHeader && <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: T.muted, marginTop: i ? 14 : 0, marginBottom: 8 }}>{e.dayLabel}</div>}
                        <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                          <div style={{ width: 54, flexShrink: 0, color: T.muted, fontSize: 12, textAlign: "right", paddingTop: 1 }}>{e.timeLabel}</div>
                          <div style={{ flexShrink: 0, fontSize: 13, width: 16, textAlign: "center" }}>{ICON[e.icon] ?? "•"}</div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, color: T.textRow }}>
                              {e.href ? <a href={e.href} target="_blank" rel="noreferrer" style={{ color: T.navy, fontWeight: 600, textDecoration: "none" }}>{e.title} ↗</a> : <span style={{ fontWeight: 600 }}>{e.title}</span>}
                              {e.child && <span style={{ marginLeft: 6, background: T.chipFill, color: T.text2, borderRadius: 999, padding: "0 7px", fontSize: 10.5, fontWeight: 700 }}>{e.child}</span>}
                            </div>
                            {e.sub && <div style={{ fontSize: 12.5, color: T.text2, marginTop: 1 }}>{e.sub}</div>}
                            {e.dropOff && <div style={{ border: `1px dashed ${T.dangerText}`, color: T.dangerText, borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 600, marginTop: 6, display: "inline-block" }}>⚑ {e.dropOff}</div>}
                          </div>
                        </div>
                        {isLastOfVisit && v && <div style={{ fontSize: 11.5, color: T.muted, margin: "2px 0 10px 64px", borderTop: `1px dashed ${T.cardBorder}`, paddingTop: 4 }}>Visit {v.index} · {v.source} · {v.range}</div>}
                      </div>
                    );
                  })}
                  <div style={{ color: T.muted, fontSize: 11.5, marginTop: 14 }}>
                    {tl.truncated ? `Showing newest ${tl.events.length} of ${tl.total} events. ` : ""}Built live from site · calls · WhatsApp · Coach{typeof tl.ms === "number" ? ` · ${tl.ms}ms` : ""}. Operator/admin views are never shown.
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {tab === "answers" && (
          <div>
            {!detail && <div style={{ color: T.muted, fontSize: 12.5 }}>Loading…</div>}
            {detail && (detail.answers[target]?.length ? (
              detail.answers[target].map((sec, si) => (
                <div key={si} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", color: T.label, textTransform: "uppercase", marginBottom: 8 }}>{sec.section}</div>
                  {sec.items.map((it, ii) => (
                    <div key={ii} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12.5, color: T.textRow, lineHeight: 1.4 }}>{it.q}</div>
                      <div style={{ fontSize: 13, color: T.navy, fontWeight: 600, marginTop: 2 }}>{it.a}</div>
                    </div>
                  ))}
                </div>
              ))
            ) : <div style={{ color: T.muted, fontSize: 12.5 }}>No stored answers for this child.</div>)}
          </div>
        )}

        {confirmTrial && (
          <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", inset: 0, background: "rgba(20,25,35,0.4)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: T.card, borderRadius: 12, padding: "18px 20px", width: 340, maxWidth: "90%", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
              <div style={{ fontFamily: T.FONT_HEAD, fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{confirmTrial === "offer" ? `Start ${row.parentName}’s 4-day trial now?` : `Re-send ${row.parentName}’s trial link?`}</div>
              <div style={{ fontSize: 13, color: T.text2, marginBottom: 16, lineHeight: 1.45 }}>{confirmTrial === "offer" ? "This activates it immediately and logs “Trial offered.”" : "This re-opens the sign-in link and WhatsApp message — it doesn’t create a new trial."}</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setConfirmTrial(null)} style={{ background: T.card, color: T.text2, border: `1px solid ${T.inputBorder}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={doOfferTrial} disabled={trialBusy} style={{ background: T.navy, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: trialBusy ? 0.7 : 1 }}>{confirmTrial === "offer" ? "Start" : "Re-send"}</button>
              </div>
            </div>
          </div>
        )}

        {offer && (
          <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", inset: 0, background: "rgba(20,25,35,0.4)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: T.card, borderRadius: 12, padding: "18px 20px", width: 400, maxWidth: "92%", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
              <div style={{ fontFamily: T.FONT_HEAD, fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{offer.already ? "Trial already active" : "Trial started ✓"}</div>
              <div style={{ fontSize: 12.5, color: T.text2, marginBottom: 12, lineHeight: 1.45 }}>{offer.already ? "This parent already has a live trial — here’s the link to re-send." : "The 4-day Coach is live. Send this on WhatsApp — the link signs them straight in."}</div>
              <textarea readOnly value={offer.msg} rows={5} style={{ ...inputCss, resize: "vertical", marginBottom: 10 }} />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button onClick={() => { navigator.clipboard?.writeText(offer.msg); setCopied(true); }} style={{ background: T.card, color: T.navy, border: `1px solid ${T.inputBorder}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{copied ? "Copied ✓" : "Copy message"}</button>
                {row.waHref && <a href={`${row.waHref}?text=${encodeURIComponent(offer.msg)}`} target="_blank" rel="noreferrer" style={{ background: T.wa, color: T.waText, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}><WaGlyph /> Open WhatsApp</a>}
                <button onClick={() => { setOffer(null); setCopied(false); }} style={{ background: T.navy, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Done</button>
              </div>
            </div>
          </div>
        )}

        {confirmNext && (
          <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", inset: 0, background: "rgba(20,25,35,0.4)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: T.card, borderRadius: 12, padding: "18px 20px", width: 320, maxWidth: "90%", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
              <div style={{ fontFamily: T.FONT_HEAD, fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Save this call first?</div>
              <div style={{ fontSize: 13, color: T.text2, marginBottom: 16, lineHeight: 1.45 }}>You have an unsaved call on this parent. Save it before moving to the next one?</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button onClick={() => setConfirmNext(false)} style={{ background: T.card, color: T.text2, border: `1px solid ${T.inputBorder}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={discardThenNext} style={{ background: T.card, color: T.dangerText, border: `1px solid ${T.inputBorder}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Discard</button>
                <button onClick={saveThenNext} disabled={saving} style={{ background: T.navy, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
