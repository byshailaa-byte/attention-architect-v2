"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { maskPhone } from "@/lib/phone";
import { CHANNEL_LABEL, type Channel, type Lead } from "@/lib/leads/merge";
import type { SourceCounts } from "./page";
import { C, BG, MONO, Badge, ChannelBadge, UrgentStatus, SafetyStatus, timeAgo, rupees } from "./ui";

type ChipKey = "all" | Channel;

const CHIPS: { key: ChipKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "web", label: "Web" },
  { key: "whatsapp_ad", label: "WhatsApp ad" },
  { key: "whatsapp_direct", label: "WhatsApp direct" },
  { key: "handbook", label: "Handbook" },
];

const CARDS: { key: keyof SourceCounts; label: string; sub: string }[] = [
  { key: "all", label: "All leads", sub: "unique people" },
  { key: "web", label: "Web assessment", sub: "landing page → assessment" },
  { key: "whatsapp_ad", label: "WhatsApp ad", sub: "Click-to-WhatsApp, from Wati" },
  { key: "whatsapp_direct", label: "WhatsApp direct", sub: "site widget or typed number" },
  { key: "handbook", label: "Handbook", sub: "handbook form" },
];

const PERIODS: { key: string; label: string }[] = [
  { key: "30d", label: "Last 30 days" },
  { key: "7d", label: "Last 7 days" },
  { key: "today", label: "Today" },
];

const TH: React.CSSProperties = {
  padding: "11px 16px",
  textAlign: "left",
  fontFamily: MONO,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: C.muted,
};
const TD: React.CSSProperties = { padding: "13px 16px", fontSize: 13, verticalAlign: "top" };

