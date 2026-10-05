import { assertBootGuards } from "@/lib/boot-guard";
import { getSql } from "@/lib/db/client";

assertBootGuards();

const ALLOWED = new Set([
  "assessment_started",
  "assessment_question_complete",
  "assessment_dimension_complete",
  "report_gate_view",
  "generating_page_view",
  "view_item",
  "pricing_section_viewed",
  "begin_checkout",
  "checkout_modal_opened",
  "checkout_modal_dismissed",
  "exit_intent_shown",
  "landing_step_age",
  "landing_step_concern",
  "landing_step_followup",
  "pricing_variant_assigned",
  "phone_capture_shown",
  "teaser_shown",
  "paywall_shown",
  "thankyou_screen_view",
  "founder_call_requested",
  "roadmap_cta_click",
  "whatsapp_click",
  // v2 start-flow (?flow=v2) step events — kept in sync with the phase_44/phase_49 DB CHECK.
  "landing_view",
  "start_worry",
  "start_age",
  "start_age_view",
  "start_oob",
  "start_oob_submit",
  "start_child",
  "start_phone",
  "phone_captured",
  "q_answered",
  "halfway_view",
  "details_view",
  "details_submitted",
  // Report/Plan v2 (?report=v2) — kept in sync with the phase_46 DB CHECK.
  "report_v2_view",
  "report_section_view",
  "report_card_view",
  "report_skip_to_plan",
  "goal_changed",
  "plan_v2_view",
  "plan_cta_click",
  "call_click",
  "day1_preview_view",
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const eventType: unknown = body?.event_type;
  const sessionId: unknown = body?.session_id;
  const metadata: unknown = body?.metadata;

  if (typeof eventType !== "string") {
    return new Response("bad request", { status: 400 });
  }

  if (!ALLOWED.has(eventType)) {
    console.warn(`[funnel/event] rejected unknown event_type: "${eventType}" — add to ALLOWED and to the DB CHECK constraint if intentional`);
    return new Response("bad request", { status: 400 });
  }

  const hasSession = typeof sessionId === "string" && UUID_RE.test(sessionId);
  // whatsapp_click may be fired from a page with no resolvable session; every other
  // event requires a valid session UUID.
  if (!hasSession && eventType !== "whatsapp_click") {
    return new Response("bad request", { status: 400 });
  }

  const meta = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};

  const sql = getSql();
  // funnel_events.session_id is NOT NULL, so a session-less whatsapp_click cannot be
  // stored — accept the request but skip the insert. (The widget already skips firing
  // when it can't resolve a session; this is the route-level contract.)
  if (hasSession) {
    try {
      await sql`
        INSERT INTO funnel_events (event_type, session_id, metadata)
        VALUES (${eventType}, ${sessionId as string}::uuid, ${JSON.stringify(meta)}::jsonb)
      `;
    } catch (e) {
      console.warn("[funnel] insert failed:", (e as Error).message);
    }
  }

  return new Response("ok");
}
