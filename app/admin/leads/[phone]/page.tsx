// Admin Lead detail — the merged timeline for one person, plus the panels that
// explain the merge. Admin-only (middleware HTTP Basic Auth on /admin/*).

import { getSql } from "@/lib/db/client";
import { normalizePhone } from "@/lib/phone";
import { fetchLeadSources } from "@/lib/leads/fetch";
import { mergeLeads, CHANNEL_LABEL, type Lead, type AssessmentRow, type WaContactRow } from "@/lib/leads/merge";
import { C, BG, MONO, Badge, UrgentStatus, timeAgo, rupees } from "../ui";
import MarkHandledButton from "./MarkHandledButton";

export const dynamic = "force-dynamic";

type TimelineItem = { at: string; badge: string; color: string; title: string; sub: string | null; urgent?: boolean };

function fmt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      hour12: false, timeZone: "Asia/Kolkata",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const FUNNEL_TITLES: Record<string, string> = {
  assessment_started: "Started the assessment",
  assessment_complete: "Finished the assessment",
  generate_lead: "Finished · report sent on WhatsApp",
  report_view: "Viewed the report",
  roadmap_cta_click: "Clicked the roadmap CTA",
  begin_checkout: "Opened checkout",
  purchase: "Completed purchase",
};

const WA_TITLES: Record<string, { title: string; urgent?: boolean }> = {
  ad_click: { title: "Tapped a Click-to-WhatsApp ad" },
  inbound: { title: "Inbound WhatsApp message" },
  handoff: { title: "Handed to a human", urgent: true },
  handled: { title: "Marked handled by a human" },
};