export default function LeadsView({
  leads,
  counts,
  range,
  error,
}: {
  leads: Lead[];
  counts: SourceCounts;
  range: string;
  error: string | null;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [chip, setChip] = useState<ChipKey>("all");
  const [needsFirst, setNeedsFirst] = useState(true);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    let out = leads.filter((l) => {
      if (chip !== "all" && l.firstChannel !== chip) return false;
      if (!q) return true;
      return (
        (l.name ?? "").toLowerCase().includes(q) ||
        (l.childName ?? "").toLowerCase().includes(q) ||
        (qDigits !== "" && l.phone.replace(/\D/g, "").includes(qDigits)) ||
        (l.sessionId ?? "").toLowerCase().startsWith(q)
      );
    });
    out = [...out].sort((a, b) => {
      if (needsFirst && a.needsHuman !== b.needsHuman) return a.needsHuman ? -1 : 1;
      return a.lastActivityAt < b.lastActivityAt ? 1 : a.lastActivityAt > b.lastActivityAt ? -1 : 0;
    });
    return out;
  }, [leads, search, chip, needsFirst]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: BG, padding: "28px 36px 64px" }}>
      <a href="/admin" style={{ fontFamily: MONO, fontSize: 12, color: C.muted, textDecoration: "none" }}>
        ← Back to admin
      </a>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, margin: "16px 0 22px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: "-0.01em" }}>Leads</h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: C.muted, maxWidth: 620 }}>
            Everyone who reached us, from any channel, merged into one person by phone number.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label htmlFor="range" style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>Period</label>
          <select
            id="range"
            value={range}
            onChange={(e) => router.push(`/admin/leads?range=${e.target.value}`)}
            style={{ font: "inherit", fontSize: 13, padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.text, minHeight: 40 }}
          >
            {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ background: `${C.red}12`, border: `1px solid ${C.red}40`, borderRadius: 8, padding: "10px 14px", marginBottom: 18, fontFamily: MONO, fontSize: 12, color: C.red }}>
          Could not load leads: {error}
        </div>
      )}

      {/* Source count cards */}
      <section aria-label="Lead counts by source" style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12, marginBottom: 22 }}>
        {CARDS.map((c) => (
          <div key={c.key} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: C.muted }}>{c.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, margin: "4px 0 2px", lineHeight: 1 }}>{counts[c.key]}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{c.sub}</div>
          </div>
        ))}
      </section>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone, session ID"
          aria-label="Search leads"
          style={{ font: "inherit", fontSize: 13, width: 300, padding: "0 14px", minHeight: 40, border: `1px solid ${C.border}`, borderRadius: 8, background: C.card, color: C.text }}
        />
        <div role="group" aria-label="Filter by source" style={{ display: "flex", gap: 6 }}>
          {CHIPS.map((c) => {
            const on = chip === c.key;
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={on}
                onClick={() => setChip(c.key)}
                style={{
                  font: "inherit", fontSize: 12, fontWeight: 600, minHeight: 40, padding: "0 14px",
                  borderRadius: 20, cursor: "pointer",
                  border: `1px solid ${on ? C.yellow : C.border}`,
                  background: on ? `${C.yellow}1c` : C.card,
                  color: on ? C.yellow : C.muted,
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginLeft: "auto", minHeight: 40, color: C.text }}>
          <input type="checkbox" checked={needsFirst} onChange={(e) => setNeedsFirst(e.target.checked)} style={{ width: 17, height: 17, accentColor: C.yellow }} />
          Needs a human reply first
        </label>
      </div>

      {/* Table */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#202127" }}>
              <th scope="col" style={TH}>Person</th>
              <th scope="col" style={TH}>First came from</th>
              <th scope="col" style={TH}>Campaign / ad</th>
              <th scope="col" style={TH}>Furthest step</th>
              <th scope="col" style={TH}>Last activity</th>
              <th scope="col" style={TH}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} style={{ ...TD, textAlign: "center", color: C.muted, padding: "28px 16px" }}>No leads in this period.</td></tr>
            )}
            {rows.map((l) => (
              <tr key={l.phone} style={{ borderTop: `1px solid ${C.border}`, background: l.needsHuman ? `${C.orange}10` : "transparent" }}>
                <td style={TD}>
                  <a href={`/admin/leads/${encodeURIComponent(l.phone)}`} style={{ fontWeight: 600, color: C.text, textDecoration: "none" }}>
                    {l.name || "Unknown"}
                  </a>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>{maskPhone(l.phone)}</div>
                </td>
                <td style={TD}><ChannelBadge channel={l.firstChannel} label={CHANNEL_LABEL[l.firstChannel]} /></td>
                <td style={{ ...TD, fontFamily: MONO, fontSize: 11, color: C.muted }}>{l.campaignAd ?? "—"}</td>
                <td style={TD}>
                  {l.furthestStep === "paid"
                    ? <span style={{ fontWeight: 600, color: C.green }}>Paid{l.amountPaise ? ` ${rupees(l.amountPaise)}` : ""}</span>
                    : <span>{l.furthestStepLabel}</span>}
                </td>
                <td style={{ ...TD, color: C.muted }}>{timeAgo(l.lastActivityAt)}</td>
                <td style={TD}>
                  {l.statusSeverity === "safety" ? <SafetyStatus text={l.status} />
                    : l.statusSeverity === "urgent" ? <UrgentStatus text={l.status} />
                    : l.status === "Customer" ? <Badge text="Customer" color={C.green} />
                    : <span style={{ color: C.muted }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend (from the mockup) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, fontSize: 12, color: C.muted, marginTop: 16 }}>
        <div><strong style={{ color: C.text }}>Furthest step</strong> runs: Chatted only → Assessment started → Report sent → Clicked roadmap → Checkout opened → Paid.</div>
        <div><strong style={{ color: C.text }}>Status</strong> in dark orange means a human should reply first: asked for a person, payment issue, refund, safety flag.</div>
        <div><strong style={{ color: C.text }}>One row per phone number.</strong> A WhatsApp chat, a handbook form and an assessment from the same number show as one person.</div>
      </div>
    </div>
  );
}
