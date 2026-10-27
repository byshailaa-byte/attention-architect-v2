"use client";
import { useMemo, useState } from "react";
import { T } from "../crm-theme";
import { BUCKET_LABEL, type Bucket, type ParentRow } from "@/lib/admin/parents/types";

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

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (bucket !== "all" && r.bucket !== bucket) return false;
      if (!needle) return true;
      return (
        r.parentName.toLowerCase().includes(needle) ||
        r.children.some((c) => c.childName.toLowerCase().includes(needle) || c.worry.toLowerCase().includes(needle))
      );
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
            <div key={r.key} data-parent-row data-child-count={r.children.length} style={{ display: "grid", gridTemplateColumns: GRID, gap: 12, alignItems: "center", background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: "12px 14px" }}>
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
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
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
          <div key={r.key} style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: "13px 14px" }}>
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
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {r.telHref ? <a href={r.telHref} style={{ flex: 1, textAlign: "center", background: T.navy, color: "#fff", borderRadius: 8, padding: "9px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Call</a> : <span style={{ flex: 1, textAlign: "center", background: T.greyBg, color: T.greyText, borderRadius: 8, padding: "9px", fontSize: 13, fontWeight: 600 }}>No phone</span>}
              {r.waHref && <a href={r.waHref} target="_blank" rel="noreferrer" style={{ background: T.wa, color: T.waText, borderRadius: 8, padding: "9px 14px", display: "inline-flex", alignItems: "center", textDecoration: "none" }}><WaGlyph /></a>}
            </div>
            {r.followUpAt && <div style={{ fontSize: 12, color: r.followUpOverdue ? T.warmText : T.text2, marginTop: 8, fontWeight: r.followUpOverdue ? 600 : 400 }}>Follow-up: {r.followUpAt}</div>}
          </div>
        ))}
      </div>

      {filtered.length === 0 && <div style={{ color: T.muted, fontSize: 13.5, padding: "20px 14px" }}>No parents in this bucket.</div>}

      <p style={{ color: T.muted, fontSize: 12, marginTop: 24 }}>Source: live · {commit} · phone shown masked; full number only in the Call/WhatsApp link</p>

      <style>{`
        @media (max-width: 767px) {
          .aa-parents-desktop { display: none !important; }
          .aa-parents-mobile { display: flex !important; }
        }
      `}</style>
    </main>
  );
}
