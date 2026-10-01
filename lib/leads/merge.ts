// Pure lead-merge logic. NO database access here — fetch.ts does the four plain
// SELECTs, this module merges their rows into one Lead per phone number.
//
// "One lead per normalizePhone()": a WhatsApp chat, a handbook form, a web
// assessment and a purchase from the same number collapse into a single person.
// Everything here is deterministic and unit-tested (see __tests__/leads-merge.test.ts).

import { normalizePhone } from "@/lib/phone";

// ── Input row shapes (what fetch.ts returns) ───────────────────────────────────

export type AssessmentRow = {
  session_id: string;
  phone: string | null;
  child_name: string | null;
  parent_name: string | null;
  archetype: string | null;
  age_band: string | null;
  email: string | null;
  created_at: string;              // ISO
  utm: Record<string, string> | null;
  // Per-session funnel milestones (ISO or null) — the furthest-step signals.
  started_at: string | null;       // funnel_events assessment_started
  report_sent_at: string | null;   // funnel_events generate_lead
  roadmap_click_at: string | null; // funnel_events roadmap_cta_click
  checkout_at: string | null;      // funnel_events begin_checkout
};

export type HandbookRow = {
  id: number;
  phone: string | null;
  name: string | null;
  age_band: string | null;
  wa_sent: boolean;
  created_at: string;              // ISO
};

export type WaContactRow = {
  phone: string;
  name: string | null;
  first_source_id: string | null;
  first_source_url: string | null;
  first_source_type: string | null;
  first_seen_at: string;           // ISO
  last_seen_at: string;            // ISO
  needs_human: boolean;
  needs_human_reason: string | null;
  needs_human_at: string | null;   // ISO | null
  handled_at: string | null;       // ISO | null
};

export type PurchaseRow = {
  phone: string | null;
  status: string;                  // only 'paid' rows are fetched
  tier: string | null;
  amount_paise: number | null;
  created_at: string;              // ISO
};

export type LeadSources = {
  assessments: AssessmentRow[];
  handbook: HandbookRow[];
  waContacts: WaContactRow[];
  purchases: PurchaseRow[];
};

// ── Output shape ───────────────────────────────────────────────────────────────

export type Channel = "web" | "whatsapp_ad" | "whatsapp_direct" | "handbook";

export const CHANNEL_LABEL: Record<Channel, string> = {
  web: "Web",
  whatsapp_ad: "WhatsApp ad",
  whatsapp_direct: "WhatsApp direct",
  handbook: "Handbook",
};

// Furthest step, lowest → highest. "handbook_sent" and "chatted" are entry
// baselines (rank 1); the six-rung ladder is the spec's ordering.
export type Step =
  | "chatted"
  | "handbook_sent"
  | "assessment_started"
  | "report_sent"
  | "roadmap_clicked"
  | "checkout_opened"
  | "paid";

export const STEP_RANK: Record<Step, number> = {
  chatted: 1,
  handbook_sent: 1,
  assessment_started: 2,
  report_sent: 3,
  roadmap_clicked: 4,
  checkout_opened: 5,
  paid: 6,
};

export const STEP_LABEL: Record<Step, string> = {
  chatted: "Chatted only",
  handbook_sent: "Handbook sent",
  assessment_started: "Assessment started",
  report_sent: "Report sent",
  roadmap_clicked: "Clicked roadmap",
  checkout_opened: "Checkout opened",
  paid: "Paid",
};

