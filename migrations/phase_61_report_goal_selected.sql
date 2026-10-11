-- phase_61: allow the new report_goal_selected funnel event (card-6 goal picker).
-- Additive: recreates funnel_events_event_type_check with report_goal_selected added. Also
-- includes handbook_lead (was in the catalog + dev CHECK but missing from prod's CHECK — aligned).
-- report_goal_selected carries goalKey + changed; routes to GA4 + funnel DB only, no ad platforms.
-- Applied to dev (ep-wild-paper) + prod (ep-green-truth), schema backed up first.
ALTER TABLE funnel_events DROP CONSTRAINT IF EXISTS funnel_events_event_type_check;
ALTER TABLE funnel_events ADD CONSTRAINT funnel_events_event_type_check CHECK (
  event_type = ANY (ARRAY[
    'assessment_started','assessment_question_complete','assessment_dimension_complete','assessment_complete','report_gate_view',
    'generating_page_view','generate_lead','report_view','view_item','pricing_section_viewed',
    'begin_checkout','checkout_modal_opened','checkout_modal_dismissed','purchase','lms_day_complete',
    'lms_reflection_submitted','scroll_milestone','exit_intent_shown','landing_step_age','landing_step_concern',
    'landing_step_followup','pricing_variant_assigned','phone_capture_shown','teaser_shown','paywall_shown',
    'simplified_report_view','thankyou_screen_view','founder_call_requested','roadmap_cta_click','whatsapp_click',
    'landing_view','start_worry','start_age','start_age_view','start_oob',
    'start_oob_submit','start_child','start_phone','phone_captured','q_answered',
    'halfway_view','details_view','details_submitted','report_v2_view','report_section_view',
    'report_card_view','report_skip_to_plan','goal_changed','plan_v2_view','plan_cta_click',
    'call_click','day1_preview_view','question_view','answer_changed','assessment_intro_view',
    'handbook_lead','trial_started','coach_message_sent','report_goal_selected'
  ]::text[])
);
