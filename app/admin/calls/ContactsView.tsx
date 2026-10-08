"use client";
import type { ContactRow, ContactsPage, ContactsQuery } from "@/lib/admin/contacts";
import { T } from "../crm-theme";

// Reuses the A1 table look. The search/filter form is a native GET form (uncontrolled inputs) so
// nothing re-renders per keystroke — no focus loss. Selects/date auto-submit on change.
const GRID = "1fr 1.2fr 1.2fr 1.5fr 0.9fr 1.2fr 0.9fr";

const STAGE_OPTS = [
  ["", "All stages"], ["started", "Started assessment"], ["report", "Got report"],
  ["checkout", "Checkout started"], ["paid", "Paid"], ["in_lms", "In LMS"], ["v1", "v1 customer"],
];
const PLAN_OPTS = [["", "Any plan"], ["tier2", "₹4,999"], ["tier1", "₹2,999"], ["full", "₹999 (old)"], ["module1", "₹499 (old)"]];

export function ContactsView({ data, query }: { data: ContactsPage; query: ContactsQuery }) {
  const { rows, total, totalAll, page, pageSize, callsEnabled } = data;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    sp.set("view", "contacts");
    if (query.q) sp.set("q", query.q);
    if (query.stage) sp.set("stage", query.stage);
    if (query.paid) sp.set("paid", query.paid);
    if (query.plan) sp.set("plan", query.plan);
    if (query.flag) sp.set("flag", query.flag);
    if (query.from) sp.set("from", query.from);
    if (query.to) sp.set("to", query.to);
    sp.set("page", String(p));
    return `/admin/calls?${sp.toString()}`;
  };

  const sel = { border: `1px solid ${T.inputBorder}`, borderRadius: 8, padding: "7px 9px", fontSize: 13, color: T.navy, background: T.card, fontFamily: "inherit" } as React.CSSProperties;

  return (
    <main style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16, minWidth: 0, color: T.text }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: T.label }}>CALLS</div>
          <h1 style={{ margin: "2px 0 0", fontFamily: T.FONT_HEAD, fontSize: 30, fontWeight: 600 }}>All contacts</h1>
        </div>
        <span style={{ fontSize: 13, color: T.text2 }}>{total.toLocaleString("en-IN")} people{total !== totalAll ? ` of ${totalAll.toLocaleString("en-IN")}` : ""} · one row per person · test traffic hidden</span>
      </div>

      {/* tab row: switch between the queue and this view */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a href="/admin/calls?tab=due_today" style={{ padding: "7px 12px", borderRadius: 999, fontSize: 13.5, fontWeight: 600, textDecoration: "none", background: T.card, color: T.navy, border: `1px solid ${T.inputBorder}` }}>Call queue</a>
        <span style={{ padding: "7px 12px", borderRadius: 999, fontSize: 13.5, fontWeight: 600, background: T.navy, color: "#fff" }}>All contacts</span>
      </div>

      {/* search + filters (native GET form → focus-safe) */}
      <form action="/admin/calls" method="get" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input type="hidden" name="view" value="contacts" />
        <input name="q" defaultValue={query.q ?? ""} placeholder="Search name, phone, child…" style={{ ...sel, width: 240 }} />
        <select name="stage" defaultValue={query.stage ?? ""} style={sel} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
          {STAGE_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select name="paid" defaultValue={query.paid ?? ""} style={sel} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
          <option value="">Paid + unpaid</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option>
        </select>
        <select name="plan" defaultValue={query.plan ?? ""} style={sel} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
          {PLAN_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select name="flag" defaultValue={query.flag ?? ""} style={sel} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
          <option value="">All</option><option value="never_called">Never called</option><option value="checkout_started">Checkout started</option>
        </select>
        <label style={{ fontSize: 12.5, color: T.text2 }}>Activity</label>
        <input type="date" name="from" defaultValue={query.from ?? ""} style={sel} onChange={(e) => e.currentTarget.form?.requestSubmit()} />
        <input type="date" name="to" defaultValue={query.to ?? ""} style={sel} onChange={(e) => e.currentTarget.form?.requestSubmit()} />
        <button type="submit" style={{ background: T.navy, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Search</button>
      </form>

      {!callsEnabled && <div style={{ fontSize: 12.5, color: T.warmText }}>Call logging not enabled yet — last-call column shows “—”.</div>}

      <section style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 12, padding: "11px 16px", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: T.label, textTransform: "uppercase" }}>
          <span>Parent</span><span>Child</span><span>Type · worry</span><span>Stage</span><span>Last activity</span><span>Last call</span><span>Follow up</span>
        </div>
        {rows.length === 0 && <div style={{ padding: "18px 16px", color: T.text2, fontSize: 14, borderTop: `1px solid ${T.cardBorder}` }}>No contacts match.</div>}
        {rows.map((c: ContactRow) => (
          <a key={c.assessmentId} href={`/admin/calls/${c.assessmentId}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 12, alignItems: "center", padding: "12px 16px", borderTop: `1px solid ${T.cardBorder}`, fontSize: 14 }}>
              <span style={{ fontWeight: 600 }}>{c.parentName}{c.assessmentCount > 1 ? <span style={{ color: T.text2, fontWeight: 400, fontSize: 12 }}> ·{c.assessmentCount}</span> : ""}</span>
              <span style={{ color: T.textRow }}>{c.childName}, {c.ageBand}</span>
              <span style={{ color: T.text2 }}>{c.typeName} · {c.worry}</span>
              <span style={{ fontSize: 13 }}>{c.stage}</span>
              <span style={{ color: T.text2 }}>{c.lastActivity}</span>
              <span style={{ color: T.text2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.lastCall}</span>
              <span style={{ fontWeight: 600, color: c.nextFollowUp !== "—" ? T.warmText : T.text2 }}>{c.nextFollowUp}</span>
            </div>
          </a>
        ))}
      </section>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: T.text2 }}>
        <span>Page {page} of {lastPage} · {pageSize}/page</span>
        <div style={{ display: "flex", gap: 8 }}>
          {page > 1 && <a href={pageHref(page - 1)} style={{ textDecoration: "none", color: T.navy, fontWeight: 600, border: `1px solid ${T.inputBorder}`, borderRadius: 8, padding: "6px 12px" }}>← Prev</a>}
          {page < lastPage && <a href={pageHref(page + 1)} style={{ textDecoration: "none", color: T.navy, fontWeight: 600, border: `1px solid ${T.inputBorder}`, borderRadius: 8, padding: "6px 12px" }}>Next →</a>}
        </div>
      </div>
    </main>
  );
}