export default async function LeadDetailPage({ params }: { params: Promise<{ phone: string }> }) {
  const { phone: rawParam } = await params;
  const phone = normalizePhone(decodeURIComponent(rawParam));

  if (!phone) {
    return <Shell><p style={{ color: C.muted }}>Invalid phone number.</p></Shell>;
  }

  const sql = getSql();
  const sources = await fetchLeadSources(sql);
  const lead: Lead | undefined = mergeLeads(sources).find((l) => l.phone === phone);

  const myAssessments: AssessmentRow[] = sources.assessments.filter((a) => normalizePhone(a.phone) === phone);
  const waContact: WaContactRow | undefined = sources.waContacts.find((w) => normalizePhone(w.phone) === phone);
  const myPurchases = sources.purchases.filter((p) => normalizePhone(p.phone) === phone);
  const myHandbook = sources.handbook.filter((h) => normalizePhone(h.phone) === phone);

  if (!lead) {
    return <Shell><p style={{ color: C.muted }}>No lead found for this number.</p></Shell>;
  }

  // ── Merged timeline: wa_events + funnel_events + purchases, in time order ─────
  const waEvents = (await sql`
    SELECT event_type, source_id, created_at
    FROM wa_events WHERE phone = ${phone} ORDER BY created_at
  `) as { event_type: string; source_id: string | null; created_at: unknown }[];

  const sessionIds = myAssessments.map((a) => a.session_id);
  const funnelEvents = sessionIds.length
    ? ((await sql`
        SELECT event_type, created_at
        FROM funnel_events WHERE session_id = ANY(${sessionIds}::uuid[])
        ORDER BY created_at
      `) as { event_type: string; created_at: unknown }[])
    : [];

  const toISO = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v));
  const items: TimelineItem[] = [];

  for (const e of waEvents) {
    const meta = WA_TITLES[e.event_type] ?? { title: e.event_type };
    items.push({
      at: toISO(e.created_at),
      badge: "WhatsApp",
      color: C.green,
      title: meta.title,
      sub: e.source_id ? `sourceId ${e.source_id}` : null,
      urgent: meta.urgent,
    });
  }
  for (const e of funnelEvents) {
    const title = FUNNEL_TITLES[e.event_type];
    if (!title) continue; // skip low-signal events
    items.push({ at: toISO(e.created_at), badge: "Website", color: C.blue, title, sub: null });
  }
  for (const p of myPurchases) {
    items.push({
      at: p.created_at,
      badge: "Payment",
      color: C.green,
      title: `Paid ${rupees(p.amount_paise)}`,
      sub: p.tier,
    });
  }
  items.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));

  return (
    <Shell>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>{lead.name || "Unknown"}</h1>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", fontSize: 13, color: C.muted, marginTop: 8 }}>
            <span style={{ fontFamily: MONO }}>{lead.phone}</span>
            {lead.childName && <><span aria-hidden>·</span><span>Child: {lead.childName}{lead.ageBand ? `, ${lead.ageBand}` : ""}</span></>}
            {lead.archetype && <><span aria-hidden>·</span><span>Pattern: {lead.archetype}</span></>}
          </div>
        </div>
        {lead.sessionId && (
          <a
            href={`/report/${lead.sessionId}`}
            style={{ display: "inline-flex", alignItems: "center", minHeight: 40, padding: "0 16px", borderRadius: 8, border: `1px solid ${C.border}`, color: C.text, background: C.card, fontSize: 13, fontWeight: 600, textDecoration: "none" }}
          >
            Open report
          </a>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>

        {/* Timeline */}
        <section aria-label="Timeline" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 22px" }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700 }}>Everything this person did, in order</h2>
          {items.length === 0 && <p style={{ color: C.muted, fontSize: 13 }}>No recorded activity yet.</p>}
          {items.map((it, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "120px 110px minmax(0, 1fr)", gap: 12, padding: "12px 0", borderTop: `1px solid ${C.border}`, fontSize: 13 }}>
              <div style={{ color: C.muted, fontFamily: MONO, fontSize: 12 }}>{fmt(it.at)}</div>
              <div><Badge text={it.badge} color={it.color} /></div>
              <div>
                <strong style={{ color: it.urgent ? C.orange : C.text, fontWeight: 600 }}>{it.title}</strong>
                {it.sub && <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 2 }}>{it.sub}</div>}
              </div>
            </div>
          ))}
        </section>

        {/* Side panels */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {lead.needsHuman && (
            <section aria-label="Next action" style={{ background: `${C.yellow}12`, border: `1px solid ${C.yellow}55`, borderRadius: 12, padding: "16px 18px" }}>
              <h2 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700 }}>Needs your reply</h2>
              <p style={{ margin: "0 0 12px", fontSize: 13, lineHeight: 1.5, color: C.text }}>
                {lead.status} {lead.needsHumanAt ? timeAgo(lead.needsHumanAt) : ""}. Assistant stopped replying.
              </p>
              <MarkHandledButton phone={lead.phone} />
            </section>
          )}
          {!lead.needsHuman && lead.statusUrgent === false && waContact?.handled_at && (
            <section style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Handled</h2>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: C.muted }}>Marked handled {timeAgo(waContact.handled_at)}.</p>
            </section>
          )}

          {/* Merged from */}
          <section aria-label="Linked records" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 9, fontSize: 13 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Merged from</h2>
            <Row label="Wati contact" value={waContact ? "wa_contacts" : "none"} mono={!!waContact} />
            <Row label="Assessment session" value={myAssessments.length ? `${myAssessments.length} × assessments` : "none"} mono={myAssessments.length > 0} />
            <Row label="Handbook form" value={myHandbook.length ? `${myHandbook.length} × handbook_leads` : "none"} mono={myHandbook.length > 0} />
            <Row label="Purchase" value={myPurchases.length ? `${myPurchases.length} × purchases` : "none"} mono={myPurchases.length > 0} />
          </section>

          {/* Attribution */}
          <section aria-label="Attribution" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 9, fontSize: 13 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Attribution</h2>
            <Row label="First touch" value={CHANNEL_LABEL[lead.firstChannel]} />
            <Row label="Ad" value={waContact?.first_source_id ?? "—"} mono={!!waContact?.first_source_id} />
            <Row label="Campaign / ad" value={lead.campaignAd ?? "—"} mono={!!lead.campaignAd} />
          </section>

          {lead.statusUrgent && (
            <div><UrgentStatus text={lead.status} /></div>
          )}
        </aside>
      </div>
    </Shell>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: C.muted }}>{label}</span>
      <span style={{ fontFamily: mono ? MONO : "inherit", fontSize: mono ? 11 : 13, color: mono ? C.muted : C.text, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: BG, padding: "28px 36px 64px" }}>
      <a href="/admin/leads" style={{ fontFamily: MONO, fontSize: 12, color: C.muted, textDecoration: "none", display: "inline-block", marginBottom: 16 }}>
        ← All leads
      </a>
      {children}
    </div>
  );
}
