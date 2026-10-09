-- phase_54 — event-tracking rebuild: dedup guarantees + new event names
--
-- Part of the lib/analytics/track.ts migration. Two things:
--   1. Partial UNIQUE indexes so the funnel can never double-count the key conversions, even if
--      a route is retried (the app ALSO dedups at insert time via NOT EXISTS — this is the
--      DB-level backstop):
--        • at most ONE generate_lead per session
--        • at most ONE purchase per razorpay payment id
--      Historical duplicates must be removed first or the UNIQUE index creation fails.
--   2. Register the new assessment instrumentation event names in the CHECK constraint
--      (question_view, answer_changed, assessment_intro_view) so their inserts are accepted.
--
-- Idempotent where possible. The dedup DELETEs keep the EARLIEST row per key.

BEGIN;

-- 1a. Remove historical duplicate generate_lead rows (keep the earliest per session).
DELETE FROM funnel_events fe
USING (
  SELECT id FROM (
    SELECT id, row_number() OVER (PARTITION BY session_id ORDER BY created_at, id) AS rn
    FROM funnel_events
    WHERE event_type = 'generate_lead'
  ) t WHERE t.rn > 1
) dup
WHERE fe.id = dup.id;

-- 1b. Remove historical duplicate purchase rows (keep the earliest per razorpay payment id).
DELETE FROM funnel_events fe
USING (
  SELECT id FROM (
    SELECT id, row_number() OVER (
      PARTITION BY (metadata->>'razorpay_payment_id') ORDER BY created_at, id
    ) AS rn
    FROM funnel_events
    WHERE event_type = 'purchase' AND metadata->>'razorpay_payment_id' IS NOT NULL
  ) t WHERE t.rn > 1
) dup
WHERE fe.id = dup.id;

-- 1c. Partial unique indexes (the dedup guarantees).
CREATE UNIQUE INDEX IF NOT EXISTS idx_funnel_lead_dedup
  ON funnel_events (session_id)
  WHERE event_type = 'generate_lead';

CREATE UNIQUE INDEX IF NOT EXISTS idx_funnel_purchase_dedup
  ON funnel_events ((metadata->>'razorpay_payment_id'))
  WHERE event_type = 'purchase' AND metadata->>'razorpay_payment_id' IS NOT NULL;

-- 2. Add the new event names to the CHECK constraint (keeps every existing value; adds the
--    three new instrumentation events). Legacy names are retained so history stays valid.
ALTER TABLE funnel_events DROP CONSTRAINT IF EXISTS funnel_events_event_type_check;
ALTER TABLE funnel_events ADD CONSTRAINT funnel_events_event_type_check CHECK (
  event_type = ANY (ARRAY[
    'assessment_started','assessment_question_complete','assessment_dimension_complete',
    'assessment_complete','report_gate_view','generating_page_view','generate_lead','report_view',
    'view_item','pricing_section_viewed','begin_checkout','checkout_modal_opened',
    'checkout_modal_dismissed','purchase','lms_day_complete','lms_reflection_submitted',
    'scroll_milestone','exit_intent_shown','landing_step_age','landing_step_concern',
    'landing_step_followup','pricing_variant_assigned','phone_capture_shown','teaser_shown',
    'paywall_shown','simplified_report_view','thankyou_screen_view','founder_call_requested',
    'roadmap_cta_click','whatsapp_click','landing_view','start_worry','start_age','start_age_view',
    'start_oob','start_oob_submit','start_child','start_phone','phone_captured','q_answered',
    'halfway_view','details_view','details_submitted','report_v2_view','report_section_view',
    'report_card_view','report_skip_to_plan','goal_changed','plan_v2_view','plan_cta_click',
    'call_click','day1_preview_view',
    -- new in phase_54:
    'question_view','answer_changed','assessment_intro_view'
  ]::text[])
);

INSERT INTO schema_migrations (phase) VALUES ('phase_54_event_tracking') ON CONFLICT DO NOTHING;

COMMIT;
