// ════════════════════════════════════════════════════════════════════════════════
// ANALYTICS CATALOG — the single source of truth for every tracked event.
// Pure data + pure helpers. Safe to import on BOTH client and server (no window, no
// node:crypto, no db). The client tracker (track.ts) and the server tracker
// (track.server.ts) and the funnel route all read from here.
//
// Rules (per the event-tracking rebuild):
//   • One `our_name` (snake_case) per logical event. The SAME name is sent to GA4 and to
//     Meta Pixel as a CUSTOM event. Key conversions ALSO send the Meta STANDARD event.
//   • Child/personal data never reaches an ad platform — enforced by AD_PARAM_ALLOW below
//     (default-deny: anything not on the list is stripped before GA4/Meta).
//   • Pixel ↔ CAPI dedup via a shared, deterministic event_id (metaEventId).
// ════════════════════════════════════════════════════════════════════════════════

export type EventSpec = {
  ga4?: boolean;         // send to GA4 under the same snake_case name
  meta?: boolean;        // send to Meta Pixel as a CUSTOM event under the same name
  metaStandard?: string; // ALSO send this Meta STANDARD event (Lead / InitiateCheckout / Purchase / ViewContent / Schedule / Subscribe)
  capi?: boolean;        // the standard event is also sent server-side via the Conversions API
  future?: boolean;      // registered now, not fired yet (forward declaration only)
  openaiEvent?: string;  // ChatGPT (OpenAI) ads conversion name. Mapped for the key conversions;
                         // only OPENAI_SEND events actually fire (today: generate_lead only).
};

// OpenAI conversions we ACTUALLY send right now (pixel + CAPI). The others are catalog-mapped
// but NOT sent yet, per spec A2c.
export const OPENAI_SEND = new Set<string>(["generate_lead"]);

