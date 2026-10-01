// The four plain SELECTs that feed the Leads merge. Each reads ONE domain and
// does NO cross-channel merge — mergeLeads() (lib/leads/merge.ts) is the only
// place rows become one-lead-per-phone. Keeping the SQL dumb keeps the merge
// unit-testable.
//
// The assessments SELECT additionally carries each session's own funnel
// milestones (assessment_started / generate_lead / roadmap_cta_click /
// begin_checkout) as scalar sub-selects — these are per-session facts the
// furthest-step ladder needs, not a merge.

import type {
  AssessmentRow,
  HandbookRow,
  WaContactRow,
  PurchaseRow,
} from "@/lib/leads/merge";

// Minimal tagged-template SQL signature — matches getSql()/neon and the test fakes.
type SqlFn = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;

const toISO = (v: unknown): string =>
  v instanceof Date ? v.toISOString() : String(v);
const toISOorNull = (v: unknown): string | null =>
  v == null ? null : v instanceof Date ? v.toISOString() : String(v);

// 1. Assessments with a non-null phone, excluding internal sessions.
export async function fetchAssessments(sql: SqlFn): Promise<AssessmentRow[]> {
  const rows = (await sql`
    SELECT
      a.session_id::text AS session_id,
      a.phone,
      a.child_name,
      a.parent_name,
      a.archetype,
      a.age_band,
      a.email,
      a.created_at,
      a.utm,
      (SELECT MIN(fe.created_at) FROM funnel_events fe
        WHERE fe.session_id = a.session_id AND fe.event_type = 'assessment_started') AS started_at,
      (SELECT MIN(fe.created_at) FROM funnel_events fe
        WHERE fe.session_id = a.session_id AND fe.event_type = 'generate_lead')      AS report_sent_at,
      (SELECT MIN(fe.created_at) FROM funnel_events fe
        WHERE fe.session_id = a.session_id AND fe.event_type = 'roadmap_cta_click')  AS roadmap_click_at,
      (SELECT MIN(fe.created_at) FROM funnel_events fe
        WHERE fe.session_id = a.session_id AND fe.event_type = 'begin_checkout')     AS checkout_at
    FROM assessments a
    WHERE a.phone IS NOT NULL AND NOT a.is_internal
  `) as Record<string, unknown>[];

  return rows.map((r) => ({
    session_id: String(r.session_id),
    phone: (r.phone as string | null) ?? null,
    child_name: (r.child_name as string | null) ?? null,
    parent_name: (r.parent_name as string | null) ?? null,
    archetype: (r.archetype as string | null) ?? null,
    age_band: (r.age_band as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    created_at: toISO(r.created_at),
    utm: (r.utm as Record<string, string> | null) ?? null,
    started_at: toISOorNull(r.started_at),
    report_sent_at: toISOorNull(r.report_sent_at),
    roadmap_click_at: toISOorNull(r.roadmap_click_at),
    checkout_at: toISOorNull(r.checkout_at),
  }));
}

// 2. Handbook leads.
export async function fetchHandbookLeads(sql: SqlFn): Promise<HandbookRow[]> {
  const rows = (await sql`
    SELECT id, name, phone, age_band, wa_sent, created_at
    FROM handbook_leads
  `) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: Number(r.id),
    name: (r.name as string | null) ?? null,
    phone: (r.phone as string | null) ?? null,
    age_band: (r.age_band as string | null) ?? null,
    wa_sent: !!r.wa_sent,
    created_at: toISO(r.created_at),
  }));
}

// 3. WhatsApp contacts (Wati).
export async function fetchWaContacts(sql: SqlFn): Promise<WaContactRow[]> {
  const rows = (await sql`
    SELECT phone, name, first_source_id, first_source_url, first_source_type,
           first_seen_at, last_seen_at,
           needs_human, needs_human_reason, needs_human_at, handled_at
    FROM wa_contacts
  `) as Record<string, unknown>[];

  return rows.map((r) => ({
    phone: String(r.phone),
    name: (r.name as string | null) ?? null,
    first_source_id: (r.first_source_id as string | null) ?? null,
    first_source_url: (r.first_source_url as string | null) ?? null,
    first_source_type: (r.first_source_type as string | null) ?? null,
    first_seen_at: toISO(r.first_seen_at),
    last_seen_at: toISO(r.last_seen_at),
    needs_human: !!r.needs_human,
    needs_human_reason: (r.needs_human_reason as string | null) ?? null,
    needs_human_at: toISOorNull(r.needs_human_at),
    handled_at: toISOorNull(r.handled_at),
  }));
}

// 4. Paid purchases, joined to assessments only to recover the phone.
export async function fetchPurchases(sql: SqlFn): Promise<PurchaseRow[]> {
  const rows = (await sql`
    SELECT a.phone, p.status, p.tier, p.amount_paise, p.created_at
    FROM purchases p
    JOIN assessments a ON a.id = p.assessment_id
    WHERE p.status = 'paid' AND a.phone IS NOT NULL AND NOT a.is_internal
  `) as Record<string, unknown>[];

  return rows.map((r) => ({
    phone: (r.phone as string | null) ?? null,
    status: String(r.status),
    tier: (r.tier as string | null) ?? null,
    amount_paise: r.amount_paise == null ? null : Number(r.amount_paise),
    created_at: toISO(r.created_at),
  }));
}

// Internal-exclusion inputs: normalizePhone() of every is_internal assessment
// phone, plus the optional comma-separated INTERNAL_PHONES env var. Returned raw
// (unnormalized) — mergeLeads() normalizes. NB: fetchAssessments already drops
// is_internal rows, so this is what lets us also drop an internal person who
// shows up only via handbook_leads / wa_contacts / purchases.
export function parseInternalPhonesEnv(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function fetchInternalPhones(sql: SqlFn): Promise<string[]> {
  const rows = (await sql`
    SELECT phone FROM assessments WHERE is_internal = true AND phone IS NOT NULL
  `) as Record<string, unknown>[];
  const dbPhones = rows.map((r) => String(r.phone));
  return [...dbPhones, ...parseInternalPhonesEnv(process.env.INTERNAL_PHONES)];
}

// Convenience: run all four and return the merge input.
export async function fetchLeadSources(sql: SqlFn) {
  const [assessments, handbook, waContacts, purchases] = await Promise.all([
    fetchAssessments(sql),
    fetchHandbookLeads(sql),
    fetchWaContacts(sql),
    fetchPurchases(sql),
  ]);
  return { assessments, handbook, waContacts, purchases };
}