export type Lead = {
  phone: string;                   // normalized "+91XXXXXXXXXX"
  name: string | null;
  childName: string | null;
  archetype: string | null;
  ageBand: string | null;
  firstChannel: Channel;
  firstTouchAt: string;            // ISO
  campaignAd: string | null;
  furthestStep: Step;
  furthestStepLabel: string;
  furthestRank: number;
  lastActivityAt: string;          // ISO
  needsHuman: boolean;
  needsHumanReason: string | null;
  needsHumanAt: string | null;
  status: string;
  statusUrgent: boolean;
  statusSeverity: "safety" | "urgent" | "none";
  amountPaise: number | null;
  sessionId: string | null;        // latest assessment session, for the report link
  mergedFrom: { assessments: number; handbook: number; waContact: boolean; purchases: number };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

type Acc = {
  assessments: AssessmentRow[];
  handbook: HandbookRow[];
  wa: WaContactRow | null;
  purchases: PurchaseRow[];
};

const maxISO = (a: string | null, b: string | null): string | null =>
  !a ? b : !b ? a : a >= b ? a : b;

// needs_human reason → the Status label (see the Leads list legend). Safety is
// checked first and is the most prominent style; refund is distinct from other
// payment issues.
const SAFETY_WORDS = ["suicide", "kill", "hurt", "abuse", "beat", "harm"];
const REFUND_WORDS = ["refund"];
const PAYMENT_WORDS = ["payment", "paid", "not received", "money"];
const PERSON_WORDS = ["talk to", "call me", "speak to", "a person", "real person", "human", "person"];
const MEDICAL_WORDS = ["doctor", "medicine", "medication", "adhd", "autism"];

export function isSafetyReason(reason: string | null): boolean {
  if (!reason) return false;
  const r = reason.toLowerCase();
  return SAFETY_WORDS.some((w) => r.includes(w));
}

export function reasonToStatus(reason: string | null): string {
  if (!reason) return "Needs reply";
  const r = reason.toLowerCase();
  if (SAFETY_WORDS.some((w) => r.includes(w))) return "Safety — reply now";
  if (REFUND_WORDS.some((w) => r.includes(w))) return "Refund";
  if (PAYMENT_WORDS.some((w) => r.includes(w))) return "Payment issue";
  if (PERSON_WORDS.some((w) => r.includes(w))) return "Asked for a person";
  if (MEDICAL_WORDS.some((w) => r.includes(w))) return "Medical question";
  return "Needs reply";
}

// ── Merge ──────────────────────────────────────────────────────────────────────

export function mergeLeads(src: LeadSources, internalPhones: Iterable<string> = []): Lead[] {
  // Internal-exclusion set: normalized phones to drop from EVERY source.
  const internal = new Set<string>();
  for (const p of internalPhones) {
    const n = normalizePhone(p);
    if (n) internal.add(n);
  }

  const byPhone = new Map<string, Acc>();
  const acc = (phone: string): Acc => {
    let a = byPhone.get(phone);
    if (!a) { a = { assessments: [], handbook: [], wa: null, purchases: [] }; byPhone.set(phone, a); }
    return a;
  };

  for (const a of src.assessments) {
    const p = normalizePhone(a.phone);
    if (p) acc(p).assessments.push(a);
  }
  for (const h of src.handbook) {
    const p = normalizePhone(h.phone);
    if (p) acc(p).handbook.push(h);
  }
  for (const w of src.waContacts) {
    const p = normalizePhone(w.phone);
    if (!p) continue;
    const a = acc(p);
    // Keep the earliest-seen contact if somehow two normalize to the same phone.
    if (!a.wa || w.first_seen_at < a.wa.first_seen_at) a.wa = w;
  }
  for (const pu of src.purchases) {
    if (pu.status !== "paid") continue;
    const p = normalizePhone(pu.phone);
    if (p) acc(p).purchases.push(pu);
  }

  const leads: Lead[] = [];
  for (const [phone, a] of byPhone) {
    if (internal.has(phone)) continue; // internal: drop regardless of which source it came from
    leads.push(buildLead(phone, a));
  }
  // Default order: most recent activity first.
  leads.sort((x, y) => (x.lastActivityAt < y.lastActivityAt ? 1 : x.lastActivityAt > y.lastActivityAt ? -1 : 0));
  return leads;
}

function buildLead(phone: string, a: Acc): Lead {
  const latestAssessment = [...a.assessments].sort((x, y) => (x.created_at < y.created_at ? 1 : -1))[0] ?? null;
  const earliestAssessment = [...a.assessments].sort((x, y) => (x.created_at < y.created_at ? -1 : 1))[0] ?? null;
  const earliestHandbook = [...a.handbook].sort((x, y) => (x.created_at < y.created_at ? -1 : 1))[0] ?? null;

  // ── First channel: whichever touch happened earliest ─────────────────────────
  const touches: { channel: Channel; at: string; tie: number }[] = [];
  if (a.wa) {
    touches.push({
      channel: a.wa.first_source_id ? "whatsapp_ad" : "whatsapp_direct",
      at: a.wa.first_seen_at,
      tie: a.wa.first_source_id ? 0 : 1,
    });
  }
  if (earliestAssessment) touches.push({ channel: "web", at: earliestAssessment.created_at, tie: 2 });
  if (earliestHandbook) touches.push({ channel: "handbook", at: earliestHandbook.created_at, tie: 3 });
  touches.sort((x, y) => (x.at < y.at ? -1 : x.at > y.at ? 1 : x.tie - y.tie));
  const first = touches[0];
  const firstChannel: Channel = first?.channel ?? (a.wa ? "whatsapp_direct" : "web");
  const firstTouchAt = first?.at ?? a.wa?.first_seen_at ?? latestAssessment?.created_at ?? new Date(0).toISOString();

  // ── Campaign / ad, keyed to the first channel ────────────────────────────────
  const campaignAd = campaignAdFor(firstChannel, a, earliestAssessment, earliestHandbook);

  // ── Furthest step (take the max rank across every signal) ────────────────────
  const paid = a.purchases.length > 0;
  const anyMilestone = (pick: (r: AssessmentRow) => string | null) => a.assessments.some((r) => pick(r));
  let step: Step = a.wa ? "chatted" : "handbook_sent";
  if (!a.wa && a.handbook.length > 0 && a.assessments.length === 0 && !paid) step = "handbook_sent";
  if (a.assessments.length > 0) step = "assessment_started";       // a web row means they started
  if (anyMilestone((r) => r.started_at)) step = "assessment_started";
  if (anyMilestone((r) => r.report_sent_at)) step = "report_sent";
  if (anyMilestone((r) => r.roadmap_click_at)) step = "roadmap_clicked";
  if (anyMilestone((r) => r.checkout_at)) step = "checkout_opened";
  if (paid) step = "paid";                                          // paid beats everything

  // ── Last activity: newest timestamp anywhere ─────────────────────────────────
  let lastActivityAt: string | null = null;
  for (const r of a.assessments) {
    lastActivityAt = maxISO(lastActivityAt, r.created_at);
    lastActivityAt = maxISO(lastActivityAt, r.started_at);
    lastActivityAt = maxISO(lastActivityAt, r.report_sent_at);
    lastActivityAt = maxISO(lastActivityAt, r.roadmap_click_at);
    lastActivityAt = maxISO(lastActivityAt, r.checkout_at);
  }
  for (const h of a.handbook) lastActivityAt = maxISO(lastActivityAt, h.created_at);
  for (const pu of a.purchases) lastActivityAt = maxISO(lastActivityAt, pu.created_at);
  if (a.wa) lastActivityAt = maxISO(lastActivityAt, a.wa.last_seen_at);
  lastActivityAt = lastActivityAt ?? firstTouchAt;

  // ── Needs-human + status ─────────────────────────────────────────────────────
  const needsHuman = !!a.wa && a.wa.needs_human && !a.wa.handled_at;
  const needsHumanReason = needsHuman ? a.wa!.needs_human_reason : null;
  const needsHumanAt = needsHuman ? a.wa!.needs_human_at : null;

  let status = "—";
  let statusUrgent = false;
  let statusSeverity: "safety" | "urgent" | "none" = "none";
  if (needsHuman) {
    status = reasonToStatus(needsHumanReason);
    statusUrgent = true;
    statusSeverity = isSafetyReason(needsHumanReason) ? "safety" : "urgent";
  } else if (paid) {
    status = "Customer";
  }

  const amountPaise = paid
    ? a.purchases.reduce((s, p) => s + (p.amount_paise ?? 0), 0)
    : null;

  const name =
    latestAssessment?.parent_name ??
    a.wa?.name ??
    earliestHandbook?.name ??
    null;

  return {
    phone,
    name,
    childName: latestAssessment?.child_name ?? null,
    archetype: latestAssessment?.archetype ?? null,
    ageBand: latestAssessment?.age_band ?? earliestHandbook?.age_band ?? null,
    firstChannel,
    firstTouchAt,
    campaignAd,
    furthestStep: step,
    furthestStepLabel: STEP_LABEL[step],
    furthestRank: STEP_RANK[step],
    lastActivityAt,
    needsHuman,
    needsHumanReason,
    needsHumanAt,
    status,
    statusUrgent,
    statusSeverity,
    amountPaise,
    sessionId: latestAssessment?.session_id ?? null,
    mergedFrom: {
      assessments: a.assessments.length,
      handbook: a.handbook.length,
      waContact: !!a.wa,
      purchases: a.purchases.length,
    },
  };
}

function campaignAdFor(
  channel: Channel,
  a: Acc,
  assessment: AssessmentRow | null,
  handbook: HandbookRow | null,
): string | null {
  if (channel === "whatsapp_ad" && a.wa?.first_source_id) return `ad ${a.wa.first_source_id}`;
  if (channel === "whatsapp_direct") {
    if (a.wa?.first_source_url) return a.wa.first_source_url;
    if (a.wa?.first_source_type) return a.wa.first_source_type;
    return "site widget";
  }
  if (channel === "web") {
    const utm = assessment?.utm ?? null;
    if (utm) {
      const sourceCampaign = [utm.utm_source, utm.utm_campaign].filter(Boolean).join(" / ");
      if (sourceCampaign) return sourceCampaign;
    }
    return null;
  }
  if (channel === "handbook") {
    return handbook?.age_band ? `age ${handbook.age_band}` : "handbook form";
  }
  return null;
}