// Every event the app may emit. Events with no ga4/meta flag are funnel_events-table-only.
// This object's keys are also the allow-list the /api/funnel/event route accepts.
export const CATALOG: Record<string, EventSpec> = {
  // ── Ad-routed conversions ──────────────────────────────────────────────────────
  assessment_started:          { ga4: true, meta: true },
  assessment_complete:         { ga4: true, meta: true },
  assessment_dimension_complete: { ga4: true, meta: true }, // dimension param stays DB-only (stripped from ad platforms)
  generate_lead:               { ga4: true, meta: true, metaStandard: "Lead", capi: true, openaiEvent: "lead_created" },
  view_item:                   { ga4: true, meta: true, metaStandard: "ViewContent" },
  begin_checkout:              { ga4: true, meta: true, metaStandard: "InitiateCheckout", capi: true, openaiEvent: "checkout_started" },
  purchase:                    { ga4: true, meta: true, metaStandard: "Purchase", capi: true, openaiEvent: "order_created" },
  call_booked:                 { ga4: true, meta: true, metaStandard: "Schedule", openaiEvent: "appointment_scheduled" }, // registered; fires when a Calendly booking is confirmed
  // Handbook (out-of-range) sign-up — DB + GA4 + Meta CUSTOM only. NEVER a Meta Lead / generate_lead
  // / OpenAI lead_created (so handbook leads don't train the ad platforms as paid-funnel leads).
  handbook_lead:               { ga4: true, meta: true },
  report_view:                 { ga4: true }, // all 3 report types; carries {variant: v1|v2|simplified}
  report_gate_view:            { ga4: true, meta: true }, // retires the Pixel-only "ReportGateView"
  scroll_milestone:            { ga4: true },
  exit_intent_shown:           { ga4: true },

  // ── Future events — registered now, NOT fired yet ────────────────────────────────
  trial_started:               { ga4: true, meta: true, future: true, openaiEvent: "trial_started" },
  coach_message_sent:          { ga4: true, meta: true, future: true },
  day4_results_viewed:         { ga4: true, meta: true, future: true },
  program_week_completed:      { ga4: true, meta: true, future: true },
  subscription_started:        { ga4: true, meta: true, metaStandard: "Subscribe", capi: true, future: true },
  assessment_intro_view:       {}, // intro screen shown (C2); DB-only

  // ── Legacy landing GA4 micro-events (GA4-only, never written to the DB) ──────────
  // These parallel the DB-only landing_step_* events on the same action; preserved as-is so the
  // existing Google Ads landing funnel keeps firing. Always called with { db: false }.
  age_selected:                { ga4: true },
  concern_selected:            { ga4: true },
  follow_up_selected:          { ga4: true },
  age_out_of_band:             { ga4: true },
  cta_click:                   { ga4: true },
  section_view:                { ga4: true },

  // ── New assessment instrumentation (DB-only) ─────────────────────────────────────
  question_view:               {},
  answer_changed:              {},

  // ── Funnel-table-only events (no ad platform) ────────────────────────────────────
  assessment_question_complete: {},
  q_answered:                  {},
  halfway_view:                {},
  details_view:                {},
  details_submitted:           {},
  phone_captured:              {},
  phone_capture_shown:         {},
  teaser_shown:                {},
  paywall_shown:               {},
  generating_page_view:        {},
  pricing_section_viewed:      {},
  checkout_modal_opened:       {},
  checkout_modal_dismissed:    {},
  thankyou_screen_view:        {},
  roadmap_cta_click:           {},
  whatsapp_click:              {},
  landing_view:                {},
  landing_step_age:            {},
  landing_step_concern:        {},
  landing_step_followup:       {},
  start_worry:                 {},
  start_age:                   {},
  start_age_view:              {},
  start_oob:                   {},
  start_oob_submit:            {},
  start_child:                 {},
  start_phone:                 {},
  report_v2_view:              {}, // legacy name kept for history; new code fires report_view{variant:v2}
  simplified_report_view:      {}, // legacy name kept for history; new code fires report_view{variant:simplified}
  report_card_view:            {},
  report_skip_to_plan:         {},
  goal_changed:                {},
  plan_v2_view:                {},
  plan_cta_click:              {},
  call_click:                  {},
  day1_preview_view:           {},
  lms_day_complete:            {},
  lms_reflection_submitted:    {},
};

// Params that MAY leave the app to GA4 / Meta. DEFAULT-DENY: anything not on this list is
// dropped before it reaches an ad platform. NEVER on it: archetype, dimension, worry/concern,
// answers, child name/age/gender, phone, email, question_id, index, card, goalKey, etc.
export const AD_PARAM_ALLOW = ["value", "currency", "tier", "content_name", "page", "depth", "variant"] as const;

export function pickAdParams(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of AD_PARAM_ALLOW) {
    if (params[k] !== undefined && params[k] !== null) out[k] = params[k];
  }
  return out;
}

// Deterministic Meta event_id so the browser Pixel event and the server CAPI event for the SAME
// conversion dedup to one. Both client and server compute the same value from (name, ids), so
// no id needs to be threaded across the client→server boundary.
export function metaEventId(
  name: string,
  ctx: { sessionId?: string | null; params?: Record<string, unknown> },
): string | undefined {
  const sid = ctx.sessionId ?? undefined;
  switch (name) {
    case "generate_lead":  return sid ? `lead:${sid}` : undefined;
    case "begin_checkout": return sid ? `checkout:${sid}` : undefined;
    case "purchase": {
      const pid = ctx.params?.razorpay_payment_id;
      return typeof pid === "string" && pid ? `purchase:${pid}` : (sid ? `purchase:${sid}` : undefined);
    }
    default: return undefined; // ViewContent / Schedule / custom events: no cross-side dedup needed
  }
}

// Consent gate for ad platforms. Placeholder: returns true for now. The ad adapters (GA4, Meta
// Pixel, CAPI) check this before sending; the funnel_events DB write is NOT gated by it.
export function consentAllowsAds(): boolean {
  return true;
}
